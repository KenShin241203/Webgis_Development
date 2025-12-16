const {
    getAllPermissions,
    getPermissionByName,
    getPermissionsByModule,
    createPermission,
    updatePermission,
    deletePermission,
    initializePermissions
} = require('../../services/auth/permissionService');

// Lấy tất cả permissions
const getAllPermissionsController = async (req, res) => {
    try {
        const permissions = await getAllPermissions();
        return res.status(200).json({
            success: true,
            data: permissions,
            total: permissions.length
        });
    } catch (error) {
        console.error('Lỗi khi lấy permissions:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy permissions',
            error: error.message
        });
    }
};

// Lấy permission theo module
const getPermissionsByModuleController = async (req, res) => {
    try {
        const { module } = req.params;
        const permissions = await getPermissionsByModule(module);
        return res.status(200).json({
            success: true,
            data: permissions,
            module,
            total: permissions.length
        });
    } catch (error) {
        console.error('Lỗi khi lấy permissions theo module:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy permissions theo module',
            error: error.message
        });
    }
};

// Tạo permission mới
const createPermissionController = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tên permission là bắt buộc'
            });
        }

        const permission = await createPermission(name, description);
        return res.status(201).json({
            success: true,
            message: 'Tạo permission thành công',
            data: permission
        });
    } catch (error) {
        console.error('Lỗi khi tạo permission:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo permission',
            error: error.message
        });
    }
};

// Cập nhật permission
const updatePermissionController = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const permission = await updatePermission(id, { name, description });
        return res.status(200).json({
            success: true,
            message: 'Cập nhật permission thành công',
            data: permission
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật permission:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật permission',
            error: error.message
        });
    }
};

// Xóa permission
const deletePermissionController = async (req, res) => {
    try {
        const { id } = req.params;

        await deletePermission(id);
        return res.status(200).json({
            success: true,
            message: 'Xóa permission thành công'
        });
    } catch (error) {
        console.error('Lỗi khi xóa permission:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa permission',
            error: error.message
        });
    }
};

// Khởi tạo permissions mặc định
const initializePermissionsController = async (req, res) => {
    try {
        const result = await initializePermissions();
        return res.status(200).json({
            success: result,
            message: result ? 'Khởi tạo permissions thành công' : 'Khởi tạo permissions thất bại'
        });
    } catch (error) {
        console.error('Lỗi khi khởi tạo permissions:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi khởi tạo permissions',
            error: error.message
        });
    }
};

module.exports = {
    getAllPermissionsController,
    getPermissionsByModuleController,
    createPermissionController,
    updatePermissionController,
    deletePermissionController,
    initializePermissionsController
};
