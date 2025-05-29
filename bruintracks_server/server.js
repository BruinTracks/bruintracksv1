import express from "express";
import cors from "cors";
import schoolRoutes from "./routes/school_routes.js";
import majorRoutes from "./routes/major_routes.js";
import courseRoutes from "./routes/course_routes.js";
import instructorRoutes from "./routes/instructor_routes.js";
import scheduleRoutes from "./routes/schedule_routes.js";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/schools", schoolRoutes);
app.use("/majors", majorRoutes);
app.use("/courses", courseRoutes);
app.use("/instructors", instructorRoutes);
app.use("/api/schedule", scheduleRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
