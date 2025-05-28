from selenium import webdriver
from supabase import create_client, Client
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import re
import os
from dotenv import load_dotenv
import time



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


def scraper(driver, major, lst, s):
    url = f"https://catalog.registrar.ucla.edu/major/2024/{major}"
    driver.get(url)
    wait = WebDriverWait(driver, 10)

    expand_all_sections(driver, wait)
    spans_in_anchors = driver.find_elements(By.XPATH, "//a/span")
    for span in spans_in_anchors:
        txt = re.search(r"^(.*?)\s-\s*", span.text)
        if txt:
            key = txt.group(1)
            if key not in s:
                s.add(key)
    
    if not s:
        print(f"No courses found for major: {major}")
    else:
        lst.append({'major_name': re.sub(r'(BS|BA)$', '', major), 'courses': list(s)})
    print(lst)
    return lst

majors = [
    # "AerospaceEngineeringBS",
    # "BioengineeringBS",
    #  "ChemicalEngineeringBS",
    # "CivilEngineeringBS",
    # "ComputerEngineeringBS",
     "ComputerScienceandEngineeringBS",
    # "ComputerScienceBS",
    # "ElectricalEngineeringBS"
]


def main():
    load_dotenv()
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase : Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    driver = webdriver.Chrome()
    lst = []
    for major in majors:
        s = set()  # Reset the set for each major
        scraper(driver, major, lst, s)
    lst = list(lst)
    response = supabase.table('all_courses').upsert(lst).execute()
    driver.quit()
    
         
    

if __name__ == "__main__":
     main()


