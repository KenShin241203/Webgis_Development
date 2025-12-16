const { getAllChatLuong, clearChatLuongCache, getCacheStats,
    createChatLuong, updateChatLuong, deleteChatLuong, getChatLuongById, searchChatLuongByCoordinates } = require('../../services/chat_luong/chatluongService');

const getAllChatLuongController = async (req, res) => {
    try {
        // Lấy các tham số từ query
        const {
            page,
            pageSize,
            forceRefresh = false,
            fromSrid = 9209,
            toSrid = 4326
        } = req.query;

        const result = await getAllChatLuong({
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

const getChatLuongByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const { fromSrid = 9209, toSrid = 4326 } = req.query;
        const result = await getChatLuongById(id, parseInt(fromSrid), parseInt(toSrid));
        return res.status(200).json({ message: result.message, data: result.data });
    } catch (error) {
        return res.status(404).json({ message: 'Không tìm thấy', error: error.message });
    }
};

const createChatLuongController = async (req, res) => {
    try {
        const payload = req.body;
        const result = await createChatLuong(payload);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi tạo', error: error.message });
    }
};

const updateChatLuongController = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const result = await updateChatLuong(id, payload);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi cập nhật', error: error.message });
    }
};

const deleteChatLuongController = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteChatLuong(id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi xóa', error: error.message });
    }
};

const clearChatLuongCacheController = async (req, res) => {
    try {
        const result = await clearChatLuongCache();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const getChatLuongCacheStatsController = async (req, res) => {
    try {
        const stats = await getCacheStats();
        return res.status(200).json(stats);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Tìm kiếm chat_luong theo tọa độ (WGS84)
const searchChatLuongByCoordinatesController = async (req, res) => {
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

        const result = await searchChatLuongByCoordinates({
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
    getAllChatLuongController,
    clearChatLuongCacheController,
    getChatLuongCacheStatsController,
    createChatLuongController,
    updateChatLuongController,
    deleteChatLuongController,
    getChatLuongByIdController,
    searchChatLuongByCoordinatesController
};
