// routes/scheduling_routes.js
import express from "express";
import {
  scheduleCourses,
  getLatestSchedule,
} from "../controllers/scheduling_controller.js";
import { handleScheduleEdit } from "../controllers/schedule_edit_controller.js";

const router = express.Router();

// POST /schedule
router.post("/", scheduleCourses);

// GET /schedule/latest
router.get("/latest", getLatestSchedule);

// POST /schedule/edit - Basic endpoint for schedule editing
router.post("/edit", handleScheduleEdit);

export default router;
