const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const {
    getAllNgapLutController,
    getNgapLutByIdController,
    createNgapLutController,
    updateNgapLutController,
    deleteNgapLutController,
    clearNgapLutCacheController,
    getNgapLutCacheStatsController
} = require('../../controllers/ngaplut/ngaplutController');
const { requirePermission } = require('../../middleware/permissionCheck');
// Xóa cache ngaplut
router.delete('/ngaplut/cache', verifyToken, requirePermission('SYSTEM_ADMIN'), clearNgapLutCacheController);

// Lấy thông tin cache stats
router.get('/ngaplut/cache/stats', verifyToken, requirePermission('SYSTEM_ADMIN'), getNgapLutCacheStatsController);
// Lấy tất cả dữ liệu ngaplut với phân trang và cache
router.get('/ngaplut', verifyToken, requirePermission('NGAPLUT_VIEW'), getAllNgapLutController);

// Lấy ngaplut theo ID
router.get('/ngaplut/:id', verifyToken, requirePermission('NGAPLUT_VIEW'), getNgapLutByIdController);

// Thêm ngaplut mới (yêu cầu authentication)
router.post('/ngaplut', verifyToken, requirePermission('NGAPLUT_CREATE'), createNgapLutController);

// Cập nhật ngaplut (yêu cầu authentication)
router.put('/ngaplut/:id', verifyToken, requirePermission('NGAPLUT_UPDATE'), updateNgapLutController);

// Xóa ngaplut (yêu cầu authentication)
router.delete('/ngaplut/:id', verifyToken, requirePermission('NGAPLUT_DELETE'), deleteNgapLutController);


module.exports = router; 