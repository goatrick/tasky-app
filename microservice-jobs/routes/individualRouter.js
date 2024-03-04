import express from "express";
import { individualAuthMiddleware } from "../middlewares/authMiddleware.js";
import { addJobController, deleteJobController } from "../controllers/jobsControllers.js";
const router = express.Router();

router.use(individualAuthMiddleware);

router.post("/add-job", addJobController);

router.post("/delete-job/:taskId", deleteJobController);

export default router;


/*
app.use("/retrieve", (req, res)=>{
    try{

    }catch(error){
        
    }
});

*/