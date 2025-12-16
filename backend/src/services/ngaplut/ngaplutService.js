const db = require('../../models');
const { transformGeometryList } = require('../../utils/coordinateTransform');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

// Hàm lấy NgapLut với phân trang và cache theo pageSize
const getAllNgapLut = async ({
    page,
    pageSize,
    forceRefresh = false,
    fromSrid = 3405,
    toSrid = 4326
} = {}) => {
    try {
        // Cache key dựa trên page và pageSize
        const cacheKey = `${CACHE_KEYS.NAGPLUT_PAGE}_${page}_${pageSize}`;
        const cacheTimestampKey = `${CACHE_KEYS.NAGPLUT_TIMESTAMP}_${page}_${pageSize}`;
        const cacheTotalKey = CACHE_KEYS.NAGPLUT_TOTAL;

        // Kiểm tra cache trước khi query database
        const hasCache = await cacheService.has(cacheKey);
        console.log('🔍 Cache status:', hasCache);
        console.log('🔍 Force refresh:', forceRefresh);
        console.log('🔍 Requested page:', page, 'pageSize:', pageSize);

        let ngapLutData = null;
        let timestamp = null;
        let total = 0;

        if (!forceRefresh && hasCache) {
            console.log('📦 Lấy dữ liệu từ cache');
            ngapLutData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);
            total = await cacheService.get(cacheTotalKey);

            if (!ngapLutData) {
                console.log('⚠️ Cache data null, query từ database');
            }
        }

        // Nếu không có cache hoặc force refresh, query từ database
        if (!ngapLutData || forceRefresh) {
            console.log('🔄 Query dữ liệu từ database với phân trang');

            // Lấy tổng số dòng (cache riêng)
            const totalFromCache = await cacheService.get(cacheTotalKey);
            if (!totalFromCache || forceRefresh) {
                total = await db.NgapLut.count();
                await cacheService.set(cacheTotalKey, total);
                console.log('📊 Tổng số dòng trong database:', total);
            } else {
                total = totalFromCache;
            }

            // Tính offset
            const offset = (page - 1) * pageSize;

            // Lấy dữ liệu theo pageSize với LIMIT và OFFSET
            const list = await db.NgapLut.findAll({
                limit: pageSize,
                offset: offset,
                order: [['id', 'ASC']] // Sắp xếp theo ID để đảm bảo tính nhất quán
            });

            ngapLutData = await transformGeometryList(list, fromSrid, toSrid);
            timestamp = new Date().toISOString();

            // Lưu dữ liệu vào cache (chỉ cache trang hiện tại)
            await cacheService.set(cacheKey, ngapLutData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log(`💾 Đã lưu trang ${page} (${ngapLutData.length} dòng) vào cache`);
        }

        const totalPages = Math.ceil(total / pageSize);

        return {
            message: hasCache && !forceRefresh ? 'Lấy dữ liệu từ cache' : 'Lấy dữ liệu từ database',
            data: ngapLutData,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages,
            fromCache: hasCache && !forceRefresh,
            timestamp: timestamp
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu ngaplut: ' + error.message);
    }
};

// Chuẩn hoá dữ liệu đầu vào cho NgapLut (hỗ trợ MultiPolygon)
const processNgapLutDataForDB = (data, isUpdate = false) => {
    const processed = {};

    // Trường số thập phân
    const decimalFields = ['mean_value', 'shape_length', 'shape_area'];

    // Trường số nguyên
    const numericFields = ['id'];

    // Trường text
    const textFields = ['layer'];

    for (const [key, value] of Object.entries(data)) {
        if (key === 'geometry') {
            continue;
        }

        if (!isUpdate && key === 'id') {
            // nếu tạo mới và id không được cung cấp, bỏ qua để DB tự xử lý
            if (value === undefined || value === null || value === '') {
                continue;
            }
        }

        if (decimalFields.includes(key)) {
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const numValue = parseFloat(value);
                processed[key] = isNaN(numValue) ? null : numValue;
            }
        } else if (numericFields.includes(key)) {
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

    // Chuẩn hoá geometry: cho phép null; nếu có thì là MultiPolygon
    const geom = (data && Object.prototype.hasOwnProperty.call(data, 'geometry')) ? data.geometry : undefined;

    if (geom === null || geom === undefined) {
        processed.geometry = null;
        return processed;
    }

    if (geom.type !== 'MultiPolygon' || !Array.isArray(geom.coordinates)) {
        throw new Error('geometry phải là MultiPolygon');
    }

    // Validate và chuẩn hóa MultiPolygon coordinates
    const normalizedCoords = geom.coordinates.map((polygon, polyIdx) => {
        if (!Array.isArray(polygon)) {
            throw new Error(`Polygon thứ ${polyIdx + 1} không hợp lệ`);
        }

        return polygon.map((ring, ringIdx) => {
            if (!Array.isArray(ring)) {
                throw new Error(`Ring thứ ${ringIdx + 1} trong polygon ${polyIdx + 1} không hợp lệ`);
            }

            return ring.map((pt, ptIdx) => {
                if (!Array.isArray(pt) || pt.length < 2) {
                    throw new Error(`Điểm thứ ${ptIdx + 1} trong ring ${ringIdx + 1}, polygon ${polyIdx + 1} không hợp lệ (cần [longitude, latitude])`);
                }
                const lon = parseFloat(pt[0]);
                const lat = parseFloat(pt[1]);
                if (Number.isNaN(lon) || Number.isNaN(lat)) {
                    throw new Error(`Toạ độ không hợp lệ tại điểm thứ ${ptIdx + 1} trong ring ${ringIdx + 1}, polygon ${polyIdx + 1}`);
                }
                return [lon, lat];
            });
        });
    });

    processed.geometry = {
        type: 'MultiPolygon',
        coordinates: normalizedCoords
    };

    return processed;
};

// Lấy theo id
const getNgapLutById = async (id, { fromSrid = 3405, toSrid = 4326 } = {}) => {
    try {
        console.log('🔄 Query từ database NgapLut');
        const record = await db.NgapLut.findByPk(id);
        if (!record) {
            throw new Error('Không tìm thấy ngaplut với id: ' + id);
        }
        const transformed = await transformGeometryList([record], fromSrid, toSrid);
        return { message: 'Lấy dữ liệu từ database', data: transformed[0], fromCache: false };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu ngaplut: ' + error.message);
    }
};

// Tạo mới
const createNgapLut = async (payload) => {
    try {
        const processed = processNgapLutDataForDB(payload, false);

        // Loại bỏ id nếu undefined để tránh lỗi với cột tự sinh
        if (processed.id === undefined) {
            delete processed.id;
        }

        // loại bỏ các field undefined/null
        const cleanData = {};
        for (const [k, v] of Object.entries(processed)) {
            if (v !== undefined && v !== null) {
                cleanData[k] = v;
            }
        }

        const created = await db.NgapLut.create(cleanData);

        // Invalidate cache - xóa tất cả cache trang và total
        await clearNgapLutCache();

        return { message: 'Thêm dữ liệu ngaplut thành công', data: created, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi tạo dữ liệu ngaplut: ' + error.message);
    }
};

// Cập nhật
const updateNgapLut = async (id, updateData) => {
    try {
        const existing = await db.NgapLut.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy ngaplut với id: ' + id);
        }

        const processed = processNgapLutDataForDB(updateData, true);
        const updated = await existing.update(processed);

        await clearNgapLutCache();

        return { message: 'Cập nhật ngaplut thành công', data: updated, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi cập nhật ngaplut: ' + error.message);
    }
};

// Xoá
const deleteNgapLut = async (id) => {
    try {
        const existing = await db.NgapLut.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy ngaplut với id: ' + id);
        }
        await existing.destroy();

        await clearNgapLutCache();

        return { message: 'Xóa ngaplut thành công', deletedId: id, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi xóa ngaplut: ' + error.message);
    }
};

// Xóa cache toàn bộ dữ liệu ngaplut
const clearNgapLutCache = async () => {
    try {
        // Xóa cache total
        await cacheService.del(CACHE_KEYS.NAGPLUT_TOTAL);

        // Xóa tất cả cache trang (có thể có nhiều pageSize khác nhau)
        // Lưu ý: Đây là cách đơn giản, trong production có thể dùng pattern matching
        const keys = await cacheService.keys(`${CACHE_KEYS.NAGPLUT_PAGE}_*`);
        for (const key of keys) {
            await cacheService.del(key);
        }

        const timestampKeys = await cacheService.keys(`${CACHE_KEYS.NAGPLUT_TIMESTAMP}_*`);
        for (const key of timestampKeys) {
            await cacheService.del(key);
        }

        console.log('🗑️ Đã xóa cache ngaplut (tất cả trang và total)');
        return { message: 'Đã xóa cache ngaplut', success: true };
    } catch (error) {
        console.error('❌ Lỗi khi xóa cache ngaplut:', error);
        throw new Error('Lỗi khi xóa cache ngaplut: ' + error.message);
    }
};

// Thêm method để lấy cache stats
const getCacheStats = async () => {
    return await cacheService.getStats();
};

module.exports = {
    getAllNgapLut,
    clearNgapLutCache,
    getCacheStats,
    getNgapLutById,
    createNgapLut,
    updateNgapLut,
    deleteNgapLut,
    processNgapLutDataForDB
}; 