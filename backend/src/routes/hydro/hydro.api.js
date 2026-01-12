const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const { requirePermission } = require('../../middleware/permissionCheck');
const {
    getAllHydroDataController,
    createHydroDataController,
    updateHydroDataController,
    deleteHydroDataController,
    getHydroDataByIdController,
    getHydroDataByElementIdController,
    getAvailableTimesController
} = require('../../controllers/hydro/hydroController');

// Lấy tất cả hydro_data với phân trang và filter
router.get('/hydro', verifyToken, requirePermission('HYDRO_VIEW'), getAllHydroDataController);

// Lấy 1 hydro_data theo ID
router.get('/hydro/:id', verifyToken, requirePermission('HYDRO_VIEW'), getHydroDataByIdController);

// Lấy hydro_data theo element_id
router.get('/hydro/element/:element_id', verifyToken, requirePermission('HYDRO_VIEW'), getHydroDataByElementIdController);

// Lấy danh sách các thời gian có sẵn
router.get('/hydro/times', verifyToken, requirePermission('HYDRO_VIEW'), getAvailableTimesController);

// Tạo hydro_data mới
router.post('/hydro', verifyToken, requirePermission('HYDRO_CREATE'), createHydroDataController);

// Cập nhật hydro_data
router.put('/hydro/:id', verifyToken, requirePermission('HYDRO_UPDATE'), updateHydroDataController);

// Xóa hydro_data
router.delete('/hydro/:id', verifyToken, requirePermission('HYDRO_DELETE'), deleteHydroDataController);

module.exports = router;

