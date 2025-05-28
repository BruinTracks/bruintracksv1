import json
import pandas as pd
import ast
import sys
from datetime import datetime, date

# Scheduler setup
# scheduled = {
#     "Fall 2024": [],
#     "Winter 2025": [],
#     "Spring 2025": [],
#     "Summer 2025": [],
#     "Fall 2025": [],
#     "Winter 2026": [],
#     "Spring 2026": [],
#     "Summer 2026": [],
#     "Fall 2026": [],
#     "Winter 2027": [],
#     "Spring 2027": [],
# }

# for now using pandas, will transfer to calling supabase

# Load course list
with open("scripts/final_course_list.json") as f:
    courses = json.load(f)
available_courses = courses['courses']

# Load course details
df = pd.read_csv("backend/data/winter_courses_old.csv", sep=";", quotechar='"', escapechar='\\', encoding='utf-8')

# Helpers
def createScheduled(grad_year, grad_quarter):
    """
    creates a dictlist with terms as keys until graduation
    """
    today = date.today()
    cur_year = today.year
    cur_month = today.month
    cur_day = today.day
    
    cur_season = ""

    match cur_month:
        # as per the ucla 24 - 25 calendar 
        case 1 | 2 | 3:
            if cur_month == 1 and cur_day == 1:
                cur_season = "Fall"
            if cur_month == 3 and cur_day <= 21:
                cur_season = "Winter"
            else:
                cur_season = "Spring"
        case 4 | 5 | 6:
            # Handle other months here if needed
            if cur_month == 6 and cur_day <= 13:
                cur_season = "Spring"
            else:
                cur_season = "Summer"
        case 7 | 8 | 9:
            if cur_month == 9 and cur_day <= 12:
                cur_season = "Summer"
            else:
                cur_season = "Fall"
        case 10 | 11 | 12:
            cur_season = "Fall"
        case _:
            raise ValueError("Not a valid month")
    scheduled = {}
    seasons = ["Fall", "Winter", "Summer", "Spring"]
    cur_index = seasons.index(cur_season)
    print("Current season", seasons[cur_index])
    print("current year", cur_year)
    while seasons[cur_index] != grad_quarter or cur_year != grad_year:
        print("in the while loop")
        scheduled[f"{seasons[cur_index]} {cur_year}"] = []
        cur_index = (cur_index + 1) % 4
        if cur_index == 0:
            cur_year += 1
    scheduled[f"{grad_quarter} {grad_year}"] = []
    print(scheduled)
    return scheduled


def int_to_time_str(t):
    if t is None:
        return None
    hour = t // 100
    minute = t % 100
    return datetime.strptime(f"{hour}:{minute:02d}", "%H:%M").strftime("%I:%M %p").lstrip("0")
def normalize_course_id(course_id):
    return course_id.strip().lower().replace("&", "and")

def can_take(completed, reqs, currently_scheduled):
    return (
        evaluate_condition(reqs.get("prerequisites"), completed) and evaluate_coreq(reqs.get("corequisites"), completed, currently_scheduled)
    )

def evaluate_coreq(cond, completed, term_scheduled):
    if not cond:
        return True
    if isinstance(cond, str):
        norm_cond = normalize_course_id(cond)
        match = df[df['full_course_id'].apply(lambda x: normalize_course_id(str(x))) == norm_cond]
        if match.empty:
            if cond in ["Mathematics 1", "Math Diagnostic Test"]:
                return True
            print(f"⚠️ Could not find course in catalog: {cond}")
            return False
        short_course_id = match.iloc[0]['course_id']
        return short_course_id in completed
    if cond.get("type") == "AND":
        return all(evaluate_coreq(c, completed) or c in term_scheduled for c in cond["conditions"])
    if cond.get("type") == "OR":
        return any(evaluate_coreq(c, completed) or c in term_scheduled for c in cond["conditions"])
    return False


def evaluate_condition(cond, completed):
    if not cond:
        return True
    if isinstance(cond, str):
        norm_cond = normalize_course_id(cond)
        match = df[df['full_course_id'].apply(lambda x: normalize_course_id(str(x))) == norm_cond]
        if match.empty:
            if cond in ["Mathematics 1", "Math Diagnostic Test"]:
                return True
            print(f"⚠️ Could not find course in catalog: {cond}")
            return False
        short_course_id = match.iloc[0]['course_id']
        return short_course_id in completed
    if cond.get("type") == "AND":
        return all(evaluate_condition(c, completed) for c in cond["conditions"])
    if cond.get("type") == "OR":
        return any(evaluate_condition(c, completed) for c in cond["conditions"])
    return False

def time_str_to_int(tstr):
    try:
        t = datetime.strptime(tstr.strip(), "%I:%M %p")
        return t.hour * 100 + t.minute
    except Exception:
        return None

def course_fits_time(course_id, preferred_start, preferred_end):
    """
    returns the start and end time of the first course that fits the preferred_start and preferred_end times.
    returns none if course can't be found or if none of the times match the preferred timings
    """
    matches = df[df['course_id'] == course_id]
    if matches.empty:
        return None
    for _, row in matches.iterrows():
        start = time_str_to_int(str(row.get('meet_strt_tm')))
        end = time_str_to_int(str(row.get('meet_stop_tm')))
        if start is not None and end is not None:
            if preferred_start <= start <= preferred_end and preferred_start <= end <= preferred_end:
                return (start, end)
    return None

def time_distance_from_preference(course_id, preferred_start, preferred_end):
    """
    finds the best possible course out of avaialble timings for that course using preferred_start and preferred_end 
    """
    matches = df[df['course_id'] == course_id]
    min_distance = float("inf")
    min_start = None
    min_end = None
    for _, row in matches.iterrows():
        start = time_str_to_int(str(row.get("meet_strt_tm", "")))
        end = time_str_to_int(str(row.get("meet_stop_tm", "")))
        if start is None or end is None:
            continue
        dist = 0
        if start < preferred_start:
            dist = preferred_start - start
        if end > preferred_end:
            dist += end - preferred_end
        if dist < min_distance:
            min_distance = dist
            min_start = start
            min_end = end
    return (min_distance, min_start, min_end)

def courseConflictChecker(term_courses, courseToAdd):
    """
    check for time conflicts between courses
    strat:
        - if term_couses is empty, then return False
        - else:
            for course, start_time, end_time in term_courses:
                
                
    
    """

def fillInCourses(scheduled):
    """ Extra courses the user can take if all required/elective courses are taken to graduate"""
    for term in scheduled:
        if len(scheduled[term]) < 3:
            # if the user includes areas of interest, we can also suggest extra courses!!
            scheduled[term].append(("Extra course (user's choice)", None, None))
            
# Schedule loop
def scheduler(preferred_start, preferred_end, completed, grad_year, grad_quarter, MAX_COURSES = 4):
    scheduled = createScheduled(grad_year, grad_quarter)
    completed = set(completed)
    for term in scheduled.keys():
        term_courses = []
        fallback_candidates = []

        for course in available_courses:
            if len(term_courses) >= MAX_COURSES:
                break
            if course in completed or course in [c[0] for c in term_courses]:
                continue

            if "Elective" in course:
                print(f"✅ Adding {course} (elective)")
                term_courses.append((course, None, None))
                continue

            match = df[df['course_id'] == course]['structured_requisites'].values
            if len(match) == 0 or pd.isna(match[0]):
                time_range = course_fits_time(course, preferred_start, preferred_end)
                if time_range:
                    print(f"✅ Adding {course} (no requisites, fits time)")
                    term_courses.append((course, time_range[0], time_range[1]))
                else:
                    fallback_candidates.append(course)
                continue

            try:
                reqs = ast.literal_eval(match[0]) if isinstance(match[0], str) else match[0]
            except Exception as e:
                print(f"⚠️ Failed to parse requisites for {course}: {e}")
                continue

            if can_take(completed, reqs, term_courses):
                time_range = course_fits_time(course, preferred_start, preferred_end)
                if time_range:
                    print(f"✅ Adding {course} (requisites & time OK)")
                    term_courses.append((course, time_range[0], time_range[1]))
                else:
                    fallback_candidates.append(course)
            else:
                print(f"⏭️ Skipping {course} (requisites not satisfied)")

        # Fallback time-based scheduling
        if len(term_courses) < MAX_COURSES:
            fallback_sorted = sorted(
                fallback_candidates,
                key=lambda c: time_distance_from_preference(c, preferred_start, preferred_end)[0]
            )
            for course in fallback_sorted:
                if course not in completed and course not in [c[0] for c in term_courses]: # and course doesn't conflict with other courses in term
                    _, start_time, end_time = time_distance_from_preference(course, preferred_start, preferred_end)
                    print(f"➕ Adding fallback course {course} (closest to preferred time)")
                    term_courses.append((course, start_time, end_time))
                if len(term_courses) >= MAX_COURSES:
                    break

        scheduled[term] = term_courses
        completed.update([c[0] for c in term_courses])
    fillInCourses(scheduled)
    # Clean output
    json_ready_schedule = {
        term: [
            {"course": c, "start_time": int_to_time_str(s), "end_time": int_to_time_str(e)}
            for c, s, e in scheduled[term]
        ]
        for term in scheduled
    }

    print("\n📅 Final Schedule:")
    print(json.dumps(json_ready_schedule, indent=2))



def main():
    scheduler(1200, 1500, ["COM SCI 31"], 2029, "Spring")
main()