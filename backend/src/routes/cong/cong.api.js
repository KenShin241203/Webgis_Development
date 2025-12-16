const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const { requirePermission } = require('../../middleware/permissionCheck');
const {
    getAllCongController,
    createCongController,
    updateCongController,
    deleteCongController,
    getCongByIdController,
    clearCongCacheController,
    getCongCacheStatsController,
    searchCongByCoordinatesController,
    backupCongController
} = require('../../controllers/cong/congController');

// Lấy tất cả dữ liệu cong với phân trang và cache (cần quyền VIEW)
router.get('/cong', verifyToken, requirePermission('CONG_VIEW'), getAllCongController);

// Tìm kiếm cống theo tọa độ (cần quyền VIEW)
router.get('/cong/search', verifyToken, requirePermission('CONG_VIEW'), searchCongByCoordinatesController);

// Xóa cache cong (cần quyền ADMIN)
router.delete('/cong/cache', verifyToken, requirePermission('SYSTEM_ADMIN'), clearCongCacheController);

// Lấy thông tin cache stats (cần quyền ADMIN)
router.get('/cong/cache/stats', verifyToken, requirePermission('SYSTEM_ADMIN'), getCongCacheStatsController);

// Backup tất cả dữ liệu cống (cần quyền BACKUP)
router.get('/cong/backup', verifyToken, requirePermission('CONG_BACKUP'), backupCongController);

// Lấy cống theo ID (cần quyền VIEW)
router.get('/cong/:id', verifyToken, requirePermission('CONG_VIEW'), getCongByIdController);

// Thêm cống mới (cần quyền CREATE)
router.post('/cong', verifyToken, requirePermission('CONG_CREATE'), createCongController);

// Cập nhật cống (cần quyền UPDATE)
router.put('/cong/:id', verifyToken, requirePermission('CONG_UPDATE'), updateCongController);

// Xóa cống (cần quyền DELETE)
router.delete('/cong/:id', verifyToken, requirePermission('CONG_DELETE'), deleteCongController);

module.exports = router; 