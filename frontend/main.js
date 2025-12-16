var mymap = L.map('map').setView([10.7769, 106.7009], 9);

// Base layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: '© OpenStreetMap'
}).addTo(mymap);

var esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17,
    attribution: '© Esri'
});

var stamen = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}@2x.png', {
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 17,
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ODbL.',
    ext: 'png'
});

// Layer control
var baseLayers = {
    "OpenStreetMap": osm,
    "Esri Satellite": esri,
    "Stamen Terrain": stamen
};
L.control.layers(baseLayers).addTo(mymap);

// Feature group for editable layers
var drawnItems = new L.FeatureGroup();
mymap.addLayer(drawnItems);

// Initialize the draw control
var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false
    }
});
mymap.addControl(drawControl);

// Event handler for drawing
mymap.on('draw:created', function (e) {
    var layer = e.layer;
    var coords = layer.getLatLngs()[0].map(point => `(${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`).join(', ');
    layer.bindPopup(`Đa giác với đỉnh: ${coords}`);
    drawnItems.addLayer(layer);
});

// Initial marker
L.marker([10.7769, 106.7009]).addTo(mymap)
    .bindPopup('Ho Chi Minh City.')
    .openPopup();

// Search function
function searchLocation() {
    var query = document.getElementById('search-input').value;
    if (!query) {
        alert("Vui lòng nhập tên vị trí!");
        return;
    }
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                var result = data[0];
                var lat = parseFloat(result.lat);
                var lon = parseFloat(result.lon);
                mymap.setView([lat, lon]);
                L.marker([lat, lon]).addTo(mymap)
                    .bindPopup(result.display_name)
                    .openPopup();
            } else {
                alert("Không tìm thấy vị trí!");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Đã xảy ra lỗi khi tìm kiếm!");
        });
}

// Toggle draw mode
document.getElementById('toggleDraw').addEventListener('click', function () {
    if (!mymap.hasLayer(drawControl)) {
        mymap.addControl(drawControl);
        alert("Chế độ vẽ đa giác đã được bật. Nhấp vào bản đồ để bắt đầu vẽ!");
    } else {
        mymap.removeControl(drawControl);
        alert("Chế độ vẽ đa giác đã được tắt.");
    }
});

// Sidebar button functions
function addLayer() {
    alert("Chức năng thêm lớp bản đồ đang được phát triển.");
}

function goToMap() {
    mymap.setView([10.7769, 106.7009], 9);
}

// Toggle weather widget
function toggleWeather() {
    const weatherWidget = document.getElementById('weatherWidget');
    if (weatherWidget.style.display === 'none' || weatherWidget.style.display === '') {
        weatherWidget.style.display = 'block';
        // Có thể thêm logic fetch weather data ở đây
    } else {
        weatherWidget.style.display = 'none';
    }
}

// Query data function
function queryData() {
    const dataType = document.getElementById('dataTypeSelect').value;
    alert(`Chức năng truy vấn dữ liệu ${dataType} đang được phát triển.`);
}


// Weather widget toggle
document.getElementById('toggleWeatherBtn').addEventListener('click', function () {
    const weatherWidget = document.getElementById('weatherWidget');
    if (weatherWidget.style.display === 'none' || weatherWidget.style.display === '') {
        weatherWidget.style.display = 'block';
        // Tự động fetch dữ liệu thời tiết khi mở widget
        if (typeof fetchWeather === 'function') {
            fetchWeather();
        }
        // Khởi tạo drag and drop khi widget được hiển thị
        if (typeof setupWeatherDragAndDrop === 'function') {
            setTimeout(() => {
                setupWeatherDragAndDrop();
            }, 50);
        }
    } else {
        weatherWidget.style.display = 'none';
    }
});

// Popup toggle (giữ lại cho các popup khác nếu cần)
document.getElementById('closePopup').addEventListener('click', function () {
    document.getElementById('controlPopup').style.display = 'none';
});

// Event handlers
var popup = L.popup();
mymap.on('click', function (e) {
    var lat = e.latlng.lat.toFixed(4);
    var long = e.latlng.lng.toFixed(4);
    popup
        .setLatLng(e.latlng)
        .setContent("Toạ độ: (" + lat + ", " + long + ")")
        .openOn(mymap);
});

mymap.on('mousemove', function (e) {
    var str = "Vĩ độ: " + e.latlng.lat.toFixed(5) + " | Kinh độ: " + e.latlng.lng.toFixed(5) + " | Tỉ lệ phóng: " + mymap.getZoom();
    var coordDisplay = document.getElementById('coord');
    if (coordDisplay) {
        coordDisplay.innerHTML = str;
    }
});

// ===== MINI MAP VIỆT NAM DẠNG LEAFLET ===== //
var miniMap = L.map('miniMap', {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    boxZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    tap: false,
    keyboard: false,
    interactive: false
}).setView([16.0, 107.5], 5); // Trung tâm VN

// Lớp nền cho mini map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 4
}).addTo(miniMap);

// Vẽ khung đỏ biểu diễn vùng bản đồ chính
var mainViewBox = L.rectangle(mymap.getBounds(), {
    color: "red",
    weight: 2,
    fillOpacity: 0.1,
    interactive: false
}).addTo(miniMap);

// Cập nhật khung này mỗi lần người dùng thay đổi bản đồ chính
mymap.on('moveend', function () {
    mainViewBox.setBounds(mymap.getBounds());
});

// ===== DROPDOWN MENU LAYER MANAGEMENT ===== //
document.addEventListener('DOMContentLoaded', function () {
    const layerDropdownBtn = document.getElementById('layerDropdownBtn');
    const layerDropdownMenu = document.getElementById('layerDropdownMenu');
    const dropdownContainer = document.querySelector('.dropdown');
    let isDropdownOpen = false;

    // Toggle dropdown menu
    layerDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        isDropdownOpen = !isDropdownOpen;
        dropdownContainer.classList.toggle('active', isDropdownOpen);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!dropdownContainer.contains(e.target)) {
            isDropdownOpen = false;
            dropdownContainer.classList.remove('active');
        }
    });

    // ===== QUẢN LÝ LAYER - CHỈ CHO PHÉP BẬT 1 LAYER DUY NHẤT ===== //

    // Mapping từ data-layer attribute đến layer group và function
    const layerConfig = {
        'cong': {
            layerGroup: window.congLayerGroup,
            fetchFunction: 'fetchAndShowCong',
            tableToggleId: 'toggleCongTable'
        },
        'chatluong': {
            layerGroup: window.chatLuongLayerGroup,
            fetchFunction: 'fetchAndShowChatLuong',
            tableToggleId: 'toggleChatLuongTable'
        },
        'debao': {
            layerGroup: window.deBaoLayerGroup,
            fetchFunction: 'fetchAndShowDeBao',
            tableToggleId: 'toggleDeBaoTable'
        },
        'dolun': {
            layerGroup: window.doLunLayerGroup,
            fetchFunction: 'fetchAndShowDoLun',
            tableToggleId: 'toggleDoLunTable'
        },
        'hientrang': {
            layerGroup: window.hienTrangLayerGroup,
            fetchFunction: 'fetchAndShowHienTrang',
            tableToggleId: 'toggleHienTrangTable'
        },
        'sutlun': {
            layerGroup: window.sutLunLayerGroup,
            fetchFunction: 'fetchAndShowSutLun',
            tableToggleId: 'toggleSutLunTable'
        },
        'ngaplut': {
            layerGroup: window.ngaplutLayerGroup,
            fetchFunction: 'fetchAndShowNgaplut',
            tableToggleId: 'toggleNgaplutTable'
        },
        'khaosat': {
            layerGroup: window.khaoSatLayerGroup,
            fetchFunction: 'fetchAndShowKhaoSat',
            tableToggleId: 'toggleKhaoSatTable'
        }
    };

    // Biến để theo dõi trạng thái loading và layer hiện tại
    let isLoadingLayer = false;
    let currentActiveLayer = null;

    // Hàm disable tất cả dropdown items
    function disableAllDropdownItems() {
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.style.opacity = '0.5';
            item.style.pointerEvents = 'none';
        });
    }

    // Hàm enable tất cả dropdown items
    function enableAllDropdownItems() {
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        });
    }

    // Hàm tắt tất cả layer
    function hideAllLayers() {
        Object.values(layerConfig).forEach(config => {
            if (config.layerGroup && mymap.hasLayer(config.layerGroup)) {
                mymap.removeLayer(config.layerGroup);
            }
        });

        // Reset tất cả dropdown items
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('active');
        });

        // Disable tất cả table toggle buttons
        document.querySelectorAll('.table-toggle-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });

        currentActiveLayer = null;
    }

    // Hàm tắt layer cụ thể
    function hideSpecificLayer(layerKey) {
        const config = layerConfig[layerKey];
        if (config && config.layerGroup && mymap.hasLayer(config.layerGroup)) {
            mymap.removeLayer(config.layerGroup);
        }
    }

    // Hàm xử lý khi layer được chọn
    function handleLayerSelection(layerKey) {
        if (isLoadingLayer) {
            console.log('Đang load layer, vui lòng đợi...');
            return;
        }

        // Kiểm tra xem layer đã được bật chưa
        const selectedItem = document.querySelector(`[data-layer="${layerKey}"]`);
        const isCurrentlyActive = selectedItem && selectedItem.classList.contains('active');

        // Nếu layer đã được bật, tắt nó đi
        if (isCurrentlyActive) {
            console.log('Tắt layer:', layerKey);

            // Kiểm tra xem có bảng nào đang mở không
            if (layerKey === 'sutlun' && typeof window.canToggleOff === 'function' && !window.canToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu sụt lún trước khi tắt layer!');
                return;
            }
            if (layerKey === 'cong' && typeof window.canCongToggleOff === 'function' && !window.canCongToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu cống trước khi tắt layer!');
                return;
            }
            if (layerKey === 'chatluong' && typeof window.canChatLuongToggleOff === 'function' && !window.canChatLuongToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu chất lượng trước khi tắt layer!');
                return;
            }
            if (layerKey === 'debao' && typeof window.canDeBaoToggleOff === 'function' && !window.canDeBaoToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu đê bao trước khi tắt layer!');
                return;
            }
            if (layerKey === 'dolun' && typeof window.canDoLunToggleOff === 'function' && !window.canDoLunToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu độ lún trước khi tắt layer!');
                return;
            }
            if (layerKey === 'hientrang' && typeof window.canHienTrangToggleOff === 'function' && !window.canHienTrangToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu hiện trạng trước khi tắt layer!');
                return;
            }
            if (layerKey === 'ngaplut' && typeof window.canNgaplutToggleOff === 'function' && !window.canNgaplutToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu ngập lụt trước khi tắt layer!');
                return;
            }
            if (layerKey === 'khaosat' && typeof window.canKhaoSatToggleOff === 'function' && !window.canKhaoSatToggleOff()) {
                alert('Vui lòng đóng bảng dữ liệu điểm khảo sát trước khi tắt layer!');
                return;
            }

            // Tắt layer hiện tại
            const config = layerConfig[layerKey];
            if (config && config.layerGroup && mymap.hasLayer(config.layerGroup)) {
                mymap.removeLayer(config.layerGroup);
            }

            // Reset trạng thái
            selectedItem.classList.remove('active');
            const tableToggleBtn = selectedItem.querySelector('.table-toggle-btn');
            if (tableToggleBtn) {
                tableToggleBtn.disabled = true;
                tableToggleBtn.style.opacity = '0.5';
            }

            // Đóng bảng dữ liệu nếu đang mở
            if (layerKey === 'sutlun' && typeof window.closeSutLunTable === 'function') {
                window.closeSutLunTable();
            }
            if (layerKey === 'cong' && typeof window.closeCongTable === 'function') {
                window.closeCongTable();
            }
            if (layerKey === 'chatluong' && typeof window.closeChatLuongTable === 'function') {
                window.closeChatLuongTable();
            }
            if (layerKey === 'debao' && typeof window.closeDeBaoTable === 'function') {
                window.closeDeBaoTable();
            }
            if (layerKey === 'dolun' && typeof window.closeDoLunTable === 'function') {
                window.closeDoLunTable();
            }
            if (layerKey === 'hientrang' && typeof window.closeHienTrangTable === 'function') {
                window.closeHienTrangTable();
            }
            if (layerKey === 'ngaplut' && typeof window.closeNgaplutTable === 'function') {
                window.closeNgaplutTable();
            }
            if (layerKey === 'khaosat' && typeof window.closeKhaoSatTable === 'function') {
                window.closeKhaoSatTable();
            }

            currentActiveLayer = null;
            console.log('Đã tắt layer:', layerKey);
            return;
        }

        // Kiểm tra xem có bảng nào đang mở không khi chuyển layer
        if (currentActiveLayer && currentActiveLayer !== layerKey) {
            let needToCloseTable = false;
            let currentOpenTable = null;

            // Kiểm tra bảng sụt lún
            if (currentActiveLayer === 'sutlun' && typeof window.canToggleOff === 'function' && !window.canToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'sụt lún';
            }
            // Kiểm tra bảng cống
            if (currentActiveLayer === 'cong' && typeof window.canCongToggleOff === 'function' && !window.canCongToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'cống';
            }
            // Kiểm tra bảng chất lượng
            if (currentActiveLayer === 'chatluong' && typeof window.canChatLuongToggleOff === 'function' && !window.canChatLuongToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'chất lượng';
            }
            // Kiểm tra bảng đê bao
            if (currentActiveLayer === 'debao' && typeof window.canDeBaoToggleOff === 'function' && !window.canDeBaoToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'đê bao';
            }
            // Kiểm tra bảng độ lún
            if (currentActiveLayer === 'dolun' && typeof window.canDoLunToggleOff === 'function' && !window.canDoLunToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'độ lún';
            }
            // Kiểm tra bảng hiện trạng
            if (currentActiveLayer === 'hientrang' && typeof window.canHienTrangToggleOff === 'function' && !window.canHienTrangToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'hiện trạng';
            }
            // Kiểm tra bảng ngập lụt
            if (currentActiveLayer === 'ngaplut' && typeof window.canNgaplutToggleOff === 'function' && !window.canNgaplutToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'ngập lụt';
            }
            // Kiểm tra bảng điểm khảo sát
            if (currentActiveLayer === 'khaosat' && typeof window.canKhaoSatToggleOff === 'function' && !window.canKhaoSatToggleOff()) {
                needToCloseTable = true;
                currentOpenTable = 'điểm khảo sát';
            }

            if (needToCloseTable) {
                alert(`Vui lòng đóng bảng dữ liệu ${currentOpenTable} trước khi chuyển layer!`);
                return;
            }
        }

        // Bắt đầu loading
        isLoadingLayer = true;
        disableAllDropdownItems();

        // Tắt tất cả layer trước
        hideAllLayers();

        // Bật layer được chọn
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        // Bật nút toggle bảng tương ứng
        const tableToggleBtn = selectedItem.querySelector('.table-toggle-btn');
        if (tableToggleBtn) {
            tableToggleBtn.disabled = false;
            tableToggleBtn.style.opacity = '1';
        }

        // Gọi hàm fetch tương ứng với callback hoàn thành
        const onLayerLoaded = () => {
            isLoadingLayer = false;
            enableAllDropdownItems();
            currentActiveLayer = layerKey;
            console.log('Layer đã load xong:', layerKey);
        };

        const onLayerError = (error) => {
            isLoadingLayer = false;
            enableAllDropdownItems();
            console.error('Lỗi load layer:', error);
            alert('Lỗi khi tải layer: ' + error.message);
        };

        const config = layerConfig[layerKey];
        if (config && typeof window[config.fetchFunction] === 'function') {
            if (layerKey === 'sutlun') {
                const pageSizeInput = document.getElementById('sutlun-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window[config.fetchFunction](pageSize).then(onLayerLoaded).catch(onLayerError);
            } else if (layerKey === 'cong') {
                const pageSizeInput = document.getElementById('cong-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window[config.fetchFunction](pageSize).then(onLayerLoaded).catch(onLayerError);
            } else if (layerKey === 'chatluong') {
                const pageSizeInput = document.getElementById('chatluong-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window[config.fetchFunction](pageSize).then(onLayerLoaded).catch(onLayerError);
            } else if (layerKey === 'debao') {
                const pageSizeInput = document.getElementById('debao-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window[config.fetchFunction](pageSize).then(onLayerLoaded).catch(onLayerError);
            } else if (layerKey === 'dolun') {
                const pageSizeInput = document.getElementById('dolun-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window[config.fetchFunction](pageSize).then(onLayerLoaded).catch(onLayerError);
            } else if (layerKey === 'hientrang') {
                const pageSizeInput = document.getElementById('hientrang-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window[config.fetchFunction](pageSize).then(onLayerLoaded).catch(onLayerError);
            } else if (layerKey === 'ngaplut') {
                const pageSizeInput = document.getElementById('ngaplut-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window[config.fetchFunction](pageSize).then(onLayerLoaded).catch(onLayerError);
            } else if (layerKey === 'khaosat') {
                window[config.fetchFunction]().then(onLayerLoaded).catch(onLayerError);
            } else {
                window[config.fetchFunction]().then(onLayerLoaded).catch(onLayerError);
            }
        } else {
            onLayerLoaded();
        }
    }

    // Thêm event listener cho tất cả dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function (e) {
            // Không xử lý nếu click vào table toggle button
            if (e.target.classList.contains('table-toggle-btn')) {
                return;
            }

            const layerKey = this.getAttribute('data-layer');
            handleLayerSelection(layerKey);
        });
    });

    // Thêm event listener cho table toggle buttons
    document.querySelectorAll('.table-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const layerKey = this.getAttribute('data-layer');

            // Xử lý mở bảng tương ứng
            switch (layerKey) {
                case 'sutlun':
                    if (typeof window.toggleSutLunTable === 'function') {
                        window.toggleSutLunTable();
                    }
                    break;
                case 'cong':
                    if (typeof window.toggleCongTable === 'function') {
                        window.toggleCongTable();
                    }
                    break;
                case 'chatluong':
                    if (typeof window.toggleChatLuongTable === 'function') {
                        window.toggleChatLuongTable();
                    }
                    break;
                case 'debao':
                    if (typeof window.toggleDeBaoTable === 'function') {
                        window.toggleDeBaoTable();
                    }
                    break;
                case 'dolun':
                    if (typeof window.toggleDoLunTable === 'function') {
                        window.toggleDoLunTable();
                    }
                    break;
                case 'hientrang':
                    if (typeof window.toggleHienTrangTable === 'function') {
                        window.toggleHienTrangTable();
                    }
                    break;
                case 'ngaplut':
                    if (typeof window.toggleNgaplutTable === 'function') {
                        window.toggleNgaplutTable();
                    }
                    break;
                case 'khaosat':
                    if (typeof window.toggleKhaoSatTable === 'function') {
                        window.toggleKhaoSatTable();
                    }
                    break;
                // Thêm các case khác cho các bảng khác
                default:
                    alert('Chức năng bảng dữ liệu cho layer này đang được phát triển.');
            }
        });
    });
});



// Image data và functions được quản lý trong file layers/layer_khaosat.js

// Không tự động thêm images khi khởi tạo, sẽ được quản lý qua layer system
// addImagesToMap();

// Layer khảo sát được quản lý trong file layers/layer_khaosat.js



// Export các function ra window object
window.toggleWeather = toggleWeather;
window.queryData = queryData;

// ========== API REQUESTS ==========
var request = new XMLHttpRequest();





// Định nghĩa VN2000 (zone 48N)
// proj4.defs("VN2000", "+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs +towgs84=0,0,0,0,0,0,0");
