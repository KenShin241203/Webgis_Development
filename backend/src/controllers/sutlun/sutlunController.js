const { getAllSutLun, clearSutLunCache, getSutLunById, createSutLun, updateSutLun, deleteSutLun, searchSutLunByCoordinates } = require('../../services/sutlun/sutlunService');

const getAllSutLunController = async (req, res) => {
    try {
        // Lấy các tham số từ query
        const {
            page,
            pageSize,
            forceRefresh = false,
            fromSrid = 3405,
            toSrid = 4326
        } = req.query;
        const list = await getAllSutLun({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            forceRefresh: forceRefresh === 'true',
            fromSrid: parseInt(fromSrid),
            toSrid: parseInt(toSrid)
        });
        return res.status(200).json({
            message: list.message,
            data: list.data,
            pagination: {
                total: list.total,
                page: list.page,
                pageSize: list.pageSize,
                totalPages: list.totalPages
            },
            cache: {
                fromCache: list.fromCache,
                timestamp: list.timestamp
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const getSutLunByIdController = async (req, res) => {
    try {
        const { objectid } = req.params;
        const { fromSrid = 3405, toSrid = 4326 } = req.query;
        const result = await getSutLunById(objectid, { fromSrid: parseInt(fromSrid), toSrid: parseInt(toSrid) });
        return res.status(200).json({ message: result.message, data: result.data });
    } catch (error) {
        return res.status(404).json({ message: 'Không tìm thấy', error: error.message });
    }
};

const createSutLunController = async (req, res) => {
    try {
        const payload = req.body;
        const result = await createSutLun(payload);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi tạo', error: error.message });
    }
};

const updateSutLunController = async (req, res) => {
    try {
        const { objectid } = req.params;
        const payload = req.body;
        const result = await updateSutLun(objectid, payload);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi cập nhật', error: error.message });
    }
};

const deleteSutLunController = async (req, res) => {
    try {
        const { objectid } = req.params;
        const result = await deleteSutLun(objectid);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: 'Lỗi khi xóa', error: error.message });
    }
};

const clearSutLunCacheController = async (req, res) => {
    try {
        const result = await clearSutLunCache();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const searchSutLunByCoordinatesController = async (req, res) => {
    try {
        const {
            lat,
            lng,
            radius = 0.01,
            page,
            pageSize,
            forceRefresh = false,
            fromSrid = 3405,
            toSrid = 4326
        } = req.query;

        const result = await searchSutLunByCoordinates({
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

module.exports = { getAllSutLunController, clearSutLunCacheController, getSutLunByIdController, createSutLunController, updateSutLunController, deleteSutLunController, searchSutLunByCoordinatesController }; 