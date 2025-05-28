import express from "express";
import userRoutes from "./routes/course_routes.js";
import cors from "cors";
import scheduleRoutes from "./routes/schedule_routes.js";
import instructorRoutes from "./routes/instructor_routes.js";
import schoolRoutes from "./routes/school_routes.js";
import majorRoutes from "./routes/major_routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parses JSON requests
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded form data
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Routes
app.use("/courses", userRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/instructors", instructorRoutes);
app.use("/schools", schoolRoutes);
app.use("/majors", majorRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
