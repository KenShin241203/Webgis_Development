// ===== TABLE HIỆN TRẠNG - LOGIC ===== //

// Biến để lưu trạng thái drag
let isDraggingHienTrang = false;
let dragOffsetHienTrang = { x: 0, y: 0 };

// Biến để lưu trạng thái resize
let isResizingHienTrang = false;
let resizeDirectionHienTrang = '';
let resizeStartHienTrang = { x: 0, y: 0, width: 0, height: 0 };

// Biến để theo dõi trạng thái bảng
let isHienTrangTableOpen = false;

// Trạng thái phân trang hiện tại
let currentHienTrangPage = 1;
let currentHienTrangPageSize = 100;

// CRUD state
let selectedHienTrangRow = null;
let currentHienTrangData = [];
let originalHienTrangData = [];
let isCoordinateSearchHienTrang = false;

// Hàm cập nhật bảng dữ liệu hiện trạng
function updateHienTrangTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('hientrang-table-container');
        const table = document.getElementById('hientrang-table');
        const tbody = table.querySelector('tbody');

        if (pagination) {
            currentHienTrangPage = Number(pagination.page) || currentHienTrangPage;
            currentHienTrangPageSize = Number(pagination.pageSize) || currentHienTrangPageSize;
        }

        console.log('Table container:', tableContainer);
        console.log('Table:', table);
        console.log('Tbody:', tbody);
        console.log('Data to display:', data);

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng hiện trạng');
            return;
        }

        // Lưu dữ liệu hiện tại và sort theo id tăng dần
        currentHienTrangData = data || [];
        if (!originalHienTrangData.length) {
            originalHienTrangData = [...currentHienTrangData];
        }

        tbody.innerHTML = '';
        currentHienTrangData.slice().sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0)).forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.id = item.id;
            row.dataset.index = index;
            row.addEventListener('click', function () { selectHienTrangRow(this, item); });

            row.innerHTML = `
                <td>${item.id || ''}</td>
                <td>${item.layer || ''}</td>
                <td>${item.gm_type || ''}</td>
                <td>${item.kml_style || ''}</td>
                <td>${item.kml_folder || ''}</td>
                <td>${item.tuyen || ''}</td>
                <td>${item.geometry ? `${item.geometry.coordinates[0]?.[0]?.toFixed(6) || ''}, ${item.geometry.coordinates[0]?.[1]?.toFixed(6) || ''}` : ''}</td>
            `;
            tbody.appendChild(row);
        });

        // Render phân trang
        renderHienTrangPagination(pagination);

        console.log('Đã cập nhật bảng hiện trạng với', currentHienTrangData.length, 'dòng dữ liệu');
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng hiện trạng:', error);
    }
}

// Hàm để người dùng cập nhật pageSize từ giao diện
function updateHienTrangData(page = currentHienTrangPage) {
    const pageSizeInput = document.getElementById('hientrang-pageSize');
    const pageSize = parseInt(pageSizeInput.value) || 100;

    if (pageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    if (isCoordinateSearchHienTrang) {
        const input = document.getElementById('hientrang-search-input');
        const coords = parseHienTrangCoordinateSearch(input ? input.value : '');
        if (coords) {
            searchHienTrangByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, page);
            return;
        }
    }

    console.log('Cập nhật dữ liệu hiện trạng với pageSize:', pageSize, 'page:', page);
    fetchAndShowHienTrang(pageSize, page);
}

function parseHienTrangCoordinateSearch(input) {
    const trimmed = (input || '').trim();
    const m = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)(?:\s*,\s*(\d+\.?\d*))?$/);
    if (!m) return null;
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    let lat = a;
    let lng = b;
    if (Math.abs(a) > 90 && Math.abs(a) <= 180 && Math.abs(b) <= 90) {
        lat = b; lng = a;
    }
    return { lat, lng, radius: m[3] ? parseFloat(m[3]) : 0.01 };
}

async function searchHienTrangByCoordinates(lat, lng, radius = 0.01, pageSize = currentHienTrangPageSize, page = 1) {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        page: String(page),
        pageSize: String(pageSize),
        fromSrid: '9209',
        toSrid: '4326'
    });
    const res = await fetch(`/api/hientrang/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || ('HTTP ' + res.status));
    }
    const json = await res.json();
    isCoordinateSearchHienTrang = true;
    updateHienTrangTable(json.data || [], json.pagination || undefined);
}

function searchHienTrangData() {
    const searchInput = document.getElementById('hientrang-search-input');
    const query = (searchInput?.value || '').trim();
    if (!query) {
        isCoordinateSearchHienTrang = false;
        updateHienTrangTable(originalHienTrangData, { page: currentHienTrangPage, pageSize: currentHienTrangPageSize, totalPages: 1 });
        return;
    }

    const coords = parseHienTrangCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchHienTrang = true;
        const pageSizeInput = document.getElementById('hientrang-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchHienTrangByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi tìm kiếm hiện trạng theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }

    const q = query.toLowerCase();
    const filtered = originalHienTrangData.filter(item => {
        return (
            (item.id && item.id.toString().includes(q)) ||
            (item.tuyen && item.tuyen.toLowerCase().includes(q)) ||
            (item.layer && item.layer.toLowerCase().includes(q)) ||
            (item.gm_type && item.gm_type.toLowerCase().includes(q)) ||
            (item.kml_folder && item.kml_folder.toLowerCase().includes(q)) ||
            (item.geometry && item.geometry.coordinates &&
                (item.geometry.coordinates[0]?.[0]?.toString().includes(q) ||
                    item.geometry.coordinates[0]?.[1]?.toString().includes(q)))
        );
    });
    updateHienTrangTable(filtered, { page: 1, pageSize: filtered.length, totalPages: 1 });
}

// Hàm để mở/đóng bảng dữ liệu hiện trạng
function toggleHienTrangTable() {
    const container = document.getElementById('hientrang-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="hientrang"]');

    if (container.style.display === 'none' || container.style.display === '') {
        // Mở bảng
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isHienTrangTableOpen = true;

        // Tự động fetch dữ liệu khi mở bảng
        const pageSizeInput = document.getElementById('hientrang-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        fetchAndShowHienTrang(pageSize);

        console.log('Đã mở bảng dữ liệu hiện trạng');
    } else {
        // Đóng bảng
        closeHienTrangTable();
    }
}

// Hàm để đóng bảng dữ liệu hiện trạng
function closeHienTrangTable() {
    const container = document.getElementById('hientrang-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="hientrang"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isHienTrangTableOpen = false;
    console.log('Đã đóng bảng dữ liệu hiện trạng');
}

// Hàm để enable/disable nút toggle bảng dữ liệu
function updateHienTrangTableToggleButtons() {
    const toggleHienTrang = document.getElementById('toggleHienTrang');
    const toggleHienTrangTable = document.querySelector('.table-toggle-btn[data-layer="hientrang"]');

    if (toggleHienTrang && toggleHienTrangTable) {
        if (toggleHienTrang.checked) {
            toggleHienTrangTable.disabled = false;
            toggleHienTrangTable.style.opacity = '1';
        } else {
            toggleHienTrangTable.disabled = true;
            toggleHienTrangTable.style.opacity = '0.5';
            // Đóng bảng nếu layer bị tắt
            closeHienTrangTable();
        }
    }
}

// Hàm kiểm tra xem có thể tắt toggle hay không
function canHienTrangToggleOff() {
    return !isHienTrangTableOpen;
}

// Hàm để thiết lập drag and drop cho bảng hiện trạng
function setupHienTrangDragAndDrop() {
    const container = document.getElementById('hientrang-table-container');
    const header = document.getElementById('hientrang-table-header');

    if (!container || !header) return;

    // Bắt đầu drag
    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return; // Không drag khi click vào button, input hoặc resize handle
        }

        isDraggingHienTrang = true;
        const rect = container.getBoundingClientRect();
        dragOffsetHienTrang.x = e.clientX - rect.left;
        dragOffsetHienTrang.y = e.clientY - rect.top;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingHienTrang) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetHienTrang.x;
        let newY = e.clientY - dragOffsetHienTrang.y;

        // Giới hạn trong viewport
        const maxX = viewportWidth - containerRect.width;
        const maxY = viewportHeight - containerRect.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Sử dụng position absolute thay vì transform
        container.style.position = 'fixed';
        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.transform = 'none';
    });

    // Kết thúc drag
    document.addEventListener('mouseup', function () {
        if (isDraggingHienTrang) {
            isDraggingHienTrang = false;
            container.style.cursor = 'move';
        }
    });
}

// Hàm để thiết lập resize cho bảng hiện trạng
function setupHienTrangResize() {
    const container = document.getElementById('hientrang-table-container');
    const resizeHandles = container.querySelectorAll('.resize-handle');

    if (!container || !resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingHienTrang = true;
            resizeDirectionHienTrang = handle.className.split(' ')[1]; // Lấy direction từ class
            const rect = container.getBoundingClientRect();

            resizeStartHienTrang = {
                x: e.clientX,
                y: e.clientY,
                width: rect.width,
                height: rect.height,
                left: rect.left,
                top: rect.top
            };

            document.body.style.cursor = handle.style.cursor;
        });
    });

    // Xử lý resize khi di chuyển chuột
    document.addEventListener('mousemove', function (e) {
        if (!isResizingHienTrang) return;

        const deltaX = e.clientX - resizeStartHienTrang.x;
        const deltaY = e.clientY - resizeStartHienTrang.y;

        let newWidth = resizeStartHienTrang.width;
        let newHeight = resizeStartHienTrang.height;
        let newLeft = resizeStartHienTrang.left;
        let newTop = resizeStartHienTrang.top;

        // Xử lý resize theo hướng
        if (resizeDirectionHienTrang.includes('e')) {
            newWidth = Math.max(400, resizeStartHienTrang.width + deltaX);
        }
        if (resizeDirectionHienTrang.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartHienTrang.width - 400);
            newWidth = resizeStartHienTrang.width - widthChange;
            newLeft = resizeStartHienTrang.left + widthChange;
        }
        if (resizeDirectionHienTrang.includes('s')) {
            newHeight = Math.max(300, resizeStartHienTrang.height + deltaY);
        }
        if (resizeDirectionHienTrang.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartHienTrang.height - 300);
            newHeight = resizeStartHienTrang.height - heightChange;
            newTop = resizeStartHienTrang.top + heightChange;
        }

        // Giới hạn kích thước tối đa
        newWidth = Math.min(newWidth, window.innerWidth - 20);
        newHeight = Math.min(newHeight, window.innerHeight - 20);

        // Áp dụng thay đổi
        container.style.position = 'fixed';
        container.style.left = newLeft + 'px';
        container.style.top = newTop + 'px';
        container.style.width = newWidth + 'px';
        container.style.height = newHeight + 'px';
        container.style.transform = 'none';
    });

    // Kết thúc resize
    document.addEventListener('mouseup', function () {
        if (isResizingHienTrang) {
            isResizingHienTrang = false;
            document.body.style.cursor = '';
        }
    });
}

function renderHienTrangPagination(pagination) {
    const paginationContainer = document.getElementById('hientrang-pagination');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    if (!pagination || !pagination.totalPages) return;
    const currentPage = Number(pagination.page) || 1;
    const totalPages = Number(pagination.totalPages) || 1;
    const createBtn = (text, targetPage, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = 'pagination-btn' + (active ? ' active' : '');
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (isCoordinateSearchHienTrang) {
                const input = document.getElementById('hientrang-search-input');
                const coords = parseHienTrangCoordinateSearch(input ? input.value : '');
                const pageSizeInput = document.getElementById('hientrang-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || currentHienTrangPageSize;
                if (coords) {
                    searchHienTrangByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, targetPage);
                    return;
                }
            }
            updateHienTrangData(targetPage);
        });
        return btn;
    };
    paginationContainer.appendChild(createBtn('«', Math.max(1, currentPage - 1), currentPage === 1));
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) { paginationContainer.appendChild(createBtn(String(p), p, false, p === currentPage)); }
    paginationContainer.appendChild(createBtn('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
}

function searchHienTrangData() {
    const searchInput = document.getElementById('hientrang-search-input');
    const query = (searchInput?.value || '').trim();
    if (!query) {
        isCoordinateSearchHienTrang = false;
        updateHienTrangTable(originalHienTrangData, { page: currentHienTrangPage, pageSize: currentHienTrangPageSize, totalPages: 1 });
        return;
    }
    const coords = parseHienTrangCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchHienTrang = true;
        const pageSizeInput = document.getElementById('hientrang-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchHienTrangByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi tìm kiếm hiện trạng theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }
    const q = query.toLowerCase();
    const filtered = originalHienTrangData.filter(item => {
        return (
            (item.id && item.id.toString().includes(q)) ||
            (item.tuyen && item.tuyen.toLowerCase().includes(q)) ||
            (item.layer && item.layer.toLowerCase().includes(q)) ||
            (item.gm_type && item.gm_type.toLowerCase().includes(q)) ||
            (item.kml_folder && item.kml_folder.toLowerCase().includes(q)) ||
            (item.geometry && item.geometry.coordinates &&
                (item.geometry.coordinates[0]?.[0]?.toString().includes(q) ||
                    item.geometry.coordinates[0]?.[1]?.toString().includes(q)))
        );
    });
    updateHienTrangTable(filtered, { page: 1, pageSize: filtered.length, totalPages: 1 });
}

// Khởi tạo table hiện trạng
function initHienTrangTable() {
    // Thiết lập drag and drop
    setupHienTrangDragAndDrop();

    // Thiết lập resize
    setupHienTrangResize();

    // Khởi tạo trạng thái ban đầu
    updateHienTrangTableToggleButtons();
}

// Export các function ra window object
window.updateHienTrangTable = updateHienTrangTable;
window.updateHienTrangData = updateHienTrangData;
window.toggleHienTrangTable = toggleHienTrangTable;
window.closeHienTrangTable = closeHienTrangTable;
window.updateHienTrangTableToggleButtons = updateHienTrangTableToggleButtons;
window.setupHienTrangDragAndDrop = setupHienTrangDragAndDrop;
window.setupHienTrangResize = setupHienTrangResize;
window.initHienTrangTable = initHienTrangTable;
window.canHienTrangToggleOff = canHienTrangToggleOff;

// Export CRUD helpers
window.selectHienTrangRow = selectHienTrangRow;
window.searchHienTrangData = searchHienTrangData;
