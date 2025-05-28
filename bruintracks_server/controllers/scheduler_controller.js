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
2. For elective requirements:
   - Select specific courses based on the student's completed courses and major requirements
   - Choose courses that complement their completed coursework
3. DO NOT include courses that the student has already completed
4. Include course IDs only, not descriptions
5. Consider prerequisites and course dependencies when making selections

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
`;

export const getCoursesToSchedule = async (req, res) => {
  try {
    const { jsonData, transcript } = req.body;
    console.log("Received jsonData:", JSON.stringify(jsonData, null, 2));
    console.log("Received transcript:", JSON.stringify(transcript, null, 2));

    if (!jsonData || !Array.isArray(jsonData)) {
      console.error("Invalid JSON data format:", jsonData);
      return res.status(400).json({ error: "Invalid JSON data format" });
    }

    const allCourses = new Set();

    for (const section of jsonData) {
      console.log("\nProcessing section:", JSON.stringify(section, null, 2));
      const sectionJson = JSON.stringify(section, null, 2);
      const transcriptJson = JSON.stringify(transcript, null, 2);
      const userPrompt = `Here is the next section of the major requirements:\n\`\`\`json\n${sectionJson}\n\`\`\`\n\nAnd here are the courses the student has already completed:\n\`\`\`json\n${transcriptJson}\n\`\`\`\n\nPlease analyze the course descriptions and titles, and select the most appropriate courses based on the student's completed courses and the logical progression of the major.`;
      console.log("Sending prompt to GPT:", userPrompt);

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt4-o",
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
          const parsed = JSON.parse(jsonContent);
          console.log("Parsed courses from GPT:", parsed);
          const courses = parsed.courses || [];

          courses.forEach((course) => allCourses.add(course));
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

    const finalList = {
      courses: Array.from(allCourses),
    };

    console.log(
      "\n🎓 Final Structured Course List:",
      JSON.stringify(finalList, null, 2)
    );

    res.json(finalList);
  } catch (error) {
    console.error("Error in getCoursesToSchedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
