// ===== LAYER: SỤT LÚN ===== //
let sutLunLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.sutLunLayerGroup = sutLunLayerGroup;

// Hàm để xác định màu sắc dựa trên vận tốc sụt lún
function getColorByVelocity(velAvg) {
    const velocity = parseFloat(velAvg);
    if (velocity < -10) return '#FF0000';      // Đỏ - Sụt lún nghiêm trọng
    if (velocity < -5) return '#FF6600';       // Cam - Sụt lún trung bình
    if (velocity < -2) return '#FFCC00';       // Vàng - Sụt lún nhẹ
    if (velocity < 2) return '#00CC00';        // Xanh lá - Ổn định
    if (velocity < 5) return '#0099FF';        // Xanh dương - Nâng lên nhẹ
    return '#9900CC';                          // Tím - Nâng lên nhiều
}

function formatDateSlash(dateStr) {
    if (!dateStr) return '';
    const clean = `${dateStr}`.trim();
    if (/^\d{8}$/.test(clean)) {
        return `${clean.slice(0, 4)}/${clean.slice(4, 6)}/${clean.slice(6, 8)}`;
    }
    return clean.replace(/-/g, '/');
}
window.formatDateSlash = formatDateSlash;

function fetchAndShowSutLun(pageSize = 100, page = 1) {
    console.log('Bắt đầu fetch dữ liệu sụt lún với pageSize:', pageSize);

    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token') || '';
        fetch(`/api/sutlun?page=${page}&pageSize=${pageSize}`, {
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
                console.log('Nhận được dữ liệu sụt lún:', json);
                sutLunLayerGroup.clearLayers();
                json.data.forEach((item) => {
                    if (item.geometry && item.geometry.type === 'Point') {
                        const lng = item.geometry.coordinates[0]; // longitude
                        const lat = item.geometry.coordinates[1]; // latitude

                        // Popup chi tiết thông tin sụt lún
                        const popupContent = `
                            <b>ID:</b> ${item.id}<br>
                            <b>Vận tốc TB:</b> ${item.vel_avg} mm/năm<br>
                            <b>Vận tốc SD:</b> ${item.vel_sd} mm/năm<br>
                            <b>Vận tốc tích lũy:</b> ${item.vel_cum} mm<br>
                            <b>Thời gian:</b> ${formatDateSlash(item.t_start)} - ${formatDateSlash(item.t_stop)}
                        `;

                        // Sử dụng circle marker thay vì marker để cải thiện performance
                        const circleMarker = L.circleMarker([lat, lng], {
                            radius: 6,
                            fillColor: getColorByVelocity(item.vel_avg),
                            color: '#333',
                            weight: 1,
                            opacity: 0.8,
                            fillOpacity: 0.7
                        }).bindPopup(popupContent);

                        sutLunLayerGroup.addLayer(circleMarker);
                    }
                });
                sutLunLayerGroup.addTo(mymap);
                // Cập nhật bảng dữ liệu bằng function từ file table
                if (typeof window.updateSutLunTable === 'function') {
                    window.updateSutLunTable(json.data, json.pagination);
                }
                resolve(); // Hoàn thành thành công
            })
            .catch(error => {
                console.error('Lỗi khi fetch dữ liệu sụt lún:', error);
                reject(error); // Hoàn thành với lỗi
            });
    });
}

// Export function ra window object
window.fetchAndShowSutLun = fetchAndShowSutLun;
