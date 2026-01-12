// ===== LAYER: MÔ HÌNH THỦY LỰC 2D ===== //
// Layer hiển thị mô hình thủy lực 2D với khả năng thay đổi theo thời gian

let moHinhThuyLuc2DLayerGroup = L.layerGroup();

// Export ra window object để main.js có thể truy cập
window.moHinhThuyLuc2DLayerGroup = moHinhThuyLuc2DLayerGroup;

// Cache để lưu tọa độ elements (element_id -> {lat, lng})
let elementsCoordinatesCache2D = {};

// Biến lưu trữ thời gian hiện tại được chọn
let currentSelectedTime = null;

// Biến lưu trữ dữ liệu thời gian có sẵn
let availableTimes = [];

// ===== HÀM TIỆN ÍCH ===== //

/**
 * Tính tốc độ dòng chảy từ vận tốc u và v
 * @param {number} u - Vận tốc theo trục x
 * @param {number} v - Vận tốc theo trục y
 * @returns {number} Tốc độ (m/s)
 */
function calculateSpeed2D(u, v) {
    if (u == null || v == null) return 0;
    return Math.sqrt(u * u + v * v);
}

/**
 * Tính hướng dòng chảy từ vận tốc u và v
 * @param {number} u - Vận tốc theo trục x
 * @param {number} v - Vận tốc theo trục y
 * @returns {number} Hướng (độ, 0-360)
 */
function calculateDirection2D(u, v) {
    if (u == null || v == null) return null;
    let angle = Math.atan2(v, u) * 180 / Math.PI;
    angle = (90 - angle + 360) % 360;
    return angle;
}

/**
 * Lấy màu sắc dựa trên độ sâu nước (total_depth)
 * @param {number} totalDepth - Độ sâu tổng (m)
 * @returns {string} Màu hex
 */
function getColorByDepth(totalDepth) {
    if (totalDepth == null || totalDepth <= 0) {
        return '#e0e0e0'; // Màu xám cho vùng không có nước
    }

    // Phân loại màu theo độ sâu
    if (totalDepth >= 5.0) {
        return '#000080'; // Xanh đậm - rất sâu
    } else if (totalDepth >= 3.0) {
        return '#0000ff'; // Xanh dương - sâu
    } else if (totalDepth >= 2.0) {
        return '#0066ff'; // Xanh nhạt - trung bình
    } else if (totalDepth >= 1.0) {
        return '#00ccff'; // Xanh cyan - nông
    } else if (totalDepth >= 0.5) {
        return '#66ffff'; // Xanh nhạt - rất nông
    } else {
        return '#ccffff'; // Xanh rất nhạt - cực nông
    }
}

/**
 * Lấy màu sắc cho mũi tên dựa trên tốc độ dòng chảy
 * @param {number} speed - Tốc độ (m/s)
 * @returns {string} Màu hex
 */
function getColorBySpeed(speed) {
    if (speed >= 2.0) {
        return '#ff0000'; // Đỏ - rất nhanh
    } else if (speed >= 1.0) {
        return '#ff6600'; // Cam đậm - nhanh
    } else if (speed >= 0.5) {
        return '#ffaa00'; // Cam nhạt - trung bình
    } else if (speed >= 0.2) {
        return '#ffcc00'; // Vàng - chậm
    } else {
        return '#0066cc'; // Xanh - rất chậm
    }
}

/**
 * Tạo marker hình tròn với màu theo độ sâu
 * @param {number} lat - Vĩ độ
 * @param {number} lng - Kinh độ
 * @param {number} totalDepth - Độ sâu tổng
 * @param {number} radius - Bán kính marker (mặc định 5)
 * @returns {L.CircleMarker} Leaflet marker
 */
function createDepthMarker(lat, lng, totalDepth, radius = 5) {
    const color = getColorByDepth(totalDepth);

    return L.circleMarker([lat, lng], {
        radius: radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.7
    });
}

/**
 * Tạo mũi tên vector để hiển thị hướng và vận tốc dòng chảy
 * @param {number} lat - Vĩ độ điểm bắt đầu
 * @param {number} lng - Kinh độ điểm bắt đầu
 * @param {number} direction - Hướng dòng chảy (độ)
 * @param {number} speed - Tốc độ dòng chảy (m/s)
 * @param {number} scale - Tỷ lệ độ dài mũi tên (mặc định 50)
 * @returns {L.Polyline} Leaflet polyline với mũi tên
 */
function createVectorArrow(lat, lng, direction, speed, scale = 50) {
    if (direction == null || speed == null || speed <= 0) {
        return null;
    }

    // Chuyển đổi hướng từ độ sang radian
    const angleRad = (direction - 90) * Math.PI / 180; // Trừ 90 vì 0 độ là hướng Bắc

    // Tính độ dài mũi tên dựa trên tốc độ (tối đa 100m, tối thiểu 10m)
    const arrowLength = Math.max(10, Math.min(100, speed * scale));

    // Tính tọa độ điểm cuối của mũi tên
    const latEnd = lat + (arrowLength / 111320) * Math.cos(angleRad);
    const lngEnd = lng + (arrowLength / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angleRad);

    // Tạo mũi tên với độ dài cánh
    const arrowHeadLength = arrowLength * 0.2;
    const arrowHeadAngle = Math.PI / 6; // 30 độ

    // Tính tọa độ 2 điểm của đầu mũi tên
    const angle1 = angleRad + Math.PI - arrowHeadAngle;
    const angle2 = angleRad + Math.PI + arrowHeadAngle;

    const latHead1 = latEnd + (arrowHeadLength / 111320) * Math.cos(angle1);
    const lngHead1 = lngEnd + (arrowHeadLength / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle1);

    const latHead2 = latEnd + (arrowHeadLength / 111320) * Math.cos(angle2);
    const lngHead2 = lngEnd + (arrowHeadLength / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle2);

    const color = getColorBySpeed(speed);

    // Tạo đường thẳng chính
    const arrowLine = L.polyline(
        [[lat, lng], [latEnd, lngEnd]],
        {
            color: color,
            weight: 2,
            opacity: 0.8
        }
    );

    // Tạo đầu mũi tên (tam giác)
    const arrowHead = L.polygon(
        [[latEnd, lngEnd], [latHead1, lngHead1], [latHead2, lngHead2]],
        {
            fillColor: color,
            fillOpacity: 0.8,
            color: color,
            weight: 1
        }
    );

    // Tạo feature group để gộp đường thẳng và đầu mũi tên
    const arrowGroup = L.featureGroup([arrowLine, arrowHead]);

    return arrowGroup;
}

/**
 * Lấy tọa độ elements từ API hoặc cache
 * @returns {Promise<Object>} Object chứa tọa độ (element_id -> {lat, lng})
 */
async function getElementsCoordinates2D() {
    // Nếu đã có cache, return ngay
    if (Object.keys(elementsCoordinatesCache2D).length > 0) {
        console.log('📦 Sử dụng cache tọa độ elements (2D)');
        return elementsCoordinatesCache2D;
    }

    // Fetch từ API
    try {
        console.log('🔄 Fetch tọa độ elements từ API (2D)...');
        const token = localStorage.getItem('access_token') || '';
        const res = await fetch(`/api/elements?page=1&pageSize=10000`, {
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
                        elementsCoordinatesCache2D[item.element_id] = { lat, lng };
                    }
                });
                console.log(`✅ Đã cache ${Object.keys(elementsCoordinatesCache2D).length} tọa độ elements (2D)`);
            }
        }
    } catch (err) {
        console.error('Lỗi khi lấy tọa độ elements (2D):', err);
    }

    return elementsCoordinatesCache2D;
}

/**
 * Lấy danh sách các thời gian có sẵn từ API
 * @returns {Promise<Array>} Mảng các timestamp
 */
async function getAvailableTimes() {
    try {
        const token = localStorage.getItem('access_token') || '';
        const res = await fetch(`/api/hydro/times`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (res.status === 401) {
            throw new Error('401 Unauthorized: thiếu hoặc hết hạn token');
        }

        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = `Lỗi ${res.status} ${res.statusText} khi lấy danh sách thời gian`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error || errorJson.message) {
                    errorMessage += `: ${errorJson.error || errorJson.message}`;
                }
            } catch {
                errorMessage += `: ${errorText.substring(0, 200)}`;
            }
            throw new Error(errorMessage);
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const errorText = await res.text();
            throw new Error(`Server trả về không phải JSON. Content-Type: ${contentType}. Response: ${errorText.substring(0, 200)}`);
        }

        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
            console.log(`✅ Đã lấy ${json.data.length} thời gian có sẵn từ API`);
            return json.data;
        }

        console.warn('⚠️ Response không có data hoặc data không phải array:', json);
        return [];
    } catch (err) {
        console.error('Lỗi khi lấy danh sách thời gian:', err);
        throw err;
    }
}

// ===== HÀM CHÍNH: FETCH VÀ HIỂN THỊ DỮ LIỆU ===== //

/**
 * Fetch và hiển thị dữ liệu mô hình thủy lực 2D theo thời gian
 * @param {string} timestamp - Timestamp cần hiển thị (ISO string hoặc timestamp)
 * @param {number} pageSize - Số lượng phần tử mỗi trang (mặc định 10000)
 * @returns {Promise} Promise resolve khi hoàn thành
 */
async function fetchAndShowMoHinhThuyLuc2D(timestamp = null, pageSize = 10000) {
    console.log('🌊 Bắt đầu fetch dữ liệu mô hình thủy lực 2D với timestamp:', timestamp);

    return new Promise(async (resolve, reject) => {
        try {
            // Clear layer group trước
            moHinhThuyLuc2DLayerGroup.clearLayers();

            // Hiển thị loading indicator
            if (typeof window.showLoadingIndicator === 'function') {
                window.showLoadingIndicator('Đang tải dữ liệu mô hình thủy lực 2D...');
            }

            const token = localStorage.getItem('access_token') || '';

            // 1. Lấy danh sách thời gian có sẵn (nếu chưa có)
            if (availableTimes.length === 0) {
                console.log('⏱️ Bước 1: Lấy danh sách thời gian có sẵn...');
                try {
                    availableTimes = await getAvailableTimes();
                    // Nếu không có timestamp được chỉ định và có danh sách thời gian, chọn thời gian mới nhất
                    if (!timestamp && availableTimes.length > 0) {
                        timestamp = availableTimes[availableTimes.length - 1];
                        currentSelectedTime = timestamp;
                        console.log(`📅 Tự động chọn thời gian mới nhất: ${new Date(timestamp).toLocaleString('vi-VN')}`);
                    }
                    // Cập nhật slider ngay sau khi có danh sách thời gian
                    updateTimeSlider2D();
                } catch (err) {
                    console.warn('⚠️ Không thể lấy danh sách thời gian, sẽ thử lấy từ dữ liệu:', err);
                }
            } else if (!timestamp && availableTimes.length > 0) {
                // Nếu đã có danh sách nhưng chưa chọn thời gian, chọn thời gian mới nhất
                timestamp = availableTimes[availableTimes.length - 1];
                currentSelectedTime = timestamp;
            }

            // 2. Lấy tọa độ elements
            console.log('📍 Bước 2: Lấy tọa độ elements...');
            await getElementsCoordinates2D();

            // 3. Fetch dữ liệu hydro theo thời gian
            console.log('🌊 Bước 3: Fetch dữ liệu hydro...');
            let hydroUrl = `/api/hydro?page=1&pageSize=${pageSize}`;
            if (timestamp) {
                hydroUrl += `&startTime=${timestamp}&endTime=${timestamp}`;
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

            if (!hydroJson.data || hydroJson.data.length === 0) {
                console.warn('⚠️ Không có dữ liệu hydro');
                if (typeof window.hideLoadingIndicator === 'function') {
                    window.hideLoadingIndicator();
                }
                resolve();
                return;
            }

            // 4. Render dữ liệu lên bản đồ
            console.log(`🌊 Bước 4: Render ${hydroJson.data.length} điểm hydro...`);

            let displayedCount = 0;
            let skippedCount = 0;

            // Batch render để tránh block UI
            const batchSize = 500;
            let currentIndex = 0;

            function renderBatch() {
                const endIndex = Math.min(currentIndex + batchSize, hydroJson.data.length);

                for (let i = currentIndex; i < endIndex; i++) {
                    const item = hydroJson.data[i];
                    const coords = elementsCoordinatesCache2D[item.element_id];

                    if (!coords) {
                        skippedCount++;
                        continue;
                    }

                    const { lat, lng } = coords;
                    const speed = calculateSpeed2D(item.u, item.v);
                    const direction = item.direction != null
                        ? item.direction
                        : calculateDirection2D(item.u, item.v);

                    // Tạo marker với màu theo độ sâu
                    const depthMarker = createDepthMarker(lat, lng, item.total_depth, 5);

                    // Tạo popup content
                    const popupContent = `
                        <div style="min-width: 250px;">
                            <h4 style="margin: 0 0 8px 0; color: #007bff;">Element #${item.element_id}</h4>
                            <table style="width: 100%; font-size: 12px;">
                                <tr><td><strong>Element ID:</strong></td><td>${item.element_id || ''}</td></tr>
                                <tr><td><strong>Thời gian:</strong></td><td>${item.time ? new Date(item.time).toLocaleString('vi-VN') : ''}</td></tr>
                                <tr><td><strong>Độ cao mặt nước:</strong></td><td>${item.surface_elev != null ? item.surface_elev.toFixed(2) + ' m' : '--'}</td></tr>
                                <tr><td><strong>Độ sâu tổng:</strong></td><td>${item.total_depth != null ? item.total_depth.toFixed(2) + ' m' : '--'}</td></tr>
                                <tr><td><strong>Vận tốc U:</strong></td><td>${item.u != null ? item.u.toFixed(3) + ' m/s' : '--'}</td></tr>
                                <tr><td><strong>Vận tốc V:</strong></td><td>${item.v != null ? item.v.toFixed(3) + ' m/s' : '--'}</td></tr>
                                <tr><td><strong>Vận tốc dòng chảy:</strong></td><td>${speed.toFixed(3)} m/s</td></tr>
                                <tr><td><strong>Hướng:</strong></td><td>${direction != null ? direction.toFixed(1) + '°' : '--'}</td></tr>
                            </table>
                        </div>
                    `;

                    depthMarker.bindPopup(popupContent);
                    moHinhThuyLuc2DLayerGroup.addLayer(depthMarker);

                    // Tạo vector arrow nếu có hướng và vận tốc
                    if (direction != null && speed > 0) {
                        const vectorArrow = createVectorArrow(lat, lng, direction, speed, 30);
                        if (vectorArrow) {
                            // Bind cùng popup cho vector arrow
                            vectorArrow.bindPopup(popupContent);
                            moHinhThuyLuc2DLayerGroup.addLayer(vectorArrow);
                        }
                    }

                    displayedCount++;
                }

                currentIndex = endIndex;

                if (currentIndex < hydroJson.data.length) {
                    requestAnimationFrame(renderBatch);
                } else {
                    console.log(`✅ Đã hiển thị ${displayedCount} điểm trên bản đồ`);
                    if (skippedCount > 0) {
                        console.log(`⚠️ Bỏ qua ${skippedCount} điểm do thiếu tọa độ elements`);
                    }

                    // Add layer to map
                    moHinhThuyLuc2DLayerGroup.addTo(mymap);

                    // Cập nhật slider nếu chưa được cập nhật
                    if (availableTimes.length > 0) {
                        updateTimeSlider2D();
                    }

                    // Ẩn loading indicator
                    if (typeof window.hideLoadingIndicator === 'function') {
                        window.hideLoadingIndicator();
                    }

                    resolve();
                }
            }

            renderBatch();
        } catch (err) {
            console.error('Lỗi khi fetch mô hình thủy lực 2D:', err);
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

/**
 * Cập nhật time slider với danh sách thời gian có sẵn
 */
function updateTimeSlider2D() {
    const timeSlider = document.getElementById('thuyLuc2DTimeSlider');
    const timeDisplay = document.getElementById('thuyLuc2DTimeDisplay');

    if (!timeSlider || !timeDisplay) return;

    if (availableTimes.length === 0) {
        timeSlider.disabled = true;
        timeDisplay.textContent = 'Không có dữ liệu';
        return;
    }

    timeSlider.disabled = false;
    timeSlider.min = 0;
    timeSlider.max = availableTimes.length - 1;
    timeSlider.value = availableTimes.length - 1; // Mặc định chọn thời gian mới nhất

    // Cập nhật hiển thị thời gian
    const selectedIndex = parseInt(timeSlider.value);
    const selectedTime = availableTimes[selectedIndex];
    if (selectedTime) {
        currentSelectedTime = selectedTime;
        timeDisplay.textContent = new Date(selectedTime).toLocaleString('vi-VN');
    }
}

/**
 * Xử lý khi time slider thay đổi
 */
function onTimeSliderChange() {
    const timeSlider = document.getElementById('thuyLuc2DTimeSlider');
    if (!timeSlider || availableTimes.length === 0) return;

    const selectedIndex = parseInt(timeSlider.value);
    const selectedTime = availableTimes[selectedIndex];

    if (selectedTime) {
        currentSelectedTime = selectedTime;
        const timeDisplay = document.getElementById('thuyLuc2DTimeDisplay');
        if (timeDisplay) {
            timeDisplay.textContent = new Date(selectedTime).toLocaleString('vi-VN');
        }

        // Fetch và hiển thị dữ liệu mới
        fetchAndShowMoHinhThuyLuc2D(selectedTime);
    }
}

/**
 * Hiển thị time slider
 */
function showTimeSlider2D() {
    const container = document.getElementById('thuyLuc2DTimeSliderContainer');
    if (container) {
        container.style.display = 'block';
    }
}

/**
 * Ẩn time slider
 */
function closeTimeSlider2D() {
    const container = document.getElementById('thuyLuc2DTimeSliderContainer');
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * Lùi thời gian 1 bước
 */
function stepTimeBackward() {
    const timeSlider = document.getElementById('thuyLuc2DTimeSlider');
    if (!timeSlider || availableTimes.length === 0) return;

    const currentValue = parseInt(timeSlider.value);
    if (currentValue > 0) {
        timeSlider.value = currentValue - 1;
        onTimeSliderChange();
    }
}

/**
 * Tiến thời gian 1 bước
 */
function stepTimeForward() {
    const timeSlider = document.getElementById('thuyLuc2DTimeSlider');
    if (!timeSlider || availableTimes.length === 0) return;

    const currentValue = parseInt(timeSlider.value);
    if (currentValue < availableTimes.length - 1) {
        timeSlider.value = currentValue + 1;
        onTimeSliderChange();
    }
}

// Export functions ra window object
window.fetchAndShowMoHinhThuyLuc2D = fetchAndShowMoHinhThuyLuc2D;
window.onTimeSliderChange = onTimeSliderChange;
window.updateTimeSlider2D = updateTimeSlider2D;
window.showTimeSlider2D = showTimeSlider2D;
window.closeTimeSlider2D = closeTimeSlider2D;
window.stepTimeBackward = stepTimeBackward;
window.stepTimeForward = stepTimeForward;

