import jwt from "jsonwebtoken";

//Each auth points to respective dashboards where they are valid


/*
        //setting cookie to response object
        res.cookie("access_token", accessToken, {
            httpOnly : true,
            signed : true, 
            maxAge : 4 * 60 * 60 * 1000
        })
*/
async function cookieAuthMiddleware(req, res, next){
    try{
        //parsed cookie set as property to request object
        let token = req.signedCookies["access_token"]; 
        //let token = req.cookies["access_token"]; //unsigned cookie
        let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY_USER);
        if (decoded) {
            req.user = decoded;
            next();
        }
    }catch(error){
        console.log(error.message);
        res.clearCookie("access_token");
        return res.status(401).json({errors : [{msg : "unauthorized request!", path : "unauthorised"}]})
    }
}

async function individualTokenAuthMiddleware(req, res, next){
    try{
        let token = req.headers["x-auth-header"];
        var decoded = jwt.verify(token, process.env.JWT_SECRET_KEY_USER);
        if(decoded){
            req.user = decoded;
            next();
        }
    }catch(error){
        console.log(error.message);
        return res.status(401).json({errors : [{msg : "unauthorized request!", path : "unauthorised"}]})
    }
}

async function organisationTokenAuthMiddleware(req, res, next){
    try{
        let token = req.headers["x-auth-header"];
        var decoded = jwt.verify(token, process.env.JWT_SECRET_KEY_ORG);
        if(decoded){
            req.user = decoded;
            next();
        }
    }catch(error){
        console.log(error.message);
        return res.status(401).json({errors : [{msg : "unauthorized request!", path : "unauthorised"}]})
    }
}

export {cookieAuthMiddleware, individualTokenAuthMiddleware, organisationTokenAuthMiddleware}