import supabase from "./supabase_client.js";

export const getMajorsBySchool = async (req, res) => {
  try {
    const { school_id } = req.query;
    if (!school_id) {
      return res.status(400).json({ message: "Missing school_id" });
    }
    const { data, error } = await supabase
      .from("majors")
      .select("name")
      .eq("school", school_id);
    if (error) throw error;
    res.status(200).json(data.map((row) => row.name));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
