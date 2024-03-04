import jwt from "jsonwebtoken";

function individualAuthMiddleware(req, res, next){
    try{
        let token = req.headers["x-auth-header"]
        var decoded = jwt.verify(token, process.env.JWT_SECRET_KEY_USER);
        console.log(decoded);
        if(decoded){
            req.user = decoded;
            next();
        }
    }catch(error){
        console.log(error.message);
        // return res.status(401).json({errors : [{msg : "unauthorized request!", path : "unauthorised"}]})
    }
}

function organisationAuthMiddleware(req, res, next){
    try{
        let token = req.headers["x-auth-header"]
        var decoded = jwt.verify(token, process.env.JWT_SECRET_KEY_ORG);
        if(decoded){
            req.user = decoded;
            next();
        }
    }catch(error){
        console.log(error.message);
        // return res.status(401).send({errors : [{msg : "unauthorized request!", path : "unauthorised"}]})
    }
}

export {individualAuthMiddleware, organisationAuthMiddleware}