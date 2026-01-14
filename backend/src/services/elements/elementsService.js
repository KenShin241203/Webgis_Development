const db = require('../../models');
const { transformGeometry } = require('../../utils/coordinateTransform');
const { cacheService, CACHE_KEYS } = require('../../utils/cache');

// Lấy danh sách elements với phân trang và cache toàn bộ dữ liệu
const getAllElements = async ({
    page = 1,
    pageSize = 100,
    forceRefresh = false
} = {}) => {
    try {
        // Cache key cho toàn bộ dữ liệu elements
        const cacheKey = CACHE_KEYS.ELEMENTS_ALL;
        const cacheTimestampKey = CACHE_KEYS.ELEMENTS_TIMESTAMP;

        // Kiểm tra cache trước khi query database
        const hasCache = await cacheService.has(cacheKey);
        console.log('🔍 Elements cache status:', hasCache);
        console.log('🔍 Force refresh:', forceRefresh);

        let allElementsData = null;
        let timestamp = null;
        let fromCache = false;

        if (!forceRefresh && hasCache) {
            console.log('📦 Lấy dữ liệu elements từ cache');
            allElementsData = await cacheService.get(cacheKey);
            timestamp = await cacheService.get(cacheTimestampKey);

            if (!allElementsData) {
                console.log('⚠️ Cache data null, query từ database');
            } else {
                fromCache = true;
            }
        }

        // Nếu không có cache hoặc force refresh, query từ database
        if (!allElementsData || forceRefresh) {
            console.log('🔄 Query toàn bộ dữ liệu elements từ database');
            const elementsList = await db.Elements.findAll({
                order: [['element_id', 'ASC']]
            });

            // Chuẩn hóa dữ liệu trả về: chuyển x,y (VN2000) sang geometry WGS84
            allElementsData = await Promise.all(elementsList.map(async (row) => {
                const item = row.toJSON();
                if (item.x != null && item.y != null) {
                    try {
                        // Giả định toạ độ elements đang ở hệ VN2000 tương tự sutlun (SRID 3405)
                        const geom = await transformGeometry({
                            type: 'Point',
                            coordinates: [item.x, item.y]
                        }, 3405, 4326);
                        item.geometry = geom;
                    } catch (e) {
                        // Nếu lỗi chuyển đổi thì fallback về null để tránh crash
                        item.geometry = null;
                    }
                } else {
                    item.geometry = null;
                }
                return item;
            }));

            timestamp = new Date().toISOString();

            // Lưu toàn bộ dữ liệu vào cache
            await cacheService.set(cacheKey, allElementsData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Đã lưu toàn bộ dữ liệu elements vào cache');
            fromCache = false;
        }

        // Loại bỏ duplicate dữ liệu dựa trên element_id
        const uniqueData = allElementsData.filter((item, index, self) =>
            index === self.findIndex(t => t.element_id === item.element_id)
        );

        if (uniqueData.length < allElementsData.length) {
            await cacheService.del(cacheKey);
            await cacheService.del(cacheTimestampKey);
            await cacheService.set(cacheKey, uniqueData);
            await cacheService.set(cacheTimestampKey, timestamp);
            console.log('💾 Làm sạch trùng và lưu lại cache');
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
            message: fromCache && !forceRefresh ? 'Lấy dữ liệu elements từ cache' : 'Lấy dữ liệu elements từ database',
            data: paginatedData,
            total,
            page: safePage,
            pageSize: safePageSize,
            totalPages,
            fromCache: fromCache && !forceRefresh,
            timestamp: timestamp || new Date().toISOString()
        };
    } catch (error) {
        throw new Error('Lỗi khi lấy dữ liệu elements: ' + error.message);
    }
};

const createElement = async (data) => {
    try {
        // element_id là PK, bắt buộc
        if (!data.element_id) {
            throw new Error('Thiếu element_id');
        }
        const element = await db.Elements.create({
            element_id: data.element_id,
            x: data.x,
            y: data.y,
            area: data.area
        });

        // Xóa cache để đảm bảo dữ liệu mới được load
        await cacheService.del(CACHE_KEYS.ELEMENTS_ALL);
        await cacheService.del(CACHE_KEYS.ELEMENTS_TIMESTAMP);

        return element;
    } catch (error) {
        throw new Error('Lỗi khi tạo element: ' + error.message);
    }
};

const updateElement = async (elementId, data) => {
    try {
        const existing = await db.Elements.findByPk(elementId);
        if (!existing) {
            throw new Error('Không tìm thấy element với ID: ' + elementId);
        }
        await existing.update({
            x: data.x,
            y: data.y,
            area: data.area
        });

        // Xóa cache để đảm bảo dữ liệu mới được load
        await cacheService.del(CACHE_KEYS.ELEMENTS_ALL);
        await cacheService.del(CACHE_KEYS.ELEMENTS_TIMESTAMP);

        return existing;
    } catch (error) {
        throw new Error('Lỗi khi cập nhật element: ' + error.message);
    }
};

const deleteElement = async (elementId) => {
    try {
        const existing = await db.Elements.findByPk(elementId);
        if (!existing) {
            throw new Error('Không tìm thấy element với ID: ' + elementId);
        }
        await existing.destroy();

        // Xóa cache để đảm bảo dữ liệu mới được load
        await cacheService.del(CACHE_KEYS.ELEMENTS_ALL);
        await cacheService.del(CACHE_KEYS.ELEMENTS_TIMESTAMP);

        return elementId;
    } catch (error) {
        throw new Error('Lỗi khi xóa element: ' + error.message);
    }
};

const getElementById = async (elementId) => {
    try {
        const element = await db.Elements.findByPk(elementId);
        if (!element) {
            throw new Error('Không tìm thấy element với ID: ' + elementId);
        }
        const item = element.toJSON();
        if (item.x != null && item.y != null) {
            try {
                const geom = await transformGeometry({
                    type: 'Point',
                    coordinates: [item.x, item.y]
                }, 3405, 4326);
                item.geometry = geom;
            } catch (e) {
                item.geometry = null;
            }
        } else {
            item.geometry = null;
        }
        return item;
    } catch (error) {
        throw new Error('Lỗi khi lấy element theo ID: ' + error.message);
    }
};

// Lấy elements theo danh sách element_ids (tối ưu cho query theo hydro_data)
const getElementsByIds = async (elementIds = []) => {
    try {
        if (!Array.isArray(elementIds) || elementIds.length === 0) {
            return [];
        }

        // Validate và chuyển đổi element_ids thành số
        const validElementIds = elementIds
            .map(id => parseInt(id))
            .filter(id => !isNaN(id) && id > 0);

        if (validElementIds.length === 0) {
            return [];
        }

        // Query elements theo danh sách element_ids
        const elementsList = await db.Elements.findAll({
            where: {
                element_id: validElementIds
            },
            order: [['element_id', 'ASC']]
        });

        // Chuẩn hóa dữ liệu trả về: chuyển x,y (VN2000) sang geometry WGS84
        const elementsData = await Promise.all(elementsList.map(async (row) => {
            const item = row.toJSON();
            if (item.x != null && item.y != null) {
                try {
                    // Giả định toạ độ elements đang ở hệ VN2000 tương tự sutlun (SRID 3405)
                    const geom = await transformGeometry({
                        type: 'Point',
                        coordinates: [item.x, item.y]
                    }, 3405, 4326);
                    item.geometry = geom;
                } catch (e) {
                    // Nếu lỗi chuyển đổi thì fallback về null để tránh crash
                    item.geometry = null;
                }
            } else {
                item.geometry = null;
            }
            return item;
        }));

        return elementsData;
    } catch (error) {
        throw new Error('Lỗi khi lấy elements theo danh sách IDs: ' + error.message);
    }
};



module.exports = {
    getAllElements,
    createElement,
    updateElement,
    deleteElement,
    getElementById,
    getElementsByIds
};