const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const {
    getAllDolunVeloController,
    clearCacheController,
    getCacheStatsController,
    getDolunByIdController,
    createDolunController,
    updateDolunController,
    deleteDolunController,
    searchDolunByCoordinatesController
} = require('../../controllers/dolun_velo/dolunveloController');
const { requirePermission } = require('../../middleware/permissionCheck');
// Clear cache dolun_velo
router.delete('/dolun-velo/cache',verifyToken, requirePermission('SYSTEM_ADMIN'), clearCacheController);

// Lấy thông tin cache stats
router.get('/dolun-velo/cache/stats',verifyToken, requirePermission('SYSTEM_ADMIN'), getCacheStatsController);
// Lấy tất cả dữ liệu dolun_velo (với caching)
router.get('/dolun-velo',verifyToken, requirePermission('DOLUN_VIEW'), getAllDolunVeloController);

// Tìm kiếm theo tọa độ
router.get('/dolun-velo/search',verifyToken, requirePermission('DOLUN_VIEW'), searchDolunByCoordinatesController);

router.get('/dolun-velo/:id',verifyToken, requirePermission('DOLUN_VIEW'), getDolunByIdController);
// Thêm dolun_velo mới (yêu cầu authentication)
router.post('/dolun-velo', verifyToken, requirePermission('DOLUN_CREATE'), createDolunController);
// Cập nhật dolun_velo (yêu cầu authentication)
router.put('/dolun-velo/:id', verifyToken, requirePermission('DOLUN_UPDATE'), updateDolunController);
// Xóa dolun_velo (yêu cầu authentication)
router.delete('/dolun-velo/:id', verifyToken, requirePermission('DOLUN_DELETE'), deleteDolunController);


module.exports = router; 