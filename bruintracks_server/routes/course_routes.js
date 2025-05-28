import express from "express";
import {
  getCourses,
  getCoursesByMajors,
} from "../controllers/courses_controller.js";

const router = express.Router();

// Routes
router.post("/get_courses", getCourses);
router.post("/by-majors", getCoursesByMajors);

export default router;
