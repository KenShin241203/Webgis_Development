const { where } = require('sequelize');
const db = require('../../models');
const bcrypt = require('bcrypt');

const toUserResponse = (userInstance) => {
    if (!userInstance) return null;
    const role = userInstance.role ? userInstance.role : null;
    return {
        id: userInstance.id,
        username: userInstance.username,
        email: userInstance.email || null,
        role: role
    };
}

const createUser = async ({ username, password, role_id }) => {
    const useIsExist = await db.User.findOne({ where: { username } });
    if (useIsExist) {
        throw new Error('User đã tồn tại trong hệ thống!!!');
    }
    let roleRow = null;
    if (role_id) {
        roleRow = await db.Role.findOne({ where: { id: role_id } });
        if (!roleRow) {
            throw new Error('Role không tồn tại trong hệ thống!!!');
        }
        // Kiểm tra nếu role là 'admin' thì chỉ cho phép 1 account duy nhất
        if (roleRow.name === 'admin') {
            const existingAdmin = await db.User.findOne({
                include: [{ model: db.Role, as: 'role', where: { name: 'admin' } }]
            });
            if (existingAdmin) {
                throw new Error('Hệ thống chỉ cho phép một tài khoản admin duy nhất!');
            }
        }
    } else {
        // Mặc định gán role 'viewer' nếu không truyền role_id
        roleRow = await db.Role.findOne({ where: { name: 'viewer' } });

    }
    const hash = await bcrypt.hash(password, 10);
    const created = await db.User.create({ username, password: hash, role_id: roleRow ? roleRow.id : null });
    const user = await db.User.findOne({
        where: { id: created.id },
        attributes: { exclude: ['password'] },
        include: [{ model: db.Role, as: 'role' }]
    });
    return toUserResponse(user);
}

const updateRoleUser = async ({ id, role }) => {
    const user = await db.User.findOne({
        where: { id },
        include: [{ model: db.Role, as: 'role' }]
    });
    if (!user) {
        throw new Error('User không tồn tại trong hệ thống!!!');
    }

    // Kiểm tra nếu user hiện tại là admin thì không cho phép cập nhật role
    if (user.role && user.role.name === 'admin') {
        throw new Error('Tài khoản admin không được phép cập nhật role!');
    }

    const roleRow = await db.Role.findOne({ where: { name: role } });
    if (!roleRow) {
        throw new Error('Role không tồn tại trong hệ thống!!!');
    }

    // Kiểm tra nếu role là 'admin' thì chỉ cho phép 1 account duy nhất
    if (roleRow.name === 'admin') {
        const existingAdmin = await db.User.findOne({
            include: [{ model: db.Role, as: 'role', where: { name: 'admin' } }]
        });
        if (existingAdmin && existingAdmin.id !== user.id) {
            throw new Error('Hệ thống chỉ cho phép một tài khoản admin duy nhất!');
        }
    }

    user.role_id = roleRow.id;
    await user.save();
    const reloaded = await db.User.findOne({
        where: { id: user.id },
        attributes: { exclude: ['password'] },
        include: [{ model: db.Role, as: 'role' }]
    });
    return toUserResponse(reloaded);
}

const getAllUsers = async () => {
    const users = await db.User.findAll({
        attributes: { exclude: ['password'] },
        include: [{ model: db.Role, as: 'role' }]
    });
    return users.map(toUserResponse);
}

const getUserById = async (id) => {
    const user = await db.User.findOne({
        where: { id },
        attributes: { exclude: ['password'] },
        include: [{ model: db.Role, as: 'role' }]
    });
    if (!user) {
        throw new Error('User không tồn tại trong hệ thống!!!');
    }
    return toUserResponse(user);
}

const deleteUser = async (id) => {
    const user = await db.User.findOne({ where: { id } });
    if (!user) {
        throw new Error('User không tồn tại trong hệ thống!!!');
    }
    await user.destroy();
}

module.exports = { createUser, updateRoleUser, getAllUsers, getUserById, deleteUser };
