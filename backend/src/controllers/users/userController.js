const { createUser, updateRoleUser, getAllUsers, getUserById, deleteUser } = require('../../services/users/userService');

const createUserController = async (req, res) => {
    const { username, password, role_id } = req.body;
    try {
        const user = await createUser({ username, password, role_id });
        return res.status(201).json({ message: 'Tạo user thành công', user });
    } catch (error) {
        return res.status(500).json({ message: 'Error create', error: error.message });
    }
}

const updateRoleUserController = async (req, res) => {
    const { id, role } = req.body;
    try {
        const user = await updateRoleUser({ id, role });
        return res.status(200).json({ message: 'Cập nhật role thành công', user });
    } catch (error) {
        return res.status(500).json({ message: 'Error update role', error: error.message });
    }
}

const getAllUsersController = async (req, res) => {
    try {
        const users = await getAllUsers();
        return res.status(200).json({ message: 'Lấy danh sách user thành công', users });
    } catch (error) {
        return res.status(500).json({ message: 'Error get users', error: error.message });
    }
}

const getUserByIdController = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await getUserById(id);
        return res.status(200).json({ message: 'Lấy user theo id thành công', user });
    } catch (error) {
        const status = error.message.includes('không tồn tại') ? 404 : 500;
        return res.status(status).json({ message: 'Error get user by id', error: error.message });
    }
}

const deleteUserController = async (req, res) => {
    const { id } = req.params;
    try {
        await deleteUser(id);
        return res.status(200).json({ message: 'Xóa user thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Error delete user', error: error.message });
    }
}


module.exports = {
    createUserController, updateRoleUserController,
    getAllUsersController, getUserByIdController, deleteUserController
};
