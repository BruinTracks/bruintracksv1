import os
import re
import time
from datetime import date, datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from ortools.sat.python import cp_model
from typing import List, Dict, Tuple, Iterator
from itertools import combinations
import pprint

# ───── CONFIGURATION ─────
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

# the core list of courses the student *must* complete
COURSES_TO_SCHEDULE = [
    "COM SCI|1",
    "COM SCI|31",
    "COM SCI|32",
    "COM SCI|33",
    "COM SCI|35L",
    "MATH|31A",
    "MATH|31B",
    "MATH|32A",
    "MATH|32B",
    "MATH|33A",
    "MATH|33B",
    "MATH|61",
    "PHYSICS|1A",
    "PHYSICS|1B",
    "PHYSICS|1C",
    "COM SCI|M51A",
    "PHYSICS|4AL",
    "COM SCI|111",
    "COM SCI|118",
    "COM SCI|131",
    "COM SCI|180",
    "COM SCI|181",
    "COM SCI|M151B",
    "COM SCI|M152A",
    "C&EE|110",
    "COM SCI|130",
]
MAX_COURSES_PER_TERM = 5

# Preferences only apply in “detailed” terms
PREF_EARLIEST    = datetime.strptime("09:00", "%H:%M").time()
PREF_LATEST      = datetime.strptime("12:00", "%H:%M").time()
PREF_NO_DAYS     = set(["F"])            # e.g. avoid Fridays
PREF_BUILDINGS   = set(["MS","SCI"])
PREF_INSTRUCTORS = set()                 # e.g. {"Smith","Jones"}

# ───── HELPERS ─────
def to_dnf(node):
    """
        Input: node is either
        • {'and': [child1, child2, …]}
        • {'or':  [child1, child2, …]}
        • a leaf dict with no 'and' or 'or'.
        Returns: List of clauses, each clause is a list of leaf-dicts.
    """
    if 'and' in node:
        # DNF(and(A,B,C)) = cartesian product of DNF(A), DNF(B), DNF(C)
        lists = [to_dnf(child) for child in node['and']]
        prods = lists[0]
        for rest in lists[1:]:
            prods = [c1 + c2 for c1 in prods for c2 in rest]
        return prods

    if 'or' in node:
        # DNF(or(X,Y,Z)) = union of DNF(X), DNF(Y), DNF(Z)
        groups = []
        for child in node['or']:
            groups.extend(to_dnf(child))
        return groups

    # leaf node
    return [[node]]

def safe_execute(req, retries=3, backoff=0.2):
    """Retry wrapper for Supabase calls."""
    for i in range(retries):
        try:
            return req.execute()
        except Exception:
            if i == retries-1:
                raise
            time.sleep(backoff)

def meetings_overlap(m1, m2):
    """True if two meeting‐time dicts share a day *and* overlap in clock time."""
    if not set(m1['days_of_week']).intersection(m2['days_of_week']):
        return False
    return not (m1['end_time'] <= m2['start_time'] or m2['end_time'] <= m1['start_time'])

GRADE_ORDER = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"]
def meets_min_grade(obtained, required):
    """Return True if `obtained` ≥ `required` in our simple grade ordering."""
    try:
        return GRADE_ORDER.index(obtained) <= GRADE_ORDER.index(required)
    except ValueError:
        return False

def create_term_sequence_2(start_quarter: str, start_year: int, grad_quarter: str, grad_year: int):
    """
    Build a dictionary of term labels from start_quarter/start_year to grad_quarter/grad_year (inclusive).
    Keys are term labels like 'Fall 2023', values are empty lists.
    """
    scheduler = {}
    seasons = ["Fall", "Winter", "Spring"]
    
    qtr = seasons.index(start_quarter)
    grad_qtr = seasons.index(grad_quarter)
    yr = start_year

    while True:
        term_label = f"{seasons[qtr]} {yr}"
        scheduler[term_label] = []

        if qtr == grad_qtr and yr == grad_year:
            break  # Reached graduation term
        
        if qtr == 0:  # Rolled from Spring to Fall
            yr += 1

        qtr = (qtr + 1) % 3

    return scheduler


def season_offered(course_key, season, sections_by_course, term_id2season):
    """
    Return True if any section of `course_key` is offered in a term
    whose season name matches `season`.
    """
    for s in sections_by_course.get(course_key, []):
        if term_id2season[s['term_id']] == season:
            return True
    return False

# ───── MAIN SCHEDULER ─────
def build_schedule(start_year, start_q, grad_year, grad_q):
    # 1) Build the term labels…
    terms = create_term_sequence_2(start_q, start_year, grad_q, grad_year)
    num_terms = len(terms)

    # 2) Pull your Supabase `terms` table → we only have data for 3 of them
    supa = create_client(SUPABASE_URL, SUPABASE_KEY)
    term_rows = safe_execute(
        supa.table("terms").select("term_name,term_code,id")
    ).data

    # map "Winter 2025"→id, etc.
    term_map = {
        f"{r['term_name']}": r['id']
        for r in term_rows
    }

    # idx2db[i] = the DB term_id for terms[i], or None if missing
    idx2db = [term_map.get(lbl) for lbl in terms]

    # reverse map only for the detailed three
    db2idx = {db:i for i,db in enumerate(idx2db) if db is not None}
    # also build term_id → season_name for season_offered()
    term_id2season = {r['id']: r['term_name'] for r in term_rows}

    # 3) Fetch subject mappings
    subs = safe_execute(
        supa.table("subjects").select("id,code,name")
    ).data

    # A&O SCI : 1
    sub2id    = {s['code']:s['id'] for s in subs}
    # 1 : A&O SCI
    id2sub    = {s['id']:s['code'] for s in subs}
    # Atmospheric and Oceanic Sciences : A&O SCI
    name2sub  = {
        re.sub(r'\s*\(.*\)$','',s['name']).strip().upper(): s['code']
        for s in subs
    }

    # 4) BFS‐expand prerequisites so that `required` contains every requirement (choose most optimal path with least courses necessary)
    # — uses helper to turn arbitrary {'and':…}/{‘or’:…} JSON into DNF: a list of AND-clauses

    required = set(COURSES_TO_SCHEDULE)
    transcript = {}   # e.g. {"COM SCI|32":"B-", ...}

    def fetch_courses(keys):
        """Given ["DEPT|NUM", ...] return list of Supabase rows with course_requisites."""
        pairs = [k.split("|", 1) for k in keys]
        ids, nums = zip(*[(sub2id[d], n) for d,n in pairs])
        return safe_execute(
            supa.table("courses")
                .select("id,subject_id,catalog_number,course_requisites")
                .in_("subject_id", list(ids))
                .in_("catalog_number", list(nums))
        ).data

    prereq_logic = {}  # vkey -> chosen AND-clause: [(ukey, relation, min_grade), ...]
    queue = list(required)

    while queue:
        vkey = queue.pop(0)
        # fetch this course’s JSONB prereqs
        rows = fetch_courses([vkey])
        if not rows:
            # no record in DB: skip
            continue

        raw = rows[0].get("course_requisites") or {}

        # turn into OR-of-ANDs: a list of lists of leaf dicts
        clauses = to_dnf(raw)
        print("clauses", clauses)

        best_clause = None
        best_missing = None
        min_missing = float("inf")

        # scan every AND-clause and count how many of its leaves are unmet
        for clause in clauses:
            parsed = []
            missing = []
            for leaf in clause:
                # parse "Physics 1A)" → "PHYSICS|1A"
                if "course" not in leaf:
                    continue
                txt = leaf["course"].strip().rstrip(")")
                parts = txt.rsplit(" ", 1)
                if len(parts) != 2:
                    continue
                dept, num = parts
                code = name2sub.get(dept.upper())
                if not code:
                    continue
                ukey = f"{code}|{num.upper()}"
                parsed.append((ukey, leaf["relation"], leaf.get("min_grade", "D-"), leaf.get("severity")))

                # if student hasn’t met min_grade, it’s “missing”
                if not meets_min_grade(transcript.get(ukey, "F"), leaf.get("min_grade", "F")):
                    missing.append(ukey)

            # if none missing, this clause is already satisfied → pick it and break
            if not missing:
                best_clause = parsed
                best_missing = []
                min_missing = 0
                break

            # otherwise keep the clause with the fewest missing prereqs
            if len(missing) < min_missing:
                best_clause = parsed
                best_missing = missing
                min_missing = len(missing)

        # record the chosen AND-clause in your logic table
        prereq_logic[vkey] = best_clause or []

        # enqueue only the missing courses from that best clause
        for ukey in (best_missing or []):
            if ukey not in required:
                required.add(ukey)
                queue.append(ukey)

    # 5) Re‐fetch all required course records now that `required` has grown
    all_courses = fetch_courses(list(required))
    cid2key = {
            c['id']: f"{id2sub[c['subject_id']]}|{c['catalog_number']}"
            for c in all_courses
        }

    # 6) Pull *only* the sections for those courses that actually exist in your DB
    course_ids = [c['id'] for c in all_courses]
    secs = safe_execute(
        supa.table("sections")
            .select("id,course_id,term_id,section_code,is_primary,activity,"
                    "enrollment_cap,enrollment_total,waitlist_cap,waitlist_total")
            .in_("course_id", course_ids)
    ).data

    # 7) Pull meeting_times + instructors
    mt = safe_execute(
        supa.table("meeting_times")
            .select("section_id,days_of_week,start_time,end_time,building,room")
            .in_("section_id", [s['id'] for s in secs])
    ).data
    si = safe_execute(
        supa.table("section_instructors")
            .select("section_id,instructor_id")
            .in_("section_id", [s['id'] for s in secs])
    ).data

    # build maps for times & instr using section id as key
    mt_by_sec = {}
    for m in mt:
        m['start_time'] = datetime.strptime(m['start_time'],"%H:%M:%S").time()
        m['end_time']   = datetime.strptime(m['end_time']  ,"%H:%M:%S").time()
        mt_by_sec.setdefault(m['section_id'], []).append(m)

    instr_ids = list({r['instructor_id'] for r in si})
    instr_rows= safe_execute(
        supa.table("instructors")
            .select("id,name")
            .in_("id", instr_ids)
    ).data


    instr_map = {r['id']:r['name'] for r in instr_rows}

    si_by_sec = {} # section id -> instructor name
    for r in si:
        si_by_sec.setdefault(r['section_id'],[]).append(instr_map[r['instructor_id']])

    # 8) Group into sections_by_course[ "COM SCI|32" ] = [ {...section data...}, … ]
    sections_by_course = {}
    for s in secs:
        key = cid2key[s['course_id']]
        # drop *completely* full sections right away
        if (s['enrollment_total'] >= s['enrollment_cap']
         and s['waitlist_total']  >= s['waitlist_cap']):
            continue
        s['times']       = mt_by_sec.get(s['id'],[])
        s['instructors'] = si_by_sec.get(s['id'],[])
        sections_by_course.setdefault(key, []).append(s)
    print("sections by course", sections_by_course)
    print('\n')
    print("prereq logic", prereq_logic)

    # 9) Identify which term‐indices have real DB data
    detailed_idxs = [idx for idx, dbid in enumerate(idx2db) if dbid is not None]
    print("Detailed idxs", detailed_idxs)


    """
    given:
    - list of courses and their corresponding sections
    - prereq_logic: keys are courses and values are one potential clause (ex. pathway of reqs)
    - only want to get details for the first term if its idx2db[0] is not None (try to meet soft user preferences like teacher prefs, building prefs, timings prefs, etc.) while also keeping in mind prereq/correq relationship
    - all other courses: don't care about sections; just need to strictly meet prereq/correq relationshup

    algo ideas:
    - topological sort to find all possible correct order of courses based on prereq, correq logic
    _ create another list of lists containing top MAX_COURSES_PER_QUARTER
    - put each sublist through solver to find most optimal group of courses based on soft recs; store the index of the sublist
    - reference the larger list that sublist comes from and schedule the rest of the courses

    """

    # 10) get a list of list of all potential course paths
    def quarter_prefixes(
    prereq_logic: Dict[str, List[Tuple[str,str,str,str]]],
    max_per_quarter: int
    ) -> List[List[str]]:
        """
        Return every distinct set of up to `max_per_quarter` courses you could
        take in one quarter, given that only `('prerequisite','R')` edges force
        an earlier-quarter requirement.  Corequisites are allowed concurrently.
        """

        # 1) collect all course names
        nodes = set(prereq_logic.keys())
        for reqs in prereq_logic.values():
            for course_name, _, _, _ in reqs:
                nodes.add(course_name)

        # 2) compute indegree only for hard prerequisites
        indegree = {n: 0 for n in nodes}
        for course, reqs in prereq_logic.items():
            for req_course, req_type, _, severity in reqs:
                if req_type == 'prerequisite' and severity == 'R':
                    indegree[course] += 1

        # 3) first-quarter “available” courses are those with no
        #    unmet hard prerequisites
        available = sorted(n for n,deg in indegree.items() if deg == 0)

        # 4) every combination of them of size `max_per_quarter`
        #    is a valid quarter-load (order within the list doesn’t matter)
        return [ list(prefix) 
                for prefix in combinations(available, max_per_quarter) ]

    MAX_COURSES_PER_QUARTER = 3
    first_quarter_options = quarter_prefixes(prereq_logic, MAX_COURSES_PER_QUARTER)

    for i, opts in enumerate(first_quarter_options, 1):
        print(f"Option {i}: {opts}")
    
    # 11) Choose and score first-quarter prefix with section selection
    schedule = {term: [] for term in terms}
    first_term = next(iter(terms))  # e.g. 'Fall 2024'

    detailed_term_id = idx2db[0]
    if detailed_term_id is not None:
        def score_and_select(prefix: List[str]):
            total = 0
            selected = {}
            for course in prefix:
                best_sec = None
                best_score = -1
                # find primary sections for this term
                for sec in sections_by_course.get(course, []):
                    if sec['term_id'] != detailed_term_id or not sec['is_primary']:
                        continue
                    sc = 0
                    # evaluate meeting times
                    for m in sec['times']:
                        if PREF_EARLIEST <= m['start_time'] <= PREF_LATEST:
                            sc += 1
                        if PREF_EARLIEST <= m['end_time'] <= PREF_LATEST:
                            sc += 1
                        if m['building'] in PREF_BUILDINGS:
                            sc += 1
                        if set(m['days_of_week']).isdisjoint(PREF_NO_DAYS):
                            sc += 1
                    # instructor preference
                    if any(instr in PREF_INSTRUCTORS for instr in sec['instructors']):
                        sc += 1
                    if sc > best_score:
                        best_score = sc
                        best_sec = sec
                # find associated discussions
                disc = []
                if best_sec:
                    lec_code = best_sec['section_code'].split('-')[0]
                    for sec in sections_by_course.get(course, []):
                        if sec['term_id'] == detailed_term_id and not sec['is_primary']:
                            if sec['section_code'].startswith(lec_code):
                                disc.append(sec)
                selected[course] = {'lecture': best_sec, 'discussions': disc}
                total += max(0, best_score)
            return total, selected

        best_score = -1
        best_selection = {}
        for prefix in first_quarter_options:
            sc, sel = score_and_select(prefix)
            if sc > best_score:
                best_score = sc
                best_selection = sel
        # assign detailed sections for first term
        schedule[first_term] = best_selection
    else:
        # no detailed data, just list course keys
        schedule[first_term] = {c: {'lecture': None, 'discussions': []} for c in first_quarter_options[0]}

    # 12) Schedule remaining courses by strict prereq order (keys only)
    remaining = set(prereq_logic.keys()) - set(schedule[first_term].keys())
    # Build adjacency & indegree for remaining
    adj = {c: [] for c in remaining}
    indegree = {c: 0 for c in remaining}
    for course, reqs in prereq_logic.items():
        if course not in remaining:
            continue
        for req_course, req_type, _, severity in reqs:
            if req_type == 'prerequisite' and severity == 'R' and req_course in remaining:
                adj[req_course].append(course)
                indegree[course] += 1

    # Fill out each subsequent term with course keys only
    term_labels = list(terms.keys())
    for term_label in term_labels[1:]:
        avail = sorted([c for c in remaining if indegree[c] == 0])
        take = avail[:MAX_COURSES_PER_TERM]
        schedule[term_label] = take
        for c in take:
            for succ in adj.get(c, []):
                indegree[succ] -= 1
            remaining.remove(c)
    return schedule

    # 13) Format and display first-term sections cleanly
def format_schedule(schedule: Dict) -> Dict:
    formatted = {}
    for term, entries in schedule.items():
        if isinstance(entries, dict):
            # detailed first term
            ft = {}
            for course, info in entries.items():
                lec = info['lecture']
                # dedupe times
                seen = set()
                times = []
                for m in lec['times']:
                    key = (
                        tuple(m['days_of_week']), 
                        m['start_time'], m['end_time'], 
                        m['building'], m['room']
                    )
                    if key not in seen:
                        seen.add(key)
                        times.append({
                            'days': m['days_of_week'],
                            'start': m['start_time'].strftime('%H:%M'),
                            'end':   m['end_time'].strftime('%H:%M'),
                            'building': m['building'],
                            'room': m['room'],
                        })
                lec_info = {
                    'id': lec['id'],
                    'section': lec['section_code'],
                    'activity': lec.get('activity'),
                    'times': times,
                    'instructors': lec.get('instructors', []),
                }

                discs = []
                for d in info['discussions']:
                    seen_d = set()
                    dtimes = []
                    for m in d['times']:
                        key = (
                            tuple(m['days_of_week']),
                            m['start_time'], m['end_time'],
                            m['building'], m['room']
                        )
                        if key not in seen_d:
                            seen_d.add(key)
                            dtimes.append({
                                'days': m['days_of_week'],
                                'start': m['start_time'].strftime('%H:%M'),
                                'end':   m['end_time'].strftime('%H:%M'),
                                'building': m['building'],
                                'room': m['room'],
                            })
                    discs.append({
                        'id': d['id'],
                        'section': d['section_code'],
                        'activity': d.get('activity'),
                        'times': dtimes,
                        'instructors': d.get('instructors', []),
                    })

                ft[course] = {
                    'lecture': lec_info,
                    'discussions': discs
                }
            formatted[term] = ft
        else:
            formatted[term] = entries
    return formatted





    




# ───── HOW TO CALL ─────
if __name__ == "__main__":
    sched = build_schedule(
        start_year=2024, start_q="Fall",
        grad_year=2026, grad_q="Spring"
    )
    pprint.pprint(format_schedule(sched))


