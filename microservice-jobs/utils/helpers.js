import IndividualJobModel from "../model/individualJobs.js"
import OrganisationJobModel from "../model/organisationJobs.js"
import sendEmail from "./sendEmail.js"
import sendSms from "./sendSms.js"
import { scheduledJobs, scheduleJob } from "node-schedule";


function fetchScheduledJobs(){
    let jobs = [], obj={};
    for(const jobId in scheduledJobs){
        obj._id = jobId;
        obj.timeStamp = scheduledJobs[jobId].nextInvocation().toString();
        jobs.push(obj);
        obj = {};
    }
    return jobs;
}

async function retrieveJobs(req, res){
    try{
        //query for jobs : false, if chron : true (fire immediatelly, else retrieve)
        let individualJobs = await IndividualJobModel.find({jobstatus : false});
        let organisationJobs = await OrganisationJobModel.find({jobstatus : false});
        let jobs = [...individualJobs, ...organisationJobs];
        jobs.forEach(async (job)=>{
            let model = job.usertype == 'organisation' ? OrganisationJobModel : IndividualJobModel;
            let action = job.notificationtype == 'email' ? sendEmail : sendSms;
            if(job.chronstatus == true){
                action(job.actionpayload, job._id);
                await model.findByIdAndDelete(job._id)
            }else{
                scheduleJob(`${job._id}`, new Date(job.timestamp), async ()=>{
                    await model.findByIdAndUpdate(job._id, {chronstatus : true});
                    action(job.actionpayload, job._id);
                })
            }
        })
        console.log(fetchScheduledJobs());
        res.status(200).send("all jobs retirieved!")
    }catch(error){
        console.log(error.message);
    }
}

export {fetchScheduledJobs, retrieveJobs}