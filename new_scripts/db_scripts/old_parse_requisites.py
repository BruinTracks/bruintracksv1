import csv
import re
import time
from supabase import create_client, Client
from httpx import RemoteProtocolError
from dotenv import load_dotenv
import os

# —— CONFIG ——
CSV_PATH = 'new_scripts/ucla_courses2.csv'
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")

# —— CLIENT & RETRY HELPER ——
supabase: Client = create_client(url, key)
def safe_execute(req, retries=3, backoff=0.2):
    for i in range(retries):
        try:
            return req.execute()
        except RemoteProtocolError:
            if i == retries - 1:
                raise
            time.sleep(backoff)

def clean_course_name(raw_name):
    s = raw_name.strip()
    # first remove any stray trailing “)”…
    s = re.sub(r'\)+\s*$', '', s)
    # then your other cleanup…
    s = s.strip("() ").strip()
    s = re.sub(r'\s+(?:and|or)[\s\)\.]*$', '', s, flags=re.IGNORECASE)
    return s

# —— STEP 1: Rebuild subject ↔ code map —— 
subjects = safe_execute(
    supabase.table("subjects").select("id,code,name")
).data

# Map: FULL_NAME (no “(CODE)”) → subject_code
subj_name_to_code = {}
for s in subjects:
    raw = s["name"].strip()
    m = m = re.match(r"^(.*?)\s*(?:\([^()]*\)\s*)*\(([^()]+)\)\s*$", raw)
    if m:
        full_name = m.group(1).strip().upper()
        code      = m.group(2).strip().upper()
    else:
        full_name = raw.upper()
        code      = s["code"].strip().upper()
    subj_name_to_code[full_name] = code

with open('new_scripts/output.txt', "a") as f:
    for full_name, code in subj_name_to_code.items():
        f.write(f"{full_name}, {code}")

# —— STEP 2: Rebuild course mappings —— 
def fetch_all_courses(batch_size=200):
    all_courses = []
    start = 0

    while True:
        batch = safe_execute(
            supabase.table("courses")
                     .select("id,subject_id,catalog_number")
                     .range(start, start + batch_size - 1)
        ).data

        if not batch:
            break

        all_courses.extend(batch)
        start += batch_size

    return all_courses

courses = fetch_all_courses()

# Map course_key = "SUBJ|NUM" → id
# and human name "FULL SUBJECT NAME NUM" → id
course_ids = {}
course_name_to_id = {}
# need subject id→full name:
subj_id_to_fullname = {s["id"]: re.sub(r"\s*\(.*\)$","", s["name"]).strip().upper()
                       for s in subjects}
with open('new_scripts/output.txt', "a") as f:
    f.write("_________________________________________________________")
    for id, full_name in subj_id_to_fullname.items():
        f.write(f"{id}, {full_name}")
    f.write("_________________________________________________________")
print(courses)
for c in courses:
    subj_full = subj_id_to_fullname[c["subject_id"]]
    subj_code = subj_name_to_code[subj_full]
    num       = c["catalog_number"].strip().upper()
    key       = f"{subj_code}|{num}"
    # print(key, c["id"])
    course_ids[key] = c["id"]

with open('new_scripts/output.txt', "a") as f:
    for key, id in course_ids.items():
        f.write(f"{key}, {id}")
    # also build human name → id:
    human = f"{subj_full} {num}"
    course_name_to_id[human] = c["id"]


# —— STEP 3: Collect raw requisites per course —— 
raw_reqs = {}
with open(CSV_PATH, newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        sc = row["subj_area_cd"].strip().upper()
        num = row["disp_catlg_no"].strip().upper()
        key = f"{sc}|{num}"
        if key not in raw_reqs:
            raw_reqs[key] = row.get("requisites","") or ""

# —— STEP 4: Parse & insert into course_requisites —— 
def parse_requisites(text):
    entries = []
    # split into non-empty lines
    lines = [ln for ln in text.strip().splitlines() if ln.strip()]
    if not lines:
        return entries

    # drop header if it begins with "classname"
    if "classname" in lines[0].lower():
        lines = lines[1:]

    for ln in lines:
        parts = [p.strip() for p in ln.split("|")]
        if len(parts) < 5:
            continue

        raw_name, min_grade, pre_flag, co_flag, _ = parts[:5]
        is_pr = pre_flag.lower() == "yes"
        is_co = co_flag.lower()  == "yes"
        if not (is_pr or is_co):
            continue

        # **CLEAN** the raw course name (strip trailing "and"/"or", outer parens, etc.)
        clean_name = clean_course_name(raw_name).rstrip(')').strip()

        entries.append({
            "course_name":     clean_name,
            "min_grade":       None if min_grade in ("---", "") else min_grade,
            "is_prerequisite": is_pr,
            "is_corequisite":  is_co
        })

    return entries

for course_key, raw in raw_reqs.items():
    if not raw.strip():
        continue
    parsed = parse_requisites(raw)
    if not parsed:
        continue

    if course_key not in course_ids:
        print(f"⚠️  Course {course_key} missing—skipping requisites")
        continue
    cid = course_ids[course_key]

    batch = []
    for req in parsed:
        # pull off trailing number from req["course_name"]
        m = re.match(r"^(.+?)\s+(\d+[A-Z]?)$", req["course_name"], re.IGNORECASE)
        if not m:
            print(f"⚠️  Can't parse '{req['course_name']}'")
            continue
        full_base = m.group(1).upper()
        num       = m.group(2).upper()

        # map full_base → subj_code
        subj_code = subj_name_to_code.get(full_base)
        if not subj_code:
            print(f"⚠️  No subject code for '{full_base}'")
            continue

        target_key = f"{subj_code}|{num}"
        if target_key not in course_ids:
            print(f"⚠️  No course_id for '{target_key}'")
            continue

        batch.append({
            "course_id":           cid,
            "requisite_course_id": course_ids[target_key],
            "is_prerequisite":     req["is_prerequisite"],
            "is_corequisite":      req["is_corequisite"],
            "min_grade":           req["min_grade"]
        })
    
    # de-duplicate by (course_id, requisite_course_id)
    unique = {}
    for r in batch:
        key = (r["course_id"], r["requisite_course_id"])
        unique[key] = r   # later entries simply overwrite earlier ones

    batch = list(unique.values())

    if batch:
        safe_execute(
            supabase
              .table("course_requisites")
              .upsert(batch, on_conflict="course_id,requisite_course_id",returning="representation")
        )
        print(f"✅  Inserted {len(batch)} requisites for {course_key}")

print("🎉 All requisites loaded.")