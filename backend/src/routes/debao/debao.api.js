const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const {
    getAllDebaoController,
    clearDebaoCacheController,
    getDebaoCacheStatsController,
    getDebaoByIdController,
    createDebaoController,
    updateDebaoController,
    deleteDebaoController,
    searchDebaoByCoordinatesController
} = require('../../controllers/debao/debaoController');
const { requirePermission } = require('../../middleware/permissionCheck');
// Xóa cache debao
router.delete('/debao/cache', verifyToken, requirePermission('SYSTEM_ADMIN'), clearDebaoCacheController);

// Lấy thông tin cache stats
router.get('/debao/cache/stats', verifyToken, requirePermission('SYSTEM_ADMIN'), getDebaoCacheStatsController);
// Lấy tất cả dữ liệu debao với phân trang và cache
router.get('/debao', verifyToken, requirePermission('DEBAO_VIEW'), getAllDebaoController);

// Tìm kiếm theo tọa độ
router.get('/debao/search', verifyToken, requirePermission('DEBAO_VIEW'), searchDebaoByCoordinatesController);

router.get('/debao/:id', verifyToken, requirePermission('DEBAO_VIEW'), getDebaoByIdController);
// Thêm debao mới (yêu cầu authentication)
router.post('/debao', verifyToken, requirePermission('DEBAO_CREATE'), createDebaoController);
// Cập nhật debao (yêu cầu authentication)
router.put('/debao/:id', verifyToken, requirePermission('DEBAO_UPDATE'), updateDebaoController);
// Xóa debao (yêu cầu authentication)
router.delete('/debao/:id', verifyToken, requirePermission('DEBAO_DELETE'), deleteDebaoController);


module.exports = router;
