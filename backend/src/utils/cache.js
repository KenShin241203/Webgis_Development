// Cài đặt: npm install ioredis
const Redis = require('ioredis');

// Kết nối Redis (cấu hình qua biến môi trường)
const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    retryStrategy: (times) => {
        // Retry với exponential backoff
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableOfflineQueue: false
});

// Xử lý lỗi Redis connection
redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    // Không throw error để app vẫn chạy được khi Redis down
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('ready', () => {
    console.log('✅ Redis ready');
});

// Cache keys
const CACHE_KEYS = {
    DOLUN_VELO: 'dolun_velo_data',
    DOLUN_VELO_TIMESTAMP: 'dolun_velo_timestamp',
    SUTLUN: 'sutlun_data',
    SUTLUN_ALL: 'sutlun_data_all',
    SUTLUN_TIMESTAMP: 'sutlun_timestamp',
    CONG_ALL: 'cong_data_all',
    CONG_TIMESTAMP: 'cong_timestamp',
    CHAT_LUONG_ALL: 'chat_luong_data_all',
    CHAT_LUONG_TIMESTAMP: 'chat_luong_timestamp',
    DEBAO_ALL: 'debao_data_all',
    DEBAO_TIMESTAMP: 'debao_timestamp',
    HIENTRANG_ALL: 'hientrang_data_all',
    HIENTRANG_TIMESTAMP: 'hientrang_timestamp',
    NAGPLUT_ALL: 'ngaplut_data_all',
    NAGPLUT_TIMESTAMP: 'ngaplut_timestamp',
    NAGPLUT_TOTAL: 'ngaplut_total',
    KHAOSAT_ALL: 'khaosat_data_all',
    KHAOSAT_TIMESTAMP: 'khaosat_timestamp',
    ELEMENTS_ALL: 'elements_data_all',
    ELEMENTS_TIMESTAMP: 'elements_timestamp',
    HYDRO_ALL: 'hydro_data_all',
    HYDRO_TIMESTAMP: 'hydro_timestamp'
};

// Hàm tạo TTL ngẫu nhiên để tránh cache stampede
const generateRandomTTL = (baseTTL, jitterPercent = 10) => {
    const jitter = Math.floor(baseTTL * (jitterPercent / 100));
    const randomJitter = Math.floor(Math.random() * jitter);
    return baseTTL + randomJitter;
};

// Cache service
const cacheService = {
    // Lấy data từ cache
    get: async (key) => {
        try {
            const data = await redis.get(key);
            if (!data) return null;
            try {
                return JSON.parse(data);
            } catch {
                return data;
            }
        } catch (error) {
            console.error('❌ Redis get error:', error.message);
            return null; // Trả về null nếu Redis lỗi, không throw
        }
    },

    // Lưu data vào cache với TTL ngẫu nhiên
    set: async (key, data, baseTTL = 1800, jitterPercent = 10) => {
        try {
            const ttl = generateRandomTTL(baseTTL, jitterPercent);
            const value = typeof data === 'string' ? data : JSON.stringify(data);
            await redis.set(key, value, 'EX', ttl);
            console.log(`Cache set for key: ${key} with TTL: ${ttl}s (base: ${baseTTL}s + jitter: ${ttl - baseTTL}s)`);
        } catch (error) {
            console.error('❌ Redis set error:', error.message);
            // Không throw, chỉ log lỗi
        }
    },

    // Xóa cache
    del: async (key) => {
        try {
            await redis.del(key);
        } catch (error) {
            console.error('❌ Redis del error:', error.message);
        }
    },

    // Kiểm tra cache có tồn tại không
    has: async (key) => {
        try {
            const exists = await redis.exists(key);
            return !!exists;
        } catch (error) {
            console.error('❌ Redis has error:', error.message);
            return false; // Trả về false nếu Redis lỗi
        }
    },

    // Lấy thông tin cache stats
    getStats: async () => {
        const info = await redis.info();
        const dbsize = await redis.dbsize();
        return { info, dbsize };
    },

    // Flush tất cả cache
    flush: async () => {
        await redis.flushdb();
    },

    // Lấy TTL còn lại của key
    getTTL: async (key) => {
        return await redis.ttl(key);
    }
};

module.exports = { cacheService, CACHE_KEYS, generateRandomTTL }; 