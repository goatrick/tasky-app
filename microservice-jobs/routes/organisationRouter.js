import express from "express";
import { organisationAuthMiddleware } from "../middlewares/authMiddleware.js";
import { addJobController, deleteJobController } from "../controllers/jobsControllers.js";
const router = express.Router();

router.use(organisationAuthMiddleware);

router.post("/add-job", addJobController);

router.post("/delete-job/:taskId", deleteJobController);

export default router;