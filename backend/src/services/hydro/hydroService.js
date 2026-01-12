const db = require('../../models');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');
const { sequelize } = require('../../models');

/**
 * Lấy danh sách hydro_data với keyset pagination (cursor-based)
 * Tránh OOM bằng cách không load toàn bộ dữ liệu vào memory
 * @param {Object} params - Tham số query
 * @param {number} params.pageSize - Số lượng bản ghi mỗi trang (mặc định 1000, tối đa 10000)
 * @param {string} params.cursor - Cursor để tiếp tục pagination (format: "time,element_id")
 * @param {number} params.element_id - Filter theo element_id
 * @param {string} params.startTime - Filter theo thời gian bắt đầu (ISO string)
 * @param {string} params.endTime - Filter theo thời gian kết thúc (ISO string)
 * @returns {Promise<Object>} Kết quả với data, cursor, hasMore
 */
const getAllHydroData = async ({
    pageSize = 1000,
    cursor = null,
    element_id = null,
    startTime = null,
    endTime = null
} = {}) => {
    try {
        // Xây dựng SQL query với keyset pagination
        // Sử dụng cursor dựa trên (time, element_id) để tránh offset pagination
        let whereConditions = [];
        let replacements = [];
        let paramIndex = 1;

        // Filter theo element_id
        if (element_id != null) {
            whereConditions.push(`h.element_id = $${paramIndex}`);
            replacements.push(Number(element_id));
            paramIndex++;
        }

        // Filter theo thời gian
        if (startTime) {
            whereConditions.push(`h.time >= $${paramIndex}`);
            replacements.push(new Date(startTime));
            paramIndex++;
        }
        if (endTime) {
            whereConditions.push(`h.time <= $${paramIndex}`);
            replacements.push(new Date(endTime));
            paramIndex++;
        }

        // Keyset pagination: cursor là "time,element_id" (chỉ dùng khi không query theo ngày)
        if (cursor && !startTime && !endTime) {
            try {
                const [cursorTime, cursorElementId] = cursor.split(',');
                if (cursorTime && cursorElementId) {
                    whereConditions.push(
                        `(h.time < $${paramIndex} OR (h.time = $${paramIndex} AND h.element_id > $${paramIndex + 1}))`
                    );
                    replacements.push(new Date(cursorTime), Number(cursorElementId));
                    paramIndex += 2;
                }
            } catch (err) {
                console.warn('⚠️ Cursor không hợp lệ, bỏ qua:', err);
            }
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Logic: Nếu query theo khoảng thời gian (có startTime hoặc endTime), lấy TẤT CẢ dữ liệu
        // Nếu không, dùng pageSize như bình thường
        const isDateRangeQuery = startTime || endTime;
        let limitClause = '';
        let safePageSize = null;

        if (isDateRangeQuery) {
            // Query theo khoảng thời gian: không dùng LIMIT, lấy tất cả dữ liệu
            // Ước tính: mỗi ngày có khoảng 24 timesteps, mỗi timestep ~45k records
            // Tổng cộng ~1.08M records/ngày, nhưng để an toàn không giới hạn
            const rangeStr = startTime && endTime
                ? `${new Date(startTime).toISOString()} đến ${new Date(endTime).toISOString()}`
                : startTime
                    ? `từ ${new Date(startTime).toISOString()}`
                    : `đến ${new Date(endTime).toISOString()}`;
            console.log(`📅 Query theo khoảng thời gian (${rangeStr}): lấy TẤT CẢ dữ liệu`);
        } else {
            // Query bình thường: dùng pageSize
            safePageSize = Math.min(Math.max(1, parseInt(pageSize) || 1000), 50000);
            limitClause = `LIMIT $${paramIndex}`;
            replacements.push(safePageSize + 1); // Lấy thêm 1 để kiểm tra hasMore
            console.log('🔄 Query hydro_data với keyset pagination, pageSize:', safePageSize);
        }

        // SQL query tối ưu: chỉ select các cột cần thiết, không join Elements
        // Order by time DESC, element_id ASC để hỗ trợ keyset pagination
        const sqlQuery = `
            SELECT 
                h.id,
                h.element_id,
                h.time,
                h.surface_elev,
                h.total_depth,
                h.u,
                h.v,
                h.direction
            FROM hydro_data h
            ${whereClause}
            ORDER BY h.time DESC, h.element_id ASC
            ${limitClause}
        `;

        const results = await sequelize.query(sqlQuery, {
            bind: replacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Xử lý kết quả - sequelize.query trả về array
        const data = Array.isArray(results) ? results : [];

        let actualData = data;
        let hasMore = false;
        let nextCursor = null;

        if (isDateRangeQuery) {
            // Query theo khoảng thời gian: trả về tất cả dữ liệu, không có pagination
            hasMore = false;
            nextCursor = null;
            const rangeStr = startTime && endTime
                ? `${new Date(startTime).toISOString()} đến ${new Date(endTime).toISOString()}`
                : startTime
                    ? `từ ${new Date(startTime).toISOString()}`
                    : `đến ${new Date(endTime).toISOString()}`;
            console.log(`✅ Đã lấy ${data.length} records trong khoảng thời gian (${rangeStr})`);
        } else {
            // Query bình thường: xử lý pagination
            hasMore = data.length > safePageSize;
            actualData = hasMore ? data.slice(0, safePageSize) : data;

            // Tạo cursor cho trang tiếp theo
            if (hasMore && actualData.length > 0) {
                const lastItem = actualData[actualData.length - 1];
                nextCursor = `${lastItem.time.toISOString()},${lastItem.element_id}`;
            }
        }

        return {
            message: 'Lấy dữ liệu hydro_data thành công',
            data: actualData,
            pageSize: safePageSize,
            cursor: nextCursor,
            hasMore: hasMore,
            total: null,
            fromCache: false
        };
    } catch (error) {
        console.error('❌ Lỗi khi query hydro_data:', error);
        throw new Error('Lỗi khi lấy dữ liệu hydro_data: ' + error.message);
    }
};

const createHydroData = async (data) => {
    try {
        // element_id và time là bắt buộc
        if (!data.element_id || !data.time) {
            throw new Error('Thiếu element_id hoặc time');
        }

        const hydroData = await db.HydroData.create({
            element_id: data.element_id,
            time: new Date(data.time),
            surface_elev: data.surface_elev,
            total_depth: data.total_depth,
            u: data.u,
            v: data.v,
            direction: data.direction
        });

        // Xóa cache để đảm bảo dữ liệu mới được load
        await cacheService.del(CACHE_KEYS.HYDRO_ALL);
        await cacheService.del(CACHE_KEYS.HYDRO_TIMESTAMP);
        await cacheService.del('hydro_available_times');

        return hydroData;
    } catch (error) {
        // Xử lý lỗi unique constraint
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new Error('Đã tồn tại dữ liệu với element_id và time này');
        }
        throw new Error('Lỗi khi tạo hydro_data: ' + error.message);
    }
};

const updateHydroData = async (id, data) => {
    try {
        const existing = await db.HydroData.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy hydro_data với ID: ' + id);
        }

        const updateData = {};
        if (data.element_id != null) updateData.element_id = data.element_id;
        if (data.time != null) updateData.time = new Date(data.time);
        if (data.surface_elev != null) updateData.surface_elev = data.surface_elev;
        if (data.total_depth != null) updateData.total_depth = data.total_depth;
        if (data.u != null) updateData.u = data.u;
        if (data.v != null) updateData.v = data.v;
        if (data.direction != null) updateData.direction = data.direction;

        await existing.update(updateData);

        // Xóa cache để đảm bảo dữ liệu mới được load
        await cacheService.del(CACHE_KEYS.HYDRO_ALL);
        await cacheService.del(CACHE_KEYS.HYDRO_TIMESTAMP);
        await cacheService.del('hydro_available_times');

        return existing;
    } catch (error) {
        // Xử lý lỗi unique constraint
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new Error('Đã tồn tại dữ liệu với element_id và time này');
        }
        throw new Error('Lỗi khi cập nhật hydro_data: ' + error.message);
    }
};

const deleteHydroData = async (id) => {
    try {
        const existing = await db.HydroData.findByPk(id);
        if (!existing) {
            throw new Error('Không tìm thấy hydro_data với ID: ' + id);
        }
        await existing.destroy();

        // Xóa cache để đảm bảo dữ liệu mới được load
        await cacheService.del(CACHE_KEYS.HYDRO_ALL);
        await cacheService.del(CACHE_KEYS.HYDRO_TIMESTAMP);
        await cacheService.del('hydro_available_times');

        return id;
    } catch (error) {
        throw new Error('Lỗi khi xóa hydro_data: ' + error.message);
    }
};

const getHydroDataById = async (id) => {
    try {
        const hydroData = await db.HydroData.findByPk(id);
        if (!hydroData) {
            throw new Error('Không tìm thấy hydro_data với ID: ' + id);
        }
        return hydroData.toJSON();
    } catch (error) {
        throw new Error('Lỗi khi lấy hydro_data theo ID: ' + error.message);
    }
};

// Lấy dữ liệu hydro_data theo element_id với keyset pagination
const getHydroDataByElementId = async (elementId, {
    pageSize = 100,
    cursor = null,
    startTime = null,
    endTime = null
} = {}) => {
    try {
        const safePageSize = Math.min(Math.max(1, parseInt(pageSize) || 100), 10000);

        let whereConditions = [`h.element_id = $1`];
        let replacements = [Number(elementId)];
        let paramIndex = 2;

        if (startTime) {
            whereConditions.push(`h.time >= $${paramIndex}`);
            replacements.push(new Date(startTime));
            paramIndex++;
        }
        if (endTime) {
            whereConditions.push(`h.time <= $${paramIndex}`);
            replacements.push(new Date(endTime));
            paramIndex++;
        }

        // Keyset pagination với cursor là time
        if (cursor) {
            try {
                const cursorTime = new Date(cursor);
                whereConditions.push(`h.time < $${paramIndex}`);
                replacements.push(cursorTime);
                paramIndex++;
            } catch (err) {
                console.warn('⚠️ Cursor không hợp lệ, bỏ qua:', err);
            }
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const sqlQuery = `
            SELECT 
                h.id,
                h.element_id,
                h.time,
                h.surface_elev,
                h.total_depth,
                h.u,
                h.v,
                h.direction
            FROM hydro_data h
            ${whereClause}
            ORDER BY h.time DESC
            LIMIT $${paramIndex}
        `;
        replacements.push(safePageSize + 1);

        const results = await sequelize.query(sqlQuery, {
            bind: replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const data = Array.isArray(results) ? results : [];
        const hasMore = data.length > safePageSize;
        const actualData = hasMore ? data.slice(0, safePageSize) : data;

        let nextCursor = null;
        if (hasMore && actualData.length > 0) {
            nextCursor = actualData[actualData.length - 1].time.toISOString();
        }

        return {
            message: 'Lấy dữ liệu hydro_data theo element_id thành công',
            data: actualData,
            pageSize: safePageSize,
            cursor: nextCursor,
            hasMore: hasMore
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu hydro_data theo element_id: ' + error.message);
    }
};

// Lấy danh sách các thời gian có sẵn (distinct times)
const getAvailableTimes = async () => {
    try {
        // Kiểm tra cache trước
        const cacheKey = 'hydro_available_times';
        let hasCache = false;
        let cachedTimes = null;

        try {
            hasCache = await cacheService.has(cacheKey);
            if (hasCache) {
                cachedTimes = await cacheService.get(cacheKey);
                if (cachedTimes && Array.isArray(cachedTimes) && cachedTimes.length > 0) {
                    console.log('📦 Lấy danh sách thời gian từ cache');
                    return {
                        message: 'Lấy danh sách thời gian thành công',
                        data: cachedTimes,
                        fromCache: true
                    };
                }
            }
        } catch (cacheError) {
            console.warn('⚠️ Không thể kiểm tra cache:', cacheError.message);
        }

        // Query từ database - sử dụng raw SQL để tối ưu
        console.log('🔄 Query danh sách thời gian từ database');
        const sqlQuery = `
            SELECT DISTINCT time
            FROM hydro_data
            ORDER BY time ASC
        `;

        const results = await sequelize.query(sqlQuery, {
            type: sequelize.QueryTypes.SELECT
        });

        // Extract và format thời gian
        const availableTimes = results
            .map(row => row.time)
            .filter(time => time != null)
            .map(time => time instanceof Date ? time.toISOString() : time);

        // Lưu vào cache (TTL: 1 giờ)
        try {
            await cacheService.set(cacheKey, availableTimes, 3600);
            console.log('💾 Đã lưu danh sách thời gian vào cache');
        } catch (cacheError) {
            console.warn('⚠️ Không thể lưu cache:', cacheError.message);
        }

        return {
            message: 'Lấy danh sách thời gian thành công',
            data: availableTimes,
            fromCache: false
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy danh sách thời gian: ' + error.message);
    }
};

module.exports = {
    getAllHydroData,
    createHydroData,
    updateHydroData,
    deleteHydroData,
    getHydroDataById,
    getHydroDataByElementId,
    getAvailableTimes
};
