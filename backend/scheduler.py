import json
import pandas as pd
import ast

scheduled = {
    "Fall 2024": [],
    "Winter 2025": [],
    "Spring 2025": [],
    "Summer 2025": []
}
completed = set() # if user has already taken courses, add that to set before running scheduling algo

# Load course list (excluding electives for now)
with open("backend/final_course_list.json") as f:
    courses = json.load(f)
available_courses = [c for c in courses['courses'] if "Elective" not in c]

# Load structured requisites
df = pd.read_csv("backend/data/course_details_final.csv", sep=";", quotechar='"', escapechar='\\', encoding='utf-8')

# Normalize helper to match course names better
def normalize_course_id(course_id):
    return course_id.strip().lower().replace("&", "and")

# Check if student can take a course
def can_take(completed, reqs):
    return (
        evaluate_condition(reqs.get("prerequisites"), completed) and
        evaluate_condition(reqs.get("corequisites"), completed)
    )

def evaluate_condition(cond, completed):
    if not cond:
        return True
    if isinstance(cond, str):
        norm_cond = normalize_course_id(cond)
        match = df[df['full_course_id'].apply(lambda x: normalize_course_id(str(x))) == norm_cond]
        if match.empty:
            if cond == "Mathematics 1" or "Math Diagnostic Test": # assume the user has satisifed the math diagnostic test (not actual classes)
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

MAX_COURSES = 4

# Build the schedule
for term in ["Fall 2024", "Winter 2025", "Spring 2025", "Summer 2025"]:
    term_courses = []
    for course in available_courses:
        if len(term_courses) >= MAX_COURSES:
            break
        if course in completed:
            continue

        match = df[df['course_id'] == course]['structured_requisites'].values
        if len(match) == 0 or pd.isna(match[0]):
            print(f"✅ Adding {course} (no requisites)")
            term_courses.append(course)
        else:
            try:
                reqs = ast.literal_eval(match[0]) if isinstance(match[0], str) else match[0]
            except Exception as e:
                print(f"⚠️ Failed to parse requisites for {course}: {e}")
                continue

            if can_take(completed, reqs):
                print(f"✅ Adding {course} (requisites satisfied)")
                term_courses.append(course)
            else:
                print(f"⏭️ Skipping {course} (requisites not satisfied)")

    scheduled[term] = term_courses
    completed.update(term_courses)

# Output the result
print("\n📅 Final Schedule:")
print(json.dumps(scheduled, indent=2))