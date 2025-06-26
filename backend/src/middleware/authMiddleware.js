const { verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
    const token = req.headers?.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized", success: false });
    }
    try {
        const data = verifyToken(token);
        req.userId = data.id;
        req.email = data.email;
        req.name = data.name;
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ message: error.message, success: false,jwtExpired: error.message === "Token has expired" });
    }
}

module.exports = authMiddleware;