const db = require('../../models');
const { transformGeometryList } = require('../../utils/coordinateTransform');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

// Hàm lấy tất cả ChatLuong với phân trang và cache toàn bộ dữ liệu
const getAllChatLuong = async ({
    page,
    pageSize,
    forceRefresh = false,
    fromSrid = 9209,
    toSrid = 4326
} = {}) => {
    try {
        // Cache key cho toàn bộ dữ liệu chat_luong
        const cacheKey = CACHE_KEYS.CHAT_LUONG_ALL;
        const cacheTimestampKey = CACHE_KEYS.CHAT_LUONG_TIMESTAMP;

        // Kiểm tra cache trước khi query database
        const hasCache = await cacheService.has(cacheKey);
        console.log('🔍 Cache status:', hasCache);
        console.log('🔍 Force refresh:', forceRefresh);

        let allChatLuongData = null;
        let timestamp = null;

        if (!forceRefresh && hasCache) {
            console.log('📦 Lấy dữ liệu từ cache');
            allChatLuongData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);

            if (!allChatLuongData) {
                console.log('⚠️ Cache data null, query từ database');
            }
        }

        // Nếu không có cache hoặc force refresh, query từ database
        if (!allChatLuongData || forceRefresh) {
            console.log('🔄 Query toàn bộ dữ liệu từ database');
            // Lấy toàn bộ dữ liệu chat_luong
            const chatLuongList = await db.ChatLuong.findAll();
            allChatLuongData = await transformGeometryList(chatLuongList, fromSrid, toSrid);
            timestamp = new Date().toISOString();

            // Lưu toàn bộ dữ liệu vào cache
            await cacheService.set(cacheKey, allChatLuongData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Đã lưu toàn bộ dữ liệu vào cache');
        }

        const uniqueData = allChatLuongData.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );

        if (uniqueData.length < allChatLuongData.length) {
            await cacheService.del(cacheKey);
            await cacheService.del(cacheTimestampKey);

            const chatLuongList = await db.ChatLuong.findAll();
            allChatLuongData = await transformGeometryList(chatLuongList, fromSrid, toSrid);

            await cacheService.set(cacheKey, allChatLuongData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Đã lưu toàn bộ dữ liệu vào cache');
        }

        // Phân trang từ dữ liệu đã có (từ cache hoặc database)
        const total = uniqueData.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0
            ? 1
            : Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

        const startIndex = (safePage - 1) * safePageSize;
        const endIndex = startIndex + safePageSize;
        const paginatedData = uniqueData.slice(startIndex, endIndex);

        return {
            message: hasCache && !forceRefresh ? 'Lấy dữ liệu từ cache' : 'Lấy dữ liệu từ database',
            data: paginatedData,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: hasCache && !forceRefresh,
            timestamp: timestamp
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu chat_luong: ' + error.message);
    }
};

// Xóa cache toàn bộ dữ liệu chat_luong
const clearChatLuongCache = async () => {
    try {
        await cacheService.del(CACHE_KEYS.CHAT_LUONG_ALL);
        await cacheService.del(CACHE_KEYS.CHAT_LUONG_TIMESTAMP);
        console.log('🗑️ Đã xóa cache chat_luong (toàn bộ dữ liệu)');
        return { message: 'Đã xóa cache chat_luong', success: true };
    } catch (error) {
        console.error('❌ Lỗi khi xóa cache chat_luong:', error);
        throw new Error('Lỗi khi xóa cache chat_luong: ' + error.message);
    }
};

// Thêm method để lấy cache stats
const getCacheStats = async () => {
    return await cacheService.getStats();
};

// Hàm xử lý dữ liệu chat_luong trước khi lưu vào database
const processChatLuongDataForDB = (data, isUpdate = false) => {
    const processed = {};

    // Trường số nguyên
    const numericFields = ['kind_id'];

    // Trường text
    const textFields = ['name', 'layer', 'kml_folder'];

    for (const [key, value] of Object.entries(data)) {
        // Bỏ qua id khi tạo mới (autoIncrement), giữ khi update
        if (key === 'id' && !isUpdate) {
            continue;
        }

        // Bỏ qua geometry trong vòng lặp, sẽ xử lý chuẩn hóa riêng phía dưới
        if (key === 'geometry') {
            continue;
        }

        if (numericFields.includes(key)) {
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const numValue = parseInt(value);
                processed[key] = isNaN(numValue) ? null : numValue;
            }
        } else if (textFields.includes(key)) {
            processed[key] = value === '' ? null : value;
        } else {
            processed[key] = value;
        }
    }

    // Chuẩn hóa geometry: cho phép null; nếu có thì là LineString với đúng 2 cặp toạ độ
    const geom = (data && Object.prototype.hasOwnProperty.call(data, 'geometry')) ? data.geometry : undefined;

    if (geom === null || geom === undefined) {
        processed.geometry = null;
        return processed;
    }

    if (geom.type !== 'LineString' || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
        throw new Error('geometry phải là LineString và có ít nhất 2 cặp toạ độ');
    }

    const [first, second] = geom.coordinates;
    if (!Array.isArray(first) || !Array.isArray(second) || first.length < 2 || second.length < 2) {
        throw new Error('Mỗi điểm trong geometry cần có dạng [longitude, latitude]');
    }

    const lon1 = parseFloat(first[0]);
    const lat1 = parseFloat(first[1]);
    const lon2 = parseFloat(second[0]);
    const lat2 = parseFloat(second[1]);

    if ([lon1, lat1, lon2, lat2].some(Number.isNaN)) {
        throw new Error('Toạ độ không hợp lệ trong geometry');
    }

    processed.geometry = {
        type: 'LineString',
        coordinates: [
            [lon1, lat1],
            [lon2, lat2]
        ]
    };

    return processed;
};

// Hàm tạo mới bản ghi chat_luong
const createChatLuong = async (chatLuongData) => {
    try {
        // Xử lý dữ liệu đầu vào (isUpdate = false)
        const processedData = processChatLuongDataForDB(chatLuongData, false);

        // Đảm bảo không đưa id khi tạo mới
        if ('id' in processedData) {
            delete processedData.id;
        }

        // Loại bỏ các trường undefined/null không cần thiết
        const cleanData = {};
        for (const [key, value] of Object.entries(processedData)) {
            if (value !== undefined && value !== null) {
                cleanData[key] = value;
            }
        }

        // 1. Tạo trong database
        const newChatLuong = await db.ChatLuong.create(cleanData);

        // 2. Invalidate cache (Cache-Aside)
        await cacheService.del(CACHE_KEYS.CHAT_LUONG_ALL);
        await cacheService.del(CACHE_KEYS.CHAT_LUONG_TIMESTAMP);

        return {
            message: 'Thêm chat_luong thành công',
            data: newChatLuong,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error('Lỗi khi thêm chat_luong: ' + error.message);
    }
};

const updateChatLuong = async (id, updateData) => {
    try {
        const existingChatLuong = await db.ChatLuong.findByPk(id);
        if (!existingChatLuong) {
            throw new Error('Không tìm thấy chat_luong với ID: ' + id);
        }
        const processedData = processChatLuongDataForDB(updateData, true);

        const updatedChatLuong = await existingChatLuong.update(processedData);

        await cacheService.del(CACHE_KEYS.CHAT_LUONG_ALL);
        await cacheService.del(CACHE_KEYS.CHAT_LUONG_TIMESTAMP);

        return {
            message: 'Cập nhật chat_luong thành công',
            data: updatedChatLuong,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error('Lỗi khi cập nhật chat_luong: ' + error.message);
    }
}

const deleteChatLuong = async (id) => {
    try {
        const existingChatLuong = await db.ChatLuong.findByPk(id);
        if (!existingChatLuong) {
            throw new Error('Không tìm thấy chat_luong với ID: ' + id);
        }
        await existingChatLuong.destroy();
        await cacheService.del(CACHE_KEYS.CHAT_LUONG_ALL);
        await cacheService.del(CACHE_KEYS.CHAT_LUONG_TIMESTAMP);

        return {
            message: 'Xóa chat_luong thành công',
            deletedId: id,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error('Lỗi khi xóa chat_luong: ' + error.message);
    }
}

const getChatLuongById = async (id, fromSrid = 9209, toSrid = 4326) => {
    try {
        const cacheKey = CACHE_KEYS.CHAT_LUONG_ALL;
        const hasCache = await cacheService.has(cacheKey);

        if (hasCache) {
            console.log('📦 Tìm kiếm trong cache');
            const allChatLuongData = await cacheService.get(cacheKey);
            const chatLuongFromCache = allChatLuongData.find(chatLuong => chatLuong.id === parseInt(id));
            if (chatLuongFromCache) {
                console.log('✅ Tìm thấy chat_luong trong cache');
                return {
                    message: 'Lấy dữ liệu từ cache',
                    data: chatLuongFromCache,
                    fromCache: true
                };
            }
        }
        const chatluong = await db.chatLuong.findByPk(id);
        if (!chatluong) {
            throw new Error('Không tìm thấy chat_luong với ID: ' + id);
        }
        const transformedChatLuong = await transformGeometryList([chatluong], fromSrid, toSrid);
        return {
            message: 'Lấy dữ liệu chat_luong thành công',
            data: transformedChatLuong[0],
            fromCache: false
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy chat_luong với ID: ' + id + ': ' + error.message);
    }
}

// Tìm kiếm chat_luong theo toạ độ WGS84 (lọc theo điểm gần đoạn LineString)
const searchChatLuongByCoordinates = async ({
    lat,
    lng,
    radius = 0.01,
    page = 1,
    pageSize = 100,
    forceRefresh = false,
    fromSrid = 9209,
    toSrid = 4326
} = {}) => {
    try {
        if (lat === undefined || lng === undefined) {
            throw new Error('Vĩ độ và kinh độ là bắt buộc');
        }
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = parseFloat(radius);
        if (Number.isNaN(latNum) || Number.isNaN(lngNum) || Number.isNaN(radiusNum)) {
            throw new Error('Tọa độ và bán kính phải là số hợp lệ');
        }
        if (latNum < -90 || latNum > 90) {
            throw new Error('Vĩ độ phải trong khoảng -90 đến 90');
        }
        if (lngNum < -180 || lngNum > 180) {
            throw new Error('Kinh độ phải trong khoảng -180 đến 180');
        }

        const cacheKey = `${CACHE_KEYS.CHAT_LUONG_ALL}_search_${latNum}_${lngNum}_${radiusNum}`;
        const hasCache = await cacheService.has(cacheKey);
        let results = null;
        if (!forceRefresh && hasCache) {
            results = await cacheService.get(cacheKey);
        }

        if (!results || forceRefresh) {
            // Lấy toàn bộ dữ liệu đã transform về WGS84 (không phân trang)
            let allData = await cacheService.get(CACHE_KEYS.CHAT_LUONG_ALL);
            if (!allData || forceRefresh) {
                const chatLuongList = await db.ChatLuong.findAll();
                allData = await transformGeometryList(chatLuongList, fromSrid, toSrid);
                await cacheService.set(CACHE_KEYS.CHAT_LUONG_ALL, allData);
                await cacheService.set(CACHE_KEYS.CHAT_LUONG_TIMESTAMP, new Date().toISOString());
            }

            // Hàm tính khoảng cách điểm đến đoạn thẳng nhỏ nhất (xấp xỉ Euclidean theo lat/lng)
            const distancePointToSegment = (px, py, x1, y1, x2, y2) => {
                const dx = x2 - x1;
                const dy = y2 - y1;
                if (dx === 0 && dy === 0) {
                    const ddx = px - x1;
                    const ddy = py - y1;
                    return Math.sqrt(ddx * ddx + ddy * ddy);
                }
                const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
                const tt = Math.max(0, Math.min(1, t));
                const cx = x1 + tt * dx;
                const cy = y1 + tt * dy;
                const ddx = px - cx;
                const ddy = py - cy;
                return Math.sqrt(ddx * ddx + ddy * ddy);
            };

            results = (allData || []).filter(item => {
                if (!item.geometry || item.geometry.type !== 'LineString' || !Array.isArray(item.geometry.coordinates)) return false;
                const coords = item.geometry.coordinates;
                for (let i = 0; i < coords.length - 1; i++) {
                    const [lng1, lat1] = coords[i];
                    const [lng2, lat2] = coords[i + 1];
                    if ([lng1, lat1, lng2, lat2].some(Number.isNaN)) continue;
                    const d = distancePointToSegment(lngNum, latNum, lng1, lat1, lng2, lat2);
                    if (d <= radiusNum) return true;
                }
                return false;
            });

            await cacheService.set(cacheKey, results, 300);
        }

        // Phân trang
        const total = results.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, Number.isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0 ? 1 : Math.min(Math.max(1, Number.isNaN(requestedPage) ? 1 : requestedPage), totalPages);
        const startIndex = (safePage - 1) * safePageSize;
        const endIndex = startIndex + safePageSize;
        const paginated = results.slice(startIndex, endIndex);

        return {
            message: hasCache && !forceRefresh ? 'Lấy dữ liệu từ cache' : 'Tìm kiếm từ dữ liệu đầy đủ',
            data: paginated,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: hasCache && !forceRefresh,
            searchParams: { lat: latNum, lng: lngNum, radius: radiusNum }
        };
    } catch (error) {
        throw new Error('Lỗi khi tìm kiếm chat_luong theo tọa độ: ' + error.message);
    }
};

module.exports = {
    getAllChatLuong, clearChatLuongCache, getCacheStats,
    processChatLuongDataForDB, createChatLuong, updateChatLuong
    , deleteChatLuong, getChatLuongById,
    searchChatLuongByCoordinates
};
