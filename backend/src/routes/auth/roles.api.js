const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const authorize = require('../../middleware/authRoutes');
const { listRoles, createRole, updateRole, deleteRole, initializeRoles } = require('../../controllers/auth/roleController');

// Lấy tất cả roles
router.get('/roles', listRoles);

// Khởi tạo roles mặc định (chỉ admin)
router.post('/roles/initialize', verifyToken, authorize({ roles: ['admin'] }), initializeRoles);

// Tạo role mới (chỉ admin)
router.post('/roles', verifyToken, authorize({ roles: ['admin'] }), createRole);

// Cập nhật role (chỉ admin)
router.put('/roles/:id', verifyToken, authorize({ roles: ['admin'] }), updateRole);

// Xóa role (chỉ admin)
router.delete('/roles/:id', verifyToken, authorize({ roles: ['admin'] }), deleteRole);

module.exports = router;


