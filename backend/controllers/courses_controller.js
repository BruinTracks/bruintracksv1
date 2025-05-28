import supabase from "./supabase_client.js";

// get all courses for a major
export const getCourses = async (req, res) => {
  try {
    const major_name = req.body.majorName;
    if (!major_name) {
      return res.status(400).json({ message: "majorName is required" });
    }
    const { data, error } = await supabase
      .from("all_courses")
      .select("courses")
      .eq("major_name", major_name);

    if (error) throw error;

    res.status(200).json(data?.[0]?.courses || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCoursesByMajors = async (req, res) => {
  try {
    const { majors } = req.body;

    if (!majors || !Array.isArray(majors)) {
      return res.status(400).json({ error: "Majors array is required" });
    }

    const { data, error } = await supabase
      .from("all_courses")
      .select("courses")
      .in("major_name", majors);

    if (error) {
      console.error("Error fetching courses:", error);
      return res.status(500).json({ error: "Failed to fetch courses" });
    }

    // Combine all courses from different majors and remove duplicates
    const allCourses = [...new Set(data.flatMap((row) => row.courses))];

    res.status(200).json(allCourses);
  } catch (error) {
    console.error("Error in getCoursesByMajors:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
