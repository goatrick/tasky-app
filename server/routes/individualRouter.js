import express from "express";
import { taskDataValidation } from "../middlewares/validationMiddleware.js";
import {body, param} from "express-validator";
import { getTaskByIdController, getTasksController, addTaskController,  editTaskController, deleteTaskController} from "../controllers/individualControllers.js";
import { individualTokenAuthMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.use(individualTokenAuthMiddleware)

router.get("/tasks", 
    getTasksController);

router.get("/tasks/:taskId", 
    param('taskId').isMongoId().withMessage("the taskId must be mongo object ID"),
    getTaskByIdController);

router.post("/tasks/add", 
    taskDataValidation(),
    addTaskController);

router.put("/tasks/edit/:taskId", 
    body("taskstatus").isBoolean().withMessage("status must be boollean"),
    taskDataValidation(),
    param('taskId').isMongoId().withMessage("the taskId must be mongo object ID"),
    editTaskController);

router.delete("/tasks/delete/:taskId", 
    param('taskId').isMongoId().withMessage("the taskId must be mongo object ID"),
    deleteTaskController);

export default router