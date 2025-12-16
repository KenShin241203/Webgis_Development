const {
    getAllCong,
    createCong,
    updateCong,
    deleteCong,
    getCongById,
    clearCongCache,
    getCacheStats,
    searchCongByCoordinates,
    backupCong
} = require('../../services/cong/congService');

const getAllCongController = async (req, res) => {
    try {
        // Lấy các tham số từ query
        const {
            page,
            pageSize,
            forceRefresh = false,
            fromSrid = 9209,
            toSrid = 4326
        } = req.query;

        const result = await getAllCong({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true',
            fromSrid: parseInt(fromSrid),
            toSrid: parseInt(toSrid)
        });

        return res.status(200).json({
            message: result.message,
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
                totalPages: result.totalPages
            },
            cache: {
                fromCache: result.fromCache,
                timestamp: result.timestamp
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Controller thêm cống mới
const createCongController = async (req, res) => {
    try {
        const congData = req.body;
        console.log('📝 Dữ liệu nhận được:', congData);

        // Validate dữ liệu đầu vào - chỉ yêu cầu tên cống
        if (!congData.ten) {
            return res.status(400).json({
                message: 'Thiếu thông tin bắt buộc: tên cống'
            });
        }

        const result = await createCong(congData);

        return res.status(201).json({
            message: result.message,
            data: result.data,
            cache: {
                invalidated: result.cacheInvalidated
            }
        });
    } catch (error) {
        console.error('❌ Lỗi trong createCongController:', error);
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Controller cập nhật cống
const updateCongController = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log('✏️ Cập nhật cống ID:', id);
        console.log('📝 Dữ liệu cập nhật:', updateData);

        if (!id) {
            return res.status(400).json({
                message: 'Thiếu ID cống cần cập nhật'
            });
        }

        // Parse ID thành integer
        const congId = parseInt(id);
        if (isNaN(congId)) {
            return res.status(400).json({
                message: 'ID cống không hợp lệ'
            });
        }

        const result = await updateCong(congId, updateData);

        return res.status(200).json({
            message: result.message,
            data: result.data,
            cache: {
                invalidated: result.cacheInvalidated
            }
        });
    } catch (error) {
        console.error('❌ Lỗi trong updateCongController:', error);
        if (error.message.includes('Không tìm thấy cống')) {
            return res.status(404).json({
                message: error.message
            });
        }
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Controller xóa cống
const deleteCongController = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Xóa cống ID:', id);

        if (!id) {
            return res.status(400).json({
                message: 'Thiếu ID cống cần xóa'
            });
        }

        // Parse ID thành integer
        const congId = parseInt(id);
        if (isNaN(congId)) {
            return res.status(400).json({
                message: 'ID cống không hợp lệ'
            });
        }

        const result = await deleteCong(congId);

        return res.status(200).json({
            message: result.message,
            deletedId: result.deletedId,
            cache: {
                invalidated: result.cacheInvalidated
            }
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy cống')) {
            return res.status(404).json({
                message: error.message
            });
        }
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Controller lấy cống theo ID
const getCongByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const { fromSrid = 9209, toSrid = 4326 } = req.query;

        if (!id) {
            return res.status(400).json({
                message: 'Thiếu ID cống'
            });
        }

        const result = await getCongById(id, parseInt(fromSrid), parseInt(toSrid));

        return res.status(200).json({
            message: result.message,
            data: result.data,
            cache: {
                fromCache: result.fromCache
            }
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy cống')) {
            return res.status(404).json({
                message: error.message
            });
        }
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};


// Controller để xóa cache
const clearCongCacheController = async (req, res) => {
    try {
        await clearCongCache();
        return res.status(200).json({
            message: 'Đã xóa cache cong thành công'
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi khi xóa cache',
            error: error.message
        });
    }
};

// Controller để lấy cache stats
const getCongCacheStatsController = async (req, res) => {
    try {
        const stats = await getCacheStats();
        return res.status(200).json({
            message: 'Lấy thông tin cache thành công',
            stats
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi khi lấy thông tin cache',
            error: error.message
        });
    }
};

// Tìm kiếm cống theo tọa độ
const searchCongByCoordinatesController = async (req, res) => {
    try {
        const {
            lat,
            lng,
            radius = 0.01,
            page,
            pageSize,
            forceRefresh = false,
            fromSrid = 9209,
            toSrid = 4326
        } = req.query;

        const result = await searchCongByCoordinates({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            radius: parseFloat(radius),
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true',
            fromSrid: parseInt(fromSrid),
            toSrid: parseInt(toSrid)
        });

        return res.status(200).json({
            message: result.message,
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
                totalPages: result.totalPages
            },
            cache: {
                fromCache: result.fromCache
            },
            searchParams: result.searchParams
        });
    } catch (error) {
        return res.status(400).json({
            message: 'Lỗi tìm kiếm',
            error: error.message
        });
    }
};

const backupCongController = async (req, res) => {
    try {

        const result = await backupCong();

        return res.status(200).json(result.data);
    } catch (error) {
        console.error('Lỗi backup cống:', error);
        return res.status(500).json({
            message: 'Lỗi server khi backup dữ liệu cống',
            error: error.message
        });
    }
};

module.exports = {
    getAllCongController,
    createCongController,
    updateCongController,
    deleteCongController,
    getCongByIdController,
    clearCongCacheController,
    getCongCacheStatsController,
    searchCongByCoordinatesController,
    backupCongController
}; 