// ===== LAYER: HIỆN TRẠNG ===== //

let hienTrangLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.hienTrangLayerGroup = hienTrangLayerGroup;

function fetchAndShowHienTrang(pageSize = 100, page = 1) {
    console.log('Bắt đầu fetch dữ liệu hiện trạng với pageSize:', pageSize);

    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token') || '';
        fetch(`/api/hientrang?page=${page}&pageSize=${pageSize}`, {
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
                console.log('API Response HienTrang:', json);
                console.log('Số lượng polyline hiện trạng:', json.data ? json.data.length : 0);

                hienTrangLayerGroup.clearLayers();
                let polylineCount = 0;

                if (!json.data) {
                    resolve();
                    return;
                }

                const colorMap = {}; // Gán màu theo nhóm
                let colorIndex = 0;
                const colorList = ['#FF0000', '#00AAFF', '#00CC00', '#FF9900', '#9900CC'];

                json.data.forEach((item, index) => {
                    console.log(`Item HienTrang ${index}:`, item);

                    if (item.geometry && item.geometry.type === 'LineString') {
                        const tuyen = item.tuyen || 'unknown';
                        const layer = item.layer || 'unknown';
                        const key = `${tuyen}__${layer}`;

                        // Gán màu cho từng nhóm
                        if (!colorMap[key]) {
                            colorMap[key] = colorList[colorIndex % colorList.length];
                            colorIndex++;
                        }

                        const latlngs = item.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        const polyline = L.polyline(latlngs, {
                            color: colorMap[key],
                            weight: 3
                        }).bindPopup(`
                            <div style="min-width: 200px;">
                                <h4 style="margin: 0 0 10px 0; color: #007bff;">${tuyen}</h4>
                                <table style="width: 100%; font-size: 12px;">
                                    <tr><td><strong>ID:</strong></td><td>${item.id || '--'}</td></tr>
                                    <tr><td><strong>Tuyến:</strong></td><td>${tuyen}</td></tr>
                                    <tr><td><strong>Layer:</strong></td><td>${layer}</td></tr>
                                    <tr><td><strong>Geometry Type:</strong></td><td>${item.geometry.type}</td></tr>
                                    <tr><td><strong>Số điểm:</strong></td><td>${item.geometry.coordinates.length}</td></tr>
                                </table>
                            </div>
                        `);

                        hienTrangLayerGroup.addLayer(polyline);
                        polylineCount++;
                        console.log(`Đã tạo polyline hiện trạng ${index}: ${tuyen} - ${layer}`);
                    } else {
                        console.log(`Item ${index} không có geometry hoặc không phải LineString:`, item.geometry);
                    }
                });

                console.log(`Tổng số polyline hiện trạng đã tạo: ${polylineCount}`);
                hienTrangLayerGroup.addTo(mymap);
                console.log('Đã add hienTrangLayerGroup vào bản đồ');

                // Cập nhật bảng dữ liệu bằng function từ file table
                if (typeof window.updateHienTrangTable === 'function') {
                    window.updateHienTrangTable(json.data, json.pagination);
                }

                console.log('=== KẾT THÚC fetchAndShowHienTrang ===');
                resolve();
            })
            .catch(err => {
                console.error('Lỗi API Hiện Trạng:', err);
                reject(err);
            });
    });
}

// Export function ra window object
window.fetchAndShowHienTrang = fetchAndShowHienTrang;
