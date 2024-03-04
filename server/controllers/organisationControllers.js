import OrganisationTaskyModel from "../model/Organisation.js";
import OrganisationTasksModel from "../model/Tasks.js";
import sendEmail from "../utils/sendEmail.js";
import sendSms from "../utils/sendSms.js";
import fs from "fs";
import ejs from "ejs";
import { validationResult } from "express-validator";
import { generateReminders, fetchTasksForTeams } from "../utils/helpers.js";
import {createClient} from "redis" //microservice access token
import axios from "axios"

let client = createClient();

//Screen1
async function getTeamsController(req, res){
    try{
        let userId = req.user.userId;
        let orgData = await OrganisationTaskyModel.findById(userId);
        let teams = orgData.teams;
        //display only member's who are verified for add task (as checkbox options)
        return res.status(200).json({success : {msg : `welcome, ${orgData.firstname}!`, teams}, errors : []}); 
    }catch(err){  
        console.log(err);  
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


//screen2 (All tasks)
async function getTasksController(req, res){
    try{
        let userId = req.user.userId;
        let org = await OrganisationTaskyModel.findById(userId, "teams");
        let teams = org.teams;
        let taskData = await fetchTasksForTeams(teams)
        res.status(200).json({success : {tasks : taskData, msg : "tasks fetched successfully"}, errors : []})
    }catch(err){
        console.log(err);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


//screen2 (team tasks)
async function getTeamTasksController(req, res){
    try{
        let userId = req.user.userId;
        let teamId = req.params.teamId;
        const result = validationResult(req);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }
        let orgData = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'_id' : teamId}}});
        let teams = orgData.teams;
        let taskData = await fetchTasksForTeams(teams)
        res.status(200).json({success : {tasks : taskData, msg : "team tasks fetched successfully"}, errors : []})
    }catch(err){
        console.log(err);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function insertTeamController(req, res){
    try{
        const result = validationResult(req);
        let userId = req.user.userId;
        let userData = await OrganisationTaskyModel.findById(userId);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : {teams : userData.teams}})
        }
        let teamname = req.body.teamname;
        let team = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'teamname' : teamname}}});
        //team-exists
        if(team.teams.length){
            return res.status(400).json({errors : "teamnames cannot be duplicated!", success : {teams : userData.teams}})
        }
        let orgData = await OrganisationTaskyModel.findByIdAndUpdate(userId, {$push : {'teams' : {teamname, members : []}}}, {new : true})
        return res.status(200).json({success : {msg : `${teamname} inserted!`, teams : orgData.teams}, errors : []}); 
    }catch(err){
        console.log(err)
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function insertMemberController(req, res){
    try{
        const result = validationResult(req);
        let userId = req.user.userId;
        let teamId = req.params.teamId;
        let {firstname, email, mobile} = req.body;
        let userData = await OrganisationTaskyModel.findById(userId);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : {teams : userData.teams}})
        }else{
            let emailVerificationCode = [...Array(12)].map(() => Math.random().toString(36)[2]).join('');
            let mobileVerificationCode = [...Array(12)].map(() => Math.random().toString(36)[2]).join('');
            let member = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'_id' : teamId, 'members': {
                $elemMatch: {
                  $or: [
                    {'email': email},
                    {'mobile': mobile}
                  ]
                }
              }}}});
            //member exists
            if(member.teams.length){
                return res.status(400).json({errors : "member already exists!", success : {teams : userData.teams}})
            }
            const orgData = await OrganisationTaskyModel.findByIdAndUpdate(
                userId,
                { $push: { 'teams.$[team].members':  {firstname, mobile, email, verificationcode : {email : emailVerificationCode, mobile : mobileVerificationCode}}} },
                { new : true, arrayFilters: [{ 'team._id': teamId }] }
            );
            let teamName = orgData.teams[0].teamname;
            //email verification
            sendEmail({
                to : `${email}`,
                subject : `you've been added to ${teamName} team!!`,
                html : ejs.render(fs.readFileSync("templates/verifyMember.ejs", "utf-8"), {
                    fname : `${firstname}`,
                    team : `${teamName}`,
                    link : `${process.env.HOST_NAME}/api/organisation/verify/member/${emailVerificationCode}/${teamId}/${userId}`,
                })
            })
            // sms verification
            sendSms({
                message : `\nHello ${firstname},\nclick link to verify number : ${process.env.HOST_NAME}/api/organisation/verify/member/${mobileVerificationCode}/${teamId}/${userId}`,
                mobile : `${mobile}`
            })
            //verification sent prompt "members can be assigned tasks only after verification!"
            return res.status(200).json({success : {msg : `member added successfull to ${teamName}`, teams : orgData.teams, verificationSent : true}, errors : [] });
        }
    }catch(err){
        console.log(err);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function verifyMemberController(req, res){
    try{
        let verificationCode = req.params.verificationcode;
        let teamId = req.params.teamId;
        let userId = req.params.userId;
        let emailVerified = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'_id' : teamId, 'members': {
            $elemMatch: {'verificationcode.email' : verificationCode}
        }}}});
        let mobileVerified = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'_id' : teamId, 'members': {
            $elemMatch: {'verificationcode.mobile' : verificationCode}
        }}}});
        if(emailVerified.teams.length){
            await OrganisationTaskyModel.updateOne(
                {'_id': userId, 'teams._id': teamId, 'teams.members.verificationcode.email': verificationCode},
                {$set: {'teams.$[outer].members.$[inner].isverified.email': true}},
                {arrayFilters: [{'outer._id': teamId}, {'inner.verificationcode.email': verificationCode}]}
            );
            return res.status(200).json({success : {msg : `your email is verified!`}})
        }else if(mobileVerified.teams.length){
            await OrganisationTaskyModel.updateOne(
                {'_id': userId, 'teams._id': teamId, 'teams.members.verificationcode.mobile': verificationCode},
                {$set: {'teams.$[outer].members.$[inner].isverified.mobile': true}},
                {arrayFilters: [{'outer._id': teamId}, {'inner.verificationcode.mobile': verificationCode}]}
            );
            return res.status(200).json({success : {msg : `your mobile is verified!`}})
        }  
        return res.status(200).json({errors : [{msg : "not verified, try again!!", path: "userStatus"}], success : ""});
    }catch(err){
        console.log(err);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}

//task inserted for each member (orgID - token, teamId - param, member - payload) 
//member verification not needed, only verified member/task data is populated in UI by default
async function insertTasksController(req, res){
    try{
        const result = validationResult(req);
        let teamId = req.params.teamId;
        let userId = req.user.userId;
        let {members, taskname, deadline} = req.body;
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }else{
            let reminders = generateReminders(deadline), tasksToInsert = [], calls = [];
            members.forEach(async (member)=>{   
                let obj = {};
                obj.taskname = taskname;
                obj.reminders = reminders;
                obj.deadline = deadline;
                obj.organisation = userId;
                obj.team = teamId;
                obj.member = member;
                tasksToInsert.push(obj);
                let task = new OrganisationTasksModel(obj)
                calls.push(task.save());
            })
            Promise.all(calls)
                .then(async (tasks)=>{
                    let token = req.headers["x-auth-header"]
                    tasks.forEach(async (task)=>{
                        //updates tasks of each memeber
                        await OrganisationTaskyModel.updateOne(
                            {'_id': userId, 'teams._id': teamId, 'teams.members._id': task.member},
                            {$push: {'teams.$[outer].members.$[inner].tasks': task._id}},
                            {arrayFilters: [{'outer._id': teamId}, {'inner._id': task.member}]}
                        ); 
                        let addTaskRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/organisation/jobs/add-job`, task, {
                            headers : {
                                "x-auth-header" : token
                            }
                    })
                    })
                    return res.status(200).json({success : {msg : `task assigned to members!`}})
                })      
        }
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function editTaskController(req, res){
    try{
        const result = validationResult(req);
        const userId = req.user.userId;
        let taskId = req.params.taskId;
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }else{
            //reminders re-generated if task is being re-scheduled by user
            if(req.body.taskstatus == false){
                req.body.reminders = generateReminders(req.body.deadline); 
            }
            req.body._id = taskId; //id added to payload
            const updatedTask = await OrganisationTasksModel.findByIdAndUpdate(
                taskId,
                { $set: { 'taskname': req.body.taskname, 'taskstatus' : req.body.taskstatus, 'deadline' : req.body.deadline, 'reminders' : req.body.reminders } },
                { new: true }
            );
            let token = req.headers["x-auth-header"]
            let newTask = updatedTask;
            if(newTask.taskstatus == false){
                let delJobApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/organisation/jobs/delete-job/${taskId}`, {}, {
                    headers : {
                        "x-auth-header" : token
                    }
                })
                console.log(`delete jobs : `, delJobApiRes.data.success.msg);
                let addJobsApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/organisation/jobs/add-job`, newTask, {
                    headers : {
                        "x-auth-header" : token
                    }
                })
                console.log(`add jobs : `, addJobsApiRes.data.success.msg);
            }else{
                let delJobApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/organisation/jobs/delete-job/${taskId}`, {}, {
                    headers : {
                        "x-auth-header" : token
                    }
                })
                console.log(`delete jobs : `, delJobApiRes.data.success.msg);
            }
            return res.status(200).json({errors : [], success : {msg : "task edited!"}});
        }   
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function deleteTaskController(req, res){
    try{
        const userId = req.user.userId;
        let taskId = req.params.taskId;
        const result = validationResult(req);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }else{
            const deletedTask = await OrganisationTasksModel.findOneAndDelete({ _id: taskId });
            let memberId = deletedTask.member;
            let teamId = deletedTask.team;
            await OrganisationTaskyModel.updateOne(
                {'_id': userId, 'teams._id': teamId, 'teams.members._id': deletedTask.member},
                {$pull: {'teams.$[outer].members.$[inner].tasks': taskId}},
                {arrayFilters: [{'outer._id': teamId}, {'inner._id': memberId}]}
            ); 
            let token = req.headers["x-auth-header"]
            let delJobApiRes = await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/organisation/jobs/delete-job/${taskId}`, {}, {
                headers : {
                    "x-auth-header" : token
                }
            })
            let apiMsg = delJobApiRes.data.success.msg;
            res.status(200).json({success : {msg : "task deleted successfully"}});
        }
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function editTeamController(req, res){
    try{
        let userId = req.user.userId;
        let teamId = req.params.teamId;
        let teamname = req.body.teamname;
        const result = validationResult(req);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }
        let team = await OrganisationTaskyModel.updateOne(
            {_id: userId, 'teams._id': teamId},
            {$set: {'teams.$[outer].teamname' : teamname}},
            {new: true, arrayFilters: [{'outer._id': teamId}]} 
        );
        return res.status(200).json({success : {msg : "teamname successfully updated"}, errors : []});
    }catch(err){
        console.log(err.message);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function deleteTeamController(req, res){
    try{
        let userId = req.user.userId;
        let teamId = req.params.teamId;
        const result = validationResult(req);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }
        //delete tasks
        let deletedTasks = await OrganisationTasksModel.find({team : teamId}, "_id");
        let token = req.headers["x-auth-header"]
        deletedTasks.forEach(async (taskId)=>{
            await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/organisation/jobs/delete-job/${taskId._id.toString()}`, {}, {
                headers : {
                    "x-auth-header" : token
                }
            })
        })
        await OrganisationTasksModel.deleteMany({team : teamId});
        await OrganisationTaskyModel.updateOne(
            {"_id" : userId},
            { $pull: { 'teams': { _id: teamId }}}
        );
        return res.status(200).json({success : {msg : "team successfully deleted"}, errors : []});
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function deleteMemberController(req, res){
    try{
        let teamId = req.params.teamId;
        let memberId = req.params.memberId;
        let userId = req.user.userId;
        const result = validationResult(req);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }
        let deletedTasks = await OrganisationTasksModel.find({member : memberId}, "_id");
        let token = req.headers["x-auth-header"]
        deletedTasks.forEach(async (taskId)=>{
            await axios.post(`${process.env.HOST_NAME_MICROSERVICE}/api/organisation/jobs/delete-job/${taskId._id.toString()}`, {}, {
                headers : {
                    "x-auth-header" : token
                }
            })
        })
        await OrganisationTasksModel.deleteMany({member : memberId});
        await OrganisationTaskyModel.updateOne(
            {'_id': userId, 'teams._id': teamId, 'teams.members._id': memberId},
            {$pull: {'teams.$[outer].members': {_id : memberId}}},
            {arrayFilters: [{'outer._id': teamId}]}
        ); 
        return res.status(200).json({success : {msg : "member successfully deleted"}, errors : []});
    }catch(err){
        if(err.response){   
            return res.status(500).json({errors : [{msg : err.response.statusText, path : "internalError"}]});
        }
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


async function editMemberController(req, res){
    try{
        let teamId = req.params.teamId;
        let memberId = req.params.memberId;
        let userId = req.user.userId;
        let {firstname, email, mobile} = req.body;
        const result = validationResult(req);
        if(!result.isEmpty()){
            return res.status(400).json({errors : result.array(), success : ""})
        }
        let member = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'_id' : teamId, 'members': {
            $elemMatch: {
              '_id' : memberId 
            }
          }}}});
        let prevEmail = member.teams[0].members[0].email, prevMobile = member.teams[0].members[0].mobile, teamName = member.teams[0].teamname, prevFirstName = member.teams[0].members[0].firstname;
        let emailVerificationCode = member.teams[0].members[0].verificationcode.email;
        let mobileVerificationCode = member.teams[0].members[0].verificationcode.mobile;
        if(firstname != prevFirstName){
            await OrganisationTaskyModel.updateOne(
                {_id: userId, 'teams._id': teamId, 'teams.members._id': memberId},
                {$set: {'teams.$[outer].members.$[inner].firstname' : firstname}},
                {new: true, arrayFilters: [{'outer._id': teamId}, {'inner._id': memberId}]} 
            );
        }
        if(prevEmail != email){
            let member = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'_id' : teamId, 'members': {
                $elemMatch: {'email': email},
            }}}});
            //member exists
            if(member.teams.length) return res.status(400).json({errors : "member with that email already exists!", success : {teams : userData.teams}})
            await OrganisationTaskyModel.updateOne(
                {_id: userId, 'teams._id': teamId, 'teams.members._id': memberId},
                {$set: {'teams.$[outer].members.$[inner].email' : email,
                        'teams.$[outer].members.$[inner].isverified.email' : false}},
                {new: true, arrayFilters: [{'outer._id': teamId}, {'inner._id': memberId}]} 
            );
            //email verification
            sendEmail({
                to : `${email}`,
                subject : `you've been added to ${teamName} team!!`,
                html : ejs.render(fs.readFileSync("templates/verifyMember.ejs", "utf-8"), {
                    fname : `${firstname}`,
                    team : `${teamName}`,
                    link : `${process.env.HOST_NAME}/api/organisation/verify/member/${emailVerificationCode}/${teamId}/${userId}`,
                })
            })
        }
        if(prevMobile != mobile){
            let member = await OrganisationTaskyModel.findOne({'_id' : userId}, {'teams' : {$elemMatch : {'_id' : teamId, 'members': {
                $elemMatch: {'mobile': mobile},
            }}}});
            //member exists
            if(member.teams.length) return res.status(400).json({errors : "member with that mobile already exists!", success : {teams : userData.teams}})
            await OrganisationTaskyModel.updateOne(
                {_id: userId, 'teams._id': teamId, 'teams.members._id': memberId},
                {$set: {'teams.$[outer].members.$[inner].mobile' : mobile,
                        'teams.$[outer].members.$[inner].isverified.mobile' : false}},
                {new: true, arrayFilters: [{'outer._id': teamId}, {'inner._id': memberId}]} 
            );
            // sms verification
            sendSms({
                message : `\nHello ${firstname},\nclick link to verify number : ${process.env.HOST_NAME}/api/organisation/verify/member/${mobileVerificationCode}/${teamId}/${userId}`,
                mobile : `${mobile}`
            })
        }
        return res.status(200).json({success : {msg : "member successfully edited. Please verify new member details!"}, errors : []});
    }catch(err){
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}



export {getTeamsController, getTasksController, getTeamTasksController, insertTeamController, 
    insertMemberController, deleteMemberController, editMemberController, verifyMemberController, 
    insertTasksController, editTaskController, deleteTaskController, editTeamController, 
    deleteTeamController}


    //getMemberByIdController, getTeamByIdController (tasks?)