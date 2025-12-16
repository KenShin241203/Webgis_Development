const {
    getAllKhaosat,
    createKhaosat,
    updateKhaosat,
    deleteKhaosat,
    getKhaosatById,
    clearKhaosatCache,
    getCacheStats,
    searchKhaosatByCoordinates
} = require('../../services/khaosat/khaosatService');

// Lấy tất cả điểm khảo sát
const getAllKhaosatController = async (req, res) => {
    try {
        const {
            page,
            pageSize,
            forceRefresh = false
        } = req.query;

        const result = await getAllKhaosat({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true'
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

// Thêm điểm khảo sát
const createKhaosatController = async (req, res) => {
    try {
        const data = req.body;

        // Validate cơ bản: lat, lng bắt buộc
        if (data.lat === undefined || data.lng === undefined) {
            return res.status(400).json({
                message: 'Thiếu thông tin bắt buộc: lat, lng'
            });
        }

        const result = await createKhaosat(data);

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

// Cập nhật điểm khảo sát
const updateKhaosatController = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Thiếu ID điểm khảo sát cần cập nhật' });
        }

        const khaosatId = parseInt(id);
        if (isNaN(khaosatId)) {
            return res.status(400).json({ message: 'ID điểm khảo sát không hợp lệ' });
        }

        const result = await updateKhaosat(khaosatId, updateData);

        return res.status(200).json({
            message: result.message,
            data: result.data,
            cache: { invalidated: result.cacheInvalidated }
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy điểm khảo sát')) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa điểm khảo sát
const deleteKhaosatController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Thiếu ID điểm khảo sát cần xóa' });
        }

        const khaosatId = parseInt(id);
        if (isNaN(khaosatId)) {
            return res.status(400).json({ message: 'ID điểm khảo sát không hợp lệ' });
        }

        const result = await deleteKhaosat(khaosatId);

        return res.status(200).json({
            message: result.message,
            deletedId: result.deletedId,
            cache: { invalidated: result.cacheInvalidated }
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy điểm khảo sát')) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy điểm khảo sát theo ID
const getKhaosatByIdController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Thiếu ID điểm khảo sát' });
        }

        const result = await getKhaosatById(id);

        return res.status(200).json({
            message: result.message,
            data: result.data,
            cache: { fromCache: result.fromCache }
        });
    } catch (error) {
        if (error.message.includes('Không tìm thấy điểm khảo sát')) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa cache
const clearKhaosatCacheController = async (req, res) => {
    try {
        await clearKhaosatCache();
        return res.status(200).json({ message: 'Đã xóa cache khaosat thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi xóa cache', error: error.message });
    }
};

// Lấy cache stats
const getKhaosatCacheStatsController = async (req, res) => {
    try {
        const stats = await getCacheStats();
        return res.status(200).json({ message: 'Lấy thông tin cache thành công', stats });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi lấy thông tin cache', error: error.message });
    }
};

// Tìm kiếm điểm khảo sát theo tọa độ
const searchKhaosatByCoordinatesController = async (req, res) => {
    try {
        const {
            lat,
            lng,
            radius = 0.01,
            page,
            pageSize,
            forceRefresh = false
        } = req.query;

        const result = await searchKhaosatByCoordinates({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            radius: parseFloat(radius),
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true'
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

module.exports = {
    getAllKhaosatController,
    createKhaosatController,
    updateKhaosatController,
    deleteKhaosatController,
    getKhaosatByIdController,
    clearKhaosatCacheController,
    getKhaosatCacheStatsController,
    searchKhaosatByCoordinatesController
};
