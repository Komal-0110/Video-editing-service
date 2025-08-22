const authMiddleware = (req, res, next)=>{
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({error : "Unauthorized"})
    }

    const token = authHeader.split(" ")[1];
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET)
        req.user = user;
        next()
    } catch (err) {
        return res.status(401).json({error : "Invalid token"})
    }
}

module.exports = authMiddleware