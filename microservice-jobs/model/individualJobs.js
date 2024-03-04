import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    task : {
        type : String,
        required : true
    },
    user : { 
        type : String,
        required : true
    },
    usertype : {
        type : String,
        default : "individual"
    },
    notificationtype : {
        type : String,
        required : true
    },
    actionpayload : {
        type : Object,
        required : true
    },
    timestamp : {
        type : Date,
        required : true
    },
    chronstatus : { //update to true once chron is fired
        type : Boolean,
        default : false 
    },
    jobstatus : {   //update to true once job is executed
        type : Boolean,
        default : false
    }
})

const IndividualJobModel = mongoose.model("IndividualJob", jobSchema, "individual-jobs");

export default IndividualJobModel;