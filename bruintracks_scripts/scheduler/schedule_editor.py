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
        print("\n=== Initializing Schedule Editor ===")
        print(f"Initial Schedule: {json.dumps(schedule, indent=2)}")
        print(f"Transcript: {json.dumps(transcript, indent=2)}")
        print(f"Preferences: {json.dumps(preferences, indent=2)}")
        print("=====================================\n")
        
        self.schedule = schedule
        self.transcript = transcript
        self.preferences = preferences
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Cache for course data
        self._course_cache = {}
        self._prereq_cache = {}
        
    def _get_course_data(self, course_id: str) -> Optional[Dict]:
        """Fetch course data from Supabase or cache."""
        print(f"\n🔍 Fetching data for course: {course_id}")
        
        if course_id in self._course_cache:
            print("✓ Found in cache")
            return self._course_cache[course_id]
            
        subject_code, number = course_id.split('|')
        print(f"Looking up: Subject={subject_code}, Number={number}")
        
        # First, get the subject ID from the subjects table
        subject_result = self.supabase.table("subjects").select("id").eq("code", subject_code).execute()
        if not subject_result.data:
            print(f"❌ Subject {subject_code} not found in database")
            return None
            
        subject_id = subject_result.data[0]['id']
        print(f"Found subject ID: {subject_id}")
        
        # Now get the course data using the numeric subject ID
        result = self.supabase.table("courses").select("*").eq("subject_id", subject_id).eq("catalog_number", number).execute()
        
        if result.data:
            print("✓ Found course data in database")
            self._course_cache[course_id] = result.data[0]
            return result.data[0]
            
        print("❌ Course not found in database")
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
                    
                # Extract department and number using right-most split
                # This handles department names with spaces (e.g., "COM SCI 31")
                course_parts = req['course'].strip().rsplit(' ', 1)
                if len(course_parts) != 2:
                    print(f"Warning: Invalid course format in prerequisites: {req['course']}")
                    continue
                    
                dept, num = course_parts
                # Look up the subject code for the department name
                subject_result = self.supabase.table("subjects").select("code").ilike("name", f"{dept}%").execute()
                if not subject_result.data:
                    print(f"Warning: Could not find subject code for department: {dept}")
                    continue
                    
                subject_code = subject_result.data[0]['code']
                prereq_clause.append((
                    f"{subject_code}|{num}",
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
        print(f"\n🔍 Checking prerequisites for {course_id} in term {term}")
        
        prereqs = self._get_prerequisites(course_id)
        if not prereqs:
            print("✓ No prerequisites found")
            return True
            
        # Get all courses taken before this term
        taken_courses = set(self.transcript.keys())
        print(f"Courses from transcript: {taken_courses}")
        
        term_order = list(self.schedule.keys())
        current_term_idx = term_order.index(term)
        
        for prev_term_idx in range(current_term_idx):
            prev_term = term_order[prev_term_idx]
            print(f"\nChecking courses from previous term: {prev_term}")
            for course in self.schedule[prev_term]:
                if isinstance(self.schedule[prev_term], dict):
                    taken_courses.add(course)
                else:
                    taken_courses.add(course['course'])
        
        print(f"All courses taken before {term}: {taken_courses}")
                    
        # Check if any prerequisite clause is satisfied
        for clause in prereqs:
            print(f"\nChecking prerequisite clause: {clause}")
            clause_satisfied = True
            for prereq, rel_type, min_grade, severity in clause:
                # Skip MATH 1 prerequisite check
                if prereq == "MATH|1":
                    print(f"✓ Skipping MATH 1 prerequisite check")
                    continue
                    
                if severity == 'W' and self.preferences.get('allow_warnings', False):
                    print(f"Skipping warning prerequisite {prereq} (warnings allowed)")
                    continue
                if prereq not in taken_courses:
                    print(f"❌ Missing prerequisite: {prereq}")
                    clause_satisfied = False
                    break
                else:
                    print(f"✓ Found prerequisite: {prereq}")
            if clause_satisfied:
                print("✓ Prerequisites satisfied!")
                return True
                
        print("❌ No prerequisite clauses satisfied")
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

    def _validate_term_schedule(self, schedule: Dict) -> bool:
        """Validate a term's schedule for time conflicts."""
        print("\n=== Validating Term Schedule ===")
        print(f"Schedule to validate: {json.dumps(schedule, indent=2)}")
        
        # Extract all meeting times
        meetings = []
        for course_data in schedule.values():
            if isinstance(course_data, dict):
                # Add lecture meetings
                if 'lecture' in course_data and course_data['lecture']:
                    for time in course_data['lecture'].get('times', []):
                        meetings.append({
                            'days': time['days'],
                            'start': time['start'],
                            'end': time['end'],
                            'course': course_data['lecture'].get('section_code', 'Unknown')
                        })
                
                # Add discussion meetings
                if 'discussion' in course_data and course_data['discussion']:
                    for time in course_data['discussion'].get('times', []):
                        meetings.append({
                            'days': time['days'],
                            'start': time['start'],
                            'end': time['end'],
                            'course': course_data['discussion'].get('section_code', 'Unknown')
                        })
        
        print(f"\nExtracted meetings: {json.dumps(meetings, indent=2)}")
        
        # Check for conflicts
        for i in range(len(meetings)):
            for j in range(i + 1, len(meetings)):
                m1, m2 = meetings[i], meetings[j]
                
                # Check if meetings share any days
                days1 = set(m1['days'])
                days2 = set(m2['days'])
                if not days1.intersection(days2):
                    continue
                
                # Check time overlap
                if m1['start'] < m2['end'] and m2['start'] < m1['end']:
                    print(f"❌ Found conflict:")
                    print(f"  Section 1: {m1['course']} ({m1['days']} {m1['start']}-{m1['end']})")
                    print(f"  Section 2: {m2['course']} ({m2['days']} {m2['start']}-{m2['end']})")
                    return False
        
        print("✓ No conflicts found")
        print("=== Validation Complete ===\n")
        return True

    def _validate_prerequisites_for_term(self, term: str) -> Tuple[bool, Optional[str]]:
        """Check prerequisites for all courses in a term."""
        print(f"\n🔍 Validating prerequisites for all courses in {term}")
        for course_id in self.schedule[term]:
            if not self._meets_prerequisites(course_id, term):
                return False, f"Prerequisites not met for {course_id} in {term}"
        return True, None

    def _validate_prerequisites_after_term(self, start_term: str) -> Tuple[bool, Optional[str]]:
        """Check prerequisites for all courses in and after the given term."""
        print(f"\n🔍 Validating prerequisites for all terms starting from {start_term}")
        term_order = list(self.schedule.keys())
        start_idx = term_order.index(start_term)
        
        # Check each term from start_term onwards
        for term_idx in range(start_idx, len(term_order)):
            term = term_order[term_idx]
            valid, message = self._validate_prerequisites_for_term(term)
            if not valid:
                return False, message
        return True, None

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
            
        # Create temporary schedule to validate
        temp_schedule = {**self.schedule}
        temp_schedule[to_term] = {**self.schedule[to_term]}
        temp_schedule[from_term] = {**self.schedule[from_term]}
        
        # Move course in temporary schedule
        temp_schedule[to_term][course_id] = self.schedule[from_term][course_id]
        del temp_schedule[from_term][course_id]
        
        # Store original schedule
        original_schedule = {**self.schedule}
        
        # Apply temporary changes to check prerequisites
        self.schedule = temp_schedule
        
        # Check prerequisites for all courses in and after both terms
        earliest_term = min(from_term, to_term)
        valid, message = self._validate_prerequisites_after_term(earliest_term)
        
        if not valid:
            # Restore original schedule
            self.schedule = original_schedule
            return False, message
            
        # Validate term schedule
        if not self._validate_term_schedule(temp_schedule[to_term]):
            # Restore original schedule
            self.schedule = original_schedule
            return False, "Time conflict in new term"
            
        # If all validations pass, keep the changes
        return True, "Move successful"

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
            
        # Create temporary schedules to validate
        temp_schedule = {**self.schedule}
        temp_schedule[term1] = {**self.schedule[term1]}
        temp_schedule[term2] = {**self.schedule[term2]}
        
        # Swap courses in temporary schedule
        temp_schedule[term1][course2_id] = self.schedule[term2][course2_id]
        temp_schedule[term2][course1_id] = self.schedule[term1][course1_id]
        del temp_schedule[term1][course1_id]
        del temp_schedule[term2][course2_id]
        
        # Store original schedule
        original_schedule = {**self.schedule}
        
        # Apply temporary changes to check prerequisites
        self.schedule = temp_schedule
        
        # Check prerequisites for all courses in and after both terms
        earliest_term = min(term1, term2)
        valid, message = self._validate_prerequisites_after_term(earliest_term)
        
        if not valid:
            # Restore original schedule
            self.schedule = original_schedule
            return False, message
            
        # Validate both terms
        if not self._validate_term_schedule(temp_schedule[term1]):
            # Restore original schedule
            self.schedule = original_schedule
            return False, f"Time conflict in {term1} after swap"
        if not self._validate_term_schedule(temp_schedule[term2]):
            # Restore original schedule
            self.schedule = original_schedule
            return False, f"Time conflict in {term2} after swap"
            
        # If all validations pass, keep the changes
        return True, "Swap successful"

    def change_section(self, course_id: str, term: str, new_lecture_id: Optional[str] = None, new_discussion_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Attempt to change the section (lecture and/or discussion) for a course.
        Returns (success, message).
        """
        print(f"\n=== Attempting Section Change ===")
        print(f"Course: {course_id}")
        print(f"Term: {term}")
        print(f"New Lecture ID: {new_lecture_id}")
        print(f"New Discussion ID: {new_discussion_id}")
        
        if term not in self.schedule or course_id not in self.schedule[term]:
            print("❌ Course not found in specified term")
            return False, "Course not found in specified term"
            
        # Get current course data
        course_data = self.schedule[term][course_id]
        print(f"\nCurrent course data: {json.dumps(course_data, indent=2)}")
        
        temp_course_data = {**course_data}
        
        # Fetch new section data from Supabase
        if new_lecture_id:
            print(f"\nFetching new lecture data (ID: {new_lecture_id})")
            result = self.supabase.table("sections").select("*").eq("id", new_lecture_id).execute()
            if not result.data:
                print("❌ Invalid lecture section ID")
                return False, "Invalid lecture section ID"
            temp_course_data['lecture'] = result.data[0]
            print(f"New lecture data: {json.dumps(result.data[0], indent=2)}")
            
        if new_discussion_id:
            print(f"\nFetching new discussion data (ID: {new_discussion_id})")
            result = self.supabase.table("sections").select("*").eq("id", new_discussion_id).execute()
            if not result.data:
                print("❌ Invalid discussion section ID")
                return False, "Invalid discussion section ID"
            temp_course_data['discussion'] = result.data[0]
            print(f"New discussion data: {json.dumps(result.data[0], indent=2)}")
            
        # Create temporary schedule to validate
        temp_schedule = {**self.schedule[term]}
        temp_schedule[course_id] = temp_course_data
        
        print("\nValidating temporary schedule...")
        # Validate term
        if not self._validate_term_schedule(temp_schedule):
            print("❌ Time conflict with new section(s)")
            return False, "Time conflict with new section(s)"
            
        # If validation passes, update the section
        print("✓ Validation passed, updating schedule")
        self.schedule[term][course_id] = temp_course_data
        print(f"\nUpdated course data: {json.dumps(self.schedule[term][course_id], indent=2)}")
        print("=== Section Change Complete ===\n")
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