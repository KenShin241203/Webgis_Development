const { getUserPermissions, checkUserPermission } = require('../services/auth/roleService');

// Middleware kiểm tra permission cụ thể
const requirePermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized - No user found'
                });
            }

            // Lấy permissions của user
            const userPermissions = await getUserPermissions(user.id);

            // Kiểm tra permission cụ thể
            if (!userPermissions.includes(permissionName)) {
                return res.status(403).json({
                    success: false,
                    message: `Forbidden - Missing permission: ${permissionName}`,
                    requiredPermission: permissionName,
                    userPermissions
                });
            }

            // Lưu permissions vào req để sử dụng sau này
            req.userPermissions = userPermissions;
            next();
        } catch (error) {
            console.error('Lỗi khi kiểm tra permission:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during permission check'
            });
        }
    };
};

// Middleware kiểm tra nhiều permissions (cần có ít nhất 1)
const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized - No user found'
                });
            }

            const userPermissions = await getUserPermissions(user.id);
            const hasAnyPermission = permissions.some(permission =>
                userPermissions.includes(permission)
            );

            if (!hasAnyPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Forbidden - Missing any of required permissions: ${permissions.join(', ')}`,
                    requiredPermissions: permissions,
                    userPermissions
                });
            }

            req.userPermissions = userPermissions;
            next();
        } catch (error) {
            console.error('Lỗi khi kiểm tra permissions:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during permission check'
            });
        }
    };
};

// Middleware kiểm tra tất cả permissions (cần có tất cả)
const requireAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized - No user found'
                });
            }

            const userPermissions = await getUserPermissions(user.id);
            const missingPermissions = permissions.filter(permission =>
                !userPermissions.includes(permission)
            );

            if (missingPermissions.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: `Forbidden - Missing required permissions: ${missingPermissions.join(', ')}`,
                    requiredPermissions: permissions,
                    missingPermissions,
                    userPermissions
                });
            }

            req.userPermissions = userPermissions;
            next();
        } catch (error) {
            console.error('Lỗi khi kiểm tra permissions:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during permission check'
            });
        }
    };
};

// Helper function để kiểm tra permission trong controller
const hasPermission = (userPermissions, permission) => {
    return userPermissions.includes(permission);
};

// Helper function để lấy module permissions
const getModulePermissions = (userPermissions, module) => {
    return userPermissions.filter(permission =>
        permission.startsWith(`${module}_`)
    );
};

// Helper function để kiểm tra quyền CRUD cho module
const getModuleCRUDPermissions = (userPermissions, module) => {
    return {
        canView: userPermissions.includes(`${module}_VIEW`),
        canCreate: userPermissions.includes(`${module}_CREATE`),
        canUpdate: userPermissions.includes(`${module}_UPDATE`),
        canDelete: userPermissions.includes(`${module}_DELETE`),
        canBackup: userPermissions.includes(`${module}_BACKUP`)
    };
};

module.exports = {
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    hasPermission,
    getModulePermissions,
    getModuleCRUDPermissions
};
