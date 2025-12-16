const db = require('../../models');
const { transformGeometryList } = require('../../utils/coordinateTransform');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

// Hàm lấy tất cả Cong với phân trang và cache toàn bộ dữ liệu
const getAllCong = async ({
    page,
    pageSize,
    forceRefresh = false,
    fromSrid = 9209,
    toSrid = 4326
} = {}) => {
    try {
        // Cache key cho toàn bộ dữ liệu cong
        const cacheKey = CACHE_KEYS.CONG_ALL;
        const cacheTimestampKey = CACHE_KEYS.CONG_TIMESTAMP;

        // Kiểm tra cache trước khi query database
        const hasCache = await cacheService.has(cacheKey);
        console.log('🔍 Cache status:', hasCache);
        console.log('🔍 Force refresh:', forceRefresh);

        let allCongData = null;
        let timestamp = null;

        if (!forceRefresh && hasCache) {
            console.log('📦 Lấy dữ liệu từ cache');
            allCongData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);

            if (!allCongData) {
                console.log('⚠️ Cache data null, query từ database');
            }
        }

        // Nếu không có cache hoặc force refresh, query từ database
        if (!allCongData || forceRefresh) {
            console.log('🔄 Query toàn bộ dữ liệu từ database');
            // Lấy toàn bộ dữ liệu cong
            const congList = await db.Cong.findAll();

            allCongData = await transformGeometryList(congList, fromSrid, toSrid);
            timestamp = new Date().toISOString();

            // Lưu toàn bộ dữ liệu vào cache
            await cacheService.set(cacheKey, allCongData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Đã lưu toàn bộ dữ liệu vào cache');
        }

        // Loại bỏ duplicate dữ liệu dựa trên ID
        const uniqueData = allCongData.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );

        // Nếu phát hiện duplicate trong cache, clear cache và lấy lại từ DB
        if (uniqueData.length < allCongData.length) {
            await cacheService.del(cacheKey);
            await cacheService.del(cacheTimestampKey);

            // Query lại từ database
            const congList = await db.Cong.findAll();
            allCongData = await transformGeometryList(congList, fromSrid, toSrid);

            // Lưu lại vào cache
            await cacheService.set(cacheKey, allCongData);
            await cacheService.set(cacheTimestampKey, new Date().toISOString());
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
        throw new Error('Lỗi khi lấy dữ liệu cong: ' + error.message);
    }
};


const createCong = async (congData) => {
    try {
        // Xử lý dữ liệu trước khi tạo (isUpdate = false để bỏ qua id)
        const processedData = processCongDataForDB(congData, false);

        // Đảm bảo không có trường id trong dữ liệu khi tạo mới
        if ('id' in processedData) {
            delete processedData.id;
        }

        // Loại bỏ tất cả các trường undefined hoặc null không cần thiết
        const cleanData = {};
        for (const [key, value] of Object.entries(processedData)) {
            if (value !== undefined && value !== null) {
                cleanData[key] = value;
            }
        }

        // 1. Thêm vào database trước
        const newCong = await db.Cong.create(cleanData);

        // 2. Xóa cache để đảm bảo consistency (Cache-Aside pattern)
        await cacheService.del(CACHE_KEYS.CONG_ALL);
        await cacheService.del(CACHE_KEYS.CONG_TIMESTAMP);

        return {
            message: 'Thêm cống thành công',
            data: newCong,
            cacheInvalidated: true
        };
    } catch (error) {
        throw new Error('Lỗi khi thêm cống: ' + error.message);
    }
};

// Hàm cập nhật cống 
const updateCong = async (id, updateData) => {
    try {
        console.log('✏️ Bắt đầu cập nhật cống:', id);
        console.log('📝 Dữ liệu cập nhật:', updateData);

        // 1. Kiểm tra cống có tồn tại không
        const existingCong = await db.Cong.findByPk(id);
        if (!existingCong) {
            throw new Error('Không tìm thấy cống với ID: ' + id);
        }

        // Xử lý dữ liệu trước khi cập nhật (isUpdate = true để giữ lại id)
        const processedData = processCongDataForDB(updateData, true);
        console.log('🔧 Dữ liệu đã xử lý:', processedData);

        // 2. Cập nhật trong database
        const updatedCong = await existingCong.update(processedData);
        console.log('✅ Đã cập nhật cống trong database:', id);

        // 3. Xóa cache để đảm bảo consistency (Cache-Aside pattern)
        await cacheService.del(CACHE_KEYS.CONG_ALL);
        await cacheService.del(CACHE_KEYS.CONG_TIMESTAMP);
        console.log('🗑️ Đã xóa cache sau khi cập nhật cống');

        return {
            message: 'Cập nhật cống thành công',
            data: updatedCong,
            cacheInvalidated: true
        };
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật cống:', error);
        throw new Error('Lỗi khi cập nhật cống: ' + error.message);
    }
};

// Hàm xóa cống 
const deleteCong = async (id) => {
    try {
        console.log('🗑️ Bắt đầu xóa cống:', id);

        // 1. Kiểm tra cống có tồn tại không
        const existingCong = await db.Cong.findByPk(id);
        if (!existingCong) {
            throw new Error('Không tìm thấy cống với ID: ' + id);
        }

        // 2. Xóa khỏi database
        await existingCong.destroy();
        console.log('✅ Đã xóa cống khỏi database:', id);

        // 3. Xóa cache để đảm bảo consistency (Cache-Aside pattern)
        await cacheService.del(CACHE_KEYS.CONG_ALL);
        await cacheService.del(CACHE_KEYS.CONG_TIMESTAMP);
        console.log('🗑️ Đã xóa cache sau khi xóa cống');

        return {
            message: 'Xóa cống thành công',
            deletedId: id,
            cacheInvalidated: true
        };
    } catch (error) {
        console.error('❌ Lỗi khi xóa cống:', error);
        throw new Error('Lỗi khi xóa cống: ' + error.message);
    }
};

// Hàm lấy cống theo ID 
const getCongById = async (id, fromSrid = 9209, toSrid = 4326) => {
    try {
        console.log('🔍 Tìm cống theo ID:', id);

        // 1. Thử lấy từ cache trước (nếu có cache toàn bộ)
        const cacheKey = CACHE_KEYS.CONG_ALL;
        const hasCache = await cacheService.has(cacheKey);

        if (hasCache) {
            console.log('📦 Tìm kiếm trong cache');
            const allCongData = await cacheService.get(cacheKey);
            const congFromCache = allCongData.find(cong => cong.id === parseInt(id));

            if (congFromCache) {
                console.log('✅ Tìm thấy cống trong cache');
                return {
                    message: 'Lấy dữ liệu từ cache',
                    data: congFromCache,
                    fromCache: true
                };
            }
        }

        // 2. Nếu không có trong cache, query từ database
        console.log('🔄 Query từ database');
        const cong = await db.Cong.findByPk(id);

        if (!cong) {
            throw new Error('Không tìm thấy cống với ID: ' + id);
        }

        // Transform geometry nếu cần
        const transformedCong = await transformGeometryList([cong], fromSrid, toSrid);

        return {
            message: 'Lấy dữ liệu từ database',
            data: transformedCong[0],
            fromCache: false
        };
    } catch (error) {
        console.error('❌ Lỗi khi lấy cống theo ID:', error);
        throw new Error('Lỗi khi lấy cống: ' + error.message);
    }
};



// Xóa cache toàn bộ dữ liệu cong
const clearCongCache = async () => {
    try {
        // Sử dụng cacheService thay vì Redis trực tiếp
        await cacheService.del(CACHE_KEYS.CONG_ALL);
        await cacheService.del(CACHE_KEYS.CONG_TIMESTAMP);

        console.log('🗑️ Đã xóa cache cong (toàn bộ dữ liệu)');
        return {
            message: 'Đã xóa cache thành công',
            success: true
        };
    } catch (error) {
        console.error('❌ Lỗi khi xóa cache:', error);
        throw new Error('Lỗi khi xóa cache: ' + error.message);
    }
};

// Thêm method để lấy cache stats
const getCacheStats = async () => {
    return await cacheService.getStats();
};

// Hàm xử lý dữ liệu cống trước khi lưu vào database
const processCongDataForDB = (data, isUpdate = false) => {
    const processed = {};

    // Danh sách các trường số
    const numericFields = ['cap', 'namxaydung', 'sophai', 'bkhoang_c', 'tongcua_c', 'codecong'];

    // Danh sách các trường số thập phân
    const decimalFields = ['ctrinh_day'];

    // Danh sách các trường text
    const textFields = ['ten', 'tenxa', 'ghichu', 'ten_chung', 'ten_rieng'];

    // Danh sách các trường đặc biệt (không xử lý)
    const specialFields = ['geometry'];

    // Danh sách các trường tọa độ
    const coordinateFields = ['longitude', 'latitude'];

    // Xử lý từng trường
    for (const [key, value] of Object.entries(data)) {
        // Bỏ qua trường id khi tạo mới (autoIncrement), nhưng giữ lại khi update
        if (key === 'id' && !isUpdate) {
            continue;
        }

        if (numericFields.includes(key)) {
            // Xử lý trường số nguyên
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const numValue = parseInt(value);
                processed[key] = isNaN(numValue) ? null : numValue;
            }
        } else if (decimalFields.includes(key)) {
            // Xử lý trường số thập phân
            if (value === '' || value === null || value === undefined) {
                processed[key] = null;
            } else {
                const numValue = parseFloat(value);
                processed[key] = isNaN(numValue) ? null : numValue;
            }
        } else if (textFields.includes(key)) {
            // Xử lý trường text
            processed[key] = value === '' ? null : value;
        } else if (specialFields.includes(key)) {
            // Xử lý trường đặc biệt (geometry)
            processed[key] = value;
        } else if (coordinateFields.includes(key)) {
            // Bỏ qua trường tọa độ riêng lẻ, sẽ xử lý ở cuối
            continue;
        } else {
            // Các trường khác (bao gồm id khi update)
            processed[key] = value;
        }
    }

    // Xử lý geometry từ tọa độ nếu có
    const longitude = parseFloat(data.longitude);
    const latitude = parseFloat(data.latitude);

    if (!isNaN(longitude) && !isNaN(latitude)) {
        processed.geometry = {
            type: "Point",
            coordinates: [longitude, latitude]
        };
    }

    return processed;
};

// Tìm kiếm cống theo tọa độ
const searchCongByCoordinates = async ({
    lat,
    lng,
    radius = 0.01, // Bán kính tìm kiếm mặc định (khoảng 1km)
    page = 1,
    pageSize = 100,
    forceRefresh = false,
    fromSrid = 9209,
    toSrid = 4326
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

        const cacheKey = `${CACHE_KEYS.CONG_ALL}_search_${latNum}_${lngNum}_${radiusNum}`;
        const hasCache = await cacheService.has(cacheKey);

        let searchResults = null;

        if (!forceRefresh && hasCache) {
            searchResults = await cacheService.get(cacheKey);
        }

        if (!searchResults || forceRefresh) {
            // Lấy tất cả dữ liệu từ cache hoặc database
            const allDataResult = await getAllCong({ forceRefresh, fromSrid, toSrid });
            const allData = allDataResult.data;

            // Tìm kiếm theo tọa độ với bán kính
            searchResults = allData.filter(item => {
                if (!item.geometry || !item.geometry.coordinates) return false;

                const itemLat = parseFloat(item.geometry.coordinates[1]); // latitude
                const itemLng = parseFloat(item.geometry.coordinates[0]); // longitude

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
        throw new Error('Lỗi khi tìm kiếm cống theo tọa độ: ' + error.message);
    }
};

// Hàm backup tất cả dữ liệu cống
const backupCong = async () => {
    try {
        console.log('🔄 Bắt đầu backup dữ liệu cống...');

        // Lấy toàn bộ dữ liệu cống từ database (không phân trang)
        const congList = await db.Cong.findAll({
            order: [['id', 'ASC']] // Sắp xếp theo ID để đảm bảo thứ tự
        });

        console.log(`📊 Tìm thấy ${congList.length} bản ghi cống`);

        // Giữ nguyên geometry ở định dạng VN2000 (không chuyển đổi)
        const backupData = congList.map(cong => ({
            id: cong.id,
            ten: cong.ten,
            cap: cong.cap,
            namxaydung: cong.namxaydung,
            tenxa: cong.tenxa,
            sophai: cong.sophai,
            bkhoang_c: cong.bkhoang_c,
            tongcua_c: cong.tongcua_c,
            ghichu: cong.ghichu,
            codecong: cong.codecong,
            ctrinh_day: cong.ctrinh_day,
            ten_chung: cong.ten_chung,
            ten_rieng: cong.ten_rieng,
            geometry: cong.geometry, // Giữ nguyên geometry VN2000
            createdAt: cong.createdAt,
            updatedAt: cong.updatedAt
        }));

        console.log('✅ Backup dữ liệu cống thành công (giữ nguyên VN2000)');

        return {
            message: 'Backup dữ liệu cống thành công (VN2000)',
            data: backupData,
            totalRecords: backupData.length,
            timestamp: new Date().toISOString(),
            coordinateSystem: 'VN2000'
        };

    } catch (error) {
        console.error('❌ Lỗi khi backup dữ liệu cống:', error);
        throw new Error(`Lỗi backup dữ liệu cống: ${error.message}`);
    }
};

module.exports = {
    getAllCong,
    createCong,
    updateCong,
    deleteCong,
    getCongById,
    clearCongCache,
    getCacheStats,
    processCongDataForDB,
    searchCongByCoordinates,
    backupCong
};