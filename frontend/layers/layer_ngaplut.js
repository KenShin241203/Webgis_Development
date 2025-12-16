// ===== LAYER: NGẬP LỤT ===== //
let ngaplutLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.ngaplutLayerGroup = ngaplutLayerGroup;

function fetchAndShowNgaplut(pageSize = 100) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token') || '';
        fetch(`/api/ngaplut?page=1&pageSize=${pageSize}`, {
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
                ngaplutLayerGroup.clearLayers();
                if (!json.data) {
                    resolve();
                    return;
                }
                json.data.forEach((item, index) => {
                    if (item.geometry && item.geometry.type === 'MultiPolygon') {
                        // MultiPolygon có cấu trúc [[[coordinates]]] - mỗi phần tử trong mảng là một polygon
                        item.geometry.coordinates.forEach((polygonCoords) => {
                            // polygonCoords là [[coordinates]] - lấy phần tử đầu tiên để có [coordinates]
                            const coordinates = polygonCoords[0];
                            // Chuyển đổi tọa độ từ [lng, lat] sang [lat, lng] cho Leaflet
                            const convertedCoords = coordinates.map(coord => [coord[1], coord[0]]);

                            const polygon = L.polygon(convertedCoords, {
                                color: '#0066cc',
                                weight: 2,
                                fillColor: '#0066cc',
                                fillOpacity: 0.3
                            });

                            // Popup chi tiết thông tin ngập lụt
                            const popupContent = `
                                <b>ID:</b> ${item.id || ''}<br>
                                <b>Giá trị trung bình:</b> ${item.mean_value || ''}<br>
                                <b>Chiều dài:</b> ${item.shape_length ? item.shape_length.toFixed(2) : ''} m<br>
                                <b>Diện tích:</b> ${item.shape_area ? item.shape_area.toFixed(2) : ''} m²<br>
                                <b>Lớp:</b> ${item.layer || ''}
                            `;

                            polygon.bindPopup(popupContent);
                            ngaplutLayerGroup.addLayer(polygon);
                        });
                    }
                });

                ngaplutLayerGroup.addTo(mymap);

                // Cập nhật bảng dữ liệu bằng function từ file table
                if (typeof window.updateNgaplutTable === 'function') {
                    window.updateNgaplutTable(json.data);
                }

                resolve();
            })
            .catch(err => {
                console.error('Lỗi API Ngập Lụt:', err);
                reject(err);
            });
    });
}

// Export function ra window object
window.fetchAndShowNgaplut = fetchAndShowNgaplut;
