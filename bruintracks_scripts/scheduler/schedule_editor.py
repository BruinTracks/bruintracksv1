import os
import json
import sys
from typing import Dict, List, Set, Tuple, Optional
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# ───── CONFIGURATION ─────
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

class ScheduleEditor:
    def __init__(self, schedule: Dict, transcript: Dict[str, str], preferences: Dict):
        self.schedule = schedule
        self.transcript = transcript
        self.preferences = preferences
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Cache for course data
        self._course_cache = {}
        self._prereq_cache = {}
        
    def _get_course_data(self, course_id: str) -> Optional[Dict]:
        """Fetch course data from Supabase or cache."""
        if course_id in self._course_cache:
            return self._course_cache[course_id]
            
        subject, number = course_id.split('|')
        result = self.supabase.table("courses").select("*").eq("subject_id", subject).eq("catalog_number", number).execute()
        
        if result.data:
            self._course_cache[course_id] = result.data[0]
            return result.data[0]
        return None

    def _get_prerequisites(self, course_id: str) -> List[List[Tuple[str, str, str, str]]]:
        """Get prerequisites for a course in DNF form."""
        if course_id in self._prereq_cache:
            return self._prereq_cache[course_id]
            
        course_data = self._get_course_data(course_id)
        if not course_data or not course_data.get("course_requisites"):
            return []
            
        def to_dnf(node: Dict) -> List[List[Dict]]:
            if 'and' in node:
                prods = to_dnf(node['and'][0])
                for child in node['and'][1:]:
                    prods = [a + b for a in prods for b in to_dnf(child)]
                return prods
            if 'or' in node:
                res = []
                for child in node['or']:
                    res.extend(to_dnf(child))
                return res
            return [[node]]
            
        prereqs = []
        for clause in to_dnf(course_data["course_requisites"]):
            prereq_clause = []
            for req in clause:
                if 'course' not in req:
                    continue
                dept, num = req['course'].strip().split(' ')
                prereq_clause.append((
                    f"{dept}|{num}",
                    req.get('relation', 'prerequisite'),
                    req.get('min_grade', 'D-'),
                    req.get('severity', 'R')
                ))
            if prereq_clause:
                prereqs.append(prereq_clause)
                
        self._prereq_cache[course_id] = prereqs
        return prereqs

    def _meets_prerequisites(self, course_id: str, term: str) -> bool:
        """Check if prerequisites are met for a course in a given term."""
        prereqs = self._get_prerequisites(course_id)
        if not prereqs:
            return True
            
        # Get all courses taken before this term
        taken_courses = set(self.transcript.keys())
        term_order = list(self.schedule.keys())
        current_term_idx = term_order.index(term)
        
        for prev_term_idx in range(current_term_idx):
            prev_term = term_order[prev_term_idx]
            for course in self.schedule[prev_term]:
                if isinstance(self.schedule[prev_term], dict):
                    taken_courses.add(course)
                else:
                    taken_courses.add(course['course'])
                    
        # Check if any prerequisite clause is satisfied
        for clause in prereqs:
            clause_satisfied = True
            for prereq, rel_type, min_grade, severity in clause:
                if severity == 'W' and self.preferences.get('allow_warnings', False):
                    continue
                if prereq not in taken_courses:
                    clause_satisfied = False
                    break
            if clause_satisfied:
                return True
        return False

    def _check_time_conflict(self, section1: Dict, section2: Dict) -> bool:
        """Check if two sections have time conflicts."""
        def meetings_overlap(m1: Dict, m2: Dict) -> bool:
            if not set(m1['days']).intersection(m2['days']):
                return False
            t1_start = datetime.strptime(m1['start'], '%H:%M').time()
            t1_end = datetime.strptime(m1['end'], '%H:%M').time()
            t2_start = datetime.strptime(m2['start'], '%H:%M').time()
            t2_end = datetime.strptime(m2['end'], '%H:%M').time()
            return not (t1_end <= t2_start or t2_end <= t1_start)

        for m1 in section1.get('times', []):
            for m2 in section2.get('times', []):
                if meetings_overlap(m1, m2):
                    return True
        return False

    def _validate_term_schedule(self, term_schedule: Dict[str, Dict]) -> bool:
        """Validate a term's schedule for time conflicts."""
        sections = []
        for course_id, course_data in term_schedule.items():
            if course_data.get('lecture'):
                sections.append(course_data['lecture'])
            if course_data.get('discussion'):
                sections.append(course_data['discussion'])
                
        # Check for conflicts
        for i in range(len(sections)):
            for j in range(i + 1, len(sections)):
                if self._check_time_conflict(sections[i], sections[j]):
                    if sections[i].get('is_primary') and sections[j].get('is_primary'):
                        if not self.preferences.get('allow_primary_conflicts', False):
                            return False
                    elif not self.preferences.get('allow_secondary_conflicts', False):
                        return False
        return True

    def swap_courses(self, course1_id: str, term1: str, course2_id: str, term2: str) -> Tuple[bool, str]:
        """
        Attempt to swap two courses between terms.
        Returns (success, message).
        """
        # Validate terms exist
        if term1 not in self.schedule or term2 not in self.schedule:
            return False, "Invalid terms specified"
            
        # Validate courses exist in specified terms
        if course1_id not in self.schedule[term1] or course2_id not in self.schedule[term2]:
            return False, "Courses not found in specified terms"
            
        # Check prerequisites for both courses in their new terms
        if not self._meets_prerequisites(course1_id, term2):
            return False, f"Prerequisites not met for {course1_id} in {term2}"
        if not self._meets_prerequisites(course2_id, term1):
            return False, f"Prerequisites not met for {course2_id} in {term1}"
            
        # Create temporary schedules to validate
        temp_schedule1 = {**self.schedule[term1]}
        temp_schedule2 = {**self.schedule[term2]}
        
        # Swap courses
        temp_schedule1[course2_id] = self.schedule[term2][course2_id]
        temp_schedule2[course1_id] = self.schedule[term1][course1_id]
        del temp_schedule1[course1_id]
        del temp_schedule2[course2_id]
        
        # Validate both terms
        if not self._validate_term_schedule(temp_schedule1):
            return False, f"Time conflict in {term1} after swap"
        if not self._validate_term_schedule(temp_schedule2):
            return False, f"Time conflict in {term2} after swap"
            
        # If all validations pass, perform the swap
        self.schedule[term1] = temp_schedule1
        self.schedule[term2] = temp_schedule2
        return True, "Swap successful"

    def move_course(self, course_id: str, from_term: str, to_term: str) -> Tuple[bool, str]:
        """
        Attempt to move a course to a different term.
        Returns (success, message).
        """
        # Validate terms
        if from_term not in self.schedule or to_term not in self.schedule:
            return False, "Invalid terms specified"
            
        # Validate course exists
        if course_id not in self.schedule[from_term]:
            return False, "Course not found in specified term"
            
        # Check prerequisites in new term
        if not self._meets_prerequisites(course_id, to_term):
            return False, f"Prerequisites not met for {course_id} in {to_term}"
            
        # Create temporary schedule to validate
        temp_schedule = {**self.schedule[to_term]}
        temp_schedule[course_id] = self.schedule[from_term][course_id]
        
        # Validate term
        if not self._validate_term_schedule(temp_schedule):
            return False, "Time conflict in new term"
            
        # If validation passes, perform the move
        self.schedule[to_term][course_id] = self.schedule[from_term][course_id]
        del self.schedule[from_term][course_id]
        return True, "Move successful"

    def change_section(self, course_id: str, term: str, new_lecture_id: Optional[str] = None, new_discussion_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Attempt to change the section (lecture and/or discussion) for a course.
        Returns (success, message).
        """
        if term not in self.schedule or course_id not in self.schedule[term]:
            return False, "Course not found in specified term"
            
        # Get current course data
        course_data = self.schedule[term][course_id]
        temp_course_data = {**course_data}
        
        # Fetch new section data from Supabase
        if new_lecture_id:
            result = self.supabase.table("sections").select("*").eq("id", new_lecture_id).execute()
            if not result.data:
                return False, "Invalid lecture section ID"
            temp_course_data['lecture'] = result.data[0]
            
        if new_discussion_id:
            result = self.supabase.table("sections").select("*").eq("id", new_discussion_id).execute()
            if not result.data:
                return False, "Invalid discussion section ID"
            temp_course_data['discussion'] = result.data[0]
            
        # Create temporary schedule to validate
        temp_schedule = {**self.schedule[term]}
        temp_schedule[course_id] = temp_course_data
        
        # Validate term
        if not self._validate_term_schedule(temp_schedule):
            return False, "Time conflict with new section(s)"
            
        # If validation passes, update the section
        self.schedule[term][course_id] = temp_course_data
        return True, "Section change successful"

def main():
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    
    editor = ScheduleEditor(
        schedule=input_data['schedule'],
        transcript=input_data['transcript'],
        preferences=input_data['preferences']
    )
    
    # Process requested operation
    operation = input_data['operation']
    if operation['type'] == 'swap':
        success, message = editor.swap_courses(
            operation['course1_id'],
            operation['term1'],
            operation['course2_id'],
            operation['term2']
        )
    elif operation['type'] == 'move':
        success, message = editor.move_course(
            operation['course_id'],
            operation['from_term'],
            operation['to_term']
        )
    elif operation['type'] == 'change_section':
        success, message = editor.change_section(
            operation['course_id'],
            operation['term'],
            operation.get('new_lecture_id'),
            operation.get('new_discussion_id')
        )
    else:
        success, message = False, "Invalid operation type"
    
    # Return result
    result = {
        'success': success,
        'message': message,
        'schedule': editor.schedule if success else None
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main() 