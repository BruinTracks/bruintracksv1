import pandas as pd
import re

df = pd.read_csv("backend/courses.csv")

# Keep only main course sections (lectures with class_prim_act_fl == 'Y')
lectures = df[df['class_prim_act_fl'] == 'Y'].copy()

# # Create unique course identifier (subj_area_name + subj_area_cd + crs_catlg_no)
lectures['course_id'] = lectures['subj_area_cd'].str.strip() + " " + lectures['disp_catlg_no'].str.strip()
lectures['full_course_id'] = lectures['sr_dept_name'].str.strip() + " " + lectures['disp_catlg_no'].str.strip()

selected_columns = [
    "course_id",
    "full_course_id",
    "requisites",
    "days_of_wk_cd",
    "meet_strt_tm",
    "meet_stop_tm",
    "meet_bldg_cd",
    "meet_room_cd",
    "instructors"
]

df_selected = lectures[selected_columns].drop_duplicates().reset_index()

df_selected.to_csv('finalCourses.csv', index=False)

