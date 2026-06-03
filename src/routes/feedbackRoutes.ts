import { Router } from "express";
import {
  getAdminFeedback,
  getMyFeedback,
  postFeedback,
} from "../controllers/feedbackController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.post("/", postFeedback);
router.get("/mine", getMyFeedback);
router.get("/admin", requireRole("admin"), getAdminFeedback);

export default router;
