const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const {
    getAllKhaosatController,
    createKhaosatController,
    updateKhaosatController,
    deleteKhaosatController,
    getKhaosatByIdController,
    clearKhaosatCacheController,
    getKhaosatCacheStatsController,
    searchKhaosatByCoordinatesController
} = require('../../controllers/khaosat/khaoSatController');
const { requirePermission } = require('../../middleware/permissionCheck');
// Lấy tất cả điểm khảo sát với phân trang và cache
router.get('/khaosat', verifyToken, requirePermission('KHAOSAT_VIEW'), getAllKhaosatController);

// Tìm kiếm điểm khảo sát theo tọa độ
router.get('/khaosat/search', verifyToken, requirePermission('KHAOSAT_VIEW'), searchKhaosatByCoordinatesController);

// Xóa cache khaosat
router.delete('/khaosat/cache', verifyToken, requirePermission('SYSTEM_ADMIN'), clearKhaosatCacheController);

// Lấy thông tin cache stats
router.get('/khaosat/cache/stats', verifyToken, requirePermission('SYSTEM_ADMIN'), getKhaosatCacheStatsController);

// Lấy điểm khảo sát theo ID
router.get('/khaosat/:id', verifyToken, requirePermission('KHAOSAT_VIEW'), getKhaosatByIdController);

// Thêm điểm khảo sát mới (yêu cầu authentication)
router.post('/khaosat', verifyToken, requirePermission('KHAOSAT_CREATE'), createKhaosatController);

// Cập nhật điểm khảo sát (yêu cầu authentication)
router.put('/khaosat/:id', verifyToken, requirePermission('KHAOSAT_UPDATE'), updateKhaosatController);

// Xóa điểm khảo sát (yêu cầu authentication)
router.delete('/khaosat/:id', verifyToken, requirePermission('KHAOSAT_DELETE'), deleteKhaosatController);

module.exports = router;
