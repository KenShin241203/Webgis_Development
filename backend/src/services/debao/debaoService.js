const db = require("../../models");
const { transformGeometryList } = require("../../utils/coordinateTransform");
const { cacheService, CACHE_KEYS } = require("../../utils/cache");

// Hàm lấy tất cả Debao với phân trang và cache toàn bộ dữ liệu
const getAllDebao = async ({
    page,
    pageSize,
    forceRefresh = false,
    fromSrid = 9209,
    toSrid = 4326
} = {}) => {
    try {
        // Cache key cho toàn bộ dữ liệu debao
        const cacheKey = CACHE_KEYS.DEBAO_ALL;
        const cacheTimestampKey = CACHE_KEYS.DEBAO_TIMESTAMP;

        // Kiểm tra cache trước khi query database
        const hasCache = await cacheService.has(cacheKey);
        console.log("🔍 Cache status:", hasCache);
        console.log("🔍 Force refresh:", forceRefresh);

        let allDebaoData = null;
        let timestamp = null;

        if (!forceRefresh && hasCache) {
            console.log("📦 Lấy dữ liệu từ cache");
            allDebaoData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);

            if (!allDebaoData) {
                console.log("⚠️ Cache data null, query từ database");
            }
        }

        // Nếu không có cache hoặc force refresh, query từ database
        if (!allDebaoData || forceRefresh) {
            console.log("🔄 Query toàn bộ dữ liệu từ database");
            // Lấy toàn tất cả debao
            const debaoList = await db.Debao.findAll();
            allDebaoData = await transformGeometryList(debaoList, fromSrid, toSrid);
            timestamp = new Date().toISOString();

            // Lưu toàn bộ dữ liệu vào cache
            await cacheService.set(cacheKey, allDebaoData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log("💾 Đã lưu toàn bộ dữ liệu vào cache");
        }

        const uniqueDebaoData = await allDebaoData.filter((item, index, self) =>
            index === self.findIndex(t => t.f_id === item.f_id)
        );

        if (uniqueDebaoData.length < allDebaoData.length) {
            await cacheService.del(cacheKey);
            await cacheService.del(cacheTimestampKey);

            // Query lại từ database
            const debaoList = await db.Debao.findAll();
            allDebaoData = await transformGeometryList(debaoList, fromSrid, toSrid);
            timestamp = new Date().toISOString();

            // Lưu toàn bộ dữ liệu vào cache
            await cacheService.set(cacheKey, allDebaoData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log("💾 Đã lưu toàn bộ dữ liệu vào cache");
        }

        // Phân trang từ dữ liệu đã có (từ cache hoặc database)
        const total = uniqueDebaoData.length;
        const requestedPage = Number(page);
        const requestedPageSize = Number(pageSize);
        const safePageSize = Math.max(1, isNaN(requestedPageSize) ? 100 : requestedPageSize);
        const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
        const safePage = total === 0
            ? 1
            : Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

        const startIndex = (safePage - 1) * safePageSize;
        const endIndex = startIndex + safePageSize;
        const paginatedData = uniqueDebaoData.slice(startIndex, endIndex);

        return {
            message: hasCache && !forceRefresh ? "Lấy dữ liệu từ cache" : "Lấy dữ liệu từ database",
            data: paginatedData,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: hasCache && !forceRefresh,
            timestamp: timestamp
        };
    } catch (error) {
        throw new Error("Lỗi khi lấy dữ liệu debao: " + error.message);
    }
};

const processDeBaoDataForDB = (data, isUpdate = false) => {
    const processed = {};

    // Trường số nguyên
    const numericFields = ["kind_id"];

    // Trường text
    const textFields = ["name", "layer", "kml_folder"];

    for (const [key, value] of Object.entries(data)) {
        // Bỏ qua f_id khi tạo mới (autoIncrement), giữ khi update
        if (key === "f_id" && !isUpdate) {
            continue;
        }

        // Bỏ qua geometry trong vòng lặp, sẽ xử lý chuẩn hóa riêng phía dưới
        if (key === "geometry") {
            continue;
        }

        if (numericFields.includes(key)) {
            if (value === "" || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const numValue = parseInt(value);
                processed[key] = isNaN(numValue) ? null : numValue;
            }
        } else if (textFields.includes(key)) {
            processed[key] = value === "" ? null : value;
        } else {
            processed[key] = value;
        }
    }

    // Chuẩn hóa geometry: cho phép null; nếu có thì là LineString với đúng 2 cặp toạ độ
    const geom = (data && Object.prototype.hasOwnProperty.call(data, "geometry")) ? data.geometry : undefined;

    if (geom === null || geom === undefined) {
        processed.geometry = null;
        return processed;
    }

    if (geom.type !== "LineString" || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
        throw new Error("geometry phải là LineString và có ít nhất 2 cặp toạ độ");
    }

    // Chuẩn hóa toàn bộ danh sách toạ độ, yêu cầu mỗi điểm có dạng [lon, lat]
    const normalizedCoords = geom.coordinates.map((pt, idx) => {
        if (!Array.isArray(pt) || (pt.length < 2)) {
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
        type: "LineString",
        coordinates: normalizedCoords
    };

    return processed;
};



const getDebaoById = async (f_id) => {
    try {
        const cacheKey = CACHE_KEYS.DEBAO_ALL;
        const hasCache = await cacheService.has(cacheKey);

        if (hasCache) {
            console.log("📦 Tìm kiếm trong cache");
            const allDebaoData = await cacheService.get(cacheKey);
            const debaoFromCache = allDebaoData.find(debao => debao.f_id === parseInt(f_id));
            if (debaoFromCache) {
                return {
                    message: "Lấy dữ liệu từ cache",
                    data: debaoFromCache,
                    fromCache: true
                }
            }
        }

        console.log("�� Query từ database");
        const debao = await db.Debao.findByPk(f_id);

        if (!debao) {
            throw new Error("Không tìm thấy dữ liệu debao với f_id: " + f_id);
        }

        const transformedDebao = await transformGeometryList([debao], fromSrid, toSrid);

        return {
            message: "Lấy dữ liệu từ database",
            data: transformedDebao[0],
            fromCache: false
        }

    } catch (error) {
        throw new Error("Lỗi khi lấy dữ liệu debao: " + error.message);
    }
}

const createDebao = async (debaoData) => {
    try {
        const updateData = processDeBaoDataForDB(debaoData, false);

        if ("f_id" in updateData) {
            delete updateData.f_id;
        }

        const cleanData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined && value !== null) {
                cleanData[key] = value;
            }
        }

        const newDebao = await db.Debao.create(cleanData);

        await cacheService.del(CACHE_KEYS.DEBAO_ALL);
        await cacheService.del(CACHE_KEYS.DEBAO_TIMESTAMP);

        return {
            message: "Thêm dữ liệu debao thành công",
            data: newDebao,
            cacheInvalidated: true
        }
    } catch (error) {
        throw new Error("Lỗi khi tạo dữ liệu debao: " + error.message);
    }
}

const updateDebao = async (f_id, updateData) => {
    try {
        const existingDeBao = await db.Debão.findByPk(f_id);
        if (!existingDeBao) {
            throw new Error("Không tìm thấy debao với f_id: " + f_id);
        }
        const processedData = processDeBaoDataForDB(updateData, true);

        const updatedDeBao = await existingDeBao.update(processedData);

        await cacheService.del(CACHE_KEYS.DEBAO_ALL);
        await cacheService.del(CACHE_KEYS.DEBAO_TIMESTAMP);

        return {
            message: "Cập nhật debao thành công",
            data: updatedDeBao,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error("Lỗi khi cập nhật debao: " + error.message);
    }
}

const deleteDeBao = async (f_id) => {
    try {
        const existingDeBao = await db.Debao.findByPk(f_id);
        if (!existingDeBao) {
            throw new Error("Không tìm thấy debao với f_id: " + f_id);
        }
        await existingDeBao.destroy();
        await cacheService.del(CACHE_KEYS.DEBAO_ALL);
        await cacheService.del(CACHE_KEYS.DEBAO_TIMESTAMP);

        return {
            message: "Xóa debao thành công",
            deletedId: f_id,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error("Lỗi khi xóa debao: " + error.message);
    }
}

// Xóa cache toàn bộ dữ liệu debao
const clearDebaoCache = async () => {
    try {
        await cacheService.del(CACHE_KEYS.DEBAO_ALL);
        await cacheService.del(CACHE_KEYS.DEBAO_TIMESTAMP);
        console.log("🗑️ Đã xóa cache debao (toàn bộ dữ liệu)");
        return { message: "Đã xóa cache debao", success: true };
    } catch (error) {
        console.error("❌ Lỗi khi xóa cache debao:", error);
        throw new Error("Lỗi khi xóa cache debao: " + error.message);
    }
};

// Thêm method để lấy cache stats
const getCacheStats = async () => {
    return await cacheService.getStats();
};

// Tìm kiếm Debao theo toạ độ WGS84 (LineString gần trong bán kính)
const searchDebaoByCoordinates = async ({
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
            throw new Error("Vĩ độ và kinh độ là bắt buộc");
        }
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = parseFloat(radius);
        if (Number.isNaN(latNum) || Number.isNaN(lngNum) || Number.isNaN(radiusNum)) {
            throw new Error("Tọa độ và bán kính phải là số hợp lệ");
        }
        if (latNum < -90 || latNum > 90) {
            throw new Error("Vĩ độ phải trong khoảng -90 đến 90");
        }
        if (lngNum < -180 || lngNum > 180) {
            throw new Error("Kinh độ phải trong khoảng -180 đến 180");
        }

        const cacheKey = `${CACHE_KEYS.DEBAO_ALL}_search_${latNum}_${lngNum}_${radiusNum}`;
        const hasCache = await cacheService.has(cacheKey);
        let results = null;
        if (!forceRefresh && hasCache) {
            results = await cacheService.get(cacheKey);
        }

        if (!results || forceRefresh) {
            // Lấy toàn bộ dữ liệu đã transform (không phân trang)
            let allData = await cacheService.get(CACHE_KEYS.DEBAO_ALL);
            if (!allData || forceRefresh) {
                const debaoList = await db.Debao.findAll();
                allData = await transformGeometryList(debaoList, fromSrid, toSrid);
                await cacheService.set(CACHE_KEYS.DEBAO_ALL, allData);
                await cacheService.set(CACHE_KEYS.DEBAO_TIMESTAMP, new Date().toISOString());
            }

            // Hàm tính khoảng cách từ điểm đến đoạn thẳng
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
                if (!item.geometry || item.geometry.type !== "LineString" || !Array.isArray(item.geometry.coordinates)) return false;
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
            message: hasCache && !forceRefresh ? "Lấy dữ liệu từ cache" : "Tìm kiếm từ dữ liệu đầy đủ",
            data: paginated,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: hasCache && !forceRefresh,
            searchParams: { lat: latNum, lng: lngNum, radius: radiusNum }
        };
    } catch (error) {
        throw new Error("Lỗi khi tìm kiếm debao theo tọa độ: " + error.message);
    }
};

module.exports = {
    getAllDebao,
    clearDebaoCache,
    getCacheStats,
    createDebao,
    updateDebao,
    deleteDeBao,
    getDebaoById,
    searchDebaoByCoordinates
};
