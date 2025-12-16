const { getAllHienTrang, clearHienTrangCache, getCacheStats, getHienTrangById, createHienTrang, updateHienTrang, deleteHienTrang, searchHienTrangByCoordinates } = require('../../services/hientrang/hientrangService');

const getAllHienTrangController = async (req, res) => {
    try {
        // Lấy các tham số từ query
        const {
            page,
            pageSize,
            forceRefresh = false,
            fromSrid = 9209,
            toSrid = 4326
        } = req.query;

        const result = await getAllHienTrang({
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

const getHienTrangByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const { fromSrid = 9209, toSrid = 4326 } = req.query;
        const result = await getHienTrangById(id, { fromSrid: parseInt(fromSrid), toSrid: parseInt(toSrid) });
        return res.status(200).json({ message: result.message, data: result.data });
    } catch (error) {
        return res.status(404).json({ message: 'Không tìm thấy', error: error.message });
    }
};

const createHienTrangController = async (req, res) => {
    try {
        const payload = req.body;
        const result = await createHienTrang(payload);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi tạo', error: error.message });
    }
};

const updateHienTrangController = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const result = await updateHienTrang(id, payload);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi cập nhật', error: error.message });
    }
};

const deleteHienTrangController = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteHienTrang(id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi xóa', error: error.message });
    }
};

const clearHienTrangCacheController = async (req, res) => {
    try {
        const result = await clearHienTrangCache();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const getHienTrangCacheStatsController = async (req, res) => {
    try {
        const stats = await getCacheStats();
        return res.status(200).json({ message: 'Lấy thông tin cache thành công', stats });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi lấy thông tin cache', error: error.message });
    }
};

const searchHienTrangByCoordinatesController = async (req, res) => {
    try {
        const { lat, lng, radius = 0.01, page, pageSize, forceRefresh = false, fromSrid = 9209, toSrid = 4326 } = req.query;
        const result = await searchHienTrangByCoordinates({
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
            pagination: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
            cache: { fromCache: result.fromCache },
            searchParams: result.searchParams
        });
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi tìm kiếm', error: error.message });
    }
};

module.exports = {
    getAllHienTrangController,
    clearHienTrangCacheController,
    getHienTrangCacheStatsController,
    getHienTrangByIdController,
    createHienTrangController,
    updateHienTrangController,
    deleteHienTrangController,
    searchHienTrangByCoordinatesController
}; 