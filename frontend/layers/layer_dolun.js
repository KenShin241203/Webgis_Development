// ===== LAYER: ĐỘ LÚN ===== //
let doLunLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.doLunLayerGroup = doLunLayerGroup;

function fetchAndShowDoLun(pageSize = 100, page = 1) {
    console.log('Bắt đầu fetch dữ liệu độ lún với pageSize:', pageSize);

    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token') || '';
        fetch(`/api/dolun-velo?page=${page}&pageSize=${pageSize}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        })
            .then(async res => {
                if (res.status === 401) {
                    throw new Error('401 Unauthorized: thiếu hoặc hết hạn token');
                }
                return res.json();
            })
            .then(json => {
                console.log('API Response DoLun:', json);
                console.log('Số lượng polygon độ lún:', json.data ? json.data.length : 0);

                doLunLayerGroup.clearLayers();
                let polygonCount = 0;

                if (!json.data) {
                    resolve();
                    return;
                }

                json.data.forEach((item, index) => {
                    console.log(`Item DoLun ${index}:`, item);

                    if (item.geometry && item.geometry.type === 'Polygon') {
                        // Chuyển đổi [x, y] sang [lat, lng] nếu cần (ở đây giả sử là WGS84, nếu không cần đổi thứ tự)
                        const coordinates = item.geometry.coordinates.map(ring => ring.map(coord => [coord[1], coord[0]]));
                        const polygon = L.polygon(coordinates, {
                            color: '#FF6600',
                            weight: 2,
                            fillOpacity: 0.4
                        }).bindPopup(`
                            <div style="min-width: 200px;">
                                <h4 style="margin: 0 0 10px 0; color: #007bff;">${item.layer || 'Không có tên'}</h4>
                                <table style="width: 100%; font-size: 12px;">
                                    <tr><td><strong>ID:</strong></td><td>${item.id || '--'}</td></tr>
                                    <tr><td><strong>Grid Code:</strong></td><td>${item.gridcode || '--'}</td></tr>
                                    <tr><td><strong>Shape Area:</strong></td><td>${item.shape_area ? item.shape_area.toFixed(2) : '--'}</td></tr>
                                    <tr><td><strong>Layer:</strong></td><td>${item.layer || '--'}</td></tr>
                                </table>
                            </div>
                        `);

                        doLunLayerGroup.addLayer(polygon);
                        polygonCount++;
                        console.log(`Đã tạo polygon độ lún ${index}: ${item.layer}`);
                    } else {
                        console.log(`Item ${index} không có geometry hoặc không phải Polygon:`, item.geometry);
                    }
                });

                console.log(`Tổng số polygon độ lún đã tạo: ${polygonCount}`);
                doLunLayerGroup.addTo(mymap);
                console.log('Đã add doLunLayerGroup vào bản đồ');

                // Cập nhật bảng dữ liệu bằng function từ file table
                if (typeof window.updateDoLunTable === 'function') {
                    window.updateDoLunTable(json.data, json.pagination);
                }

                console.log('=== KẾT THÚC fetchAndShowDoLun ===');
                resolve();
            })
            .catch(err => {
                console.error('Lỗi API Độ Lún:', err);
                reject(err);
            });
    });
}

// Export function ra window object
window.fetchAndShowDoLun = fetchAndShowDoLun;
