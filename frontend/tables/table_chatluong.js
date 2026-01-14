// ===== TABLE Bờ bao - LOGIC ===== //

// Biến để lưu trạng thái drag
let isDraggingChatLuong = false;
let dragOffsetChatLuong = { x: 0, y: 0 };

// Biến để lưu trạng thái resize
let isResizingChatLuong = false;
let resizeDirectionChatLuong = '';
let resizeStartChatLuong = { x: 0, y: 0, width: 0, height: 0 };

// Biến để theo dõi trạng thái bảng
let isChatLuongTableOpen = false;

// Biến để lưu dữ liệu hiện tại và dữ liệu gốc + lựa chọn dòng
let currentChatLuongData = [];
let originalChatLuongData = [];
let selectedChatLuongRow = null;

// Trạng thái phân trang hiện tại
let currentChatLuongPage = 1;
let currentChatLuongPageSize = 100;
let isCoordinateSearchChatLuong = false;

// Hàm cập nhật bảng dữ liệu Bờ bao
function updateChatLuongTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('chatluong-table-container');
        const table = document.getElementById('chatluong-table');
        const tbody = table.querySelector('tbody');

        if (pagination) {
            currentChatLuongPage = Number(pagination.page) || currentChatLuongPage;
            currentChatLuongPageSize = Number(pagination.pageSize) || currentChatLuongPageSize;
        }

        console.log('Table container:', tableContainer);
        console.log('Table:', table);
        console.log('Tbody:', tbody);
        console.log('Data to display:', data);

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng Bờ bao');
            return;
        }

        // Lưu dữ liệu hiện tại
        currentChatLuongData = data;
        if (!originalChatLuongData.length) {
            originalChatLuongData = [...data];
        }

        tbody.innerHTML = '';
        // Hiển thị theo thứ tự ID tăng dần (nếu có id)
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.id = item.id;
            row.dataset.index = index;

            row.innerHTML = `
                <td>${item.id || ''}</td>
                <td>${item.name || ''}</td>
                <td>${item.layer || ''}</td>
                <td>${item.kml_folder || ''}</td>
                <td>${item.geometry ? `${item.geometry.coordinates[0]?.[0]?.toFixed(6) || ''}, ${item.geometry.coordinates[0]?.[1]?.toFixed(6) || ''}` : ''}</td>
            `;

            // Thêm event listener cho việc chọn dòng
            row.addEventListener('click', function () {
                selectChatLuongRow(this, item);
            });

            tbody.appendChild(row);
        });

        // Cập nhật trạng thái các button
        updateChatLuongActionButtons();

        // Render phân trang
        renderChatLuongPagination(pagination);

        console.log('Đã cập nhật bảng Bờ bao với', data.length, 'dòng dữ liệu');
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng Bờ bao:', error);
    }
}

// Hàm để người dùng cập nhật pageSize từ giao diện
function updateChatLuongData(page = currentChatLuongPage) {
    const pageSizeInput = document.getElementById('chatluong-pageSize');
    const newPageSize = parseInt(pageSizeInput.value) || 100;

    if (newPageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    if (isCoordinateSearchChatLuong) {
        const searchInput = document.getElementById('chatluong-search-input');
        const coords = parseChatLuongCoordinateSearch(searchInput ? searchInput.value : '');
        if (coords) {
            searchChatLuongByCoordinates(coords.lat, coords.lng, coords.radius, newPageSize, page);
            return;
        }
    }

    // Frontend không tự tính lại page nữa; backend chuẩn hóa phân trang
    console.log('Cập nhật dữ liệu Bờ bao với pageSize:', newPageSize, 'page:', page);
    fetchAndShowChatLuong(newPageSize, page);
}

// Hàm để mở/đóng bảng dữ liệu Bờ bao
function toggleChatLuongTable() {
    const container = document.getElementById('chatluong-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="chatluong"]');

    if (container.style.display === 'none' || container.style.display === '') {
        // Mở bảng
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isChatLuongTableOpen = true;

        // Tự động fetch dữ liệu khi mở bảng
        const pageSizeInput = document.getElementById('chatluong-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        fetchAndShowChatLuong(pageSize);

        console.log('Đã mở bảng dữ liệu Bờ bao');
    } else {
        // Đóng bảng
        closeChatLuongTable();
    }
}

// Hàm để đóng bảng dữ liệu Bờ bao
function closeChatLuongTable() {
    const container = document.getElementById('chatluong-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="chatluong"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isChatLuongTableOpen = false;
    console.log('Đã đóng bảng dữ liệu Bờ bao');
}

// Hàm để enable/disable nút toggle bảng dữ liệu
function updateChatLuongTableToggleButtons() {
    const toggleChatLuong = document.getElementById('toggleChatLuong');
    const toggleChatLuongTable = document.querySelector('.table-toggle-btn[data-layer="chatluong"]');

    if (toggleChatLuong && toggleChatLuongTable) {
        if (toggleChatLuong.checked) {
            toggleChatLuongTable.disabled = false;
            toggleChatLuongTable.style.opacity = '1';
        } else {
            toggleChatLuongTable.disabled = true;
            toggleChatLuongTable.style.opacity = '0.5';
            // Đóng bảng nếu layer bị tắt
            closeChatLuongTable();
        }
    }
}

// Hàm kiểm tra xem có thể tắt toggle hay không
function canChatLuongToggleOff() {
    return !isChatLuongTableOpen;
}

// ==== CRUD giống bảng Cống ====
// Hàm để chọn dòng trong bảng
function selectChatLuongRow(row, data) {
    // Bỏ chọn dòng cũ
    const allRows = document.querySelectorAll('#chatluong-table tbody tr');
    allRows.forEach(r => r.classList.remove('selected-row'));

    // Chọn dòng mới
    row.classList.add('selected-row');
    selectedChatLuongRow = data;

    // Cập nhật trạng thái các button
    updateChatLuongActionButtons();
}

// Hàm cập nhật trạng thái các button action
function updateChatLuongActionButtons() {
    const container = document.getElementById('chatluong-table-container');
    if (!container) return;

    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');

    if (editBtn && deleteBtn) {
        const hasSelection = selectedChatLuongRow !== null;
        editBtn.disabled = !hasSelection;
        deleteBtn.disabled = !hasSelection;
    }
}

// Thêm bản ghi mới
function addChatLuongRecord() {
    const modal = createChatLuongFormModal('Thêm Bờ bao', null);
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.style.display = 'flex';
    }, 10);
}

// Sửa bản ghi
function editChatLuongRecord() {
    if (!selectedChatLuongRow) {
        alert('Vui lòng chọn một dòng để sửa');
        return;
    }
    const modal = createChatLuongFormModal('Sửa Bờ bao', selectedChatLuongRow);
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.style.display = 'flex';
    }, 10);
}

// Xóa bản ghi
function deleteChatLuongRecord() {
    if (!selectedChatLuongRow) {
        alert('Vui lòng chọn một dòng để xóa');
        return;
    }
    const label = selectedChatLuongRow.name || selectedChatLuongRow.id;
    if (confirm(`Bạn có chắc chắn muốn xóa bản ghi "${label}"?`)) {
        deleteChatLuongFromServer(selectedChatLuongRow.id);
    }
}

// Tạo modal form cho Bờ bao
function createChatLuongFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.editId = data.id;
    } else {
        modal.dataset.editMode = 'false';
    }

    const coordinatesValue = (data && data.geometry && data.geometry.type === 'LineString') ?
        JSON.stringify(data.geometry.coordinates) : '';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form class="modal-form" onsubmit="handleChatLuongFormSubmit(event)">
                <div class="form-group">
                    <label for="chatluong-name">Tên:</label>
                    <input type="text" id="chatluong-name" name="name" value="${data ? (data.name || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="chatluong-layer">Layer:</label>
                    <input type="text" id="chatluong-layer" name="layer" value="${data ? (data.layer || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="chatluong-kml_folder">KML Folder:</label>
                    <input type="text" id="chatluong-kml_folder" name="kml_folder" value="${data ? (data.kml_folder || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="chatluong-kind_id">Kind ID:</label>
                    <input type="number" id="chatluong-kind_id" name="kind_id" value="${data && typeof data.kind_id !== 'undefined' ? data.kind_id : ''}" placeholder="VD: 2">
                </div>
                <div class="form-group">
                    <label for="chatluong-coordinates">Tọa độ LineString (VN2000 - [x, y]):</label>
                    <textarea id="chatluong-coordinates" name="coordinates" rows="5" placeholder='VD: [[606000.00,1067000.00],[606100.00,1066900.00]]'>${coordinatesValue}</textarea>
                    <small>Nhập mảng các cặp [x, y] theo VN2000. Server sẽ chuyển đổi sang WGS84.</small>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-cancel">Hủy</button>
                    <button type="submit" class="btn-submit">${data ? 'Cập nhật' : 'Thêm'}</button>
                </div>
            </form>
        </div>
    `;

    return modal;
}

// Submit form
function handleChatLuongFormSubmit(event) {
    event.preventDefault();

    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const editId = modal.dataset.editId;

    const formData = new FormData(event.target);
    const raw = Object.fromEntries(formData.entries());

    // Xây dựng payload chuẩn cho API
    const payload = {
        name: raw.name || '',
        layer: raw.layer || null,
        kml_folder: raw.kml_folder || null,
        kind_id: raw.kind_id !== '' && raw.kind_id !== undefined ? Number(raw.kind_id) : null
    };

    // Parse coordinates nếu có
    if (raw.coordinates && raw.coordinates.trim() !== '') {
        try {
            const coords = JSON.parse(raw.coordinates);
            if (Array.isArray(coords)) {
                payload.geometry = { type: 'LineString', coordinates: coords };
            }
        } catch (e) {
            alert('Tọa độ không hợp lệ. Vui lòng nhập JSON hợp lệ cho coordinates.');
            return;
        }
    }

    if (isEditMode && editId) {
        updateChatLuongOnServer(editId, payload);
    } else {
        addChatLuongToServer(payload);
    }

    modal.remove();
}

// Gọi API thêm
async function addChatLuongToServer(data) {
    try {
        const response = await fetch('/api/chat-luong', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Thêm bản ghi Bờ bao thành công!');
            const pageSizeInput = document.getElementById('chatluong-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowChatLuong(pageSize);
        } else {
            alert('Lỗi khi thêm Bờ bao: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi thêm Bờ bao:', error);
        alert('Lỗi kết nối khi thêm Bờ bao');
    }
}

// Gọi API cập nhật
async function updateChatLuongOnServer(id, data) {
    try {
        const response = await fetch(`/api/chat-luong/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Cập nhật Bờ bao thành công!');
            const pageSizeInput = document.getElementById('chatluong-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowChatLuong(pageSize);
        } else {
            alert('Lỗi khi cập nhật Bờ bao: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật Bờ bao:', error);
        alert('Lỗi kết nối khi cập nhật Bờ bao');
    }
}

// Gọi API xóa
async function deleteChatLuongFromServer(id) {
    try {
        const response = await fetch(`/api/chat-luong/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (response.ok) {
            alert('Xóa Bờ bao thành công!');
            selectedChatLuongRow = null;
            const pageSizeInput = document.getElementById('chatluong-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowChatLuong(pageSize);
        } else {
            alert('Lỗi khi xóa Bờ bao: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi xóa Bờ bao:', error);
        alert('Lỗi kết nối khi xóa Bờ bao');
    }
}

// Hàm để thiết lập drag and drop cho bảng Bờ bao
function setupChatLuongDragAndDrop() {
    const container = document.getElementById('chatluong-table-container');
    const header = document.getElementById('chatluong-table-header');

    if (!container || !header) return;

    // Bắt đầu drag
    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return; // Không drag khi click vào button, input hoặc resize handle
        }

        isDraggingChatLuong = true;
        const rect = container.getBoundingClientRect();
        dragOffsetChatLuong.x = e.clientX - rect.left;
        dragOffsetChatLuong.y = e.clientY - rect.top;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingChatLuong) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetChatLuong.x;
        let newY = e.clientY - dragOffsetChatLuong.y;

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
        if (isDraggingChatLuong) {
            isDraggingChatLuong = false;
            container.style.cursor = 'move';
        }
    });
}

// Hàm để thiết lập resize cho bảng Bờ bao
function setupChatLuongResize() {
    const container = document.getElementById('chatluong-table-container');
    const resizeHandles = container.querySelectorAll('.resize-handle');

    if (!container || !resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingChatLuong = true;
            resizeDirectionChatLuong = handle.className.split(' ')[1]; // Lấy direction từ class
            const rect = container.getBoundingClientRect();

            resizeStartChatLuong = {
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
        if (!isResizingChatLuong) return;

        const deltaX = e.clientX - resizeStartChatLuong.x;
        const deltaY = e.clientY - resizeStartChatLuong.y;

        let newWidth = resizeStartChatLuong.width;
        let newHeight = resizeStartChatLuong.height;
        let newLeft = resizeStartChatLuong.left;
        let newTop = resizeStartChatLuong.top;

        // Xử lý resize theo hướng
        if (resizeDirectionChatLuong.includes('e')) {
            newWidth = Math.max(400, resizeStartChatLuong.width + deltaX);
        }
        if (resizeDirectionChatLuong.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartChatLuong.width - 400);
            newWidth = resizeStartChatLuong.width - widthChange;
            newLeft = resizeStartChatLuong.left + widthChange;
        }
        if (resizeDirectionChatLuong.includes('s')) {
            newHeight = Math.max(300, resizeStartChatLuong.height + deltaY);
        }
        if (resizeDirectionChatLuong.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartChatLuong.height - 300);
            newHeight = resizeStartChatLuong.height - heightChange;
            newTop = resizeStartChatLuong.top + heightChange;
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
        if (isResizingChatLuong) {
            isResizingChatLuong = false;
            document.body.style.cursor = '';
        }
    });
}

// Khởi tạo table Bờ bao
function renderChatLuongPagination(pagination) {
    const paginationContainer = document.getElementById('chatluong-pagination');
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
            if (isCoordinateSearchChatLuong) {
                const searchInput = document.getElementById('chatluong-search-input');
                const coords = parseChatLuongCoordinateSearch(searchInput ? searchInput.value : '');
                const pageSizeInput = document.getElementById('chatluong-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || currentChatLuongPageSize;
                if (coords) {
                    searchChatLuongByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, targetPage);
                    return;
                }
            }
            updateChatLuongData(targetPage);
        });
        return btn;
    };

    paginationContainer.appendChild(createBtn('«', Math.max(1, currentPage - 1), currentPage === 1));

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) {
        paginationContainer.appendChild(createBtn(String(p), p, false, p === currentPage));
    }

    paginationContainer.appendChild(createBtn('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
}

function searchChatLuongData() {
    const searchInput = document.getElementById('chatluong-search-input');
    const query = (searchInput?.value || '').trim();
    if (!query) {
        isCoordinateSearchChatLuong = false;
        updateChatLuongTable(originalChatLuongData, { page: currentChatLuongPage, pageSize: currentChatLuongPageSize, totalPages: 1 });
        return;
    }

    // Yêu cầu nhập đủ cả lng và lat: nếu chỉ là một số (không có dấu phẩy) thì cảnh báo
    const onlyNumber = !query.includes(',') && !Number.isNaN(parseFloat(query));
    if (onlyNumber) {
        isCoordinateSearchChatLuong = false;
        alert('Vui lòng nhập đủ kinh độ (lng) và vĩ độ (lat), ví dụ: 10.12345, 106.12345');
        return;
    }

    // Thử parse tọa độ
    const coords = parseChatLuongCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchChatLuong = true;
        const pageSizeInput = document.getElementById('chatluong-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchChatLuongByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi khi tìm kiếm Bờ bao theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }

    // Tìm kiếm text thường
    const q = query.toLowerCase();
    const filtered = originalChatLuongData.filter(item => {
        return (
            (item.id && item.id.toString().includes(q)) ||
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.layer && item.layer.toLowerCase().includes(q)) ||
            (item.kml_folder && item.kml_folder.toLowerCase().includes(q)) ||
            (item.geometry && item.geometry.coordinates &&
                (item.geometry.coordinates[0]?.[0]?.toString().includes(q) ||
                    item.geometry.coordinates[0]?.[1]?.toString().includes(q)))
        );
    });
    updateChatLuongTable(filtered, { page: 1, pageSize: filtered.length, totalPages: 1 });
}

// Parse input: "lat, lng" hoặc "lng, lat" hoặc có radius
function parseChatLuongCoordinateSearch(input) {
    const trimmed = (input || '').trim();
    const m = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)(?:\s*,\s*(\d+\.?\d*))?$/);
    if (!m) return null;
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    let lat = a;
    let lng = b;
    if (Math.abs(a) > 90 && Math.abs(a) <= 180 && Math.abs(b) <= 90) {
        lat = b;
        lng = a;
    }
    return {
        lat,
        lng,
        radius: m[3] ? parseFloat(m[3]) : 0.01
    };
}

// Gọi API search theo tọa độ (WGS84)
async function searchChatLuongByCoordinates(lat, lng, radius = 0.01, pageSize = currentChatLuongPageSize, page = 1) {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        page: String(page),
        pageSize: String(pageSize),
        fromSrid: '9209',
        toSrid: '4326'
    });
    const res = await fetch(`/api/chat-luong/search?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || ('HTTP ' + res.status));
    }
    const json = await res.json();
    updateChatLuongTable(json.data || [], json.pagination || undefined);
}

function initChatLuongTable() {
    // Thiết lập drag and drop
    setupChatLuongDragAndDrop();

    // Thiết lập resize
    setupChatLuongResize();

    // Khởi tạo trạng thái ban đầu
    updateChatLuongTableToggleButtons();
}

// Export các function ra window object
window.updateChatLuongTable = updateChatLuongTable;
window.updateChatLuongData = updateChatLuongData;
window.toggleChatLuongTable = toggleChatLuongTable;
window.closeChatLuongTable = closeChatLuongTable;
window.updateChatLuongTableToggleButtons = updateChatLuongTableToggleButtons;
window.setupChatLuongDragAndDrop = setupChatLuongDragAndDrop;
window.setupChatLuongResize = setupChatLuongResize;
window.initChatLuongTable = initChatLuongTable;
window.canChatLuongToggleOff = canChatLuongToggleOff;

// Export CRUD helpers
window.addChatLuongRecord = addChatLuongRecord;
window.editChatLuongRecord = editChatLuongRecord;
window.deleteChatLuongRecord = deleteChatLuongRecord;
window.handleChatLuongFormSubmit = handleChatLuongFormSubmit;
window.selectChatLuongRow = selectChatLuongRow;
window.searchChatLuongData = searchChatLuongData;
window.searchChatLuongByCoordinates = searchChatLuongByCoordinates;
