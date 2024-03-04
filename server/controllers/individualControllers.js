import { validationResult } from "express-validator";
import { generateReminders } from "../utils/helpers.js";
import IndividualTaskyModel from "../model/Individual.js";
import {createClient} from "redis" //microservice access token
import axios from "axios"

let client = createClient();


async function getTasksController(req, res){
    try{
        let userId = req.user.userId;
        let userData = await IndividualTaskyModel.findById(userId);
        let tasks = userData.tasks;
        return res.status(200).json({success : {msg : `welcome, ${userData.firstname}!`, tasks}, errors : []}); 
    }catch(err){
        console.log(err);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


/*
API : /user/tasks/:taskId
method : GET
description : specific todo 
*/
async function getTaskByIdController(req, res) {
    try{
        const result = validationResult(req);
        const userId = req.user.userId;
        let taskId = req.params.taskId;
        let taskData = await IndividualTaskyModel.findOne({ '_id': userId }, { 'tasks': { $elemMatch: { '_id': taskId } } });
        if(!result.isEmpty()){
            res.send(400).json({errors : result.array(), success : ""})
        }else{
            res.status(200).json({success : {tasks : taskData.tasks[0]}, errors : []});
        }   
    }catch(err){
        console.log(err.message);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


/*
API : /user/tasks/edit/:taskId
method : PUT
description : edit todo
*/
async function editTaskController(req, res) {
    try{
        const result = validationResult(req);
        const userId = req.user.userId;
        let taskId = req.params.taskId;
        if(!result.isEmpty()){
            let userData = await IndividualTaskyModel.findById(userId);
            res.status(400).json({errors : result.array(), success : {tasks : userData.tasks}})
        }else{
            //reminders re-generated if task is being re-scheduled by user
            if(req.body.taskstatus == false){
                req.body.reminders = generateReminders(req.body.deadline); 
            }
            req.body._id = taskId; //id added to payload
            const updatedTasks = await IndividualTaskyModel.findByIdAndUpdate(
                userId,
                { $set: { 'tasks.$[task]': {...req.body} } },
                { new: true, arrayFilters: [{ 'task._id': taskId }] }
            );
            let newTask = updatedTasks.tasks[updatedTasks.tasks.length - 1];
            let token = req.headers["x-auth-header"];
            if(newTask.taskstatus == false){
                let delJobApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/individual/jobs/delete-job/${taskId}`, {}, {
                    headers : {
                        "x-auth-header" : token
                    }
                })
                console.log(`delete jobs : `, delJobApiRes.data.success.msg);
                let addJobsApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/individual/jobs/add-job`, newTask, {
                    headers : {
                        "x-auth-header" : token
                    }
                })
                console.log(`add jobs : `, addJobsApiRes.data.success.msg);
            }else{
                let delJobApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/individual/jobs/delete-job/${taskId}`, {}, {
                    headers : {
                        "x-auth-header" : token
                    }
                })
                console.log(`delete jobs : `, delJobApiRes.data.success.msg);
            }
            return res.status(200).json({errors : [], success : {msg : "task edited!", tasks : updatedTasks.tasks}});
        }   
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


/*
API : /user/tasks/add
method : POST
description : user todo insert
*/
async function deleteTaskController(req, res) {
    try{
        const userId = req.user.userId;
        let taskId = req.params.taskId;
        const result = validationResult(req);
        if(!result.isEmpty()){
            let userData = await IndividualTaskyModel.findById(userId);
            return res.status(400).json({errors : result.array(), success : {tasks : userData.tasks}})
        }else{
            const updatedTasks = await IndividualTaskyModel.findByIdAndUpdate(
                userId,
                { $pull: { 'tasks': { _id: taskId } } },
                { new: true }
            );
            let token = req.headers["x-auth-header"];
            let delJobApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/individual/jobs/delete-job/${taskId}`, {}, {
                headers : {
                    "x-auth-header" : token
                }
            })
            let apiMsg = delJobApiRes.data.success.msg;
            res.status(200).json({success : {msg : "task deleted successfully", tasks : updatedTasks.tasks}});
        }
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}

/*
API : /user/tasks/add
method : POST
description : user todo insert
*/
async function addTaskController(req, res){
    try{
        const result = validationResult(req);
        const userId = req.user.userId; 
        if(!result.isEmpty()){
            let userData = await IndividualTaskyModel.findById(userId);
            return res.status(400).json({errors : result.array(), success : {tasks : userData.tasks}})
        }else{
            req.body.reminders = generateReminders(req.body.deadline);
            //nested array mongodb push query
            let updatedTasks = await IndividualTaskyModel.findByIdAndUpdate(userId, {$push : {'tasks' : {...req.body}}}, {new : true})
            let newTask = updatedTasks.tasks[updatedTasks.tasks.length - 1];
            let token = req.headers["x-auth-header"];
            let addJobsApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/individual/jobs/add-job`, newTask, {
                headers : {
                    "x-auth-header" : token
                }
            })
            let apiMsg = addJobsApiRes.data.success.msg;
            return res.status(200).json({errors : [], success : {msg : `task added! ${apiMsg}`, tasks : updatedTasks.tasks}});
        }
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


export { getTasksController, getTaskByIdController, addTaskController, editTaskController, deleteTaskController };