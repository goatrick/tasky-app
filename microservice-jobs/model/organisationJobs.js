import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    //in relation to pool -> original taskId+count 
    task : {
        type : String,
        required : true
    },
    usertype : { //not referenced (otherwise we need 2 models)
        type : String,
        default : "organisation"
    },
    user : {
        type : String,
        required : true
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

const OrganisationJobModel = mongoose.model("OrganisationJob", jobSchema, "organisation-jobs");

export default OrganisationJobModel;