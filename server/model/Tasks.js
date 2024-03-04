import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    organisation : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Organisation"
    },
    team : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Organisation",
    },
    member : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Organisation"
    },
    taskname: {
        type: String,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    taskstatus: {
        type: Boolean,
        default: false
    },
    reminders: [Date]
})

const OrganisationTasksModel = new mongoose.model("OrgTask", taskSchema, "orgtasks");

export default OrganisationTasksModel