// ===== LAYER: ELEMENTS + HYDRO (LƯỚI THỦY ĐỘNG LỰC + DỮ LIỆU THỦY ĐỘNG LỰC) ===== //
// Gộp 2 layer thành 1 vì chúng phải đi chung với nhau

let elementsHydroLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.elementsHydroLayerGroup = elementsHydroLayerGroup;

// Cache để lưu tọa độ elements (element_id -> {lat, lng})
let elementsCoordinatesCache = {};

// Hàm lấy tọa độ từ elements (cache để tránh fetch nhiều lần)
async function getElementsCoordinatesForHydro() {
    // Nếu đã có cache, return ngay
    if (Object.keys(elementsCoordinatesCache).length > 0) {
        console.log('📦 Sử dụng cache tọa độ elements');
        return elementsCoordinatesCache;
    }

    // Thử lấy từ elements layer nếu đã được load
    if (window.elementsLayerGroup && window.elementsLayerGroup.getLayers().length > 0) {
        console.log('📦 Lấy tọa độ từ elements layer đã load');
        window.elementsLayerGroup.eachLayer(function (layer) {
            if (layer.getLatLng) {
                const latlng = layer.getLatLng();
                const popup = layer.getPopup();
                if (popup && popup.getContent) {
                    const content = popup.getContent();
                    const match = content.match(/Element #(\d+)/);
                    if (match) {
                        const elementId = parseInt(match[1]);
                        elementsCoordinatesCache[elementId] = { lat: latlng.lat, lng: latlng.lng };
                    }
                }
            }
        });

        if (Object.keys(elementsCoordinatesCache).length > 0) {
            return elementsCoordinatesCache;
        }
    }

    // Nếu chưa có, fetch từ API
    try {
        console.log('🔄 Fetch tọa độ elements từ API...');
        const token = localStorage.getItem('access_token') || '';
        const res = await fetch(`/api/elements?page=1&pageSize=5000`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        if (res.ok) {
            const json = await res.json();
            if (json.data) {
                json.data.forEach(item => {
                    if (item.geometry && item.geometry.type === 'Point') {
                        const lng = item.geometry.coordinates[0];
                        const lat = item.geometry.coordinates[1];
                        elementsCoordinatesCache[item.element_id] = { lat, lng };
                    }
                });
                console.log(`✅ Đã cache ${Object.keys(elementsCoordinatesCache).length} tọa độ elements`);
            }
        }
    } catch (err) {
        console.error('Lỗi khi lấy tọa độ elements:', err);
    }
    return elementsCoordinatesCache;
}

// Tính tốc độ từ u và v
function calculateSpeed(u, v) {
    if (u == null || v == null) return 0;
    return Math.sqrt(u * u + v * v);
}

// Tính hướng từ u và v
function calculateDirection(u, v) {
    if (u == null || v == null) return null;
    let angle = Math.atan2(v, u) * 180 / Math.PI;
    angle = (90 - angle + 360) % 360;
    return angle;
}

// Tạo arrow marker để hiển thị hướng dòng chảy
function createArrowMarker(lat, lng, direction, speed) {
    const angle = direction != null ? direction : 0;

    let color = '#0066cc';
    if (speed > 1.0) {
        color = '#ff0000';
    } else if (speed > 0.5) {
        color = '#ff8800';
    } else if (speed > 0.2) {
        color = '#ffaa00';
    } else {
        color = '#00ccff';
    }

    const arrowIcon = L.divIcon({
        className: 'hydro-arrow-icon',
        html: `
            <div style="
                transform: rotate(${angle}deg);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 20px solid ${color};
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: 20px;
                    left: -3px;
                    width: 6px;
                    height: 8px;
                    background: ${color};
                "></div>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    return L.marker([lat, lng], { icon: arrowIcon });
}

// Function chính: Fetch và hiển thị cả Elements và Hydro
function fetchAndShowElementsAndHydro(elementsPageSize = 500, hydroPageSize = 50, page = 1, selectedTime = null) {
    console.log('Bắt đầu fetch dữ liệu Elements + Hydro với pageSize:', { elementsPageSize, hydroPageSize });

    return new Promise(async (resolve, reject) => {
        try {
            // Clear layer group
            elementsHydroLayerGroup.clearLayers();

            // Hiển thị loading indicator
            if (typeof window.showLoadingIndicator === 'function') {
                window.showLoadingIndicator('Đang tải dữ liệu Elements và Hydro...');
            }

            const token = localStorage.getItem('access_token') || '';

            // 1. Fetch Elements trước
            console.log('📍 Bước 1: Fetch Elements...');
            const elementsRes = await fetch(`/api/elements?page=${page}&pageSize=${elementsPageSize}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (elementsRes.status === 401) {
                throw new Error('401 Unauthorized: thiếu hoặc hết hạn token');
            }

            const elementsJson = await elementsRes.json();
            console.log('API Response Elements:', elementsJson);

            if (!elementsJson.data || elementsJson.data.length === 0) {
                console.warn('⚠️ Không có dữ liệu elements');
                if (typeof window.hideLoadingIndicator === 'function') {
                    window.hideLoadingIndicator();
                }
                resolve();
                return;
            }

            // Render Elements markers
            console.log(`📍 Bước 2: Render ${elementsJson.data.length} Elements markers...`);
            elementsJson.data.forEach((item) => {
                if (item.geometry && item.geometry.type === 'Point') {
                    const lng = item.geometry.coordinates[0];
                    const lat = item.geometry.coordinates[1];

                    // Cache tọa độ cho hydro
                    elementsCoordinatesCache[item.element_id] = { lat, lng };

                    const popupContent = `
                        <div style="min-width: 200px;">
                            <h4 style="margin: 0 0 8px 0; color: #007bff;">Element #${item.element_id}</h4>
                            <table style="width: 100%; font-size: 12px;">
                                <tr><td><strong>ID:</strong></td><td>${item.element_id}</td></tr>
                                <tr><td><strong>X:</strong></td><td>${item.x}</td></tr>
                                <tr><td><strong>Y:</strong></td><td>${item.y}</td></tr>
                                <tr><td><strong>Area:</strong></td><td>${item.area ?? '--'}</td></tr>
                            </table>
                        </div>
                    `;

                    const marker = L.circleMarker([lat, lng], {
                        radius: 4,
                        fillColor: '#007bff',
                        color: '#ffffff',
                        weight: 1,
                        opacity: 0.9,
                        fillOpacity: 0.8
                    }).bindPopup(popupContent);

                    elementsHydroLayerGroup.addLayer(marker);
                }
            });

            console.log(`✅ Đã render ${elementsJson.data.length} Elements markers`);

            // 2. Fetch Hydro
            console.log('🌊 Bước 3: Fetch Hydro...');
            let hydroUrl = `/api/hydro?page=${page}&pageSize=${hydroPageSize}`;
            if (selectedTime) {
                hydroUrl += `&startTime=${selectedTime}&endTime=${selectedTime}`;
            }

            const hydroRes = await fetch(hydroUrl, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (hydroRes.status === 401) {
                throw new Error('401 Unauthorized: thiếu hoặc hết hạn token');
            }

            const hydroJson = await hydroRes.json();
            console.log('API Response Hydro:', hydroJson);

            if (hydroJson.data && hydroJson.data.length > 0) {
                console.log(`🌊 Bước 4: Render ${hydroJson.data.length} Hydro markers...`);
                let displayedCount = 0;
                let skippedCount = 0;

                // Batch render để tránh block UI
                const batchSize = 100;
                let currentIndex = 0;

                function renderHydroBatch() {
                    const endIndex = Math.min(currentIndex + batchSize, hydroJson.data.length);

                    for (let i = currentIndex; i < endIndex; i++) {
                        const item = hydroJson.data[i];
                        const coords = elementsCoordinatesCache[item.element_id];

                        if (!coords) {
                            skippedCount++;
                            continue;
                        }

                        const { lat, lng } = coords;
                        const speed = calculateSpeed(item.u, item.v);
                        const direction = item.direction != null ? item.direction : calculateDirection(item.u, item.v);

                        const marker = createArrowMarker(lat, lng, direction, speed);

                        const popupContent = `
                            <div style="min-width: 250px;">
                                <h4 style="margin: 0 0 8px 0; color: #007bff;">Hydro Data #${item.id}</h4>
                                <table style="width: 100%; font-size: 12px;">
                                    <tr><td><strong>Element ID:</strong></td><td>${item.element_id || ''}</td></tr>
                                    <tr><td><strong>Thời gian:</strong></td><td>${item.time ? new Date(item.time).toLocaleString('vi-VN') : ''}</td></tr>
                                    <tr><td><strong>Độ cao mặt nước:</strong></td><td>${item.surface_elev != null ? item.surface_elev.toFixed(2) + ' m' : '--'}</td></tr>
                                    <tr><td><strong>Độ sâu tổng:</strong></td><td>${item.total_depth != null ? item.total_depth.toFixed(2) + ' m' : '--'}</td></tr>
                                    <tr><td><strong>Vận tốc U:</strong></td><td>${item.u != null ? item.u.toFixed(3) + ' m/s' : '--'}</td></tr>
                                    <tr><td><strong>Vận tốc V:</strong></td><td>${item.v != null ? item.v.toFixed(3) + ' m/s' : '--'}</td></tr>
                                    <tr><td><strong>Tốc độ:</strong></td><td>${speed.toFixed(3)} m/s</td></tr>
                                    <tr><td><strong>Hướng:</strong></td><td>${direction != null ? direction.toFixed(1) + '°' : '--'}</td></tr>
                                </table>
                            </div>
                        `;

                        marker.bindPopup(popupContent);
                        elementsHydroLayerGroup.addLayer(marker);
                        displayedCount++;
                    }

                    currentIndex = endIndex;

                    if (currentIndex < hydroJson.data.length) {
                        requestAnimationFrame(renderHydroBatch);
                    } else {
                        console.log(`✅ Đã hiển thị ${displayedCount} điểm hydro trên bản đồ`);
                        if (skippedCount > 0) {
                            console.log(`⚠️ Bỏ qua ${skippedCount} điểm do thiếu tọa độ elements`);
                        }

                        // Add layer to map
                        elementsHydroLayerGroup.addTo(mymap);

                        // Cập nhật bảng dữ liệu
                        if (typeof window.updateElementsTable === 'function') {
                            window.updateElementsTable(elementsJson.data, elementsJson.pagination);
                        }
                        if (typeof window.updateHydroTable === 'function') {
                            window.updateHydroTable(hydroJson.data, hydroJson.pagination);
                        }

                        // Ẩn loading indicator
                        if (typeof window.hideLoadingIndicator === 'function') {
                            window.hideLoadingIndicator();
                        }

                        resolve();
                    }
                }

                renderHydroBatch();
            } else {
                // Không có hydro data, chỉ hiển thị elements
                console.log('⚠️ Không có dữ liệu hydro');
                elementsHydroLayerGroup.addTo(mymap);

                if (typeof window.updateElementsTable === 'function') {
                    window.updateElementsTable(elementsJson.data, elementsJson.pagination);
                }

                if (typeof window.hideLoadingIndicator === 'function') {
                    window.hideLoadingIndicator();
                }

                resolve();
            }
        } catch (err) {
            console.error('Lỗi khi fetch Elements + Hydro:', err);
            if (typeof window.hideLoadingIndicator === 'function') {
                window.hideLoadingIndicator();
            }
            try {
                alert('Không tải được dữ liệu: ' + (err.message || err));
            } catch (_) { }
            reject(err);
        }
    });
}

// Export function ra window object
window.fetchAndShowElementsAndHydro = fetchAndShowElementsAndHydro;

