import express from 'express';
import { getCourses } from '../controllers/courses_controller.js';

const router = express.Router();

// Routes
router.get('/get_courses', getCourses); 

export default router;
