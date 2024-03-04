import express from "express";
import {body} from "express-validator";
import { cookieAuthMiddleware } from "../middlewares/authMiddleware.js";
import { userRegistrationValidationRules, passwordResetValidation } from "../middlewares/validationMiddleware.js"
import { userRegisterPostController, userLoginPostController, verifyUserController, forgotPasswordController, verifyForgotPasswordController , resetPasswordController} from "../controllers/userControllers.js"
const router = express.Router();

/* resend verification, forgot password, logout */

router.post("/register", 
    userRegistrationValidationRules(), 
    userRegisterPostController);

router.post("/login",
    body("usertype").isIn(['individual', 'organisation']).withMessage("usertype is invald"),
    userLoginPostController);

router.get("/verify/:verificationcode/:usertype", 
    verifyUserController);

router.post("/forgot-password", 
    forgotPasswordController);

router.get("/verify-forgot-password/:email/:verificationcode/:usertype", 
    verifyForgotPasswordController);

router.post("/reset-password/:verificationcode", 
    passwordResetValidation(), 
    resetPasswordController)

export default router