const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const { requirePermission } = require('../../middleware/permissionCheck');
const {
    getAllElementsController,
    createElementController,
    updateElementController,
    deleteElementController,
    getElementByIdController,
    getElementsByIdsController
} = require('../../controllers/elements/elementsController');

// Lấy tất cả elements với phân trang
// Tạm thời dùng quyền SUTLUN_VIEW để tái sử dụng phân quyền hiện tại
router.get('/elements', verifyToken, requirePermission('ELEMENTS_VIEW'), getAllElementsController);

// Lấy nhiều elements theo danh sách IDs (tối ưu cho query theo hydro_data)
// PHẢI ĐẶT TRƯỚC route /elements/:element_id để tránh conflict
// GET /api/elements/by-ids?element_ids=1,2,3,4,5
// hoặc POST /api/elements/by-ids với body: {element_ids: [1,2,3,4,5]}
router.get('/elements/by-ids', verifyToken, requirePermission('ELEMENTS_VIEW'), getElementsByIdsController);
router.post('/elements/by-ids', verifyToken, requirePermission('ELEMENTS_VIEW'), getElementsByIdsController);

// Lấy 1 element theo ID (phải đặt SAU route cụ thể /by-ids)
router.get('/elements/:element_id', verifyToken, requirePermission('ELEMENTS_VIEW'), getElementByIdController);

// Tạo element mới
router.post('/elements', verifyToken, requirePermission('ELEMENTS_CREATE'), createElementController);

// Cập nhật element
router.put('/elements/:element_id', verifyToken, requirePermission('ELEMENTS_UPDATE'), updateElementController);

// Xóa element
router.delete('/elements/:element_id', verifyToken, requirePermission('ELEMENTS_DELETE'), deleteElementController);

module.exports = router;
