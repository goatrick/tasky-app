/*

        resendVerification = (!individual.isverified.mobile) ? {mobile : true} : ((!individual.isverified.email) ? {email : true} : {})

        //res-send verification system is automatic
        if (resendVerification.mobile){
            let verifyMobile = usertype == "individual" ? individual.mobile : organisation.mobile;
            let firstname = usertype == "individual" ? individual.firstname : organisation.firstname;
            let verificationCode = usertype == "individual" ? individual.verificationcode.mobile : organisation.verificationcode.mobile;
            res.status(200).json({errors : [{msg : `please verify your mobile, verification link has been sent to ${verifyMobile}!`, path: "userStatus", verificationSent : true}], success : ""});
            sendSMS({
                message : `\nHello ${firstname},\nclick link to verify number : ${process.env.LINK}/user/verify/${verificationCode}`,
                mobile : `${verifyMobile}`
            })   
        } 
        if (resendVerification.email){
            let verifyEmail = usertype == "individual" ? individual.email : organisation.email;
            let firstname = usertype == "individual" ? individual.firstname : organisation.firstname;
            let verificationCode = usertype == "individual" ? individual.verificationcode.email : organisation.verificationcode.email;
            res.status(200).json({errors : [{msg : `please verify your email, verification link has been sent to ${verifyEmail}!`, path: "userStatus", verificationSent : true}], success : ""});
            sendEmail({
                to : `${verifyEmail}`,
                subject : `welcome to tasky.app`,
                html : ejs.render(fs.readFileSync("templates/verifyEmail.ejs", "utf-8"), {
                    fname : `${firstname}`,
                    link : `${process.env.LINK}/user/verify/${verificationCode}`
                })
            })
        } 
*/