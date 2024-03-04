import jwt from "jsonwebtoken";

//Auth middleware to check if user is logged in or not
function userAuthMiddleware(req, res, next) {
    try {
        let authToken = req.headers["authorization"];
        let decoded = jwt.verify(authToken, process.env.JWT_SECRET_KEY);
        if (decoded) {
            req.user = decoded;
            next();
        }
    } catch (error) {
        res.status(401).json({ error: "UnAuthorized Access" });
    }
}


//Auth middleware to protect / route
async function dashboardAuthMiddleware(req, res) {
    try {
        let authToken = req.body.token;
        let decoded = jwt.verify(authToken, process.env.JWT_SECRET_KEY);
        if (decoded) {
            res.status(200).json({ user: decoded });
        }
    } catch (error) {
        res.status(401).json({ error: "UnAuthorized Access" });
    }
}

export { userAuthMiddleware, dashboardAuthMiddleware };