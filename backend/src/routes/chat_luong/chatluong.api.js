const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyJwt');
const {
    getAllChatLuongController,
    clearChatLuongCacheController,
    getChatLuongCacheStatsController,
    createChatLuongController,
    updateChatLuongController,
    deleteChatLuongController,
    getChatLuongByIdController,
    searchChatLuongByCoordinatesController
} = require('../../controllers/chat_luong/chatluongController');
const { requirePermission } = require('../../middleware/permissionCheck');

// Lấy tất cả dữ liệu chat_luong với phân trang và cache
router.get('/chat-luong', verifyToken, requirePermission('CHATLUONG_VIEW'), getAllChatLuongController);

// Tìm kiếm chat_luong theo tọa độ
router.get('/chat-luong/search', verifyToken, requirePermission('CHATLUONG_VIEW'), searchChatLuongByCoordinatesController);

// Xóa cache chat_luong (đặt trước route động)
router.delete('/chat-luong/cache', verifyToken, requirePermission('SYSTEM_ADMIN'), clearChatLuongCacheController);

// Lấy thông tin cache stats
router.get('/chat-luong/cache/stats', verifyToken, requirePermission('SYSTEM_ADMIN'), getChatLuongCacheStatsController);

// Lấy chat_luong theo ID
router.get('/chat-luong/:id', verifyToken, requirePermission('CHATLUONG_VIEW'), getChatLuongByIdController);

// Thêm chat_luong mới (yêu cầu authentication)
router.post('/chat-luong', verifyToken, requirePermission('CHATLUONG_CREATE'), createChatLuongController);

// Cập nhật chat_luong (yêu cầu authentication)
router.put('/chat-luong/:id', verifyToken, requirePermission('CHATLUONG_UPDATE'), updateChatLuongController);

// Xóa chat_luong (yêu cầu authentication)
router.delete('/chat-luong/:id', verifyToken, requirePermission('CHATLUONG_DELETE'), deleteChatLuongController);

module.exports = router; 