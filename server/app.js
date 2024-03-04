import "./utils/loadEnv.js" //loading .env before any operation (is available everywhere)
import express from 'express';
import "./utils/dbConnect.js"
import userRouter from "./routes/userRouter.js";
import individualRouter from "./routes/individualRouter.js";
import organisationRouter from "./routes/organisationRouter.js";
import cookieParser from "cookie-parser";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cookieParser(process.env.COOKIE_SECRET_KEY)); //parses/signs cookie while req/res

app.use("/api/user", userRouter); //shared
app.use("/api/individual", individualRouter); 
app.use("/api/organisation", organisationRouter); 

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

export default app; //for testing 