const db = require('../../models');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

// Lấy tất cả Khaosat với phân trang và cache toàn bộ dữ liệu
const getAllKhaosat = async ({
    page,
    pageSize,
    forceRefresh = false
} = {}) => {
    try {
        const cacheKey = CACHE_KEYS.KHAOSAT_ALL;
        const cacheTimestampKey = CACHE_KEYS.KHAOSAT_TIMESTAMP;

        const hasCache = await cacheService.has(cacheKey);
        let allData = null;
        let timestamp = null;

        if (!forceRefresh && hasCache) {
            allData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);
        }

        if (!allData || forceRefresh) {
            const list = await db.Khaosat.findAll();
            // Không cần transform geometry; dữ liệu gồm lat/lng/image/caption
            allData = list.map(item => item.toJSON());
            timestamp = new Date().toISOString();

            await cacheService.set(cacheKey, allData);
            await cacheService.set(cacheTimestampKey, timestamp);
        }

        // Loại bỏ duplicate theo id
        const uniqueData = allData.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

        if (uniqueData.length < allData.length) {
            await cacheService.del(cacheKey);
            await cacheService.del(cacheTimestampKey);
            const list = await db.Khaosat.findAll();
            allData = list.map(item => item.toJSON());
            await cacheService.set(cacheKey, allData);
            await cacheService.set(cacheTimestampKey, new Date().toISOString());
        }

        const total = uniqueData.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0 ? 1 : Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

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
            timestamp
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu khaosat: ' + error.message);
    }
};

// Tạo điểm khảo sát
const createKhaosat = async (data) => {
    try {
        const cleanData = processKhaosatDataForDB(data, false);
        if ('id' in cleanData) {
            delete cleanData.id;
        }

        const newItem = await db.Khaosat.create(cleanData);

        await cacheService.del(CACHE_KEYS.KHAOSAT_ALL);
        await cacheService.del(CACHE_KEYS.KHAOSAT_TIMESTAMP);

        return {
            message: 'Thêm điểm khảo sát thành công',
            data: newItem,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error('Lỗi khi thêm điểm khảo sát: ' + error.message);
    }
};

// Cập nhật điểm khảo sát
const updateKhaosat = async (id, updateData) => {
    try {
        const existing = await db.Khaosat.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy điểm khảo sát với ID: ' + id);
        }

        const processed = processKhaosatDataForDB(updateData, true);
        const updated = await existing.update(processed);

        await cacheService.del(CACHE_KEYS.KHAOSAT_ALL);
        await cacheService.del(CACHE_KEYS.KHAOSAT_TIMESTAMP);

        return {
            message: 'Cập nhật điểm khảo sát thành công',
            data: updated,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error('Lỗi khi cập nhật điểm khảo sát: ' + error.message);
    }
};

// Xóa điểm khảo sát
const deleteKhaosat = async (id) => {
    try {
        const existing = await db.Khaosat.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy điểm khảo sát với ID: ' + id);
        }

        await existing.destroy();

        await cacheService.del(CACHE_KEYS.KHAOSAT_ALL);
        await cacheService.del(CACHE_KEYS.KHAOSAT_TIMESTAMP);

        return {
            message: 'Xóa điểm khảo sát thành công',
            deletedId: id,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error('Lỗi khi xóa điểm khảo sát: ' + error.message);
    }
};

// Lấy điểm khảo sát theo ID
const getKhaosatById = async (id) => {
    try {
        const cacheKey = CACHE_KEYS.KHAOSAT_ALL;
        const hasCache = await cacheService.has(cacheKey);

        if (hasCache) {
            const allData = await cacheService.get(cacheKey);
            const found = allData.find(item => item.id === parseInt(id));
            if (found) {
                return {
                    message: 'Lấy dữ liệu từ cache',
                    data: found,
                    fromCache: true
                };
            }
        }

        const item = await db.Khaosat.findByPk(id);
        if (!item) {
            throw new Error('Không tìm thấy điểm khảo sát với ID: ' + id);
        }

        return {
            message: 'Lấy dữ liệu từ database',
            data: item,
            fromCache: false
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy điểm khảo sát: ' + error.message);
    }
};

// Xóa cache toàn bộ dữ liệu khaosat
const clearKhaosatCache = async () => {
    try {
        await cacheService.del(CACHE_KEYS.KHAOSAT_ALL);
        await cacheService.del(CACHE_KEYS.KHAOSAT_TIMESTAMP);
        return { message: 'Đã xóa cache thành công', success: true };
    } catch (error) {
        throw new Error('Lỗi khi xóa cache: ' + error.message);
    }
};

// Lấy thống kê cache
const getCacheStats = async () => {
    return await cacheService.getStats();
};

// Xử lý dữ liệu trước khi lưu
const processKhaosatDataForDB = (data, isUpdate = false) => {
    const processed = {};

    const numericFields = ['id'];
    const decimalFields = ['lat', 'lng'];
    const textFields = ['image', 'caption'];

    for (const [key, value] of Object.entries(data)) {
        if (key === 'id' && !isUpdate) {
            continue;
        }

        if (numericFields.includes(key)) {
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const num = parseInt(value);
                processed[key] = isNaN(num) ? null : num;
            }
        } else if (decimalFields.includes(key)) {
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const num = parseFloat(value);
                processed[key] = isNaN(num) ? null : num;
            }
        } else if (textFields.includes(key)) {
            processed[key] = value === '' ? null : value;
        } else {
            processed[key] = value;
        }
    }

    return processed;
};

// Tìm kiếm điểm khảo sát theo tọa độ
const searchKhaosatByCoordinates = async ({
    lat,
    lng,
    radius = 0.01, // Bán kính tìm kiếm mặc định (khoảng 1km)
    page = 1,
    pageSize = 100,
    forceRefresh = false
} = {}) => {
    try {
        // Validate input
        if (lat === undefined || lng === undefined) {
            throw new Error('Vĩ độ và kinh độ là bắt buộc');
        }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = parseFloat(radius);

        if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
            throw new Error('Tọa độ và bán kính phải là số hợp lệ');
        }

        if (latNum < -90 || latNum > 90) {
            throw new Error('Vĩ độ phải trong khoảng -90 đến 90');
        }

        if (lngNum < -180 || lngNum > 180) {
            throw new Error('Kinh độ phải trong khoảng -180 đến 180');
        }

        const cacheKey = `${CACHE_KEYS.KHAOSAT_ALL}_search_${latNum}_${lngNum}_${radiusNum}`;
        const hasCache = await cacheService.has(cacheKey);

        let searchResults = null;

        if (!forceRefresh && hasCache) {
            searchResults = await cacheService.get(cacheKey);
        }

        if (!searchResults || forceRefresh) {
            // Lấy tất cả dữ liệu từ cache hoặc database
            const allDataResult = await getAllKhaosat({ forceRefresh });
            const allData = allDataResult.data;

            // Tìm kiếm theo tọa độ với bán kính
            searchResults = allData.filter(item => {
                if (item.lat === null || item.lng === null) return false;

                const itemLat = parseFloat(item.lat);
                const itemLng = parseFloat(item.lng);

                if (isNaN(itemLat) || isNaN(itemLng)) return false;

                // Tính khoảng cách Euclidean (đơn giản)
                const latDiff = Math.abs(itemLat - latNum);
                const lngDiff = Math.abs(itemLng - lngNum);
                const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

                return distance <= radiusNum;
            });

            // Cache kết quả tìm kiếm trong 5 phút
            await cacheService.set(cacheKey, searchResults, 300);
        }

        // Phân trang kết quả
        const total = searchResults.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0 ? 1 : Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

        const startIndex = (safePage - 1) * safePageSize;
        const endIndex = startIndex + safePageSize;
        const paginatedData = searchResults.slice(startIndex, endIndex);

        return {
            message: hasCache && !forceRefresh ? 'Lấy dữ liệu từ cache' : 'Tìm kiếm từ database',
            data: paginatedData,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: hasCache && !forceRefresh,
            searchParams: {
                lat: latNum,
                lng: lngNum,
                radius: radiusNum
            }
        };
    } catch (error) {
        throw new Error('Lỗi khi tìm kiếm điểm khảo sát theo tọa độ: ' + error.message);
    }
};

module.exports = {
    getAllKhaosat,
    createKhaosat,
    updateKhaosat,
    deleteKhaosat,
    getKhaosatById,
    clearKhaosatCache,
    getCacheStats,
    processKhaosatDataForDB,
    searchKhaosatByCoordinates
};
