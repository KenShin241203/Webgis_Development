// Cài đặt: npm install ioredis
const Redis = require('ioredis');

// Kết nối Redis (cấu hình qua biến môi trường)
const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
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
    KHAOSAT_TIMESTAMP: 'khaosat_timestamp'
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
        const data = await redis.get(key);
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    },

    // Lưu data vào cache với TTL ngẫu nhiên
    set: async (key, data, baseTTL = 1800, jitterPercent = 10) => {
        const ttl = generateRandomTTL(baseTTL, jitterPercent);
        const value = typeof data === 'string' ? data : JSON.stringify(data);
        await redis.set(key, value, 'EX', ttl);
        console.log(`Cache set for key: ${key} with TTL: ${ttl}s (base: ${baseTTL}s + jitter: ${ttl - baseTTL}s)`);
    },

    // Xóa cache
    del: async (key) => {
        await redis.del(key);
    },

    // Kiểm tra cache có tồn tại không
    has: async (key) => {
        const exists = await redis.exists(key);
        return !!exists;
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