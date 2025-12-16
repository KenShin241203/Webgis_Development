const { getAllDolunVelo, clearDolunVeloCache, getCacheStats, getDolunVeloById, createDolun, updateDolun, deleteDolun, searchDolunByCoordinates } = require('../../services/dolun_velo/dolunveloService');

const getAllDolunVeloController = async (req, res) => {
    try {
        const { page,
            pageSize,
            forceRefresh } = req.query;
        const result = await getAllDolunVelo({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true',
        });

        return res.status(200).json({
            message: 'Lấy dữ liệu dolun_velo thành công',
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
                totalPages: result.totalPages
            },
            cacheInfo: {
                cached: result.fromCache,
                lastUpdated: result.timestamp
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const getDolunByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await getDolunVeloById(id);
        return res.status(200).json({ message: result.message, data: result.data, fromCache: result.fromCache });
    } catch (error) {
        return res.status(404).json({ message: 'Không tìm thấy', error: error.message });
    }
};

const createDolunController = async (req, res) => {
    try {
        const dolunData = req.body;
        const result = await createDolun(dolunData);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi tạo', error: error.message });
    }
};

const updateDolunController = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const result = await updateDolun(id, updateData);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi cập nhật', error: error.message });
    }
};

const deleteDolunController = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteDolun(id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi xóa', error: error.message });
    }
};

const clearCacheController = async (req, res) => {
    try {
        await clearDolunVeloCache();
        return res.status(200).json({ message: 'Đã xóa cache dolun_velo thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi xóa cache', error: error.message });
    }
};

const getCacheStatsController = async (req, res) => {
    try {
        const stats = await getCacheStats();
        return res.status(200).json({ message: 'Lấy thông tin cache thành công', stats });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi lấy thông tin cache', error: error.message });
    }
};

const searchDolunByCoordinatesController = async (req, res) => {
    try {
        const { lat, lng, radius = 0.01, page, pageSize, forceRefresh = false } = req.query;
        const result = await searchDolunByCoordinates({
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
            pagination: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
            cache: { fromCache: result.fromCache },
            searchParams: result.searchParams
        });
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi tìm kiếm', error: error.message });
    }
};

module.exports = {
    getAllDolunVeloController,
    createDolunController,
    getDolunByIdController,
    updateDolunController,
    deleteDolunController,
    clearCacheController,
    getCacheStatsController,
    searchDolunByCoordinatesController
}; 