import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompt for GPT
const systemPrompt = `
You are helping build a structured list of courses required for a major. Your task is to analyze the major requirements and return a list of courses that need to be taken, taking into account courses the student has already completed.

### Input:
1. Major requirements in JSON format (including course descriptions and titles)
2. List of completed courses from the student's transcript

### Rules:
1. For courses with choices (e.g., "Select one from:"):
   - Read the descriptions and titles carefully
   - Select the most appropriate course based on:
     * The student's completed courses
     * The course descriptions and prerequisites
     * The logical progression of the major
   - Only include the selected course, not all options

2. For elective requirements with specific counts:
   - Pay close attention to the number of courses required (e.g., "Select six additional major field elective courses")
   - Select EXACTLY the specified number of courses
   - Choose courses that:
     * Complement the student's completed coursework
     * Follow a logical progression
     * Avoid duplicates
     * Consider prerequisites
   - If a maximum unit limit is specified (e.g., "maximum of 8 units of course 199"), respect that limit

3. For technical breadth requirements:
   - Select the specified number of courses
   - Choose courses that complement the major requirements
   - Consider the student's completed courses

4. DO NOT include courses that the student has already completed

5. Include course IDs only, not descriptions

### Example Response Format:
{
  "courses": [
    "COMSCI 31",
    "COMSCI 32",
    "COMSCI 33",
    "MATH 31A",
    "COMSCI 180",
    "COMSCI 111"
  ]
}

### Important:
- Only return course IDs—no explanations or extra text
- Course IDs must be exact—do not modify their format
- Make intelligent selections based on course descriptions and student's background
- Consider prerequisites and course dependencies
- Select EXACTLY the number of courses specified in the requirements
- For electives, choose courses that form a coherent specialization
`;

export const getCoursesToSchedule = async (req, res) => {
  try {
    const { jsonData, transcript } = req.body;
    console.log("Received jsonData:", JSON.stringify(jsonData, null, 2));
    console.log("Received transcript:", JSON.stringify(transcript, null, 2));

    // Handle nested array if present
    const requirements = Array.isArray(jsonData[0]) ? jsonData[0] : jsonData;

    if (!requirements || !Array.isArray(requirements)) {
      console.error("Invalid JSON data format:", requirements);
      return res.status(400).json({ error: "Invalid JSON data format" });
    }

    const allCourses = new Set();

    for (const section of requirements) {
      console.log("\nProcessing section:", section.title);

      // Skip sections without options
      if (!section.options || !Array.isArray(section.options)) {
        console.log("Skipping section without options:", section.title);
        continue;
      }

      for (const option of section.options) {
        console.log("\nProcessing option:", option.title);

        // Skip options without courses
        if (!option.courses || !Array.isArray(option.courses)) {
          console.log("Skipping option without courses:", option.title);
          continue;
        }

        const sectionJson = JSON.stringify(section, null, 2);
        const transcriptJson = JSON.stringify(transcript, null, 2);
        const userPrompt = `Here is the next section of the major requirements:\n\`\`\`json\n${sectionJson}\n\`\`\`\n\nAnd here are the courses the student has already completed:\n\`\`\`json\n${transcriptJson}\n\`\`\`\n\nPlease analyze the course descriptions and titles, and select the most appropriate courses based on the student's completed courses and the logical progression of the major. Pay special attention to the number of courses required for each section, especially for electives.`;
        console.log("Sending prompt to GPT:", userPrompt);

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0,
          });

          console.log("GPT Response:", JSON.stringify(completion, null, 2));

          const content = completion.choices[0].message.content;
          if (!content) {
            console.error("No content returned from GPT");
            continue;
          }

          try {
            // Remove markdown code block formatting if present
            const jsonContent = content.replace(/```json\n|\n```/g, "").trim();
            console.log("Cleaned JSON content:", jsonContent);

            const parsed = JSON.parse(jsonContent);
            console.log("Parsed courses from GPT:", parsed);

            if (!parsed.courses || !Array.isArray(parsed.courses)) {
              console.error("Invalid courses format in GPT response:", parsed);
              continue;
            }

            const courses = parsed.courses;
            console.log("Adding courses:", courses);

            courses.forEach((course) => {
              if (typeof course === "string" && course.trim()) {
                allCourses.add(course.trim());
              }
            });

            console.log(
              `Processed section successfully. Current courses:`,
              Array.from(allCourses)
            );
          } catch (parseError) {
            console.error("Error parsing GPT response:", parseError);
            console.error("Raw response:", content);
          }
        } catch (err) {
          console.error(`Error processing section:`, err.message);
        }
      }
    }

    const finalList = {
      courses: Array.from(allCourses),
    };

    console.log(
      "\n🎓 Final Structured Course List:",
      JSON.stringify(finalList, null, 2)
    );

    if (finalList.courses.length === 0) {
      console.error(
        "No courses were selected. This might indicate an issue with the GPT response or data processing."
      );
    }

    res.json(finalList);
  } catch (error) {
    console.error("Error in getCoursesToSchedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
