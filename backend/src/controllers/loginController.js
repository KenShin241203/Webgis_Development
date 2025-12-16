const { loginService } = require('../services/loginService');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const SECRET_KEY = process.env.JWT_SECRET || 'mysecretkey';

async function loginController(req, res) {
    const { username, password } = req.body;

    try {
        const user = await loginService(username, password);
        if (!user) {
            return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
        }

        const roleName = user.role ? user.role.name : null;
        const permissions = user.role && user.role.permissions ? user.role.permissions.map(p => p.name) : [];

        const payload = { userId: user.id, username: user.username };
        const access_token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

        return res.json({
            message: 'Đăng nhập thành công',
            access_token,
            user: {
                id: user.id,
                username: user.username,
                role: roleName,
                role_id: user.role_id,
                permissions
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
}

module.exports = { loginController };
