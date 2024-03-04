import ejs from "ejs";
import sendEmail from "../utils/sendEmail.js";
import sendSms from "../utils/sendSms.js";
import fs from "fs"
import IndividualJobModel from "../model/individualJobs.js";
import OrganisationJobModel from "../model/organisationJobs.js";
import { scheduleJob, scheduledJobs } from "node-schedule";
import { fetchScheduledJobs } from "../utils/helpers.js";

async function addJobController(req, res){
    try{
        //must be extracted from token
        let task = req.body;
        let {email, mobile, userId, usertype} = req.user;
        let model = (usertype == "individual") ? IndividualJobModel : OrganisationJobModel;
        let reminders = task.reminders;
        let calls=[], count = 0;
        reminders.forEach(async (deadline)=>{
            ++count;
            let smsData = {
                message : `reminder for : ${task.taskname}, \n deadline : ${task.deadline}`,
                mobile
            }
            let emailData = {
                to : email,
                subject : `Friendly Reminder to ${task.taskname}!`,
                html : ejs.render(fs.readFileSync("./templates/emailReminder.ejs", "utf-8"), {
                    fname : `${task.firstname}`,
                    taskname : `${task.taskname}`,
                    deadline : `${Date(task.deadline)}`
                })
            }
            let smsJob = new model({task : `${task._id}${count}`, user : userId, timestamp : deadline, actionpayload : smsData, notificationtype : "sms"})
            let emailJob = new model({task : `${task._id}${count}`, user : userId, timestamp : deadline, actionpayload : emailData, notificationtype : "email"})
            calls.push(smsJob.save(), emailJob.save());
            //add jobs to pool
            let count2 = count;
            scheduleJob(`${task._id}${count2}`, new Date(deadline) , async function(){
                //id of job (sms and email)
                let id = `${task._id}${count2}`;
                //chron - true
                await model.findOneAndUpdate({task : id, notificationtype : "email"}, {chronstatus : true});
                await model.findOneAndUpdate({task : id, notificationtype : "sms"}, {chronstatus : true});
                sendSms(smsData, id);
                sendEmail(emailData, id);
                //job - true
            })
        }) 
        //handled concurrently, all insert task requests are fired almost simultaneously. By the time all promises are handled, jobs are in pool already. 
        Promise.all(calls)
            .then(()=>{
                console.log(fetchScheduledJobs());  
                return res.status(200).json({success : {msg : "jobs scheduled!"}})
            })
    }catch(error){
        console.log(error.message);
        return res.status(500).json({errors : [{msg : error.message, path : "internalError"}]})
    }
}

async function deleteJobController(req, res){
    try{
        let {usertype} = req.user;
        let taskId = req.params.taskId;
        let model = (usertype == "individual") ? IndividualJobModel : OrganisationJobModel;
        //new RegExp(`${taskId}\\d[1-3]$`)
        const taskIds = [...Array(3)].map((value, index) => `${taskId}${++index}`);
        await model.deleteMany({ task: { $in: taskIds } });
        for(const jobId in scheduledJobs){
            if(jobId.slice(0, jobId.length-1) == taskId){ 
                scheduledJobs[jobId].cancel();
            }
        }
        console.log(fetchScheduledJobs());
        return res.status(200).json({success : {msg : "scheduled jobs flushed!"}})
    }catch(error){
        console.log(error.message);
        return res.status(500).json({errors : [{msg : error.message, path : "internalError"}]})
    }
}


export {addJobController, deleteJobController}
