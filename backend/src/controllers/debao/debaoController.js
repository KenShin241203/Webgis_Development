const { getAllDebao, clearDebaoCache, getCacheStats, getDebaoById, createDebao, updateDebao, deleteDeBao, searchDebaoByCoordinates } = require('../../services/debao/debaoService');

const getAllDebaoController = async (req, res) => {
    try {
        // Lấy các tham số từ query
        const {
            page,
            pageSize,
            forceRefresh = false,
            fromSrid = 9209,
            toSrid = 4326
        } = req.query;

        const result = await getAllDebao({
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

const getDebaoByIdController = async (req, res) => {
    try {
        const { f_id } = req.params;
        if (!f_id) {
            return res.status(400).json({
                message: 'Thiếu f_id debao cần lấy'
            });
        }
        const debaoId = parseInt(f_id);
        if (isNaN(debaoId)) {
            return res.status(400).json({
                message: 'f_id Debao không hợp lệ'
            });
        }
        const result = await getDebaoById(f_id);
        return res.status(200).json({
            message: result.message,
            data: result.data,
            fromCache: result.fromCache
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
}

const createDebaoController = async (req, res) => {
    try {
        const debaoData = req.body;
        if (!debaoData.entity) {
            return res.status(400).json({
                message: 'Thiếu dữ liệu debao cần thêm'
            });
        }

        const result = await createDebao(debaoData);
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
}

const updateDebaoController = async (req, res) => {
    try {
        const { f_id } = req.params;
        const updateData = req.body;
        if (!f_id) {
            return res.status(400).json({
                message: 'Thiếu ID debao cần cập nhật'
            });
        }
        const debaoId = parseInt(f_id);
        if (isNaN(debaoId)) {
            return res.status(400).json({
                message: 'ID Debao không hợp lệ'
            });
        }
        const result = await updateDebao(f_id, updateData);
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
}

const deleteDebaoController = async (req, res) => {
    try {
        const { f_id } = req.params;
        if (!f_id) {
            return res.status(400).json({
                message: 'Thiếu ID debao cần xóa'
            });
        }
        const result = await deleteDeBao(f_id);
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
}

// Controller để xóa cache
const clearDebaoCacheController = async (req, res) => {
    try {
        await clearDebaoCache();
        return res.status(200).json({
            message: 'Đã xóa cache debao thành công'
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi khi xóa cache',
            error: error.message
        });
    }
};

// Controller để lấy cache stats
const getDebaoCacheStatsController = async (req, res) => {
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

const searchDebaoByCoordinatesController = async (req, res) => {
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

        const result = await searchDebaoByCoordinates({
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
            cache: { fromCache: result.fromCache },
            searchParams: result.searchParams
        });
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi tìm kiếm', error: error.message });
    }
};

module.exports = {
    getAllDebaoController,
    clearDebaoCacheController,
    getDebaoCacheStatsController,
    createDebaoController,
    updateDebaoController,
    deleteDebaoController,
    getDebaoByIdController,
    searchDebaoByCoordinatesController
};
