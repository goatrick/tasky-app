import { validationResult } from "express-validator";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"; 
import fs from "fs";
import ejs from "ejs";
import {createClient} from "redis" //set token (for microservice), resetpwd otp
import sendEmail from "../utils/sendEmail.js";
import sendSms from "../utils/sendSms.js"
import IndividualTaskyModel from "../model/Individual.js";
import OrganisationTaskyModel from "../model/Organisation.js";

let client = createClient();

/*
    API : /api/user/register
    Method : POST
    Desc : Register a user org 
    Access : Public
    Notes : This is the common end-point for Individual registration and Org Registration
*/
async function userRegisterPostController(req, res){
    try{
        const result = validationResult(req);
        if(!result.isEmpty()){  
            res.status(400).json({errors : result.array(), success : ""});
        }else{
            let {firstname, lastname, mobile, email, password, usertype} = req.body;
            let model = (usertype == "individual") ? IndividualTaskyModel : OrganisationTaskyModel
            let user = await model.findOne({ $or: [{ email }, { mobile }] })
            if (user) return res.status(409).json({errors : [{msg : "user already exists", path: "userStatus"}], success : ""})
            let salt = bcrypt.genSaltSync(12);
            let hashedPwd = bcrypt.hashSync(password, salt);
            let emailVerificationCode = [...Array(12)].map(() => Math.random().toString(36)[2]).join('');
            let mobileVerificationCode = [...Array(12)].map(() => Math.random().toString(36)[2]).join('');
            let newUser = new model({firstname, lastname, mobile, email, password : hashedPwd, verificationcode : {email : emailVerificationCode, mobile : mobileVerificationCode}})
            await newUser.save();
            //email verification
            sendEmail({
                to : `${email}`,
                subject : `welcome to tasky.app`,
                html : ejs.render(fs.readFileSync("templates/verifyEmail.ejs", "utf-8"), {
                    fname : `${firstname}`,
                    link : `${process.env.HOST_NAME}/api/user/verify/${emailVerificationCode}/${usertype}`
                })
            })
            //sms verification
            sendSms({
                message : `\nHello ${firstname},\nclick link to verify number : ${process.env.HOST_NAME}/api/user/verify/${mobileVerificationCode}/${usertype}`,
                mobile : `${mobile}`
            })
             //verificationsent notification must be shown
             res.status(200).json({success : {msg : "user registration successfull", verificationSent : true}, errors : [] });
        }
    }catch(err){
        console.log(err.message);
        res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}



/*
    API : /api/user/login
    Method : POST
    Desc : Login a user and generate JWT token
    Access : Public
    Notes : This is the common end-point for Individual login and Org login
*/
async function userLoginPostController(req, res){
    try{
        const { email, password, usertype } = req.body;
        const result = validationResult(req);
        if(!result.isEmpty()) return res.status(400).json({errors : result.array(), success : ""}); 
        let model = (usertype == "individual") ? IndividualTaskyModel : OrganisationTaskyModel
        let user = await model.findOne({email});
        if (!user) return res.status(200).json({errors : [{msg : "user not found, register first!", path: "userStatus"}], success : ""});
        let hashedPwd = user.password;
        let passwordValidation = bcrypt.compare(`${password}`, hashedPwd);
        if(!passwordValidation) return res.status(401).json({errors : [{msg : "invalid credentials", path : "userStatus"}], success : ""});
        if (!user.isverified.mobile){       
            return res.status(200).json({errors : [{msg : `use verification link sent to ${user.mobile}! on ${Date(user._id.getTimestamp()).slice(0,15)}`, path: "userStatus", verificationSent : true}], success : ""});
        } 
        if (!user.isverified.email){
            return res.status(200).json({errors : [{msg : `use verification link sent to ${user.email}! on ${Date(user._id.getTimestamp()).slice(0,15)}`, path: "userStatus", verificationSent : true}], success : ""});
        } 
        //cookie -> (userId/mobile/email used by microservice)
        let payload = {usertype, email, userId : user._id, mobile : user.mobile};
        //signed based on usertype
        let secretKey = (usertype == "individual") ? process.env.JWT_SECRET_KEY_USER : process.env.JWT_SECRET_KEY_ORG;
        let accessToken = jwt.sign(payload, secretKey, {expiresIn : "4h"});
        return res.status(200).json({errors : [], success : {msg : "user login successfull", authtoken : accessToken}}); //redirect to dashboard
    }catch(err){
        console.log(err);
        res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}  



/*
API : /user/verify/:verificationCode
method : GET
description : user email/mobile verification
*/
async function verifyUserController(req, res){
    try{
        let verificationCode = req.params.verificationcode;
        let usertype = req.params.usertype;
        let model = (usertype == "individual") ? IndividualTaskyModel : OrganisationTaskyModel
        let emailVerified, mobileVerified;
        emailVerified = await model.findOne({'verificationcode.email' : verificationCode});
        mobileVerified = await model.findOne({'verificationcode.mobile' : verificationCode});
        if(mobileVerified){
            await model.updateOne({_id : mobileVerified._id.toString()}, {$set : {'isverified.mobile' : true}});
            return res.status(200).json({success : {msg : `your mobile is verified!`}})
        }else if(emailVerified){
            await model.updateOne({_id : emailVerified._id.toString()}, {$set : {'isverified.email' : true}});
            return res.status(200).json({success : {msg : `your email is verified!`}})
        }  
        return res.status(200).json({errors : [{msg : "not verified, try again!!", path: "userStatus"}], success : ""});
    }catch(err){
        console.log(err);
        return res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}

/*
API : /user/forgot-password
method : POST
description : capture user email (form), to fire email with password reset link
client (react) : /user/forgot-password
*/
async function forgotPasswordController(req, res){
    try{
        let {email, usertype} = req.body;
        let model = (usertype == "individual") ? IndividualTaskyModel : OrganisationTaskyModel;
        let user = await model.findOne({ email });
        if (!user) return res.status(200).json({errors : [{msg : "unrecognised user, register first!", path : "userStatus"}], success : ""});
        //use redis to store password-reset-email-token
        let passwordResetToken = Math.floor(Math.random() * 899999 + 100000);
        await client.connect();
        await client.set(`${email}`, passwordResetToken, 'EX', 3600); 
        await client.disconnect();
        sendEmail({
            to : `${email}`,
            subject : `welcome to tasky.app`,
            html : ejs.render(fs.readFileSync("./templates/forgotPasswordEmail.ejs", "utf-8"), {
            fname : `${user.firstname}`,
            link : `${process.env.HOST_NAME}/api/user/verify-forgot-password/${email}/${passwordResetToken}/${usertype}`
            })
        })
        const hiddenPart = '*'.repeat(15 - 4);
        let hiddenEmail = email.substring(0, 4) + hiddenPart + email.substring(15);
        return res.status(200).json({success : {msg : `password reset link has been sent to ${hiddenEmail}!`}, errors : []});  //email displays input area for code
    }catch(err){
        console.log(err);
        res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}



/*
API : /user/password-reset-link/:email/:verificationcode/:usertype
method : POST
description : from link clicked -> capture email (param) to fetch that user, and verify pwd-reset verification code against redis data
*/
async function verifyForgotPasswordController(req, res){
    try{
        let verificationCode = req.params.verificationcode;
        //preserve for pwd update
        let email = req.params.email;
        let usertype = req.params.usertype
        await client.connect();
        let verifiedCode = await client.get(`${email}`);
        await client.disconnect();
        if(verificationCode==verifiedCode){
            //reset pwd component is rendered, token is embedded in form action url
            return res.status(200).json({errors : [], success : {msg : "reset password now", email, usertype, token : verifiedCode, passwordreset : true}});
        }else{
            //redirect to login
            return res.status(200).json({errors : [{msg : "not verified, try again!!", path: "userStatus"}], success : ""});
        }
    }catch(err){
        console.log(err);
        res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}


/*
API : /user/reset-password
method : POST
description : from link clicked -> capture email (param) to fetch that user, and verify pwd-reset verification code against redis data
*/
async function resetPasswordController(req, res){
    try{
        let {password, usertype, email} = req.body
        const result = validationResult(req);
        let verificationCode = req.params.verificationcode;      
        if(!result.isEmpty()){
            console.log(result.array());
            return res.status(400).json({errors : result.array(), success : {email, usertype, token : verificationCode}});
        }
        await client.connect();
        let verifiedCode = await client.get(`${email}`);
        await client.del(`${email}`);
        await client.disconnect();
        if(!(verificationCode==verifiedCode)){
            //redirect to login
            return res.status(200).json({errors : [{msg : "not verified, try again!!", path: "userStatus"}], success : ""});
        }
        let model = (usertype == "individual") ? IndividualTaskyModel : OrganisationTaskyModel;
        let salt = await bcrypt.genSalt(12);
        let hashedPwd = await bcrypt.hash(password, salt);
        await model.updateOne({email}, {$set : {'password' : hashedPwd}});
        res.status(200).json({success : {msg : "password successfully changed", passwordreset : false}, errors : []});
        //redirect to login
    }catch(err){
        console.log(err);
        res.status(500).json({errors : [{msg : err.message, path : "internalError"}]});
    }
}




export {userRegisterPostController, userLoginPostController, verifyUserController, forgotPasswordController, verifyForgotPasswordController, resetPasswordController}
