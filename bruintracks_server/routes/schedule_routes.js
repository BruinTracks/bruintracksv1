// routes/scheduling_routes.js
import express from "express";
import {
  scheduleCourses,
  getLatestSchedule,
} from "../controllers/scheduling_controller.js";

const router = express.Router();

// POST /schedule
router.post("/", scheduleCourses);

// GET /schedule/latest
router.get("/latest", getLatestSchedule);

export default router;
