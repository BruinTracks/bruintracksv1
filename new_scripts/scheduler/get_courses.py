import json
import re
import os
from supabase import create_client, Client
from collections import defaultdict
from dotenv import load_dotenv
load_dotenv()

# get courses to schedule
courses_to_schedule = []

def get_courses_to_schedule():
    count = 0
    with open('scheduler/final_course_list.json', "r") as f:
        content = f.read()
        content = json.loads(content)
        for course in content["courses"]:
            count += 1
            match = re.search(r"(.*)\s([A-Z]?\d+[A-Z]?)", course)
            if match:
                courses_to_schedule.append(f"{match.group(1)}|{match.group(2)}")
    return courses_to_schedule

# Student preferences:
MAX_COURSES_PER_TERM = 3
PREFERRED_TIME_RANGES = {  # term_code -> list of (start, end) time windows (24h strings)
    '25W': [('10:00', '17:00')],  # example: avoid before 10 and after 5
}
NO_CLASS_DAYS = ['F']  # e.g. Fridays
TEACHER_PREFERENCE = { 'Smith, J.': 1.0, 'Doe, A.': 0.5 }
LOCATION_PREFERENCE = { 'Westwood': 1.0, 'Online': 0.8 }
REQUIRED_COURSES = get_courses_to_schedule()  


# ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
url   = os.getenv("SUPABASE_URL")
key   = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)


def load_required_data(required_keys):
    courses = supabase.table("subjects").select("id,code,name").range(0, 9999).execute().data

    # # Map course keys (short_name|number) to course_id
    # courses = supabase.table("courses").select("id,subject_id,catalog_number").range(0, 9999).execute().data
    # print(len(courses))

    # #create a subject_map to map the course's subject_id to subject's code
    # subject_data = supabase.table("subjects").select("id,code").execute().data
    # subject_map = {s["id"]: s["code"] for s in subject_data}
    # course_ids = { f"{subject_map.get(c['subject_id'])}|{c['catalog_number']}": c['id'] for c in courses }
    # print(len(course_ids))
    # req_ids = [course_ids[k] for k in required_keys if k in course_ids]
    # print(req_ids)
    # print(len(required_keys))
    # print(len(req_ids))



    # # Load only needed sections
    # sections = supabase.table("sections") \
    #     .select("id,course_id,term_id,section_code") \
    #     .in_("course_id", req_ids) \
    #     .execute().data

    # # Load meetings and instructors for those sections
    # section_ids = [s['id'] for s in sections]
    # meetings = supabase.table("meeting_times") \
    #     .select("section_id,days_of_week,start_time,end_time,building,room") \
    #     .in_("section_id", section_ids) \
    #     .execute().data
    # instrs = supabase.table("section_instructors") \
    #     .select("section_id,instructor_id,instructors(name)") \
    #     .in_("section_id", section_ids) \
    #     .execute().data

    # # Build maps
    # mt_by_sec = defaultdict(list)
    # for m in meetings:
    #     mt_by_sec[m['section_id']].append(m)
    # inst_by_sec = defaultdict(list)
    # for i in instrs:
    #     inst_by_sec[i['section_id']].append(i['instructors']['name'])

    # sections_by_course = defaultdict(list)
    # for s in sections:
    #     sections_by_course[s['course_id']].append({
    #         'id': s['id'],
    #         'term': s['term_id'],
    #         'meetings': mt_by_sec.get(s['id'], []),
    #         'instructors': inst_by_sec.get(s['id'], [])
    #     })

    # return sections_by_course


load_required_data(REQUIRED_COURSES)
















      
      