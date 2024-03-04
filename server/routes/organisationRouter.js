import express from "express";
import { organisationTokenAuthMiddleware } from "../middlewares/authMiddleware.js";
import { getTasksController, getTeamTasksController, getTeamsController, insertTeamController, 
    editTeamController, deleteTeamController, insertMemberController, verifyMemberController, 
    insertTasksController, editTaskController, deleteTaskController, editMemberController, deleteMemberController } from "../controllers/organisationControllers.js";
import { teamMemberValidation, taskDataValidation } from "../middlewares/validationMiddleware.js";
import { body, param } from "express-validator";
const router = express.Router();

//public route
router.get("/verify/member/:verificationcode/:teamId/:userId",
    verifyMemberController);

router.use(organisationTokenAuthMiddleware);

//screen1 (shown if not verified)
router.get("/teams",
    getTeamsController);

//screen2 team-wise tasks -> member (not shown, if not verified) -> task details (add task form)
router.get("/tasks",
    getTasksController);

router.get("/tasks/:teamId",
    param('teamId').isMongoId().withMessage("teamId must be mongo object ID"),
    getTeamTasksController);

router.post("/insert/team",
    body("teamname").isLength({ min: 6, max: 20 }).withMessage("teamname must be a minimum of 6 to 20 characters"),
    insertTeamController);

router.put("/edit/team/:teamId",
    param('teamId').isMongoId().withMessage("teamId must be mongo object ID"),
    body("teamname").isLength({ min: 6, max: 20 }).withMessage("teamname must be a minimum of 6 to 20 characters"),
    editTeamController
)

router.delete("/delete/team/:teamId",
    param('teamId').isMongoId().withMessage("teamId must be mongo object ID"),
    deleteTeamController
)

router.post("/insert/member/:teamId",
    param('teamId').isMongoId().withMessage("teamId must be mongo object ID"),
    teamMemberValidation(),
    insertMemberController);

router.post("/insert/task/:teamId",
    taskDataValidation(),
    param('teamId').isMongoId().withMessage("teamId must be mongo object ID"),
    body("members")
        .custom((value, { req }) => {
            if (Array.isArray(value) && value.length) return true;
            return false;
        }).withMessage("task must be assigned to atleast one member!"),
    insertTasksController);

router.put("/edit/task/:taskId",
    body("taskstatus").isBoolean().withMessage("status must be boollean"),
    param('taskId').isMongoId().withMessage("taskId must be mongo object ID"),
    taskDataValidation(),
    editTaskController);

router.delete("/delete/task/:taskId",
    param('taskId').isMongoId().withMessage("taskId must be mongo object ID"),
    deleteTaskController);    

router.put("/edit/member/:teamId/:memberId",
    param('teamId').isMongoId().withMessage("teamId must be mongo object ID"),
    param('memberId').isMongoId().withMessage("memberId must be mongo object ID"),
    teamMemberValidation(),
    editMemberController);

router.delete("/delete/member/:teamId/:memberId",
    param('teamId').isMongoId().withMessage("teamId must be mongo object ID"),
    param('memberId').isMongoId().withMessage("memberId must be mongo object ID"),
    deleteMemberController);

export default router