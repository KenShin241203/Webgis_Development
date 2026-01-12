# Hydro Data - Keyset Pagination

## Tổng quan

API Hydro Data đã được refactor để sử dụng **Keyset Pagination** (cursor-based) thay vì offset pagination, giúp:
- ✅ Tránh OOM (Out of Memory) khi query dữ liệu lớn
- ✅ Không load toàn bộ dữ liệu vào memory
- ✅ Không build GeoJSON không cần thiết
- ✅ Hiệu năng tốt hơn với dữ liệu lớn

## SQL Query Mẫu

### 1. Query với Keyset Pagination (Cursor-based)

```sql
-- Trang đầu tiên (không có cursor)
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
WHERE h.time >= '2024-01-01'::timestamp
  AND h.time <= '2024-01-31'::timestamp
ORDER BY h.time DESC, h.element_id ASC
LIMIT 1001;  -- Lấy thêm 1 để kiểm tra hasMore

-- Trang tiếp theo (có cursor)
-- Cursor format: "2024-01-15T10:30:00Z,12345" (time,element_id)
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
WHERE h.time >= '2024-01-01'::timestamp
  AND h.time <= '2024-01-31'::timestamp
  AND (h.time < '2024-01-15T10:30:00Z'::timestamp 
       OR (h.time = '2024-01-15T10:30:00Z'::timestamp AND h.element_id > 12345))
ORDER BY h.time DESC, h.element_id ASC
LIMIT 1001;
```

### 2. Query với Filter theo Element ID

```sql
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
WHERE h.element_id = 12345
  AND h.time >= '2024-01-01'::timestamp
ORDER BY h.time DESC
LIMIT 101;  -- pageSize + 1
```

### 3. Query Distinct Times (cho Time Slider)

```sql
SELECT DISTINCT time
FROM hydro_data
ORDER BY time ASC;
```

## API Endpoints

### GET /api/hydro

**Query Parameters:**
- `pageSize` (number, optional): Số lượng bản ghi mỗi trang (mặc định: 1000, tối đa: 10000)
- `cursor` (string, optional): Cursor để tiếp tục pagination (format: "time,element_id")
- `element_id` (number, optional): Filter theo element_id
- `startTime` (string, optional): Filter theo thời gian bắt đầu (ISO string)
- `endTime` (string, optional): Filter theo thời gian kết thúc (ISO string)

**Response:**
```json
{
  "message": "Lấy dữ liệu hydro_data thành công",
  "data": [
    {
      "id": 1,
      "element_id": 12345,
      "time": "2024-01-15T10:30:00.000Z",
      "surface_elev": 5.2,
      "total_depth": 3.1,
      "u": 0.5,
      "v": 0.3,
      "direction": 45.0
    }
  ],
  "pagination": {
    "pageSize": 1000,
    "cursor": "2024-01-15T10:30:00.000Z,12345",
    "hasMore": true,
    "total": 50000
  },
  "fromCache": false
}
```

**Ví dụ Request:**
```bash
# Trang đầu tiên
GET /api/hydro?pageSize=1000&startTime=2024-01-01&endTime=2024-01-31

# Trang tiếp theo
GET /api/hydro?pageSize=1000&cursor=2024-01-15T10:30:00.000Z,12345&startTime=2024-01-01&endTime=2024-01-31
```

## Indexes Đề Xuất

Để tối ưu hiệu năng, nên tạo các indexes sau:

```sql
-- Index cho keyset pagination (time, element_id)
CREATE INDEX IF NOT EXISTS idx_hydro_data_time_element_id 
ON hydro_data(time DESC, element_id ASC);

-- Index cho filter theo element_id
CREATE INDEX IF NOT EXISTS idx_hydro_data_element_id 
ON hydro_data(element_id);

-- Index cho filter theo time
CREATE INDEX IF NOT EXISTS idx_hydro_data_time 
ON hydro_data(time);

-- Composite index cho filter time + element_id
CREATE INDEX IF NOT EXISTS idx_hydro_data_time_element_id_filter 
ON hydro_data(time, element_id) 
WHERE time IS NOT NULL;
```

## So Sánh: Offset vs Keyset Pagination

### Offset Pagination (Cũ - Gây OOM)
```sql
-- Vấn đề: Offset lớn sẽ chậm và tốn memory
SELECT * FROM hydro_data 
ORDER BY time DESC 
OFFSET 100000 LIMIT 1000;
```

### Keyset Pagination (Mới - Tối ưu)
```sql
-- Ưu điểm: Luôn nhanh, không phụ thuộc vào offset
SELECT * FROM hydro_data 
WHERE (time < '2024-01-15T10:30:00Z' OR (time = '2024-01-15T10:30:00Z' AND element_id > 12345))
ORDER BY time DESC, element_id ASC 
LIMIT 1000;
```

## Lưu Ý

1. **Cursor Format**: `"time,element_id"` - phải đúng format để pagination hoạt động
2. **PageSize Limit**: Tối đa 10000 để tránh OOM
3. **Total Count**: Chỉ được tính ở trang đầu tiên (khi không có cursor) để tối ưu
4. **Order By**: Phải giữ nguyên `ORDER BY time DESC, element_id ASC` để keyset pagination hoạt động đúng

