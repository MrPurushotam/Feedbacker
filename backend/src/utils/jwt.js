const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
const createToken = (data, expiresIn = '1h') => {
    if (!secret) {
        throw new Error("JWT secret is not defined");
    }
    return jwt.sign(data, secret, { expiresIn });
}

const verifyToken = (token) => {
    if (!secret) {
        throw new Error("JWT secret is not defined");
    }
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        if( error.name === 'TokenExpiredError') {
            throw new Error("Token has expired");
        }
        console.log("Error verifying token:", error);
        throw new Error("Invalid token");
    }
}

module.exports = {
    createToken,
    verifyToken
};