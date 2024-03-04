import OrganisationTasksModel from "../model/Tasks.js";

function generateReminders(deadline){
    const currentTime = new Date();
    deadline = new Date(deadline);
    const timeDiff = deadline - currentTime;
    let reminders = [], reminder, scheduled;
    for(let i=1; i<4; i++){
        reminder = (timeDiff * i/4);
        scheduled = new Date(currentTime.getTime() + reminder);
        reminders.push(scheduled) //current time + reminder = first reminder
    }
    return reminders;
}

async function fetchTasksForTeams(teams) {
    const tasksData = [];
    for (const team of teams) {
        let obj = {
            [team.teamname]: `${team._id}`,
            members: {}
        };
        const members = team.members;
        for (const member of members) {
            //not shown on second screen if not verified (member Ids are not send to frontend)
            if (member.isverified.email && member.isverified.mobile){
                //if tasks are assigned
                if (member.tasks.length) {
                    //perform async io
                    obj.members[member.firstname] = await OrganisationTasksModel.find({ _id : { $in: member.tasks} });
                }
            }
        }   
        tasksData.push(obj);
    }
    return tasksData; // Resolve the promise with tasksData
}



export { generateReminders, fetchTasksForTeams }