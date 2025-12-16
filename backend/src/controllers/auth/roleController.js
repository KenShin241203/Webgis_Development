const {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    initializeRoles
} = require('../../services/auth/roleService');

// Lấy tất cả roles
async function listRoles(req, res) {
    try {
        const roles = await getAllRoles();
        return res.status(200).json({
            success: true,
            data: roles,
            total: roles.length
        });
    } catch (error) {
        console.error('Lỗi khi lấy roles:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy roles',
            error: error.message
        });
    }
}

// Tạo role mới
async function createRoleController(req, res) {
    try {
        const { name, description, permissions = [] } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tên role là bắt buộc'
            });
        }

        const role = await createRole(name, description, permissions);
        return res.status(201).json({
            success: true,
            message: 'Tạo role thành công',
            data: role
        });
    } catch (error) {
        console.error('Lỗi khi tạo role:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo role',
            error: error.message
        });
    }
}

// Cập nhật role
async function updateRoleController(req, res) {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        const role = await updateRole(id, { name, description, permissions });
        return res.status(200).json({
            success: true,
            message: 'Cập nhật role thành công',
            data: role
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật role:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật role',
            error: error.message
        });
    }
}

// Xóa role
async function deleteRoleController(req, res) {
    try {
        const { id } = req.params;

        await deleteRole(id);
        return res.status(200).json({
            success: true,
            message: 'Xóa role thành công'
        });
    } catch (error) {
        console.error('Lỗi khi xóa role:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa role',
            error: error.message
        });
    }
}

// Khởi tạo roles mặc định
async function initializeRolesController(req, res) {
    try {
        const result = await initializeRoles();
        return res.status(200).json({
            success: result,
            message: result ? 'Khởi tạo roles thành công' : 'Khởi tạo roles thất bại'
        });
    } catch (error) {
        console.error('Lỗi khi khởi tạo roles:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi khởi tạo roles',
            error: error.message
        });
    }
}

module.exports = {
    listRoles,
    createRole: createRoleController,
    updateRole: updateRoleController,
    deleteRole: deleteRoleController,
    initializeRoles: initializeRolesController
};


