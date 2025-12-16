const db = require('../../models');
const { transformGeometryList } = require('../../utils/coordinateTransform');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

// Hàm lấy tất cả HienTrang với phân trang và cache toàn bộ dữ liệu
const getAllHienTrang = async ({
    page,
    pageSize,
    forceRefresh = false,
    fromSrid = 9209,
    toSrid = 4326
} = {}) => {
    try {
        // Cache key cho toàn bộ dữ liệu hientrang
        const cacheKey = CACHE_KEYS.HIENTRANG_ALL;
        const cacheTimestampKey = CACHE_KEYS.HIENTRANG_TIMESTAMP;

        // Kiểm tra cache trước khi query database
        const hasCache = await cacheService.has(cacheKey);
        console.log('🔍 Cache status:', hasCache);
        console.log('🔍 Force refresh:', forceRefresh);

        let allHienTrangData = null;
        let timestamp = null;

        if (!forceRefresh && hasCache) {
            console.log('📦 Lấy dữ liệu từ cache');
            allHienTrangData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);

            if (!allHienTrangData) {
                console.log('⚠️ Cache data null, query từ database');
            }
        }

        // Nếu không có cache hoặc force refresh, query từ database
        if (!allHienTrangData || forceRefresh) {
            console.log('🔄 Query toàn bộ dữ liệu từ database');
            // Lấy toàn bộ dữ liệu hientrang với filter tuyen = 'Tuyen_debao_bobao_2k'
            const list = await db.HienTrang.findAll({
                where: {
                    tuyen: 'Tuyen_debao_bobao_2k'
                }
            });
            allHienTrangData = await transformGeometryList(list, fromSrid, toSrid);
            timestamp = new Date().toISOString();

            // Lưu toàn bộ dữ liệu vào cache
            await cacheService.set(cacheKey, allHienTrangData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Đã lưu toàn bộ dữ liệu vào cache');
        }

        // Phân trang từ dữ liệu đã có (từ cache hoặc database) với kiểm soát an toàn giống debao
        const total = allHienTrangData.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0
            ? 1
            : Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

        const startIndex = (safePage - 1) * safePageSize;
        const endIndex = startIndex + safePageSize;
        const paginatedData = allHienTrangData.slice(startIndex, endIndex);

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
        throw new Error('Lỗi khi lấy dữ liệu hientrang: ' + error.message);
    }
};

// Chuẩn hoá dữ liệu đầu vào cho HienTrang (tương đồng hình học với Debao)
const processHienTrangDataForDB = (data, isUpdate = false) => {
    const processed = {};

    // Trường số
    const numericFields = ['id'];

    // Trường text
    const textFields = ['layer', 'gm_type', 'kml_style', 'kml_folder', 'tuyen'];

    for (const [key, value] of Object.entries(data)) {
        if (key === 'geometry') {
            continue;
        }

        if (!isUpdate && key === 'id') {
            // nếu tạo mới và id không được cung cấp, bỏ qua để DB tự xử lý (nếu có)
            if (value === undefined || value === null || value === '') {
                continue;
            }
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

    // Chuẩn hoá geometry: cho phép null; nếu có thì là LineString với >= 2 điểm
    const geom = (data && Object.prototype.hasOwnProperty.call(data, 'geometry')) ? data.geometry : undefined;

    if (geom === null || geom === undefined) {
        processed.geometry = null;
        return processed;
    }

    if (geom.type !== 'LineString' || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
        throw new Error('geometry phải là LineString và có ít nhất 2 cặp toạ độ');
    }

    const normalizedCoords = geom.coordinates.map((pt, idx) => {
        if (!Array.isArray(pt) || pt.length < 2) {
            throw new Error(`Điểm thứ ${idx + 1} trong geometry không hợp lệ (cần [longitude, latitude])`);
        }
        const lon = parseFloat(pt[0]);
        const lat = parseFloat(pt[1]);
        if (Number.isNaN(lon) || Number.isNaN(lat)) {
            throw new Error(`Toạ độ không hợp lệ tại điểm thứ ${idx + 1}`);
        }
        return [lon, lat];
    });

    processed.geometry = {
        type: 'LineString',
        coordinates: normalizedCoords
    };

    return processed;
};

// Lấy theo id
const getHienTrangById = async (id, { fromSrid = 9209, toSrid = 4326 } = {}) => {
    try {
        const cacheKey = CACHE_KEYS.HIENTRANG_ALL;
        const hasCache = await cacheService.has(cacheKey);

        if (hasCache) {
            console.log('📦 Tìm kiếm trong cache HienTrang');
            const all = await cacheService.get(cacheKey);
            const item = all.find((r) => r.id === parseInt(id));
            if (item) {
                return { message: 'Lấy dữ liệu từ cache', data: item, fromCache: true };
            }
        }

        console.log('🔄 Query từ database HienTrang');
        const record = await db.HienTrang.findByPk(id);
        if (!record) {
            throw new Error('Không tìm thấy hientrang với id: ' + id);
        }
        const transformed = await transformGeometryList([record], fromSrid, toSrid);
        return { message: 'Lấy dữ liệu từ database', data: transformed[0], fromCache: false };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu hientrang: ' + error.message);
    }
};

// Tạo mới
const createHienTrang = async (payload) => {
    try {
        const processed = processHienTrangDataForDB(payload, false);

        // Loại bỏ id nếu undefined để tránh lỗi với cột tự sinh (nếu có)
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

        const created = await db.HienTrang.create(cleanData);

        // Invalidate cache
        await cacheService.del(CACHE_KEYS.HIENTRANG_ALL);
        await cacheService.del(CACHE_KEYS.HIENTRANG_TIMESTAMP);

        return { message: 'Thêm dữ liệu hientrang thành công', data: created, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi tạo dữ liệu hientrang: ' + error.message);
    }
};

// Cập nhật
const updateHienTrang = async (id, updateData) => {
    try {
        const existing = await db.HienTrang.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy hientrang với id: ' + id);
        }

        const processed = processHienTrangDataForDB(updateData, true);
        const updated = await existing.update(processed);

        await cacheService.del(CACHE_KEYS.HIENTRANG_ALL);
        await cacheService.del(CACHE_KEYS.HIENTRANG_TIMESTAMP);

        return { message: 'Cập nhật hientrang thành công', data: updated, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi cập nhật hientrang: ' + error.message);
    }
};

// Xoá
const deleteHienTrang = async (id) => {
    try {
        const existing = await db.HienTrang.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy hientrang với id: ' + id);
        }
        await existing.destroy();

        await cacheService.del(CACHE_KEYS.HIENTRANG_ALL);
        await cacheService.del(CACHE_KEYS.HIENTRANG_TIMESTAMP);

        return { message: 'Xóa hientrang thành công', deletedId: id, cacheInvalidated: true };
    } catch (error) {
        throw new Error('Lỗi khi xóa hientrang: ' + error.message);
    }
};

// Xóa cache toàn bộ dữ liệu hientrang
const clearHienTrangCache = async () => {
    try {
        await cacheService.del(CACHE_KEYS.HIENTRANG_ALL);
        await cacheService.del(CACHE_KEYS.HIENTRANG_TIMESTAMP);
        console.log('🗑️ Đã xóa cache hientrang (toàn bộ dữ liệu)');
        return { message: 'Đã xóa cache hientrang', success: true };
    } catch (error) {
        console.error('❌ Lỗi khi xóa cache hientrang:', error);
        throw new Error('Lỗi khi xóa cache hientrang: ' + error.message);
    }
};

// Thêm method để lấy cache stats
const getCacheStats = async () => {
    return await cacheService.getStats();
};

// Tìm kiếm HienTrang theo toạ độ WGS84 (điểm gần đoạn LineString)
const searchHienTrangByCoordinates = async ({
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

        const cacheKey = `${CACHE_KEYS.HIENTRANG_ALL}_search_${latNum}_${lngNum}_${radiusNum}`;
        const hasCache = await cacheService.has(cacheKey);
        let results = null;
        if (!forceRefresh && hasCache) {
            results = await cacheService.get(cacheKey);
        }

        if (!results || forceRefresh) {
            // Lấy toàn bộ dữ liệu (không phân trang) từ cache; nếu thiếu thì nạp DB + transform với filter tuyen
            let allData = await cacheService.get(CACHE_KEYS.HIENTRANG_ALL);
            if (!allData || forceRefresh) {
                const list = await db.HienTrang.findAll({ where: { tuyen: 'Tuyen_debao_bobao_2k' } });
                allData = await transformGeometryList(list, fromSrid, toSrid);
                await cacheService.set(CACHE_KEYS.HIENTRANG_ALL, allData);
                await cacheService.set(CACHE_KEYS.HIENTRANG_TIMESTAMP, new Date().toISOString());
            }

            // Hàm khoảng cách điểm-đoạn
            const distancePointToSegment = (px, py, x1, y1, x2, y2) => {
                const dx = x2 - x1;
                const dy = y2 - y1;
                if (dx === 0 && dy === 0) {
                    const ddx = px - x1; const ddy = py - y1;
                    return Math.sqrt(ddx * ddx + ddy * ddy);
                }
                const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
                const tt = Math.max(0, Math.min(1, t));
                const cx = x1 + tt * dx; const cy = y1 + tt * dy;
                const ddx = px - cx; const ddy = py - cy;
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
        throw new Error('Lỗi khi tìm kiếm hientrang theo tọa độ: ' + error.message);
    }
};

module.exports = { getAllHienTrang, clearHienTrangCache, getCacheStats, getHienTrangById, createHienTrang, updateHienTrang, deleteHienTrang, searchHienTrangByCoordinates };