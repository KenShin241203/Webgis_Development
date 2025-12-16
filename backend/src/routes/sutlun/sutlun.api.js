const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const { getAllSutLunController, clearSutLunCacheController, getSutLunByIdController, createSutLunController, updateSutLunController, deleteSutLunController, searchSutLunByCoordinatesController } = require('../../controllers/sutlun/sutlunController');

const { requirePermission } = require('../../middleware/permissionCheck');
// Clear cache sutlun
router.delete('/sutlun/cache', verifyToken, requirePermission('SYSTEM_ADMIN'), clearSutLunCacheController);
// Lấy tất cả dữ liệu sutlun
router.get('/sutlun', verifyToken, requirePermission('SUTLUN_VIEW'), getAllSutLunController);

// Tìm kiếm theo tọa độ
router.get('/sutlun/search', verifyToken, requirePermission('SUTLUN_VIEW'), searchSutLunByCoordinatesController);

// Lấy theo objectid
router.get('/sutlun/:objectid', verifyToken, requirePermission('SUTLUN_VIEW'), getSutLunByIdController);

// Tạo mới (yêu cầu authentication)
router.post('/sutlun', verifyToken, requirePermission('SUTLUN_CREATE'), createSutLunController);

// Cập nhật (yêu cầu authentication)
router.put('/sutlun/:objectid', verifyToken, requirePermission('SUTLUN_UPDATE'), updateSutLunController);

// Xoá (yêu cầu authentication)
router.delete('/sutlun/:objectid', verifyToken, requirePermission('SUTLUN_DELETE'), deleteSutLunController);
module.exports = router; 