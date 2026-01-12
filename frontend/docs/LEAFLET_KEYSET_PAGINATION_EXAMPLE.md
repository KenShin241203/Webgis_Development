# Leaflet - Keyset Pagination Example

## Ví dụ Load Dữ Liệu Theo Trang với Keyset Pagination

### 1. Load Tất Cả Dữ Liệu Theo Từng Trang

```javascript
/**
 * Load tất cả dữ liệu hydro theo từng trang sử dụng keyset pagination
 * @param {string} timestamp - Timestamp cần load
 * @param {number} pageSize - Số lượng bản ghi mỗi trang (mặc định 2000)
 */
async function loadAllHydroDataByPage(timestamp, pageSize = 2000) {
    const token = localStorage.getItem('access_token') || '';
    let allData = [];
    let cursor = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 50; // Giới hạn số trang

    while (hasMore && pageCount < maxPages) {
        // Xây dựng URL với cursor
        let url = `/api/hydro?pageSize=${pageSize}`;
        if (timestamp) {
            url += `&startTime=${timestamp}&endTime=${timestamp}`;
        }
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const json = await response.json();

            if (!json.data || json.data.length === 0) {
                hasMore = false;
                break;
            }

            // Thêm dữ liệu vào mảng
            allData = allData.concat(json.data);

            // Cập nhật cursor và hasMore
            cursor = json.pagination?.cursor || null;
            hasMore = json.pagination?.hasMore || false;
            pageCount++;

            console.log(`📄 Đã load trang ${pageCount}, tổng: ${allData.length} bản ghi`);

            // Nếu không còn dữ liệu, dừng lại
            if (!hasMore || !cursor) {
                break;
            }
        } catch (error) {
            console.error(`❌ Lỗi khi load trang ${pageCount + 1}:`, error);
            break;
        }
    }

    return allData;
}
```

### 2. Load và Render Theo Từng Trang (Lazy Loading)

```javascript
/**
 * Load và render dữ liệu theo từng trang (lazy loading)
 * Render ngay khi có dữ liệu, không đợi load hết
 * @param {string} timestamp - Timestamp cần load
 * @param {number} pageSize - Số lượng bản ghi mỗi trang
 * @param {Function} renderCallback - Callback để render mỗi batch
 */
async function loadAndRenderHydroDataLazy(timestamp, pageSize = 2000, renderCallback) {
    const token = localStorage.getItem('access_token') || '';
    let cursor = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 50;

    while (hasMore && pageCount < maxPages) {
        let url = `/api/hydro?pageSize=${pageSize}`;
        if (timestamp) {
            url += `&startTime=${timestamp}&endTime=${timestamp}`;
        }
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const json = await response.json();

            if (!json.data || json.data.length === 0) {
                hasMore = false;
                break;
            }

            // Render ngay batch này
            if (renderCallback && typeof renderCallback === 'function') {
                await renderCallback(json.data, pageCount + 1);
            }

            // Cập nhật cursor
            cursor = json.pagination?.cursor || null;
            hasMore = json.pagination?.hasMore || false;
            pageCount++;

            console.log(`📄 Đã render trang ${pageCount}, ${json.data.length} bản ghi`);

            if (!hasMore || !cursor) {
                break;
            }

            // Delay nhỏ để không block UI
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`❌ Lỗi khi load trang ${pageCount + 1}:`, error);
            break;
        }
    }
}

// Sử dụng:
loadAndRenderHydroDataLazy('2024-01-15T10:30:00Z', 2000, async (data, pageNumber) => {
    console.log(`Rendering page ${pageNumber} with ${data.length} items`);
    // Render data lên bản đồ
    data.forEach(item => {
        // ... render logic
    });
});
```

### 3. Load Với Progress Indicator

```javascript
/**
 * Load với progress indicator
 */
async function loadHydroDataWithProgress(timestamp, pageSize = 2000, onProgress) {
    const token = localStorage.getItem('access_token') || '';
    let allData = [];
    let cursor = null;
    let hasMore = true;
    let pageCount = 0;
    let total = null;
    const maxPages = 50;

    while (hasMore && pageCount < maxPages) {
        let url = `/api/hydro?pageSize=${pageSize}`;
        if (timestamp) {
            url += `&startTime=${timestamp}&endTime=${timestamp}`;
        }
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            const json = await response.json();

            if (!json.data || json.data.length === 0) {
                hasMore = false;
                break;
            }

            allData = allData.concat(json.data);

            // Lấy total từ trang đầu tiên
            if (pageCount === 0 && json.pagination?.total) {
                total = json.pagination.total;
            }

            cursor = json.pagination?.cursor || null;
            hasMore = json.pagination?.hasMore || false;
            pageCount++;

            // Gọi callback progress
            if (onProgress && typeof onProgress === 'function') {
                onProgress({
                    current: allData.length,
                    total: total,
                    page: pageCount,
                    percentage: total ? Math.round((allData.length / total) * 100) : null
                });
            }

            if (!hasMore || !cursor) {
                break;
            }
        } catch (error) {
            console.error(`❌ Lỗi:`, error);
            break;
        }
    }

    return allData;
}

// Sử dụng:
loadHydroDataWithProgress('2024-01-15T10:30:00Z', 2000, (progress) => {
    console.log(`Progress: ${progress.current}/${progress.total} (${progress.percentage}%)`);
    // Update progress bar
    document.getElementById('progressBar').style.width = `${progress.percentage}%`;
});
```

### 4. Response Format

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
    "pageSize": 2000,
    "cursor": "2024-01-15T10:30:00.000Z,12345",
    "hasMore": true,
    "total": 50000
  },
  "fromCache": false
}
```

### 5. Lưu Ý

1. **Cursor Format**: `"time,element_id"` - phải encode khi gửi request
2. **PageSize Limit**: Tối đa 10000 để tránh OOM
3. **Max Pages**: Nên giới hạn số trang để tránh vòng lặp vô hạn
4. **Error Handling**: Luôn xử lý lỗi khi fetch
5. **Progress**: Có thể hiển thị progress cho user khi load nhiều trang

