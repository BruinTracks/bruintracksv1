import os
import re
import time
from datetime import datetime
from typing import Dict, List, Tuple
import pprint
from dotenv import load_dotenv
from supabase import create_client
from itertools import combinations

# ───── CONFIGURATION ─────
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

# Core courses the student must complete
COURSES_TO_SCHEDULE = [
    "COM SCI|1", "COM SCI|31", "COM SCI|32", "COM SCI|33",
    "COM SCI|35L", "MATH|31A", "MATH|31B", "MATH|32A",
    "MATH|32B", "MATH|33A", "MATH|33B", "MATH|61",
    "PHYSICS|1A", "PHYSICS|1B", "PHYSICS|1C", "COM SCI|M51A",
    "PHYSICS|4AL", "COM SCI|111", "COM SCI|118", "COM SCI|131",
    "COM SCI|180", "COM SCI|181", "COM SCI|M151B", "COM SCI|M152A",
    "C&EE|110", "COM SCI|130"
]

# Scheduling parameters
MAX_COURSES_PER_TERM = 5
LEAST_COURSES_PER_TERM = 3
FILLER_COURSE = "FILLER"

# Preferences apply only to the first (detailed) term
PREF_EARLIEST = datetime.strptime("09:00", "%H:%M").time()
PREF_LATEST = datetime.strptime("12:00", "%H:%M").time()
PREF_NO_DAYS = {"F"}
PREF_BUILDINGS = {"MS", "SCI"}
PREF_INSTRUCTORS = set()

# Grade ordering
GRADE_ORDER = [
    "A+","A","A-","B+","B","B-",
    "C+","C","C-","D+","D","D-","F"
]


def to_dnf(node: Dict) -> List[List[Dict]]:
    """
    Convert a JSON prereq tree into DNF: list of AND-clauses.
    """
    if 'and' in node:
        prods = to_dnf(node['and'][0])
        for child in node['and'][1:]:
            prods = [a + b for a in prods for b in to_dnf(child)]
        return prods
    if 'or' in node:
        groups: List[List[Dict]] = []
        for child in node['or']:
            groups.extend(to_dnf(child))
        return groups
    return [[node]]


def safe_execute(request, retries: int = 3, backoff: float = 0.2):
    """Retry wrapper for Supabase requests."""
    for attempt in range(retries):
        try:
            return request.execute()
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(backoff)


def meets_min_grade(obtained: str, required: str) -> bool:
    """Return True if obtained grade ≥ required grade."""
    try:
        return GRADE_ORDER.index(obtained) <= GRADE_ORDER.index(required)
    except ValueError:
        return False


def create_term_sequence(start_q: str, start_y: int, end_q: str, end_y: int) -> List[str]:
    """Generate term labels from start to end, inclusive."""
    seasons = ["Fall", "Winter", "Spring"]
    seq: List[str] = []
    idx = seasons.index(start_q)
    year = start_y
    end_idx = seasons.index(end_q)
    while True:
        seq.append(f"{seasons[idx]} {year}")
        if idx == end_idx and year == end_y:
            break
        idx = (idx + 1) % 3
        if idx == 0:
            year += 1
    return seq


def quarter_prefixes(prereq_logic: Dict[str, List[Tuple[str,str,str,str]]], k: int) -> List[List[str]]:
    """Return all size-k sets of courses with no hard prereqs."""
    nodes = set(prereq_logic.keys())
    for reqs in prereq_logic.values():
        for c, _, _, _ in reqs:
            nodes.add(c)
    indegree = {n: 0 for n in nodes}
    for course, reqs in prereq_logic.items():
        for req_c, typ, _, sev in reqs:
            if typ == 'prerequisite' and sev == 'R':
                indegree[course] += 1
    available = sorted([n for n, d in indegree.items() if d == 0])
    return [list(cmb) for cmb in combinations(available, k)]


def build_schedule(start_y: int, start_q: str, end_y: int, end_q: str) -> Dict:
    # 1) Build term labels and containers
    term_labels = create_term_sequence(start_q, start_y, end_q, end_y)
    terms = {lbl: [] for lbl in term_labels}

    # 2) Supabase client and term-ID mapping
    supa = create_client(SUPABASE_URL, SUPABASE_KEY)
    term_rows = safe_execute(supa.table("terms").select("term_name,id")).data
    db_map = {r['term_name']: r['id'] for r in term_rows}
    idx2db = [db_map.get(lbl) for lbl in term_labels]

    # 3) Subject lookups
    subs = safe_execute(supa.table("subjects").select("id,code,name")).data
    sub2id = {s['code']: s['id'] for s in subs}
    id2sub = {s['id']: s['code'] for s in subs}
    name2sub = {re.sub(r"\s*\(.*\)$", "", s['name']).strip().upper(): s['code'] for s in subs}

    # 4) Expand prereqs to get prereq_logic
    required = set(COURSES_TO_SCHEDULE)
    transcript: Dict[str,str] = {}
    def fetch_courses(keys: List[str]):
        pairs = [k.split("|",1) for k in keys]
        ids, nums = zip(*[(sub2id[d], n) for d, n in pairs])
        return safe_execute(
            supa.table("courses")
                .select("id,subject_id,catalog_number,course_requisites")
                .in_("subject_id", list(ids))
                .in_("catalog_number", list(nums))
        ).data

    prereq_logic: Dict[str, List[Tuple[str,str,str,str]]] = {}
    queue = list(required)
    while queue:
        vkey = queue.pop(0)
        rows = fetch_courses([vkey])
        if not rows:
            continue
        raw = rows[0].get('course_requisites') or {}
        clauses = to_dnf(raw)
        best_clause = []
        best_missing: List[str] = []
        min_missing = float('inf')
        for clause in clauses:
            parsed: List[Tuple[str,str,str,str]] = []
            missing: List[str] = []
            for leaf in clause:
                if 'course' not in leaf:
                    continue
                txt = leaf['course'].strip().rstrip(')')
                parts = txt.rsplit(' ',1)
                if len(parts) != 2:
                    continue
                dept, num = parts
                code = name2sub.get(dept.upper())
                if not code:
                    continue
                ukey = f"{code}|{num.upper()}"
                parsed.append((ukey, leaf['relation'], leaf.get('min_grade','D-'), leaf.get('severity')))
                if not meets_min_grade(transcript.get(ukey,'F'), leaf.get('min_grade','F')):
                    missing.append(ukey)
            if not missing:
                best_clause, best_missing = parsed, []
                break
            if len(missing) < min_missing:
                best_clause, best_missing, min_missing = parsed, missing, len(missing)
        prereq_logic[vkey] = best_clause
        for u in best_missing:
            if u not in required:
                required.add(u)
                queue.append(u)

    # 5) Fetch all course & section data
    all_courses = fetch_courses(list(required))
    cid2key = {c['id']: f"{id2sub[c['subject_id']]}|{c['catalog_number']}" for c in all_courses}
    secs = safe_execute(
        supa.table("sections")
            .select(
                "id,course_id,term_id,section_code,is_primary,activity,"
                "enrollment_cap,enrollment_total,waitlist_cap,waitlist_total"
            )
            .in_("course_id", [c['id'] for c in all_courses])
    ).data
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

    # Build maps for times & instructors
    mt_by_sec: Dict[int,List[Dict]] = {}
    for m in mt:
        m['start_time'] = datetime.strptime(m['start_time'], "%H:%M:%S").time()
        m['end_time']   = datetime.strptime(m['end_time'],   "%H:%M:%S").time()
        mt_by_sec.setdefault(m['section_id'], []).append(m)
    instr_ids = {r['instructor_id'] for r in si}
    instr_rows = safe_execute(
        supa.table("instructors").select("id,name").in_("id", list(instr_ids))
    ).data
    instr_map = {r['id']: r['name'] for r in instr_rows}
    si_by_sec: Dict[int,List[str]] = {}
    for r in si:
        si_by_sec.setdefault(r['section_id'], []).append(instr_map[r['instructor_id']])

    # 6) Group sections by course key
    sections_by_course: Dict[str,List[Dict]] = {}
    for s in secs:
        key = cid2key[s['course_id']]
        if s['enrollment_total'] >= s['enrollment_cap'] and s['waitlist_total'] >= s['waitlist_cap']:
            continue
        s['times'] = mt_by_sec.get(s['id'], [])
        s['instructors'] = si_by_sec.get(s['id'], [])
        sections_by_course.setdefault(key,[]).append(s)

    # 7) First-term prefix selection
    first_term = term_labels[0]
    prefixes = quarter_prefixes(prereq_logic, MAX_COURSES_PER_TERM)
    detailed_id = idx2db[0]
    schedule: Dict = {}
    if detailed_id:
        def score_and_select(prefix: List[str]) -> Tuple[int, Dict[str,Dict]]:
            total = 0
            sel: Dict[str,Dict] = {}
            for course in prefix:
                # Lecture
                best_sec = None
                best_sc = -1
                for sec in sections_by_course.get(course, []):
                    if sec['term_id'] != detailed_id or not sec['is_primary']:
                        continue
                    sc = sum([
                        (PREF_EARLIEST <= m['start_time'] <= PREF_LATEST) +
                        (PREF_EARLIEST <= m['end_time'] <= PREF_LATEST) +
                        (m['building'] in PREF_BUILDINGS) +
                        (set(m['days_of_week']).isdisjoint(PREF_NO_DAYS))
                        for m in sec['times']
                    ]) + any(i in PREF_INSTRUCTORS for i in sec['instructors'])
                    if sc > best_sc:
                        best_sc, best_sec = sc, sec
                # Discussion
                best_disc = None
                best_dsc = -1
                if best_sec:
                    code_pref = best_sec['section_code'].split('-')[0]
                    for dsec in sections_by_course.get(course, []):
                        if dsec['term_id'] != detailed_id or dsec['is_primary']:
                            continue
                        if not dsec['section_code'].startswith(code_pref):
                            continue
                        dsc = sum([
                            (PREF_EARLIEST <= m['start_time'] <= PREF_LATEST) +
                            (PREF_EARLIEST <= m['end_time'] <= PREF_LATEST) +
                            (m['building'] in PREF_BUILDINGS) +
                            (set(m['days_of_week']).isdisjoint(PREF_NO_DAYS))
                            for m in dsec['times']
                        ]) + any(i in PREF_INSTRUCTORS for i in dsec['instructors'])
                        if dsc > best_dsc:
                            best_dsc, best_disc = dsc, dsec
                sel[course] = {'lecture': best_sec, 'discussion': best_disc}
                total += max(0, best_sc) + max(0, best_dsc)
            return total, sel

        best_score = -1
        best_sel: Dict[str,Dict] = {}
        for pf in prefixes:
            sc, sel = score_and_select(pf)
            if sc > best_score:
                best_score, best_sel = sc, sel
        schedule[first_term] = best_sel
    else:
        schedule[first_term] = {c: {'lecture': None, 'discussion': None} for c in prefixes[0]}

    # 8) Fill remaining terms by hard prerequisites
    # Calculate dependency graph on remaining courses
    all_courses_set = set(required)
    scheduled_first = set(schedule[first_term].keys())
    remaining = all_courses_set - scheduled_first
    adj = {c: [] for c in remaining}
    indegree = {c: 0 for c in remaining}
    for course in remaining:
        for rc, typ, _, sev in prereq_logic.get(course, []):
            if typ == 'prerequisite' and sev == 'R' and rc in remaining:
                adj[rc].append(course)
                indegree[course] += 1

    # Assign courses term-by-term, balancing to minimize fillers
    import math
    num_subsequent = len(term_labels) - 1
    for idx, term in enumerate(term_labels[1:], start=1):
        # remaining terms after this one
        rem_terms = len(term_labels) - idx - 1
        # available this term
        avail = sorted([c for c in remaining if indegree.get(c, 0) == 0])
        # ideal count is average of remaining divided by slots
        ideal = math.ceil(len(avail) / (rem_terms + 1)) if rem_terms >= 0 else len(avail)
        assign_count = max(LEAST_COURSES_PER_TERM, min(ideal, MAX_COURSES_PER_TERM))
        # pick that many
        take = avail[:assign_count]
        schedule[term] = take
        # update graph
        for c in take:
            for succ in adj.get(c, []):
                indegree[succ] -= 1
            remaining.discard(c)

# 9) Pad underfilled terms
    for term in term_labels:
        vals = schedule.get(term, [])
        if isinstance(vals, list):
            while len(vals) < LEAST_COURSES_PER_TERM:
                vals.append(FILLER_COURSE)

    return schedule
    for term in term_labels:
        vals = schedule.get(term, [])
        if isinstance(vals, list):
            while len(vals) < LEAST_COURSES_PER_TERM:
                vals.append(FILLER_COURSE)

    return schedule


def format_schedule(schedule: Dict) -> Dict:
    out: Dict = {}
    for term, entries in schedule.items():
        if isinstance(entries, dict):
            fm: Dict = {}
            for course, info in entries.items():
                lec = info.get('lecture')
                disc = info.get('discussion')
                def fmt(sec):
                    if not sec:
                        return None
                    seen = set()
                    times = []
                    for m in sec['times']:
                        key = (tuple(m['days_of_week']), m['start_time'], m['end_time'], m['building'], m['room'])
                        if key in seen:
                            continue
                        seen.add(key)
                        times.append({
                            'days': m['days_of_week'],
                            'start': m['start_time'].strftime('%H:%M'),
                            'end': m['end_time'].strftime('%H:%M'),
                            'building': m['building'],
                            'room': m['room'],
                        })
                    return {'id': sec['id'], 'section': sec['section_code'], 'activity': sec.get('activity'), 'times': times, 'instructors': sec.get('instructors', [])}
                fm[course] = {'primary': fmt(lec), 'secondary': fmt(disc)}
            out[term] = fm
        else:
            out[term] = entries
    return out

if __name__ == "__main__":
    sched = build_schedule(2024, 'Fall', 2026, 'Spring')
    pprint.pprint(format_schedule(sched))
