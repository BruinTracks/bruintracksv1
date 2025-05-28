import csv
import re
import json

def remove_parentheses(text):
    """
    Removes all parenthetical content from a string.
    Example: "Biology (life)" -> "Biology"
    """
    return re.sub(r"\(.*?\)", "", text).strip()

# ------------------------------------------------------------------------------
# 1) TOKENIZATION of a single line
#    Splits out '(' / ')' / trailing 'and' or 'or' from the course name text.
# ------------------------------------------------------------------------------
def tokenize_line(course_text):
    """
    Given a string like "( Physics 1A and", return a list of tokens.
    E.g. ["(", "Physics 1A", "AND"]

    We do this by:
      - Repeatedly stripping leading '(' => each one becomes a separate token "("
      - Repeatedly stripping trailing ')' => each one becomes a separate token ")"
      - Checking if line ends with "and" or "or" => separate token "AND" or "OR"
      - The remainder is the course name token (unless empty).
    """
    tokens = []

    text = course_text.strip()

    # 1) Extract leading parentheses
    while text.startswith('('):
        tokens.append("(")
        text = text[1:].strip()

    # 2) Extract trailing parentheses
    #    Because we can have multiple: e.g. "Physics 1C)) or"
    #    We'll do this in a loop from the end.
    trailing_parens = 0
    while text.endswith(')'):
        trailing_parens += 1
        text = text[:-1].strip()

    # 3) Check if text ends with "and" or "or"
    #    We'll do a case-insensitive match on a word boundary.
    connector_pattern = r'\b(and|or)\b\s*$'
    match = re.search(connector_pattern, text, flags=re.IGNORECASE)
    connector = None
    if match:
        connector = match.group(1).lower()  # 'and' or 'or'
        # remove that from the end of text
        text = re.sub(connector_pattern, '', text, flags=re.IGNORECASE).strip()

    # Now `text` should be the main course name
    # If non-empty, that's a token
    if text:
        tokens.append(text)

    # If we found a connector, add it
    if connector:
        tokens.append(connector.upper())  # store "AND" or "OR" in uppercase

    # Finally, add as many ")" tokens as we have in trailing_parens
    for _ in range(trailing_parens):
        tokens.append(")")

    return tokens


# ------------------------------------------------------------------------------
# 2) BUILD TOKEN STREAM from multiple lines (already filtered for prereq or coreq)
# ------------------------------------------------------------------------------
def build_token_stream(lines):
    """
    Given the lines that are relevant to a single type (prereq or coreq),
    each line might look like:
        "(Physics 1A and"
        "Physics 1B and"
        "Physics 1C) or"
        "(Physics 6A and"
        "Physics 6B and"
        "Physics 6C)"
    Convert them all into a single flat list of tokens. Example:

    [
        "(", "Physics 1A", "AND",
        "Physics 1B", "AND",
        "Physics 1C", ")", "OR",
        "(", "Physics 6A", "AND",
        "Physics 6B", "AND",
        "Physics 6C", ")"
    ]
    """
    token_stream = []
    for line_text in lines:
        # Tokenize the line_text
        line_tokens = tokenize_line(line_text)
        token_stream.extend(line_tokens)
    return token_stream


# ------------------------------------------------------------------------------
# 3) PARSING the token stream (Recursive-Descent) -> Returns nested AND/OR tree
#    Grammar (roughly):
#       EXPR := TERM ( (AND|OR) TERM )*
#       TERM := "(" EXPR ")" | COURSE_NAME
# ------------------------------------------------------------------------------
class TokenStream:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def next(self):
        if self.pos < len(self.tokens):
            val = self.tokens[self.pos]
            self.pos += 1
            return val
        return None

def parse_expression(ts: TokenStream):
    """
    Parse an expression of the form:  TERM ( (AND|OR) TERM )*
    We'll left-fold them, so if you have: T AND T AND T => type=AND, conditions=[..., ...].
    Or if you see an OR in the middle, we nest them. 
    """
    left = parse_term(ts)

    while True:
        op = ts.peek()
        if op in ("AND", "OR"):
            ts.next()  # consume the connector
            right = parse_term(ts)
            left = {
                "type": op,
                "conditions": [left, right]
            }
        else:
            break

    return left

def parse_term(ts: TokenStream):
    """
    A TERM is either "(" EXPR ")" or a single COURSE_NAME (string).
    """
    token = ts.peek()
    if token == "(":
        # consume "("
        ts.next()
        node = parse_expression(ts)
        # expect ")"
        closing = ts.next()
        if closing != ")":
            raise ValueError("Missing closing parenthesis!")
        return node
    else:
        # Must be a course name, e.g. "Physics 1A"
        return ts.next()

def build_ast_from_tokens(tokens):
    """
    Build the parse tree (AST) from a list of tokens.
    If tokens is empty, return None.
    """
    if not tokens:
        return None

    ts = TokenStream(tokens)
    expr = parse_expression(ts)

    # If there's leftover tokens, you might want to check for parse errors
    if ts.peek() is not None:
        raise ValueError(f"Extra tokens remaining after parse: {ts.tokens[ts.pos:]}")

    return expr

def clean_up_ast(ast):
    """
    The parse tree can have single-leaf nodes that are strings or nested AND/OR.
    For example, if you parse "Physics 1A" you get "Physics 1A" as a string.

    This function is optional, but can be used to ensure the structure
    always has "type"/"conditions" for internal nodes, or a string for leaves.
    
    - If `ast` is just a string, it's a leaf.
    - If it's a dict like {"type": "AND", "conditions": [ ... ]}, recursively clean children.
    - If any sub-"conditions" has only one item, consider flattening, etc. (some folks do).
      We'll skip flattening to preserve the structure as-is.

    Returns a validated AST.
    """
    if isinstance(ast, str):
        # a leaf node, presumably a course name
        return ast.strip()

    if isinstance(ast, dict):
        node_type = ast.get("type")
        conditions = ast.get("conditions", [])
        cleaned = []
        for c in conditions:
            cleaned.append(clean_up_ast(c))
        return {
            "type": node_type,
            "conditions": cleaned
        }

    # Otherwise, something unexpected
    return ast


# ------------------------------------------------------------------------------
# 4) The main function to parse a big “requisites” text into:
#    { "prerequisites": <AST>, "corequisites": <AST> }
# ------------------------------------------------------------------------------
def parse_requisites(raw_text):
    """
    Given the entire “requisites” text (with multiple lines),
    we expect lines of the form:
       course_name_part | minimumgrade | prerequisite | corequisite | rqs_sev

    - We'll split into lines.
    - For each line, parse out the columns with split('|').
    - We'll gather lines that are relevant to prerequisites, lines relevant to corequisites.
      (If a line says "Yes" to both, it goes into both sets.)
    - Then we parse each set separately with our parentheses/AND/OR logic.
    - Return a dict: {"prerequisites": <parsed>, "corequisites": <parsed>}
    """

    lines = raw_text.strip().splitlines()
    # Prepare separate lists: one for prereq, one for coreq
    prereq_texts = []
    coreq_texts  = []

    for line in lines:
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 5:
            continue  # skip invalid line

        course_col     = parts[0]  # e.g. "(Physics 1A and"
        # minimum_grade = parts[1]  # e.g. "D-"
        is_prereq      = (parts[2].lower() == "yes")
        is_coreq       = (parts[3].lower() == "yes")
        # rqs_sev       = parts[4]

        # If relevant to prereq, store the course_col
        if is_prereq:
            prereq_texts.append(course_col)
        # If relevant to coreq, store it
        if is_coreq:
            coreq_texts.append(course_col)

    # Build parse tree for prereqs
    prereq_ast = None
    if prereq_texts:
        tokens = build_token_stream(prereq_texts)
        ast    = build_ast_from_tokens(tokens)
        prereq_ast = clean_up_ast(ast)
    # Build parse tree for coreqs
    coreq_ast = None
    if coreq_texts:
        tokens = build_token_stream(coreq_texts)
        ast    = build_ast_from_tokens(tokens)
        coreq_ast = clean_up_ast(ast)

    return {
        "prerequisites": prereq_ast,
        "corequisites": coreq_ast
    }


# ------------------------------------------------------------------------------
# EXAMPLE MAIN SCRIPT: read from the CSV, transform, write new CSV
# ------------------------------------------------------------------------------
input_csv_path  = "/mnt/data/RSR 016717 IT-136364 24F, 25W, 25S.xlsx - 25W (1).csv"
output_csv_path = "/mnt/data/transformed_courses.csv"

with open(input_csv_path, "r", encoding="utf-8-sig", newline="") as f_in, \
     open(output_csv_path, "w", encoding="utf-8", newline="") as f_out:

    reader = csv.DictReader(f_in)

    fieldnames = [
        "Course_short_name",
        "course_full_name",
        "meet_strt_time",
        "meet_stop_time",
        "Meet_strt_tm",
        "Meet_stop_tm",
        "enrl_cap_num",
        "waitlist_cap_num",
        "Meet_bldg_cd",
        "Meet_room_cd",
        "Instructors",
        "Days_of_wk_cd",
        "cls_act_typ_cd",
        "requisites"   # JSON string
    ]

    writer = csv.DictWriter(f_out, fieldnames=fieldnames)
    writer.writeheader()

    for row in reader:
        # Build Course_short_name
        course_short_name = f"{row['subj_area_cd']} {row['disp_catlg_no']}"

        # Build course_full_name (remove parentheses in subj_area_name, then space + disp_catlg_no)
        subj_area_no_parens = remove_parentheses(row["subj_area_name"])
        course_full_name = f"{subj_area_no_parens} {row['disp_catlg_no']}"

        # Parse the requisites into a nested dict
        raw_req_text = row.get("requisites", "")
        req_dict = parse_requisites(raw_req_text)

        # Convert that dict to JSON string
        req_json_str = json.dumps(req_dict)

        out_row = {
            "Course_short_name": course_short_name,
            "course_full_name": course_full_name,
            "meet_strt_time": row.get("meet_strt_time", ""),
            "meet_stop_time": row.get("meet_stop_time", ""),
            "Meet_strt_tm": row.get("Meet_strt_tm", ""),
            "Meet_stop_tm": row.get("Meet_stop_tm", ""),
            "enrl_cap_num": row.get("enrl_cap_num", ""),
            "waitlist_cap_num": row.get("waitlist_cap_num", ""),
            "Meet_bldg_cd": row.get("Meet_bldg_cd", ""),
            "Meet_room_cd": row.get("Meet_room_cd", ""),
            "Instructors": row.get("Instructors", ""),
            "Days_of_wk_cd": row.get("Days_of_wk_cd", ""),
            "cls_act_typ_cd": row.get("cls_act_typ_cd", ""),
            "requisites": req_json_str
        }

        writer.writerow(out_row)

print(f"Done! New CSV created: {output_csv_path}")