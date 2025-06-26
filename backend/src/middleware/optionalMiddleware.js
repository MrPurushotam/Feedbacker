const { verifyToken } = require("../utils/jwt");

const optionalAuthMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        req.userId = null;
        req.name="";
        req.email="";
        return next();
    }
    
    try {
        const decoded = verifyToken(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.name = decoded.name;
        req.email = decoded.email;
        next();
    } catch (error) {
        req.userId = null;
        next();
    }
};

module.exports = optionalAuthMiddleware;
