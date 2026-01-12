-- ============================================
-- SQL QUERIES MẪU CHO HYDRO DATA
-- Keyset Pagination để tránh OOM
-- ============================================

-- 1. Query với Keyset Pagination (Trang đầu tiên)
-- Không có cursor, lấy pageSize + 1 để kiểm tra hasMore
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
LIMIT 1001;  -- pageSize + 1

-- 2. Query với Keyset Pagination (Trang tiếp theo)
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

-- 3. Query với Filter theo Element ID
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

-- 4. Query Distinct Times (cho Time Slider)
SELECT DISTINCT time
FROM hydro_data
ORDER BY time ASC;

-- 5. Tạo Indexes để tối ưu hiệu năng
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

-- 6. So sánh: Offset vs Keyset Pagination

-- ❌ Offset Pagination (Cũ - Gây OOM với offset lớn)
-- Vấn đề: Offset lớn sẽ chậm và tốn memory
SELECT * FROM hydro_data 
ORDER BY time DESC 
OFFSET 100000 LIMIT 1000;

-- ✅ Keyset Pagination (Mới - Tối ưu)
-- Ưu điểm: Luôn nhanh, không phụ thuộc vào offset
SELECT * FROM hydro_data 
WHERE (time < '2024-01-15T10:30:00Z'::timestamp 
       OR (time = '2024-01-15T10:30:00Z'::timestamp AND element_id > 12345))
ORDER BY time DESC, element_id ASC 
LIMIT 1000;

