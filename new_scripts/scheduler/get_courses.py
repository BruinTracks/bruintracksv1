import os
import re
import time
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from itertools import combinations
from dotenv import load_dotenv
from supabase import create_client

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

# Transcript: completed courses with optional grades
# e.g. {"COM SCI|31": "B+", "MATH|31A": None}
TRANSCRIPT: Dict[str, Optional[str]] = {"COM SCI|31": "B+", "MATH|31A": "A"}

# Scheduling parameters
MAX_COURSES_PER_TERM = 3
LEAST_COURSES_PER_TERM = 3
FILLER_COURSE = "FILLER"
ALLOW_WARNINGS = False  # If False, treat 'W' requisites like 'R'

# Preferences for first term scoring
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

# ───── HELPERS ─────
def to_dnf(node: Dict) -> List[List[Dict]]:
    if 'and' in node:
        prods = to_dnf(node['and'][0])
        for child in node['and'][1:]:
            prods = [a + b for a in prods for b in to_dnf(child)]
        return prods
    if 'or' in node:
        res: List[List[Dict]] = []
        for child in node['or']:
            res.extend(to_dnf(child))
        return res
    return [[node]]


def safe_execute(req, retries: int = 3, backoff: float = 0.2):
    for i in range(retries):
        try:
            return req.execute()
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(backoff)


def meets_min_grade(obtained: str, required: str) -> bool:
    try:
        return GRADE_ORDER.index(obtained) <= GRADE_ORDER.index(required)
    except ValueError:
        return False


def create_term_sequence(start_q: str, start_y: int, end_q: str, end_y: int) -> List[str]:
    seasons = ["Fall", "Winter", "Spring"]
    seq = []
    idx = seasons.index(start_q)
    year = start_y
    while True:
        seq.append(f"{seasons[idx]} {year}")
        if seasons[idx] == end_q and year == end_y:
            break
        if seasons[idx] == "Fall":
            year += 1
        idx = (idx + 1) % len(seasons)
    return seq


def quarter_prefixes(
    prereq_logic: Dict[str, List[Tuple[str, str, str, str]]],
    k: int,
    allow_warnings: bool
) -> List[List[str]]:
    # Build node set minus completed
    nodes = set(prereq_logic.keys())
    for reqs in prereq_logic.values():
        for c, *_ in reqs:
            nodes.add(c)
    completed = {c for c, g in TRANSCRIPT.items() if g is not None}
    nodes -= completed

    # Compute indegree on both prereqs and coreqs when enforced
    indegree = {n: 0 for n in nodes}
    for course, reqs in prereq_logic.items():
        if course not in indegree:
            continue
        for rc, typ, _, sev in reqs:
            if (
                rc in indegree and
                typ in ('prerequisite', 'corequisite') and
                (sev == 'R' or (sev == 'W' and not allow_warnings))
            ):
                indegree[course] += 1

    available = sorted(n for n, d in indegree.items() if d == 0)
    if len(available) < k:
        return [available]
    return [list(cmb) for cmb in combinations(available, k)]


def build_schedule(
    start_y: int,
    start_q: str,
    end_y: int,
    end_q: str,
    allow_warnings: bool
) -> Tuple[Dict[str, object], Optional[str]]:
    # Term labels
    terms = create_term_sequence(start_q, start_y, end_q, end_y)

    # Supabase client & term-id map
    supa = create_client(SUPABASE_URL, SUPABASE_KEY)
    term_rows = safe_execute(supa.table("terms").select("term_name,id")).data
    db_map = {r['term_name']: r['id'] for r in term_rows}
    idx2db = [db_map.get(t) for t in terms]

    # Subject maps
    subs = safe_execute(supa.table("subjects").select("id,code,name")).data
    sub2id = {s['code']: s['id'] for s in subs}
    id2sub = {s['id']: s['code'] for s in subs}
    name2sub = {re.sub(r"\s*\(.*\)$", "", s['name']).strip().upper(): s['code'] for s in subs}

    # Expand prereqs (BFS + DNF)
    completed = {c for c, g in TRANSCRIPT.items() if g is not None}
    required = set(COURSES_TO_SCHEDULE) - completed
    transcript = TRANSCRIPT.copy()

    def fetch_courses(keys: List[str]):
        pairs = [k.split("|", 1) for k in keys]
        ids, nums = zip(*[(sub2id[d], n) for d, n in pairs])
        return safe_execute(
            supa.table("courses")
                .select("id,subject_id,catalog_number,course_requisites")
                .in_("subject_id", list(ids))
                .in_("catalog_number", list(nums))
        ).data

    prereq_logic: Dict[str, List[Tuple[str, str, str, str]]] = {}
    queue = list(required)
    while queue:
        course = queue.pop(0)
        rows = fetch_courses([course])
        raw = rows[0].get("course_requisites") if rows else {}
        clauses = to_dnf(raw or {})
        best_clause: List[Tuple[str,str,str,str]] = []
        best_missing: List[str] = []
        min_missing = float('inf')
        for clause in clauses:
            parsed: List[Tuple[str,str,str,str]] = []
            missing: List[str] = []
            for leaf in clause:
                if 'course' not in leaf:
                    continue
                txt = leaf['course'].strip().rstrip(')')
                parts = txt.rsplit(' ', 1)
                if len(parts) != 2:
                    continue
                dept, num = parts
                code = name2sub.get(dept.upper())
                if not code:
                    continue
                ukey = f"{code}|{num.upper()}"
                parsed.append((ukey, leaf['relation'], leaf.get('min_grade', 'D-'), leaf.get('severity')))
                if not meets_min_grade(transcript.get(ukey, 'F'), leaf.get('min_grade', 'F')):
                    missing.append(ukey)
            if not missing:
                best_clause, best_missing = parsed, []
                break
            if len(missing) < min_missing:
                best_clause, best_missing, min_missing = parsed, missing, len(missing)
        prereq_logic[course] = best_clause
        for u in best_missing:
            if u not in required:
                required.add(u)
                queue.append(u)

    # Fetch sections, times, instructors
    all_courses = fetch_courses(list(required))
    cid2key = {c['id']: f"{id2sub[c['subject_id']]}|{c['catalog_number']}" for c in all_courses}
    secs = safe_execute(
        supa.table("sections").select(
            "id,course_id,term_id,section_code,is_primary,activity,"
            "enrollment_cap,enrollment_total,waitlist_cap,waitlist_total"
        ).in_("course_id", [c['id'] for c in all_courses])
    ).data
    mt = safe_execute(
        supa.table("meeting_times").select("section_id,days_of_week,start_time,end_time,building,room")
            .in_("section_id", [s['id'] for s in secs])
    ).data
    si = safe_execute(
        supa.table("section_instructors").select("section_id,instructor_id")
            .in_("section_id", [s['id'] for s in secs])
    ).data

    # Build maps
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

    # Group sections by course
    sections_by_course: Dict[str,List[Dict]] = {}
    for s in secs:
        key = cid2key[s['course_id']]
        if s['enrollment_total'] >= s['enrollment_cap'] and s['waitlist_total'] >= s['waitlist_cap']:
            continue
        s['times'] = mt_by_sec.get(s['id'], [])
        s['instructors'] = si_by_sec.get(s['id'], [])
        sections_by_course.setdefault(key, []).append(s)

    # First term selection
    first_term = terms[0]
    detailed_id = idx2db[0]
    prefixes = quarter_prefixes(prereq_logic, MAX_COURSES_PER_TERM, allow_warnings)
    if detailed_id:
        valid = [p for p in prefixes if all(any(sec['term_id']==detailed_id and sec['is_primary'] for sec in sections_by_course.get(c,[])) for c in p)]
        if valid:
            prefixes = valid
    if not prefixes:
        avail = [c for c, sects in sections_by_course.items() if detailed_id and any(sec['term_id']==detailed_id and sec['is_primary'] for sec in sects)]
        prefixes = [sorted(avail)[:MAX_COURSES_PER_TERM]]

    # Score and select best prefix
    def score_and_select(prefix: List[str]) -> Tuple[int, Dict[str, Dict]]:
        total = 0
        sel: Dict[str,Dict] = {}
        for course in prefix:
            # Lecture selection
            best_sec, best_sc = None, -1
            for sec in sections_by_course.get(course, []):
                if sec['term_id'] != detailed_id or not sec['is_primary']:
                    continue
                sc = sum((PREF_EARLIEST <= m['start_time'] <= PREF_LATEST) +
                         (PREF_EARLIEST <= m['end_time'] <= PREF_LATEST) +
                         (m['building'] in PREF_BUILDINGS) +
                         (set(m['days_of_week']).isdisjoint(PREF_NO_DAYS)) for m in sec['times'])
                if any(i in PREF_INSTRUCTORS for i in sec['instructors']):
                    sc += 1
                if sc > best_sc:
                    best_sc, best_sec = sc, sec
            # Discussion selection
            best_disc, best_dsc = None, -1
            if best_sec:
                prefix_code = best_sec['section_code'].split('-')[0]
                for dsec in sections_by_course.get(course, []):
                    if dsec['term_id'] != detailed_id or dsec['is_primary']:
                        continue
                    if not dsec['section_code'].startswith(prefix_code):
                        continue
                    dsc = sum((PREF_EARLIEST <= m['start_time'] <= PREF_LATEST) +
                              (PREF_EARLIEST <= m['end_time'] <= PREF_LATEST) +
                              (m['building'] in PREF_BUILDINGS) +
                              (set(m['days_of_week']).isdisjoint(PREF_NO_DAYS)) for m in dsec['times'])
                    if any(i in PREF_INSTRUCTORS for i in dsec['instructors']):
                        dsc += 1
                    if dsc > best_dsc:
                        best_dsc, best_disc = dsc, dsec
            sel[course] = {'lecture': best_sec, 'discussion': best_disc}
            total += max(0, best_sc) + max(0, best_dsc)
        return total, sel

    best_score, best_sel = -1, {}
    for p in prefixes:
        sc, sel = score_and_select(p)
        if sc > best_score:
            best_score, best_sel = sc, sel
    schedule: Dict[str,object] = {first_term: best_sel}

    # Subsequent terms
    remaining = set(required) - set(best_sel.keys())
    adj = {c: [] for c in remaining}
    indegree = {c: 0 for c in remaining}
    for c in remaining:
        for rc, typ, _, sev in prereq_logic.get(c, []):
            if rc in remaining and typ in ('prerequisite','corequisite') and (sev=='R' or (sev=='W' and not allow_warnings)):
                adj[rc].append(c)
                indegree[c] += 1
    import math
    for term in terms[1:]:
        avail = sorted([c for c in remaining if indegree[c] == 0])
        rem_terms = len(terms) - terms.index(term) - 1
        ideal = math.ceil(len(avail) / (rem_terms + 1)) if rem_terms >= 0 else len(avail)
        count = max(LEAST_COURSES_PER_TERM, min(ideal, MAX_COURSES_PER_TERM))
        take = avail[:count]
        schedule[term] = take
        for c in take:
            for succ in adj[c]:
                indegree[succ] -= 1
            remaining.remove(c)
        while len(schedule[term]) < LEAST_COURSES_PER_TERM:
            schedule[term].append(FILLER_COURSE)

    # Check for unscheduled
    scheduled_courses = set(best_sel.keys())
    for term in terms[1:]:
        scheduled_courses |= set(schedule.get(term, []))
    unscheduled = set(COURSES_TO_SCHEDULE) - scheduled_courses
    note = None
    if unscheduled:
        note = "Unable to schedule: " + ", ".join(sorted(unscheduled))

    return schedule, note


def format_schedule(schedule: Dict[str,object]) -> Dict[str,object]:
    out: Dict[str,object] = {}
    for term, entries in schedule.items():
        if isinstance(entries, dict):
            fm = {}
            for course, info in entries.items():
                def fmt(sec):
                    if not sec: return None
                    times = []
                    seen = set()
                    for m in sec['times']:
                        key = (tuple(m['days_of_week']), m['start_time'], m['end_time'], m['building'], m['room'])
                        if key in seen: continue
                        seen.add(key)
                        times.append({
                            'days': m['days_of_week'],
                            'start': m['start_time'].strftime('%H:%M'),
                            'end': m['end_time'].strftime('%H:%M'),
                            'building': m['building'],
                            'room': m['room']
                        })
                    return {
                        'id': sec['id'],
                        'section': sec['section_code'],
                        'activity': sec.get('activity'),
                        'times': times,
                        'instructors': sec.get('instructors', [])
                    }
                fm[course] = {'primary': fmt(info['lecture']), 'secondary': fmt(info['discussion'])}
            out[term] = fm
        else:
            out[term] = entries
    return out

if __name__ == "__main__":
    sched, note = build_schedule(2024, 'Fall', 2026, 'Spring', allow_warnings=ALLOW_WARNINGS)
    formatted = format_schedule(sched)
    result = {'schedule': formatted}
    if note:
        result['note'] = note
    print(json.dumps(result, default=str, indent=2))
