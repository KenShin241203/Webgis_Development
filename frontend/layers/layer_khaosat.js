// ===== LAYER KHẢO SÁT ===== //
// Tạo layer group cho điểm khảo sát
window.khaoSatLayerGroup = L.layerGroup();

var imageData = [
    { lat: 9.663922, lng: 106.207569, image: '../assets/Sat lo bo bao_Ap Xoai Rum-Kim Son-Tra Cu.jpg', caption: 'Điểm sạt lở nguy hiểm ấp Xoài Rùm_Kim Sơn_Trà Cú' },
    { lat: 9.762209, lng: 106.139194, image: '../assets/Sat lo cua Cong Can Chong.jpg', caption: 'Điểm sạt lở cửa cống_bờ bao cống Cần Chông' },
    { lat: 9.820930, lng: 106.055294, image: '../assets/RachRum.jpg', caption: 'Cống Rạch Rum' },
    { lat: 9.841128, lng: 106.029272, image: '../assets/Diem nguy hiem 2_Xa Hoa Tan_Sg Hau.jpg', caption: 'Điểm sạt lở nguy hiểm 2_xã Hòa Tân_Cầu Kè' },
    { lat: 9.903773, lng: 105.989892, image: '../assets/TanDinh.jpg', caption: 'Cống Tân Dinh' },
    { lat: 10.066250, lng: 106.251106, image: '../assets/Sat lo bo bao_Ap My Hiep_My Duc.jpg', caption: 'Điểm sạt lở bờ bao nguy hiểm_Đức Mỹ_Càng Long' },
    { lat: 9.558165, lng: 106.369777, image: '../assets/LongVinh.jpg', caption: 'Đê Long Vĩnh' },
    { lat: 10.015500, lng: 106.309875, image: '../assets/Sat lo de bao_C Trai Luan - Dai Phuoc.jpg', caption: 'Điểm sat lo đê bao_x. Đại Phước_Càng Long' },
    { lat: 9.949009, lng: 106.376390, image: '../assets/RachKinh.jpg', caption: 'Cống Rạch Kinh' },
    { lat: 9.931509, lng: 106.391183, image: '../assets/BaTram.jpg', caption: 'Cống Bà Trầm' },
    { lat: 9.902347, lng: 106.415405, image: '../assets/NgaiHiep.jpg', caption: 'Cống Ngãi Hiệp' },
    { lat: 9.893686, lng: 106.424627, image: '../assets/NgaiHoa.jpg', caption: 'Cống Ngãi Hoà' },
    { lat: 9.878800, lng: 106.437200, image: '../assets/tuyenCauNgang.jpg', caption: 'Tuyến Cầu Ngang' },
    { lat: 9.867275, lng: 106.443393, image: '../assets/ChaVa.jpg', caption: 'Cống Chà Và' },
    { lat: 9.867459, lng: 106.444582, image: '../assets/VinhKim.jpg', caption: 'Cống Vĩnh Kim' },
    { lat: 9.863137, lng: 106.462650, image: '../assets/RachDap.jpg', caption: 'Cống Rạch Đập' },
    { lat: 9.849725, lng: 106.472515, image: '../assets/CaTre.jpg', caption: 'Cống Cá Trê' },
    { lat: 9.835967, lng: 106.485070, image: '../assets/LungMit.jpg', caption: 'Cống Lung Mít' },
];

// Hàm fetch và hiển thị điểm khảo sát từ dữ liệu cứng
window.fetchAndShowKhaoSat = function (pageSize = 100, page = 1) {
    return new Promise((resolve, reject) => {
        try {
            if (window.khaoSatLayerGroup) {
                window.khaoSatLayerGroup.clearLayers();
            } else {
                window.khaoSatLayerGroup = L.layerGroup();
            }

            // Sử dụng dữ liệu cứng từ biến imageData
            const list = imageData.map((item, index) => ({
                id: index + 1,
                lat: item.lat,
                lng: item.lng,
                image: item.image,
                caption: item.caption
            }));

            // Cập nhật dữ liệu cho bảng
            window.imageData = list;

            if (!list.length) {
                // Không có dữ liệu: vẫn cập nhật bảng rỗng để UI rõ ràng
                if (typeof window.updateKhaoSatTable === 'function') {
                    window.updateKhaoSatTable([], null);
                }
                resolve();
                return;
            }

            list.forEach(data => {
                if (data.lat != null && data.lng != null) {
                    const marker = L.marker([data.lat, data.lng]);
                    const popupContent = `
						<div style="padding: 10px;">
							<img src="${data.image || ''}" alt="${data.caption || ''}" style="min-width: 300px; max-width: 100%; height: 300px; object-fit: contain;">
							<br><strong>${data.caption || ''}</strong>
						</div>
					`;
                    marker.bindPopup(popupContent);
                    marker.bindTooltip(data.caption || '', {
                        permanent: false,
                        direction: 'top',
                        className: 'custom-tooltip'
                    });
                    window.khaoSatLayerGroup.addLayer(marker);
                }
            });

            if (mymap && !mymap.hasLayer(window.khaoSatLayerGroup)) {
                mymap.addLayer(window.khaoSatLayerGroup);
            }

            // Cập nhật bảng với pagination client-side
            const totalPages = Math.ceil(list.length / pageSize);
            const pagination = {
                page: page,
                pageSize: pageSize,
                total: list.length,
                totalPages: totalPages
            };

            if (typeof window.updateKhaoSatTable === 'function') {
                window.updateKhaoSatTable(window.imageData, pagination);
            }

            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

// Hàm tìm kiếm điểm khảo sát theo tọa độ từ dữ liệu cứng
window.searchKhaoSatByCoordinates = function (lat, lng, radius = 0.01, pageSize = 100, page = 1) {
    return new Promise((resolve, reject) => {
        try {
            if (window.khaoSatLayerGroup) {
                window.khaoSatLayerGroup.clearLayers();
            } else {
                window.khaoSatLayerGroup = L.layerGroup();
            }

            // Validate input
            if (lat === undefined || lng === undefined) {
                reject(new Error('Vĩ độ và kinh độ là bắt buộc'));
                return;
            }

            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            const radiusNum = parseFloat(radius);

            if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
                reject(new Error('Tọa độ và bán kính phải là số hợp lệ'));
                return;
            }

            // Tìm kiếm trong dữ liệu cứng
            const filteredData = imageData.filter(item => {
                const distance = Math.sqrt(
                    Math.pow(item.lat - latNum, 2) + Math.pow(item.lng - lngNum, 2)
                );
                return distance <= radiusNum;
            });

            const list = filteredData.map((item, index) => ({
                id: index + 1,
                lat: item.lat,
                lng: item.lng,
                image: item.image,
                caption: item.caption
            }));

            // Cập nhật dữ liệu cho bảng
            window.imageData = list;

            if (!list.length) {
                // Không có dữ liệu: vẫn cập nhật bảng rỗng để UI rõ ràng
                if (typeof window.updateKhaoSatTable === 'function') {
                    window.updateKhaoSatTable([], null);
                }
                resolve();
                return;
            }

            list.forEach(data => {
                if (data.lat != null && data.lng != null) {
                    const marker = L.marker([data.lat, data.lng]);
                    const popupContent = `
						<div style="padding: 10px;">
							<img src="${data.image || ''}" alt="${data.caption || ''}" style="min-width: 300px; max-width: 100%; height: 300px; object-fit: contain;">
							<br><strong>${data.caption || ''}</strong>
							<br><small>Tọa độ: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}</small>
						</div>
					`;
                    marker.bindPopup(popupContent);
                    marker.bindTooltip(data.caption || '', {
                        permanent: false,
                        direction: 'top',
                        className: 'custom-tooltip'
                    });
                    window.khaoSatLayerGroup.addLayer(marker);
                }
            });

            if (mymap && !mymap.hasLayer(window.khaoSatLayerGroup)) {
                mymap.addLayer(window.khaoSatLayerGroup);
            }

            // Cập nhật bảng với pagination client-side
            const totalPages = Math.ceil(list.length / pageSize);
            const pagination = {
                page: page,
                pageSize: pageSize,
                total: list.length,
                totalPages: totalPages
            };

            if (typeof window.updateKhaoSatTable === 'function') {
                window.updateKhaoSatTable(window.imageData, pagination);
            }

            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

// Hàm tắt layer khảo sát
window.hideKhaoSatLayer = function () {
    if (mymap && mymap.hasLayer(window.khaoSatLayerGroup)) {
        mymap.removeLayer(window.khaoSatLayerGroup);
    }
};

// Hàm kiểm tra xem có thể tắt layer không
window.canKhaoSatToggleOff = function () {
    // Có thể thêm logic kiểm tra bảng dữ liệu nếu cần
    return true;
};