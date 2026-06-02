import { Router } from "express";
import { getAppVersion } from "../controllers/appController";

const router = Router();

router.get("/version", getAppVersion);

export default router;
