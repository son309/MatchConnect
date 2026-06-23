import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { createReport, getMyReports } from "../controllers/report.controller.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.post("/:userId", createReport);
router.get("/", getMyReports);

export default router;
