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
// Clear cache dolun_velo
router.delete('/dolun-velo/cache', clearCacheController);

// Lấy thông tin cache stats
router.get('/dolun-velo/cache/stats', getCacheStatsController);
// Lấy tất cả dữ liệu dolun_velo (với caching)
router.get('/dolun-velo', getAllDolunVeloController);

// Tìm kiếm theo tọa độ
router.get('/dolun-velo/search', searchDolunByCoordinatesController);

router.get('/dolun-velo/:id', getDolunByIdController);
// Thêm dolun_velo mới (yêu cầu authentication)
router.post('/dolun-velo', verifyToken, createDolunController);
// Cập nhật dolun_velo (yêu cầu authentication)
router.put('/dolun-velo/:id', verifyToken, updateDolunController);
// Xóa dolun_velo (yêu cầu authentication)
router.delete('/dolun-velo/:id', verifyToken, deleteDolunController);


module.exports = router; 