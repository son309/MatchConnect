import express from "express";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import {
  getAdminOverview,
  getAdminReports,
  getAdminUsers,
  updateReportStatus,
  updateUserModeration,
  updateProfileVerification,
  deleteUserPermanently,
  removeUserDatingPhoto,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute, requireAdmin);

router.get("/overview", getAdminOverview);
router.get("/reports", getAdminReports);
router.patch("/reports/:reportId", updateReportStatus);
router.get("/users", getAdminUsers);
router.patch("/users/:userId/moderation", updateUserModeration);
router.patch("/users/:userId/verification", updateProfileVerification);
router.delete("/users/:userId/dating-photos/:photoIndex", removeUserDatingPhoto);
router.delete("/users/:userId", deleteUserPermanently);

export default router;