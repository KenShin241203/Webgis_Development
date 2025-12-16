const {
    getAllNgapLut,
    clearNgapLutCache,
    getCacheStats,
    getNgapLutById,
    createNgapLut,
    updateNgapLut,
    deleteNgapLut
} = require('../../services/ngaplut/ngaplutService');

const getAllNgapLutController = async (req, res) => {
    try {
        const { page = 1, pageSize = 100, forceRefresh = false } = req.query;

        // Debug logging
        console.log('🔍 Controller received params:', { page, pageSize, forceRefresh });
        console.log('🔍 Parsed params:', {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true'
        });

        const result = await getAllNgapLut({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true'
        });

        return res.status(200).json({
            message: result.message,
            data: result.data,
            pagination: {
                page: result.page,
                pageSize: result.pageSize,
                total: result.total,
                totalPages: result.totalPages
            },
            fromCache: result.fromCache,
            timestamp: result.timestamp
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const getNgapLutByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                message: 'Thiếu ID ngaplut cần lấy'
            });
        }
        const ngaplutId = parseInt(id);
        if (isNaN(ngaplutId)) {
            return res.status(400).json({
                message: 'ID ngaplut không hợp lệ'
            });
        }
        const result = await getNgapLutById(id);
        return res.status(200).json({
            message: result.message,
            data: result.data,
            cache: {
                fromCache: result.fromCache
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const createNgapLutController = async (req, res) => {
    try {
        const ngaplutData = req.body;
        console.log('📝 Dữ liệu nhận được:', ngaplutData);

        const result = await createNgapLut(ngaplutData);
        return res.status(201).json({
            message: result.message,
            data: result.data,
            cache: {
                invalidated: result.cacheInvalidated
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const updateNgapLutController = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (!id) {
            return res.status(400).json({
                message: 'Thiếu ID ngaplut cần cập nhật'
            });
        }
        // Parse ID thành integer
        const ngaplutId = parseInt(id);
        if (isNaN(ngaplutId)) {
            return res.status(400).json({
                message: 'ID ngaplut không hợp lệ'
            });
        }
        const result = await updateNgapLut(id, updateData);
        return res.status(200).json({
            message: result.message,
            data: result.data,
            cache: {
                invalidated: result.cacheInvalidated
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const deleteNgapLutController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                message: 'Thiếu ID ngaplut cần xóa'
            });
        }
        const result = await deleteNgapLut(id);
        return res.status(200).json({
            message: result.message,
            deletedId: result.deletedId,
            cache: {
                invalidated: result.cacheInvalidated
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Controller để xóa cache
const clearNgapLutCacheController = async (req, res) => {
    try {
        await clearNgapLutCache();
        return res.status(200).json({
            message: 'Đã xóa cache ngaplut thành công'
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi khi xóa cache',
            error: error.message
        });
    }
};

// Controller để lấy cache stats
const getNgapLutCacheStatsController = async (req, res) => {
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

module.exports = {
    getAllNgapLutController,
    getNgapLutByIdController,
    createNgapLutController,
    updateNgapLutController,
    deleteNgapLutController,
    clearNgapLutCacheController,
    getNgapLutCacheStatsController
}; 