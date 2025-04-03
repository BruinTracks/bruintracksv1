import supabase from './supabase_client.js';

// get all courses for a major
export const getCourses = async (req, res) => {
    try {
        const major_name = req.body.majorName
        if (!major_name) {
            return res.status(400).json({ message: "majorName is required" });
        }
        const { data, error } = await supabase.from('all_courses').select('courses').eq('major_name',major_name);

        if (error) throw error;

        res.status(200).json(data?.[0]?.courses || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

