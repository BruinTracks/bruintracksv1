import express from "express";
import { getMajorsBySchool } from "../controllers/majors_controller.js";

const router = express.Router();

router.get("/", getMajorsBySchool);

export default router;
