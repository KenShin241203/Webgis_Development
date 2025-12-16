// ===== LAYER: ĐÊ BÀO ===== //
let deBaoLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.deBaoLayerGroup = deBaoLayerGroup;

function fetchAndShowDeBao(pageSize = 100, page = 1) {
    console.log('Bắt đầu fetch dữ liệu đê bao với pageSize:', pageSize);

    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token') || '';
        fetch(`/api/debao?page=${page}&pageSize=${pageSize}`, {
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
                console.log('API Response DeBao:', json);
                console.log('Số lượng tuyến đê bào:', json.data ? json.data.length : 0);

                deBaoLayerGroup.clearLayers();
                let polylineCount = 0;

                json.data.forEach((item, index) => {
                    console.log(`Item DeBao ${index}:`, item);

                    if (item.geometry && item.geometry.type === 'LineString') {
                        // Tạo polyline với màu khác nhau theo loại
                        const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#B8860B'];
                        const color = colors[item.color % colors.length] || '#8B4513';

                        // Dùng trực tiếp toạ độ WGS84 từ API
                        const coordinates = item.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        const polyline = L.polyline(coordinates, {
                            color: color,
                            weight: 4,
                            opacity: 0.9
                        }).bindPopup(`
                            <div style="min-width: 200px;">
                                <h4 style="margin: 0 0 10px 0; color: #007bff;">${item.layer || 'Không có tên'}</h4>
                                <table style="width: 100%; font-size: 12px;">
                                    <tr><td><strong>ID:</strong></td><td>${item.f_id || '--'}</td></tr>
                                    <tr><td><strong>Entity:</strong></td><td>${item.entity || '--'}</td></tr>
                                    <tr><td><strong>LineType:</strong></td><td>${item.linetype || '--'}</td></tr>
                                    <tr><td><strong>Elevation:</strong></td><td>${item.elevation || '--'}</td></tr>
                                    <tr><td><strong>Line_WT:</strong></td><td>${item.line_wt || '--'}</td></tr>
                                    <tr><td><strong>Kind_ID:</strong></td><td>${item.kind_id || '--'}</td></tr>
                                </table>
                            </div>
                        `);

                        deBaoLayerGroup.addLayer(polyline);
                        polylineCount++;
                        console.log(`Đã tạo polyline đê bào ${index}: ${item.layer}`);
                    } else {
                        console.log(`Item ${index} không có geometry hoặc không phải LineString:`, item.geometry);
                    }
                });

                console.log(`Tổng số polyline đê bào đã tạo: ${polylineCount}`);
                deBaoLayerGroup.addTo(mymap);
                console.log('Đã add deBaoLayerGroup vào bản đồ');

                // Cập nhật bảng dữ liệu bằng function từ file table
                if (typeof window.updateDeBaoTable === 'function') {
                    window.updateDeBaoTable(json.data, json.pagination);
                }

                console.log('=== KẾT THÚC fetchAndShowDeBao ===');
                resolve();
            })
            .catch(err => {
                console.error('Lỗi API Đê Bào:', err);
                reject(err);
            });
    });
}

// Export function ra window object
window.fetchAndShowDeBao = fetchAndShowDeBao;
