import nodemailer from "nodemailer"

async function sendEmail(emailData){ 
    try{
        //configuring SMTP client (nodemailr) with SMTP email server (brevo)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, 
            port: 587,
            secure: false, //465 if true
            auth: { //credentials for smtp server 
              user: process.env.SMTP_EMAIL, 
              pass: process.env.SMTP_KEY,
            }
          });

        //configuring SMTP server with recepient email servers 
        const info = await transporter.sendMail({
            from: 'Abhinav <abhinav.edulakanti@gmail.com>', 
            to: `${emailData.to}`,
            subject: `${emailData.subject}`, 
            html: `${emailData.html}`
        });
        console.log(info.messageId);
    }catch(error){
        console.log(error.message);
    }
}

export default sendEmail;