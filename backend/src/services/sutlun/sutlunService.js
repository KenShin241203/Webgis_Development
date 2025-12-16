const db = require('../../models');
const { transformGeometryList } = require('../../utils/coordinateTransform');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

// Hàm lấy tất cả SutLun với phân trang và cache toàn bộ dữ liệu
const getAllSutLun = async ({
    page,
    pageSize,
    forceRefresh = false,
    fromSrid = 3405,
    toSrid = 4326
} = {}) => {
    try {
        // Cache key cho toàn bộ dữ liệu sutlun
        const cacheKey = CACHE_KEYS.SUTLUN_ALL;
        const cacheTimestampKey = CACHE_KEYS.SUTLUN_TIMESTAMP;

        // Kiểm tra cache trước khi query database
        const hasCache = await cacheService.has(cacheKey);
        console.log('🔍 Cache status:', hasCache);
        console.log('🔍 Force refresh:', forceRefresh);

        let allSutLunData = null;
        let timestamp = null;

        if (!forceRefresh && hasCache) {
            console.log('📦 Lấy dữ liệu từ cache');
            allSutLunData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);

            if (!allSutLunData) {
                console.log('⚠️ Cache data null, query từ database');
            }
        }

        // Nếu không có cache hoặc force refresh, query từ database
        if (!allSutLunData || forceRefresh) {
            console.log('🔄 Query toàn bộ dữ liệu từ database');
            // Lấy toàn bộ dữ liệu sutlun
            const sutlunList = await db.SutLun.findAll();
            allSutLunData = await transformGeometryList(sutlunList, fromSrid, toSrid);
            timestamp = new Date().toISOString();

            // Lưu toàn bộ dữ liệu vào cache
            await cacheService.set(cacheKey, allSutLunData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Đã lưu toàn bộ dữ liệu vào cache');
        }

        // Phân trang từ dữ liệu đã có (từ cache hoặc database) với kiểm soát an toàn giống debao
        const total = allSutLunData.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0
            ? 1
            : Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

        const startIndex = (safePage - 1) * safePageSize;
        const endIndex = startIndex + safePageSize;
        const paginatedData = allSutLunData.slice(startIndex, endIndex);

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
        throw new Error('Lỗi khi lấy dữ liệu sutlun: ' + error.message);
    }
};

// Chuẩn hoá dữ liệu đầu vào cho SutLun (geometry Point)
const processSutLunDataForDB = (data, isUpdate = false) => {
    const processed = {};

    // Trường số
    const numericFields = [
        'objectid', 'id', 'lat', 'lon', 'vel_avg', 'vel_avg_cm', 'vel_sd', 'vel_cum',
        's0', 't_start', 't_stop', 'ags_2018', 'lun_2019_2', 'lun2019_20', 'north', 'earth', 'kind_id'
    ];

    for (const [key, value] of Object.entries(data)) {
        if (key === 'geometry') {
            continue;
        }

        if (!isUpdate && key === 'objectid') {
            if (value === undefined || value === null || value === '') {
                continue;
            }
        }

        if (numericFields.includes(key)) {
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const numValue = parseFloat(value);
                processed[key] = isNaN(numValue) ? null : numValue;
            }
        } else {
            processed[key] = value;
        }
    }

    // Chuẩn hoá geometry: cho phép null; nếu có thì là Point [lon, lat]
    const geom = (data && Object.prototype.hasOwnProperty.call(data, 'geometry')) ? data.geometry : undefined;

    if (geom === null || geom === undefined) {
        processed.geometry = null;
        return processed;
    }

    if (geom.type !== 'Point' || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
        throw new Error('geometry phải là Point và có dạng [longitude, latitude]');
    }

    const lon = parseFloat(geom.coordinates[0]);
    const lat = parseFloat(geom.coordinates[1]);
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
        throw new Error('Toạ độ geometry không hợp lệ');
    }

    processed.geometry = {
        type: 'Point',
        coordinates: [lon, lat]
    };

    return processed;
};

// Lấy theo objectid
const getSutLunById = async (objectid, { fromSrid = 3405, toSrid = 4326 } = {}) => {
    try {
        const cacheKey = CACHE_KEYS.SUTLUN_ALL;
        const hasCache = await cacheService.has(cacheKey);

        if (hasCache) {
            console.log('📦 Tìm kiếm trong cache SutLun');
            const all = await cacheService.get(cacheKey);
            const item = all.find((r) => r.objectid === parseInt(objectid));
            if (item) {
                return { message: 'Lấy dữ liệu từ cache', data: item, fromCache: true };
            }
        }

        console.log('🔄 Query từ database SutLun');
        const record = await db.SutLun.findByPk(objectid);
        if (!record) {
            throw new Error('Không tìm thấy sutlun với objectid: ' + objectid);
        }
        const transformed = await transformGeometryList([record], fromSrid, toSrid);
        return { message: 'Lấy dữ liệu từ database', data: transformed[0], fromCache: false };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu sutlun: ' + error.message);
    }
};

// Tạo mới
const createSutLun = async (payload) => {
    try {
        const processed = processSutLunDataForDB(payload, false);
        if (processed.objectid === undefined) {
            delete processed.objectid;
        }

        const cleanData = {};
        for (const [k, v] of Object.entries(processed)) {
            if (v !== undefined && v !== null) {
                cleanData[k] = v;
            }
        }

        const created = await db.SutLun.create(cleanData);

        await cacheService.del(CACHE_KEYS.SUTLUN_ALL);
        await cacheService.del(CACHE_KEYS.SUTLUN_TIMESTAMP);

        return { message: 'Thêm dữ liệu sutlun thành công', data: created, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi tạo dữ liệu sutlun: ' + error.message);
    }
};

// Cập nhật
const updateSutLun = async (objectid, updateData) => {
    try {
        const existing = await db.SutLun.findByPk(objectid);
        if (!existing) {
            throw new Error('Không tìm thấy sutlun với objectid: ' + objectid);
        }

        const processed = processSutLunDataForDB(updateData, true);
        const updated = await existing.update(processed);

        await cacheService.del(CACHE_KEYS.SUTLUN_ALL);
        await cacheService.del(CACHE_KEYS.SUTLUN_TIMESTAMP);

        return { message: 'Cập nhật sutlun thành công', data: updated, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi cập nhật sutlun: ' + error.message);
    }
};

// Xoá
const deleteSutLun = async (objectid) => {
    try {
        const existing = await db.SutLun.findByPk(objectid);
        if (!existing) {
            throw new Error('Không tìm thấy sutlun với objectid: ' + objectid);
        }
        await existing.destroy();

        await cacheService.del(CACHE_KEYS.SUTLUN_ALL);
        await cacheService.del(CACHE_KEYS.SUTLUN_TIMESTAMP);

        return { message: 'Xóa sutlun thành công', deletedId: objectid, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi xóa sutlun: ' + error.message);
    }
};

// Xóa cache toàn bộ dữ liệu sutlun
const clearSutLunCache = async () => {
    try {
        await cacheService.del(CACHE_KEYS.SUTLUN_ALL);
        await cacheService.del(CACHE_KEYS.SUTLUN_TIMESTAMP);
        console.log('🗑️ Đã xóa cache sutlun (toàn bộ dữ liệu)');
        return { message: 'Đã xóa cache sutlun', success: true };
    } catch (error) {
        console.error('❌ Lỗi khi xóa cache sutlun:', error);
        throw new Error('Lỗi khi xóa cache sutlun: ' + error.message);
    }
};

// Thêm method để lấy cache stats
const getCacheStats = async () => {
    return await cacheService.getStats();
};

// Tìm kiếm SutLun theo toạ độ WGS84 (Point gần trong bán kính)
const searchSutLunByCoordinates = async ({
    lat,
    lng,
    radius = 0.01,
    page = 1,
    pageSize = 100,
    forceRefresh = false,
    fromSrid = 3405,
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

        const cacheKey = `${CACHE_KEYS.SUTLUN_ALL}_search_${latNum}_${lngNum}_${radiusNum}`;
        const hasCache = await cacheService.has(cacheKey);
        let results = null;
        if (!forceRefresh && hasCache) {
            results = await cacheService.get(cacheKey);
        }

        if (!results || forceRefresh) {
            // Lấy toàn bộ dữ liệu đã transform (không phân trang)
            let allData = await cacheService.get(CACHE_KEYS.SUTLUN_ALL);
            if (!allData || forceRefresh) {
                const sutlunList = await db.SutLun.findAll();
                allData = await transformGeometryList(sutlunList, fromSrid, toSrid);
                await cacheService.set(CACHE_KEYS.SUTLUN_ALL, allData);
                await cacheService.set(CACHE_KEYS.SUTLUN_TIMESTAMP, new Date().toISOString());
            }

            results = (allData || []).filter(item => {
                if (!item.geometry || !item.geometry.coordinates) return false;
                const itemLng = parseFloat(item.geometry.coordinates[0]);
                const itemLat = parseFloat(item.geometry.coordinates[1]);
                if (Number.isNaN(itemLat) || Number.isNaN(itemLng)) return false;
                const dLat = itemLat - latNum;
                const dLng = itemLng - lngNum;
                const dist = Math.sqrt(dLat * dLat + dLng * dLng);
                return dist <= radiusNum;
            });

            await cacheService.set(cacheKey, results, 300);
        }

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
        throw new Error('Lỗi khi tìm kiếm sutlun theo tọa độ: ' + error.message);
    }
};

module.exports = { getAllSutLun, clearSutLunCache, getCacheStats, getSutLunById, createSutLun, updateSutLun, deleteSutLun, searchSutLunByCoordinates }; 