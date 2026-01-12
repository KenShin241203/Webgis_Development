const {
    getAllHydroData,
    createHydroData,
    updateHydroData,
    deleteHydroData,
    getHydroDataById,
    getHydroDataByElementId,
    getAvailableTimes
} = require('../../services/hydro/hydroService');

const getAllHydroDataController = async (req, res) => {
    try {
        const {
            pageSize,
            cursor = null,
            element_id = null,
            startTime = null,
            endTime = null
        } = req.query;

        const result = await getAllHydroData({
            pageSize: parseInt(pageSize) || 1000,
            cursor: cursor || null,
            element_id: element_id ? parseInt(element_id) : null,
            startTime: startTime || null,
            endTime: endTime || null
        });

        return res.status(200).json({
            message: result.message,
            data: result.data,
            pagination: {
                pageSize: result.pageSize,
                cursor: result.cursor,
                hasMore: result.hasMore,
                total: result.total // Chỉ có khi là trang đầu tiên
            },
            fromCache: result.fromCache
        });
    } catch (error) {
        console.error('❌ Lỗi getAllHydroDataController:', error);
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const createHydroDataController = async (req, res) => {
    try {
        const payload = req.body;
        if (!payload.element_id || !payload.time) {
            return res.status(400).json({
                message: 'Thiếu element_id hoặc time'
            });
        }
        const created = await createHydroData(payload);
        return res.status(201).json({
            message: 'Tạo hydro_data thành công',
            data: created
        });
    } catch (error) {
        const status = error.message.includes('Đã tồn tại') ? 409 : 500;
        return res.status(status).json({
            message: 'Lỗi server khi tạo hydro_data',
            error: error.message
        });
    }
};

const updateHydroDataController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Thiếu id' });
        }
        
        // Validate ID là số hợp lệ
        const parsedId = parseInt(id);
        if (isNaN(parsedId) || parsedId <= 0) {
            return res.status(400).json({ 
                message: 'ID không hợp lệ',
                error: `ID phải là số nguyên dương, nhận được: ${id}`
            });
        }
        
        const updated = await updateHydroData(parsedId, req.body);
        return res.status(200).json({
            message: 'Cập nhật hydro_data thành công',
            data: updated
        });
    } catch (error) {
        let status = 500;
        if (error.message.includes('Không tìm thấy')) {
            status = 404;
        } else if (error.message.includes('Đã tồn tại')) {
            status = 409;
        }
        return res.status(status).json({
            message: 'Lỗi khi cập nhật hydro_data',
            error: error.message
        });
    }
};

const deleteHydroDataController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Thiếu id' });
        }
        
        // Validate ID là số hợp lệ
        const parsedId = parseInt(id);
        if (isNaN(parsedId) || parsedId <= 0) {
            return res.status(400).json({ 
                message: 'ID không hợp lệ',
                error: `ID phải là số nguyên dương, nhận được: ${id}`
            });
        }
        
        const deletedId = await deleteHydroData(parsedId);
        return res.status(200).json({
            message: 'Xóa hydro_data thành công',
            deletedId
        });
    } catch (error) {
        const status = error.message.includes('Không tìm thấy') ? 404 : 500;
        return res.status(status).json({
            message: 'Lỗi khi xóa hydro_data',
            error: error.message
        });
    }
};

const getHydroDataByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Thiếu id' });
        }
        
        // Validate ID là số hợp lệ
        const parsedId = parseInt(id);
        if (isNaN(parsedId) || parsedId <= 0) {
            return res.status(400).json({ 
                message: 'ID không hợp lệ',
                error: `ID phải là số nguyên dương, nhận được: ${id}`
            });
        }
        
        const data = await getHydroDataById(parsedId);
        return res.status(200).json({
            message: 'Lấy hydro_data theo ID thành công',
            data
        });
    } catch (error) {
        const status = error.message.includes('Không tìm thấy') ? 404 : 500;
        return res.status(status).json({
            message: 'Lỗi khi lấy hydro_data theo ID',
            error: error.message
        });
    }
};

const getHydroDataByElementIdController = async (req, res) => {
    try {
        const { element_id } = req.params;
        if (!element_id) {
            return res.status(400).json({ message: 'Thiếu element_id' });
        }
        
        // Validate element_id là số hợp lệ
        const parsedElementId = parseInt(element_id);
        if (isNaN(parsedElementId) || parsedElementId <= 0) {
            return res.status(400).json({ 
                message: 'element_id không hợp lệ',
                error: `element_id phải là số nguyên dương, nhận được: ${element_id}`
            });
        }
        
        const {
            pageSize = 100,
            cursor = null,
            startTime = null,
            endTime = null
        } = req.query;

        const result = await getHydroDataByElementId(parsedElementId, {
            pageSize: parseInt(pageSize) || 100,
            cursor: cursor || null,
            startTime: startTime || null,
            endTime: endTime || null
        });

        return res.status(200).json({
            message: result.message,
            data: result.data,
            pagination: {
                pageSize: result.pageSize,
                cursor: result.cursor,
                hasMore: result.hasMore
            }
        });
    } catch (error) {
        console.error('❌ Lỗi getHydroDataByElementIdController:', error);
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const getAvailableTimesController = async (req, res) => {
    try {
        const result = await getAvailableTimes();
        return res.status(200).json({
            message: result.message,
            data: result.data,
            fromCache: result.fromCache
        });
    } catch (error) {
        console.error('❌ Lỗi getAvailableTimesController:', error);
        console.error('Stack trace:', error.stack);
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    getAllHydroDataController,
    createHydroDataController,
    updateHydroDataController,
    deleteHydroDataController,
    getHydroDataByIdController,
    getHydroDataByElementIdController,
    getAvailableTimesController
};

