import os
import json
from typing import Dict, List, Optional, Tuple, Any
from dotenv import load_dotenv
import openai
from schedule_editor import ScheduleEditor

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")
openai.api_key = OPENAI_API_KEY

# Sample initial schedule for testing
SAMPLE_SCHEDULE = {
    "Fall 2024": {
        "COM SCI|31": {
            "lecture": {
                "id": 1,
                "section_code": "1A",
                "times": [{"days": "MW", "start": "10:00", "end": "11:50", "building": "MS", "room": "100"}],
                "instructors": ["Smallberg"]
            },
            "discussion": {
                "id": 2,
                "section_code": "1D",
                "times": [{"days": "F", "start": "10:00", "end": "11:50", "building": "MS", "room": "101"}],
                "instructors": ["TA1"]
            }
        },
        "MATH|31A": {
            "lecture": {
                "id": 3,
                "section_code": "1A",
                "times": [{"days": "TR", "start": "10:00", "end": "11:50", "building": "MS", "room": "200"}],
                "instructors": ["Math Prof"]
            },
            "discussion": {
                "id": 4,
                "section_code": "1D",
                "times": [{"days": "F", "start": "13:00", "end": "13:50", "building": "MS", "room": "201"}],
                "instructors": ["TA2"]
            }
        }
    },
    "Winter 2025": {
        "COM SCI|32": {
            "lecture": {
                "id": 5,
                "section_code": "1A",
                "times": [{"days": "MW", "start": "14:00", "end": "15:50", "building": "MS", "room": "300"}],
                "instructors": ["Nachenberg"]
            },
            "discussion": {
                "id": 6,
                "section_code": "1D",
                "times": [{"days": "F", "start": "14:00", "end": "15:50", "building": "MS", "room": "301"}],
                "instructors": ["TA3"]
            }
        },
        "MATH|31B": {
            "lecture": {
                "id": 7,
                "section_code": "1A",
                "times": [{"days": "TR", "start": "14:00", "end": "15:50", "building": "MS", "room": "400"}],
                "instructors": ["Math Prof 2"]
            },
            "discussion": {
                "id": 8,
                "section_code": "1D",
                "times": [{"days": "F", "start": "16:00", "end": "16:50", "building": "MS", "room": "401"}],
                "instructors": ["TA4"]
            }
        }
    },
    "Spring 2025": {
        "FILM|33": {
            "lecture": {
                "id": 9,
                "section_code": "1A",
                "times": [{"days": "MW", "start": "16:00", "end": "17:50", "building": "MS", "room": "500"}],
                "instructors": ["Nachenberg 2"]
            },
            "discussion": {
                "id": 10,
                "section_code": "1D",
                "times": [{"days": "F", "start": "16:00", "end": "17:50", "building": "MS", "room": "501"}],
                "instructors": ["TA5"]
            }
        }
    }
}

# Sample transcript for testing
SAMPLE_TRANSCRIPT = {}

# Sample preferences for testing
SAMPLE_PREFERENCES = {
    "allow_warnings": True
}

def interpret_request(request: str, current_schedule: Dict) -> Dict[str, Any]:
    """Use OpenAI to interpret a natural language request into schedule operations."""
    
    # Create a prompt that describes the current schedule and the available operations
    system_prompt = """You are a schedule modification assistant. Given a schedule and a user request, determine what schedule operations to perform.

Available operations and their EXACT required JSON format:

1. Move course:
{
    "type": "move",
    "course_id": "DEPT|NUMBER",  # e.g. "COM SCI|31"
    "from_term": "TERM",         # e.g. "Fall 2024"
    "to_term": "TERM"           # e.g. "Winter 2025"
}

2. Swap courses:
{
    "type": "swap",
    "course1_id": "DEPT|NUMBER", # e.g. "COM SCI|31"
    "term1": "TERM",            # e.g. "Fall 2024"
    "course2_id": "DEPT|NUMBER", # e.g. "COM SCI|32"
    "term2": "TERM"             # e.g. "Winter 2025"
}

3. Change section:
{
    "type": "change_section",
    "course_id": "DEPT|NUMBER",  # e.g. "COM SCI|31"
    "term": "TERM",             # e.g. "Fall 2024"
    "new_lecture_id": "ID",     # Optional, numeric ID
    "new_discussion_id": "ID"   # Optional, numeric ID
}

Your response MUST be a JSON object with EXACTLY this format:
{
    "operations": [
        {
            // One or more operations in the exact format shown above
            // NO nested "parameters" object
            // All fields must be at the top level of each operation
        }
    ],
    "explanation": "Clear explanation of what will be done",
    "feasible": true/false
}

Example of CORRECT format:
{
    "operations": [
        {
            "type": "move",
            "course_id": "COM SCI|31",
            "from_term": "Fall 2024",
            "to_term": "Winter 2025"
        }
    ],
    "explanation": "The course COM SCI|31 will be moved from Fall 2024 to Winter 2025 as requested.",
    "feasible": true
}

Example of INCORRECT format (DO NOT USE):
{
    "operations": [
        {
            "type": "move",
            "parameters": {  // NO nested parameters object!
                "course_id": "COM SCI|31",
                "from_term": "Fall 2024",
                "to_term": "Winter 2025"
            }
        }
    ]
}

Important:
- Always use the pipe character (|) in course IDs: "COM SCI|31" not "COM SCI 31"
- All operation parameters must be at the top level, not nested in a "parameters" object
- Terms must match exactly as shown in the schedule
- Department codes must match exactly as shown in the schedule"""

    schedule_context = f"Current Schedule:\n{json.dumps(current_schedule, indent=2)}"
    
    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{schedule_context}\n\nUser Request: {request}"}
            ],
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error interpreting request: {e}")
        return {
            "feasible": False,
            "explanation": "Sorry, I encountered an error while interpreting your request.",
            "operations": []
        }

def execute_operations(editor: ScheduleEditor, operations: List[Dict]) -> Tuple[bool, str, Optional[Dict]]:
    """Execute a list of operations on the schedule."""
    success = True
    messages = []
    
    for op in operations:
        if op["type"] == "move":
            op_success, message = editor.move_course(
                course_id=op["course_id"],
                from_term=op["from_term"],
                to_term=op["to_term"]
            )
        elif op["type"] == "swap":
            op_success, message = editor.swap_courses(
                course1_id=op["course1_id"],
                term1=op["term1"],
                course2_id=op["course2_id"],
                term2=op["term2"]
            )
        elif op["type"] == "change_section":
            op_success, message = editor.change_section(
                course_id=op["course_id"],
                term=op["term"],
                new_lecture_id=op.get("new_lecture_id"),
                new_discussion_id=op.get("new_discussion_id")
            )
        else:
            op_success, message = False, f"Unknown operation type: {op['type']}"
        
        success = success and op_success
        messages.append(message)
    
    return success, "\n".join(messages), editor.schedule if success else None

def print_schedule(schedule: Dict):
    """Pretty print the schedule."""
    print("\n=== Current Schedule ===")
    for term, courses in schedule.items():
        print(f"\n{term}:")
        for course_id, sections in courses.items():
            print(f"  {course_id}:")
            if sections.get("lecture"):
                lec = sections["lecture"]
                times = ", ".join(f"{t['days']} {t['start']}-{t['end']}" for t in lec["times"])
                print(f"    Lecture {lec['section_code']}: {times}")
            if sections.get("discussion"):
                dis = sections["discussion"]
                times = ", ".join(f"{t['days']} {t['start']}-{t['end']}" for t in dis["times"])
                print(f"    Discussion {dis['section_code']}: {times}")
    print("\n=====================")

def main():
    # Initialize the schedule editor with sample data
    editor = ScheduleEditor(
        schedule=SAMPLE_SCHEDULE,
        transcript=SAMPLE_TRANSCRIPT,
        preferences=SAMPLE_PREFERENCES
    )
    
    print("\nWelcome to the Schedule Assistant!")
    print("Enter your requests in natural language, or 'quit' to exit.")
    print_schedule(editor.schedule)
    
    while True:
        print("\nWhat would you like to do with your schedule?")
        request = input("> ").strip()
        
        if request.lower() in ('quit', 'exit', 'q'):
            break
            
        # Interpret the request
        interpretation = interpret_request(request, editor.schedule)
        
        if not interpretation["feasible"]:
            print(f"\n❌ {interpretation['explanation']}")
            continue
            
        print(f"\n💭 I'll try to: {interpretation['explanation']}")
        
        # Execute the operations
        print(interpretation)
        success, message, new_schedule = execute_operations(editor, interpretation["operations"])
        
        if success:
            print("\n✅ Changes applied successfully!")
            print(message)
            print_schedule(new_schedule)
        else:
            print(f"\n❌ Could not apply changes: {message}")

if __name__ == "__main__":
    main() 