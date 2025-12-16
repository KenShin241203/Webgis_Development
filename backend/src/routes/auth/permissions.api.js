const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const authorize = require('../../middleware/authRoutes');
const {
    getAllPermissionsController,
    getPermissionsByModuleController,
    createPermissionController,
    updatePermissionController,
    deletePermissionController,
    initializePermissionsController
} = require('../../controllers/auth/permissionController');

// Lấy tất cả permissions
router.get('/permissions', getAllPermissionsController);

// Lấy permissions theo module
router.get('/permissions/module/:module', getPermissionsByModuleController);

// Khởi tạo permissions mặc định (chỉ admin)
router.post('/permissions/initialize', verifyToken, authorize({ roles: ['admin'] }), initializePermissionsController);

// Tạo permission mới (chỉ admin)
router.post('/permissions', verifyToken, authorize({ roles: ['admin'] }), createPermissionController);

// Cập nhật permission (chỉ admin)
router.put('/permissions/:id', verifyToken, authorize({ roles: ['admin'] }), updatePermissionController);

// Xóa permission (chỉ admin)
router.delete('/permissions/:id', verifyToken, authorize({ roles: ['admin'] }), deletePermissionController);

module.exports = router;
