// routes/scheduling_routes.js
import express from 'express';
import { scheduleCourses } from '../controllers/scheduling_controller.js';

const router = express.Router();

// POST /schedule
router.post('/', scheduleCourses);

export default router;