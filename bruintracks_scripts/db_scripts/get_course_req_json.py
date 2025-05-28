import json
import time
import os
from dotenv import load_dotenv
load_dotenv()

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Import Supabase client
from supabase import create_client, Client

# Import BeautifulSoup
from bs4 import BeautifulSoup

# Set up Supabase client using environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_argument("--headless=new")  # Use the latest headless mode
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")  # Prevent resource issues

# Set up WebDriver
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)
wait = WebDriverWait(driver, 10)

def remove_empty(data):
    if isinstance(data, dict):
        return {k: remove_empty(v) for k, v in data.items() if v not in ("", [], {}) and remove_empty(v) != {} and remove_empty(v) != []}
    elif isinstance(data, list):
        return [remove_empty(i) for i in data if i not in ("", [], {}) and remove_empty(i) != {} and remove_empty(i) != []]
    else:
        return data

def scrapeMajor(driver, majorToScrape):
    def expand_all_sections(driver, wait):
        try:
            button = wait.until(EC.element_to_be_clickable((
                By.XPATH,
                "//h3[contains(text(), 'Major Requirements')]/following::button"
            )))
            driver.execute_script("arguments[0].click();", button)
            time.sleep(2)  # Allow time for expansion
        except Exception as e:
            print("Could not expand section:", e)

    try:
        website = f"https://catalog.registrar.ucla.edu/major/2024/{majorToScrape}"
        driver.get(website)
        time.sleep(2)  # Wait for page to load
    except Exception as e:
        print("Couldn't load page:", e)
        return

    expand_all_sections(driver, wait)
    try:
        major_requirements_div = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//div[@aria-label='Major Requirements accordions']")
            )
        )
        major_requirements_html = major_requirements_div.get_attribute("innerHTML")
    except Exception as e:
        print("Error extracting Major Requirements:", e)
        return

    soup = BeautifulSoup(major_requirements_html, "html.parser")

    def parse_structure_item(item):
        result = {}
        # Get the current item's level from its data-level attribute
        current_level = int(item.get("data-level", "0"))
        
        # Extract heading (could be h4, h5, or h6)
        heading_container = item.find("div", class_="css-115ux54-CompactStructure--ItemHeadingContent")
        if heading_container:
            heading = heading_container.find(["h4", "h5", "h6"])
            result["title"] = heading.get_text(strip=True) if heading else ""
        else:
            result["title"] = ""
        
        # Find the collapsible container that holds description, courses, and nested items
        container = item.find(
            lambda tag: tag.name == "div" and tag.get("class") and any("CollapsibleContainer" in cls for cls in tag.get("class"))
        )
        if container:
            content = container.find("div", attrs={"aria-hidden": "false"})
            if content:
                desc_el = content.find("div", class_="css-l9pyj5-CompactStructure--ItemDescription")
                result["description"] = desc_el.get_text(strip=True) if desc_el else ""
                
                # Build the list of courses (as strings)
                result["courses"] = []
                course_lists = content.find_all("div", class_="css-79j3ig-CompactStructure--RelationshipsList", recursive=False)
                for course_list in course_lists:
                    for a in course_list.find_all("a"):
                        span = a.find("span", class_="relationshipName")
                        text = span.get_text(strip=True) if span else a.get_text(strip=True)
                        parts = text.split(" - ")
                        code = parts[0].strip() if parts else ""
                        name = " - ".join(parts[1:]).strip() if len(parts) > 1 else ""
                        course_text = f"{code} - {name}" if name else code
                        result["courses"].append(course_text)
                
                # Process nested items: include only those descendants whose data-level equals current_level+1.
                result["options"] = []
                for child in content.find_all("div", attrs={"data-level": True}, recursive=True):
                    try:
                        child_level = int(child.get("data-level", "0"))
                    except:
                        child_level = 0
                    if child_level == current_level + 1:
                        result["options"].append(parse_structure_item(child))
            else:
                result["description"] = ""
                result["courses"] = []
                result["options"] = []
        else:
            result["description"] = ""
            result["courses"] = []
            result["options"] = []
        
        # Special handling for "Tracks": if the title is "Tracks", move its nested options to a "tracks" key,
        # renaming their "title" key to "heading"
        if result["title"].strip().lower() == "tracks":
            for opt in result["options"]:
                if "title" in opt:
                    opt["heading"] = opt.pop("title")
            result["tracks"] = result.pop("options")
        
        return result

    structure_container = soup.find("div", class_="css-18a61ju-CompactStructure--StructureContainer")
    sections = []
    if structure_container:
        # Process only direct children with data-level="1" as top-level sections.
        for item in structure_container.find_all("div", attrs={"data-level": "1"}, recursive=False):
            sections.append(parse_structure_item(item))

    data_to_insert = {
    "major_name": majorToScrape,         # Column storing the major identifier
    "json_data": sections      # Column (of type jsonb or text) storing the JSON data
    }
    filtered_json = remove_empty(data_to_insert)
    with open(f"backend/majors/{majorToScrape}.json", "w") as f:
        f.write(json.dumps(filtered_json, indent=2))
    
    # Insert the record into the 'majors' table.
    response = supabase.table("majors").insert(filtered_json).execute()

    # Check the response for success or errors.
    print(response)

# List of majors to scrape
majors = [
    "AerospaceEngineeringBS",
    "BioengineeringBS",
    "ChemicalEngineeringBS",
    "CivilEngineeringBS",
    "ComputerEngineeringBS",
    "ComputerScienceandEngineeringBS",
    "ComputerScienceBS",
    "ElectricalEngineeringBS"
]

for major in majors:
    scrapeMajor(driver, major)
   

driver.quit()



