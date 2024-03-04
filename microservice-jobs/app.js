import "./utils/loadEnv.js" 
import express from "express"
import "./utils/dbConnect.js"
import individualJobsRouter from "./routes/individualRouter.js"
import organisationJobsRouter from "./routes/organisationRouter.js"
import cors from "cors"
import { retrieveJobs } from "./utils/helpers.js"
const app = express();

const port = process.env.PORT || 3001;

app.use(cors())
app.use(express.json());

app.use("/api/individual/jobs", individualJobsRouter);
app.use("/api/organisation/jobs", organisationJobsRouter);

app.use("/api/admin/jobs/retrieve", retrieveJobs);

app.listen(port, ()=>{
    console.log(`server started at ${port}`);
})