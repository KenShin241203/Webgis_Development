// ===== LAYER: CỐNG ===== //
let congLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.congLayerGroup = congLayerGroup;

function fetchAndShowCong(pageSize = 100, page = 1) {
    console.log('Bắt đầu fetch dữ liệu cống với pageSize:', pageSize);

    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token') || '';
        fetch(`/api/cong?page=${page}&pageSize=${pageSize}`, {
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
                console.log('API Response Cong:', json);
                congLayerGroup.clearLayers();
                if (!json.data) {
                    resolve();
                    return;
                }
                json.data.forEach((item, index) => {
                    if (item.geometry && item.geometry.type === 'Point') {
                        const lng = item.geometry.coordinates[0];
                        const lat = item.geometry.coordinates[1];

                        // Popup chi tiết thông tin cống
                        const popupContent = `
                            <b>ID:</b> ${item.id || ''}<br>
                            <b>Tên cống:</b> ${item.ten || ''}<br>
                            <b>Cấp:</b> ${item.cap || ''}<br>
                            <b>Năm xây dựng:</b> ${item.namxaydung || ''}<br>
                            <b>Tên xã:</b> ${item.tenxa || ''}<br>
                            <b>Số phai:</b> ${item.sophai || ''}<br>
                            <b>Bề khoảng:</b> ${item.bkhoang_c || ''} m<br>
                            <b>Tổng cửa:</b> ${item.tongcua_c || ''}<br>
                            <b>Mã cống:</b> ${item.codecong || ''}<br>
                            <b>Cao trình đáy:</b> ${item.ctrinh_day || ''}<br>
                            <b>Tên chung:</b> ${item.ten_chung || ''}<br>
                            <b>Tên riêng:</b> ${item.ten_rieng || ''}<br>
                            <b>Ghi chú:</b> ${item.ghichu || ''}
                        `;

                        const marker = L.marker([lat, lng], {
                            icon: L.icon({
                                iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                                iconSize: [24, 24],
                                iconAnchor: [12, 24],
                                popupAnchor: [0, -24]
                            })
                        }).bindPopup(popupContent);
                        congLayerGroup.addLayer(marker);
                    }
                });
                congLayerGroup.addTo(mymap);

                // Cập nhật bảng dữ liệu bằng function từ file table
                if (typeof window.updateCongTable === 'function') {
                    window.updateCongTable(json.data, json.pagination);
                }

                resolve();
            })
            .catch(err => {
                console.error('Lỗi API Cống:', err);
                try { alert('Không tải được dữ liệu cống: ' + (err.message || err)); } catch (_) { }
                reject(err);
            });
    });
}

// Export function ra window object
window.fetchAndShowCong = fetchAndShowCong;