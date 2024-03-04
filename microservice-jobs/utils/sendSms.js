import twilio from "twilio";
import IndividualJobModel from "../model/individualJobs.js";

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

//configuring connection to send SMS from given phone number to inputed data -> returns a delivery status report 
async function sendSms(msgData, taskId){
    try{    
        let messageStatus = await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            body: msgData.message,
            to: msgData.mobile
        })
        if(messageStatus.sid){
            await IndividualJobModel.findOneAndUpdate({task : taskId, notificationtype : "sms"}, {jobstatus : true});
            console.log(messageStatus.sid);
        }
    }catch(error){
        console.log(error.message);
    }
}

export default sendSms