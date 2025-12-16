const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const {
    getAllHienTrangController,
    clearHienTrangCacheController,
    getHienTrangCacheStatsController,
    getHienTrangByIdController,
    createHienTrangController,
    updateHienTrangController,
    deleteHienTrangController,
    searchHienTrangByCoordinatesController
} = require('../../controllers/hientrang/hientrangController');
const { requirePermission } = require('../../middleware/permissionCheck');

// Xóa cache hientrang
router.delete('/hientrang/cache', verifyToken, requirePermission('SYSTEM_ADMIN'), clearHienTrangCacheController);

// Lấy thông tin cache stats
router.get('/hientrang/cache/stats', verifyToken, requirePermission('SYSTEM_ADMIN'), getHienTrangCacheStatsController);
// Lấy tất cả dữ liệu hientrang với phân trang và cache
router.get('/hientrang', verifyToken, requirePermission('HIENTRANG_VIEW'), getAllHienTrangController);

// Tìm kiếm theo toạ độ
router.get('/hientrang/search', verifyToken, requirePermission('HIENTRANG_VIEW'), searchHienTrangByCoordinatesController);

// Lấy theo id
router.get('/hientrang/:id', verifyToken, requirePermission('HIENTRANG_VIEW'), getHienTrangByIdController);

// Tạo mới (yêu cầu authentication)
router.post('/hientrang', verifyToken, requirePermission('HIENTRANG_CREATE'), createHienTrangController);

// Cập nhật (yêu cầu authentication)
router.put('/hientrang/:id', verifyToken, requirePermission('HIENTRANG_UPDATE'), updateHienTrangController);

// Xoá (yêu cầu authentication)
router.delete('/hientrang/:id', verifyToken, requirePermission('HIENTRANG_DELETE'), deleteHienTrangController);


module.exports = router; 