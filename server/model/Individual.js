import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
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
});


const individualTaskySchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  email: { 
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true,
    unique: true
  },
  usertype: {
    type: String,
    default: "individual",
  },
  accounttype: {
    type: String,
    default: "freemium",
  },
  isverified : {
    email : {
      type : Boolean,
      default : false
    },
    mobile : {
      type : Boolean,
      default : false
    }
  },
  verificationcode : {
    email : {
      type : String,
    },
    mobile : {
      type : String,
    }
  },
  tasks: [taskSchema],
});

const IndividualTaskyModel = new mongoose.model(
  "individual",
  individualTaskySchema,
  "individuals"
);

export default IndividualTaskyModel;

