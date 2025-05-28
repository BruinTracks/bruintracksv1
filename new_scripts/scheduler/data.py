# scheduler.py
import os, time
from datetime import datetime
from supabase import create_client
from ortools.sat.python import cp_model
from dotenv import load_dotenv

load_dotenv()
url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(url, key)

def safe(req, retries=3, backoff=0.2):
    for i in range(retries):
        try:
            return req.execute()
        except Exception:
            time.sleep(backoff)
    raise RuntimeError("Supabase failed")

# 2.1 fetch all future terms in your window
terms = safe(supabase.table("terms")
             .select("id,term_code")
             .order("term_code","asc")
            ).data
# map term_code → small ordinal 0,1,2…
term_index = {t["term_code"]: i for i,t in enumerate(terms)}

# 2.2 fetch only the courses the student needs
needed = [ "COM SCI|32","COM SCI|33" ]  # your input
courses = safe(supabase
           .table("courses")
           .select("id, subject_id, catalog_number")
           .in_("concat(subjects.code,'|',catalog_number)", needed,  column="dummy")
          ).data

# 2.3 pull all sections for those courses **across all your terms**
sections = safe(supabase
           .table("sections")
           .select("id, course_id, term_id, section_code")
           .in_("course_id",[c["id"] for c in courses])
          ).data

# 2.4 pull meeting_times & build a map section_id → list of (day, start_min, end_min)
mt_rows = safe(supabase
           .table("meeting_times")
           .select("section_id, days_of_week, start_time, end_time")
          ).data
meetings = {}
for r in mt_rows:
    sid = r["section_id"]
    meetings.setdefault(sid, [])
    days = list(r["days_of_week"])  # e.g. "MWF" → ["M","W","F"]
    st = datetime.strptime(r["start_time"], "%H:%M:%S").hour*60 + datetime.strptime(r["start_time"], "%H:%M:%S").minute
    et = datetime.strptime(r["end_time"],   "%H:%M:%S").hour*60 + datetime.strptime(r["end_time"],   "%H:%M:%S").minute
    for d in days:
      meetings[sid].append((d, st, et))

# 2.5 fetch prerequisites
prs = safe(supabase
        .table("course_requisites")
        .select("course_id, requisite_course_id, is_prerequisite, is_corequisite")
       ).data

