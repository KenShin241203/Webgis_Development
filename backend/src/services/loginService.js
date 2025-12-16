const db = require('../models');
const bcrypt = require('bcrypt');

async function loginService(username, password) {
    const user = await db.User.findOne({
        where: { username },
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
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return user;
}

module.exports = { loginService };
