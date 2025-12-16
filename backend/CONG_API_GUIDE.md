# Hướng dẫn sử dụng API Cống với Cache-Aside Pattern

## Tổng quan
API này được thiết kế theo mô hình **Cache-Aside Pattern** để tối ưu hiệu suất đọc và đảm bảo tính nhất quán dữ liệu.

### Mô hình hoạt động:
- **Write Operations (CR7)**: Update database trước → Xóa cache
- **Read Operations (M1D)**: Kiểm tra cache trước → Nếu miss thì query database → Lưu vào cache

## Endpoints

### 1. Lấy tất cả cống (với phân trang và cache)
```http
GET /api/cong?page=1&pageSize=100&forceRefresh=false&fromSrid=9209&toSrid=4326
```

**Query Parameters:**
- `page`: Trang hiện tại (mặc định: 1)
- `pageSize`: Số lượng item mỗi trang (mặc định: 100)
- `forceRefresh`: Bắt buộc refresh cache (mặc định: false)
- `fromSrid`: Hệ tọa độ nguồn (mặc định: 9209)
- `toSrid`: Hệ tọa độ đích (mặc định: 4326)

**Response:**
```json
{
  "message": "Lấy dữ liệu từ cache",
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 100,
    "totalPages": 2
  },
  "cache": {
    "fromCache": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Thêm cống mới
```http
POST /api/cong
Content-Type: application/json

{
  "ten_cong": "Cống An Giang 1",
  "ma_cong": "AG001",
  "tinh": "An Giang",
  "huyen": "Long Xuyên",
  "xa": "Mỹ Xuyên",
  "geometry": "POINT(105.123 10.456)"
}
```

**Response:**
```json
{
  "message": "Thêm cống thành công",
  "data": {
    "id": 1,
    "ten_cong": "Cống An Giang 1",
    "ma_cong": "AG001",
    ...
  },
  "cache": {
    "invalidated": true
  }
}
```

### 3. Cập nhật cống
```http
PUT /api/cong/1
Content-Type: application/json

{
  "ten_cong": "Cống An Giang 1 - Đã cập nhật",
  "tinh": "An Giang"
}
```

**Response:**
```json
{
  "message": "Cập nhật cống thành công",
  "data": {
    "id": 1,
    "ten_cong": "Cống An Giang 1 - Đã cập nhật",
    ...
  },
  "cache": {
    "invalidated": true
  }
}
```

### 4. Xóa cống
```http
DELETE /api/cong/1
```

**Response:**
```json
{
  "message": "Xóa cống thành công",
  "deletedId": 1,
  "cache": {
    "invalidated": true
  }
}
```

### 5. Lấy cống theo ID
```http
GET /api/cong/1?fromSrid=9209&toSrid=4326
```

**Response:**
```json
{
  "message": "Lấy dữ liệu từ cache",
  "data": {
    "id": 1,
    "ten_cong": "Cống An Giang 1",
    ...
  },
  "cache": {
    "fromCache": true
  }
}
```

### 6. Tìm kiếm cống
```http
GET /api/cong/search?ten_cong=An Giang&ma_cong=AG&tinh=An Giang
```

**Query Parameters:**
- `ten_cong`: Tên cống (tìm kiếm mờ)
- `ma_cong`: Mã cống (tìm kiếm mờ)
- `tinh`: Tỉnh (tìm kiếm mờ)

**Response:**
```json
{
  "message": "Lấy dữ liệu từ cache",
  "data": [...],
  "total": 5,
  "cache": {
    "fromCache": true
  }
}
```

### 7. Xóa cache
```http
DELETE /api/cong/cache
```

**Response:**
```json
{
  "message": "Đã xóa cache cong thành công"
}
```

### 8. Lấy thông tin cache stats
```http
GET /api/cong/cache/stats
```

**Response:**
```json
{
  "message": "Lấy thông tin cache thành công",
  "stats": {
    "info": "...",
    "dbsize": 5
  }
}
```

## Cache Strategy

### TTL (Time To Live)
- **Base TTL**: 1800 giây (30 phút)
- **Jitter**: ±10% (ngẫu nhiên từ 1620-1980 giây)
- **Mục đích**: Tránh cache stampede khi nhiều keys hết hạn cùng lúc

### Cache Keys
- `cong_data_all`: Dữ liệu toàn bộ cống
- `cong_timestamp`: Timestamp của dữ liệu cache

### Cache Invalidation
Khi có thao tác **Write** (thêm/sửa/xóa):
1. Update database trước
2. Xóa cache để đảm bảo consistency
3. Lần đọc tiếp theo sẽ query database và rebuild cache

## Error Handling

### HTTP Status Codes
- `200`: Thành công
- `201`: Tạo mới thành công
- `400`: Bad Request (thiếu thông tin)
- `404`: Không tìm thấy cống
- `500`: Lỗi server

### Error Response Format
```json
{
  "message": "Lỗi server",
  "error": "Chi tiết lỗi"
}
```

## Performance Tips

1. **Sử dụng cache**: Mặc định API sẽ trả về dữ liệu từ cache nếu có
2. **Force refresh**: Sử dụng `forceRefresh=true` khi cần dữ liệu mới nhất
3. **Phân trang**: Sử dụng `page` và `pageSize` để giảm tải
4. **Tìm kiếm**: Sử dụng endpoint search thay vì filter trên client

## Monitoring

### Log Messages
- `🔍 Cache status`: Trạng thái cache
- `📦 Lấy dữ liệu từ cache`: Cache hit
- `🔄 Query từ database`: Cache miss
- `💾 Đã lưu dữ liệu vào cache`: Cache được update
- `🗑️ Đã xóa cache`: Cache được invalidate

### Cache Stats
Sử dụng endpoint `/api/cong/cache/stats` để monitor:
- Số lượng keys trong cache
- Thông tin Redis server
- Memory usage 