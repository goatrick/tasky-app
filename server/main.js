import fs from "fs"
import bcrypt from "bcrypt"
import "dotenv/config"
import "./utils/dbConnect.js"
import OrganisationTaskyModel from "./model/Organisation.js"
import IndividualTaskyModel from "./model/Individual.js"
import OrganisationTasksModel from "./model/Tasks.js"

function addReminders(input) {
    const deadline = new Date(input);
    const currentTime = new Date();
    const timeDiff = deadline.getTime() - currentTime.getTime();
    let reminders = [], reminder;

    //array of objects with IDs and data/time as key/value pairs
    for (let i = 1; i < 4; i++) {
        reminder = (timeDiff * i / 4);
        reminders.push(new Date(currentTime.getTime() + reminder));
    }

    return reminders;
}

//seed static info -> individual Model
async function seedUsers(users) {
    try{
        users.forEach(async (user) => {
            let salt = bcrypt.genSaltSync(12);
            let hashedPwd = bcrypt.hashSync(user.password, salt);
            user.password = hashedPwd;
            user.isverified = {
                mobile : true,
                email : true
            }
            user.verificationcode = {
                mobile : [...Array(12)].map(el => Math.random().toString(36)[2]).join(""),
                email : [...Array(12)].map(el => Math.random().toString(36)[2]).join("")
            }
        })
        await IndividualTaskyModel.insertMany(users);
        console.log("users seeded");
    }catch(error){
        console.log(error.message);
    }
}

//seed individual tasks
async function seedUserTasks(tasks, userId) {
    try{
        let user = await IndividualTaskyModel.findById(userId);
        let seedTasks = tasks.slice(0, 10);
        seedTasks.forEach((task, j) => {
            seedTasks[j].reminders = addReminders(task.deadline);
        })
        user.tasks = seedTasks;
        await user.save();
    }catch(error){
        console.log(error.message);
    }
}


async function seedOrgs(orgs) {
    try{
        orgs.forEach(async (org) => {
            let salt = bcrypt.genSaltSync(12);
            let hashedPwd = bcrypt.hashSync(org.password, salt);
            org.password = hashedPwd;
            org.isverified = {
                mobile : true,
                email : true
            }
            org.verificationcode = {
                mobile : [...Array(12)].map(el => Math.random().toString(36)[2]).join(""),
                email : [...Array(12)].map(el => Math.random().toString(36)[2]).join("")
            }
        })
        await OrganisationTaskyModel.insertMany(orgs)
        console.log("organisations inserted");
    }catch(error){
        console.log(error.message);
    }
}

async function seedOrgTeams(teamNames, orgId){
    try{
        let org = await OrganisationTaskyModel.findById(orgId);
        let teams = []
        teamNames.forEach((teamName)=>{
            let obj = {}
            obj.teamname = teamName;
            teams.push(obj);
        })
        org.teams = teams;
        await org.save();
        console.log("teams inserted");
    }catch(error){
        console.log(error.message);
    }
}

async function seedOrgMembers(members, orgId, teamId){
    try{
        let inserted = await OrganisationTaskyModel.findByIdAndUpdate(
            orgId,
            { $set: { 'teams.$[team].members':  members} },
            { new : true, arrayFilters: [{ 'team._id': teamId }] }
        );
        console.log("members inserted");
    }catch(error){
        console.log(error.message);
    }
}

async function seedOrgTasks(tasks, orgId, teamId){
    let data = await OrganisationTaskyModel.findOne({'_id' : orgId}, {'teams' : {$elemMatch : {'_id' : teamId}}})
    let members = data.teams[0].members;
    let memberIds = members.map((member) => member._id)
    let tasksToInsert = []
    memberIds.forEach((memberId)=>{
        tasks.forEach((task)=>{
            task.team = teamId;
            task.member = memberId;
            tasksToInsert.push(task)
        })
    })
    await OrganisationTasksModel.insertMany(tasksToInsert);
    console.log("taks inserted");
}

//seedUsers(JSON.parse(fs.readFileSync("./model/userData.json")))

//seedUserTasks(JSON.parse(fs.readFileSync("./model/tasksData.json")), "65cf00d43a85bd92696717ee")

//seedOrgs(JSON.parse(fs.readFileSync("./data/orgData.json")))

//seedOrgTeams(["backend", "frontend", "devops"], "65cf0ba6bc9625b178e13d0a")

//seedOrgMembers(JSON.parse(fs.readFileSync("./data/members.json")), "65cf0ba6bc9625b178e13d0a", "65cf12d9a31524d44ab115a6")

//seedOrgTasks(JSON.parse(fs.readFileSync("./data/tasksData.json")).slice(0, 10), "65cf0ba6bc9625b178e13d0a", "65cf12d9a31524d44ab115a6")

