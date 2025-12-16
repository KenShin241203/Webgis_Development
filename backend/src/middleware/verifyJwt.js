const jwt = require('jsonwebtoken');
const db = require('../models');
require('dotenv').config();

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
        const user = await db.User.findOne({
            where: { id: decoded.userId },
            include: [{
                model: db.Role,
                as: 'role',
                include: [{
                    model: db.Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            }]
        });
        if (!user) throw new Error('User not found');

        const roleName = user.role ? user.role.name : null;
        const permissions = user.role && user.role.permissions ? user.role.permissions.map(p => p.name) : [];

        req.user = {
            id: user.id,
            username: user.username,
            role: roleName,
            role_id: user.role_id,
            permissions
        };
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};

module.exports = verifyToken;