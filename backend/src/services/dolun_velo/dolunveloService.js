const db = require('../../models');
const { transformPolygonList } = require('../../utils/coordinateTransform');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

const getAllDolunVelo = async (
    {
        page,
        pageSize,
        forceRefresh = false
    } = {}) => {
    try {
        // Debug: Kiểm tra cache status
        const cacheKey = CACHE_KEYS.DOLUN_VELO;
        const cacheTimestampKey = CACHE_KEYS.DOLUN_VELO_TIMESTAMP;
        const hasCache = await cacheService.has(cacheKey);
        console.log('🔍 Cache status:', hasCache);
        console.log('🔍 Force refresh:', forceRefresh);

        let allDolunVeloData = null;
        let timestamp = null;
        let fromCache = false;

        // Lấy từ cache nếu có và không forceRefresh
        if (!forceRefresh && hasCache) {
            console.log('📦 Lấy dữ liệu từ cache');
            allDolunVeloData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);
            fromCache = true;
        }

        // Nếu không có cache hoặc force refresh, query từ database và lưu cache
        if (!allDolunVeloData || forceRefresh) {
            console.log('🔄 Query dữ liệu từ database');
            const veloList = await db.DolunVelo.findAll();
            allDolunVeloData = await transformPolygonList(veloList);
            timestamp = new Date().toISOString();

            // Lưu vào cache
            await cacheService.set(cacheKey, allDolunVeloData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Đã lưu vào cache');
            fromCache = false;
        }

        // Loại trùng theo id
        const uniqueDolunVeloData = allDolunVeloData.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );

        // Nếu phát hiện trùng, refresh lại cache sạch
        if (uniqueDolunVeloData.length < allDolunVeloData.length) {
            await cacheService.del(cacheKey);
            await cacheService.del(cacheTimestampKey);
            await cacheService.set(cacheKey, uniqueDolunVeloData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Làm sạch trùng và lưu lại cache');
        }

        // Phân trang
        const total = uniqueDolunVeloData.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0
            ? 1
            : Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

        const startIndex = (safePage - 1) * safePageSize;
        const endIndex = startIndex + safePageSize;
        const paginatedData = uniqueDolunVeloData.slice(startIndex, endIndex);

        return {
            message: fromCache && !forceRefresh ? 'Lấy dữ liệu từ cache' : 'Lấy dữ liệu từ database',
            data: paginatedData,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: fromCache && !forceRefresh,
            timestamp: timestamp || new Date().toISOString()
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu dolun_velo: ' + error.message);
    }
};

const processDolunDataForDB = (data, isUpdate = false) => {
    const processed = {};

    // Trường số nguyên
    const numericFields = ['id', 'gridcode', 'kind_id'];

    // Trường số thực
    const floatFields = ['shape_area'];

    // Trường text
    const textFields = ['layer'];

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
        } else if (floatFields.includes(key)) {
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const floatValue = parseFloat(value);
                processed[key] = isNaN(floatValue) ? null : floatValue;
            }
        } else if (textFields.includes(key)) {
            processed[key] = value === '' ? null : value;
        } else {
            processed[key] = value;
        }
    }

    // Chuẩn hóa geometry: cho phép null; nếu có thì là Polygon với coordinates hợp lệ
    const geom = (data && Object.prototype.hasOwnProperty.call(data, 'geometry')) ? data.geometry : undefined;

    if (geom === null || geom === undefined) {
        processed.geometry = null;
        return processed;
    }

    if (geom.type !== 'Polygon' || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
        throw new Error('geometry phải là Polygon và có ít nhất 1 ring coordinates');
    }

    // Chuẩn hóa toàn bộ danh sách toạ độ, yêu cầu mỗi điểm có dạng [lon, lat]
    const normalizedCoords = geom.coordinates.map((ring, ringIdx) => {
        if (!Array.isArray(ring)) {
            throw new Error(`Ring thứ ${ringIdx + 1} trong geometry không hợp lệ`);
        }

        return ring.map((pt, ptIdx) => {
            if (!Array.isArray(pt) || pt.length < 2) {
                throw new Error(`Điểm thứ ${ptIdx + 1} trong ring ${ringIdx + 1} không hợp lệ (cần [longitude, latitude])`);
            }
            const lon = parseFloat(pt[0]);
            const lat = parseFloat(pt[1]);
            if (Number.isNaN(lon) || Number.isNaN(lat)) {
                throw new Error(`Toạ độ không hợp lệ tại điểm thứ ${ptIdx + 1} trong ring ${ringIdx + 1}`);
            }
            return [lon, lat];
        });
    });

    processed.geometry = {
        type: 'Polygon',
        coordinates: normalizedCoords
    };

    return processed;
};

const getDolunVeloById = async (id) => {
    try {
        const cacheKey = CACHE_KEYS.DOLUN_VELO;
        const hasCache = await cacheService.has(cacheKey);

        if (hasCache) {
            console.log('📦 Tìm kiếm trong cache');
            const allDolunVeloData = await cacheService.get(cacheKey);
            const dolunFromCache = allDolunVeloData.find(dolun => dolun.id === parseInt(id));
            if (dolunFromCache) {
                return {
                    message: 'Lấy dữ liệu từ cache',
                    data: dolunFromCache,
                    fromCache: true
                }
            }
        }
        console.log('🔄 Query từ database');
        const dolun = await db.DolunVelo.findByPk(id);

        if (!dolun) {
            throw new Error('Không tìm thấy dữ liệu dolun_velo với ID: ' + id);
        }

        const transformedDolun = await transformPolygonList([dolun])
        return {
            message: 'Lấy dữ liệu từ database',
            data: transformedDolun[0],
            fromCache: false
        }
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu dolun_velo: ' + error.message);
    }
}

const createDolun = async (dolunData) => {
    try {
        const updateData = processDolunDataForDB(dolunData, false)

        if ('id' in updateData) {
            delete updateData.id
        }
        const cleanData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined && value !== null) {
                cleanData[key] = value;
            }
        }

        const newDolun = await db.DolunVelo.create(cleanData);

        await cacheService.del(CACHE_KEYS.DOLUN_VELO);
        await cacheService.del(CACHE_KEYS.DOLUN_VELO_TIMESTAMP)
        return {
            message: 'Thêm dữ liệu dolun thành công',
            data: newDolun,
            cacheInvalidated: true
        }
    } catch (error) {
        throw new Error('Lỗi khi tạo dữ liệu debao: ' + error.message);
    }
}

const updateDolun = async (id, updateData) => {
    try {
        const existingDolun = await db.DolunVelo.findByPk(id);
        if (!existingDolun) {
            throw new Error('Không tìm thấy dolun với id: ' + id);
        }
        const proccessedData = processDolunDataForDB(updateData, true);

        const updateDolun = await existingDolun.update(proccessedData);

        await cacheService.del(CACHE_KEYS.DOLUN_VELO);
        await cacheService.del(CACHE_KEYS.DOLUN_VELO_TIMESTAMP);

        return {
            message: 'Cập nhật dolun thành công',
            data: updateDolun,
            cacheInvalidated: true
        }
    } catch (error) {
        throw new Error('Lỗi khi cập nhật debao: ' + error.message);
    }
}

const deleteDolun = async (id) => {
    try {
        const existingDolun = await db.DolunVelo.findByPk(id);
        if (!existingDolun) {
            throw new Error('Không tìm thấy dolun với id: ' + id);
        }

        await existingDolun.destroy();
        await cacheService.del(CACHE_KEYS.DOLUN_VELO);
        await cacheService.del(CACHE_KEYS.DOLUN_VELO_TIMESTAMP);

        return {
            message: 'Xoá độ lun thành công',
            deleteId: id,
            cacheInvalidated: true
        }
    } catch (error) {
        throw new Error('Lỗi khi xóa dolun: ' + error.message);
    }
}

// Thêm method để clear cache
const clearDolunVeloCache = async () => {
    await cacheService.del(CACHE_KEYS.DOLUN_VELO);
    await cacheService.del(CACHE_KEYS.DOLUN_VELO_TIMESTAMP);
    console.log('🗑️ Đã xóa cache dolun_velo');
};

// Thêm method để lấy cache stats
const getCacheStats = async () => {
    return await cacheService.getStats();
};

// Tìm kiếm Dolun (Polygon) theo toạ độ WGS84: chứa điểm hoặc gần trong bán kính
const searchDolunByCoordinates = async ({
    lat,
    lng,
    radius = 0.01,
    page = 1,
    pageSize = 100,
    forceRefresh = false
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

        const cacheKey = `${CACHE_KEYS.DOLUN_VELO}_search_${latNum}_${lngNum}_${radiusNum}`;
        const hasCache = await cacheService.has(cacheKey);
        let results = null;
        if (!forceRefresh && hasCache) {
            results = await cacheService.get(cacheKey);
        }

        if (!results || forceRefresh) {
            // Lấy toàn bộ dữ liệu đã transform từ cache; nếu thiếu thì nạp DB + transform
            let allData = await cacheService.get(CACHE_KEYS.DOLUN_VELO);
            if (!allData || forceRefresh) {
                const veloList = await db.DolunVelo.findAll();
                allData = await transformPolygonList(veloList);
                await cacheService.set(CACHE_KEYS.DOLUN_VELO, allData);
                await cacheService.set(CACHE_KEYS.DOLUN_VELO_TIMESTAMP, new Date().toISOString());
            }

            // Point in polygon (ray casting) cho ring ngoài cùng; gần trong bán kính nếu ngoài
            const pointInRing = (px, py, ring) => {
                let inside = false;
                for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                    const xi = ring[i][0], yi = ring[i][1];
                    const xj = ring[j][0], yj = ring[j][1];
                    const intersect = ((yi > py) !== (yj > py)) &&
                        (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-12) + xi);
                    if (intersect) inside = !inside;
                }
                return inside;
            };
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
                if (!item.geometry || item.geometry.type !== 'Polygon' || !Array.isArray(item.geometry.coordinates)) return false;
                const rings = item.geometry.coordinates;
                const outer = rings[0];
                // Nếu điểm nằm trong polygon => match ngay
                if (Array.isArray(outer) && pointInRing(lngNum, latNum, outer)) return true;
                // Nếu không, kiểm tra khoảng cách tới các cạnh polygon
                for (let r = 0; r < rings.length; r++) {
                    const ring = rings[r];
                    for (let i = 0; i < ring.length - 1; i++) {
                        const [x1, y1] = ring[i];
                        const [x2, y2] = ring[i + 1];
                        if ([x1, y1, x2, y2].some(Number.isNaN)) continue;
                        const d = distancePointToSegment(lngNum, latNum, x1, y1, x2, y2);
                        if (d <= radiusNum) return true;
                    }
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
            message: 'Tìm kiếm từ dữ liệu đầy đủ',
            data: paginated,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: false,
            searchParams: { lat: latNum, lng: lngNum, radius: radiusNum }
        };
    } catch (error) {
        throw new Error('Lỗi khi tìm kiếm dolun theo tọa độ: ' + error.message);
    }
};

module.exports = {
    getAllDolunVelo,
    clearDolunVeloCache,
    getCacheStats,
    getDolunVeloById,
    createDolun,
    updateDolun,
    deleteDolun,
    searchDolunByCoordinates
}; 