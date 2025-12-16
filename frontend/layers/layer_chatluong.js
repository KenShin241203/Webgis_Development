// ===== LAYER: CHẤT LƯỢNG ===== //
let chatLuongLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.chatLuongLayerGroup = chatLuongLayerGroup;

function fetchAndShowChatLuong(pageSize = 100, page = 1) {
    console.log('Bắt đầu fetch dữ liệu chất lượng với pageSize:', pageSize);

    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token') || '';
        fetch(`/api/chat-luong?page=${page}&pageSize=${pageSize}`, {
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
                console.log('API Response ChatLuong:', json);
                congLayerGroup.clearLayers();
                if (!json.data) {
                    resolve();
                    return;
                }

                console.log('Số lượng tuyến chất lượng:', json.data ? json.data.length : 0);

                chatLuongLayerGroup.clearLayers();
                let polylineCount = 0;

                json.data.forEach((item, index) => {
                    console.log(`Item ChatLuong ${index}:`, item);

                    if (item.geometry && item.geometry.type === 'LineString') {
                        // Tạo polyline với màu khác nhau theo loại
                        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
                        const color = colors[item.color % colors.length] || '#FF0000';

                        // Dùng trực tiếp toạ độ WGS84 từ API
                        const coordinates = item.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        const polyline = L.polyline(coordinates, {
                            color: color,
                            weight: 3,
                            opacity: 0.8
                        }).bindPopup(`
                            <div style="min-width: 200px;">
                                <h4 style="margin: 0 0 10px 0; color: #007bff;">${item.name || 'Không có tên'}</h4>
                                <table style="width: 100%; font-size: 12px;">
                                    <tr><td><strong>ID:</strong></td><td>${item.layer || '--'}</td></tr>
                                    <tr><td><strong>Entity:</strong></td><td>${item.kml_folder || '--'}</td></tr>
                                    <tr>
                                    <td><strong>Layer:</strong></td>
                                    <td>
                                       ( ${item.geometry.coordinates[0] || '--'}) <br>
                                        (${item.geometry.coordinates[1] || '--'})
                                    </td>
                                    </tr>
                                    <tr><td><strong>Color:</strong></td><td>${item.kind_id || '--'}</td></tr>
                                </table>
                            </div>
                        `);

                        chatLuongLayerGroup.addLayer(polyline);
                        polylineCount++;
                        console.log(`Đã tạo polyline ${index}: ${item.layer}`);
                    } else {
                        console.log(`Item ${index} không có geometry hoặc không phải LineString:`, item.geometry);
                    }
                });

                console.log(`Tổng số polyline đã tạo: ${polylineCount}`);
                chatLuongLayerGroup.addTo(mymap);
                console.log('Đã add chatLuongLayerGroup vào bản đồ');

                // Cập nhật bảng dữ liệu bằng function từ file table
                if (typeof window.updateChatLuongTable === 'function') {
                    window.updateChatLuongTable(json.data, json.pagination);
                }

                console.log('=== KẾT THÚC fetchAndShowChatLuong ===');
                resolve();
            })
            .catch(err => {
                console.error('Lỗi API Chất Lượng:', err);
                reject(err);
            });
    });
}

// Export function ra window object
window.fetchAndShowChatLuong = fetchAndShowChatLuong;