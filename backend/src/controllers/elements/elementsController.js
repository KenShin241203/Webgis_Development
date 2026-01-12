const {
    getAllElements,
    createElement,
    updateElement,
    deleteElement,
    getElementById,
    getElementsByIds
} = require('../../services/elements/elementsService');

const getAllElementsController = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 100,
            forceRefresh = false
        } = req.query;

        const result = await getAllElements({
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

const createElementController = async (req, res) => {
    try {
        const payload = req.body;
        if (!payload.element_id) {
            return res.status(400).json({ message: 'Thiếu element_id' });
        }
        const created = await createElement(payload);
        return res.status(201).json({
            message: 'Tạo element thành công',
            data: created
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi server khi tạo element',
            error: error.message
        });
    }
};

const updateElementController = async (req, res) => {
    try {
        const { element_id } = req.params;
        if (!element_id) {
            return res.status(400).json({ message: 'Thiếu element_id' });
        }
        const updated = await updateElement(parseInt(element_id), req.body);
        return res.status(200).json({
            message: 'Cập nhật element thành công',
            data: updated
        });
    } catch (error) {
        const status = error.message.includes('Không tìm thấy') ? 404 : 500;
        return res.status(status).json({
            message: 'Lỗi khi cập nhật element',
            error: error.message
        });
    }
};

const deleteElementController = async (req, res) => {
    try {
        const { element_id } = req.params;
        if (!element_id) {
            return res.status(400).json({ message: 'Thiếu element_id' });
        }
        const deletedId = await deleteElement(parseInt(element_id));
        return res.status(200).json({
            message: 'Xóa element thành công',
            deletedId
        });
    } catch (error) {
        const status = error.message.includes('Không tìm thấy') ? 404 : 500;
        return res.status(status).json({
            message: 'Lỗi khi xóa element',
            error: error.message
        });
    }
};

const getElementByIdController = async (req, res) => {
    try {
        const { element_id } = req.params;
        if (!element_id) {
            return res.status(400).json({ message: 'Thiếu element_id' });
        }

        // Validate ID là số hợp lệ
        const parsedId = parseInt(element_id);
        if (isNaN(parsedId) || parsedId <= 0) {
            return res.status(400).json({
                message: 'element_id không hợp lệ',
                error: `element_id phải là số nguyên dương, nhận được: ${element_id}`
            });
        }

        const data = await getElementById(parsedId);
        return res.status(200).json({
            message: 'Lấy element theo ID thành công',
            data
        });
    } catch (error) {
        const status = error.message.includes('Không tìm thấy') ? 404 : 500;
        return res.status(status).json({
            message: 'Lỗi khi lấy element theo ID',
            error: error.message
        });
    }
};

const getElementsByIdsController = async (req, res) => {
    try {
        // Nhận danh sách element_ids từ query parameter (comma-separated hoặc array)
        let elementIds = [];

        if (req.query.element_ids) {
            // Nếu là string (comma-separated)
            if (typeof req.query.element_ids === 'string') {
                elementIds = req.query.element_ids.split(',').map(id => id.trim());
            } else if (Array.isArray(req.query.element_ids)) {
                elementIds = req.query.element_ids;
            }
        } else if (req.body && req.body.element_ids) {
            // Nếu gửi qua POST body
            elementIds = Array.isArray(req.body.element_ids)
                ? req.body.element_ids
                : [req.body.element_ids];
        }

        if (elementIds.length === 0) {
            return res.status(400).json({
                message: 'Thiếu element_ids',
                error: 'Cần cung cấp danh sách element_ids (query: ?element_ids=1,2,3 hoặc body: {element_ids: [1,2,3]})'
            });
        }

        const data = await getElementsByIds(elementIds);
        return res.status(200).json({
            message: `Lấy ${data.length} elements thành công`,
            data,
            total: data.length
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Lỗi khi lấy elements theo danh sách IDs',
            error: error.message
        });
    }
};

module.exports = {
    getAllElementsController,
    createElementController,
    updateElementController,
    deleteElementController,
    getElementByIdController,
    getElementsByIdsController
};
