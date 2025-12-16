// ===== TABLE ĐỘ LÚN - LOGIC ===== //

// Biến để lưu trạng thái drag
let isDraggingDoLun = false;
let dragOffsetDoLun = { x: 0, y: 0 };

// Biến để lưu trạng thái resize
let isResizingDoLun = false;
let resizeDirectionDoLun = '';
let resizeStartDoLun = { x: 0, y: 0, width: 0, height: 0 };

// Biến để theo dõi trạng thái bảng
let isDoLunTableOpen = false;

// Biến để lưu dữ liệu hiện tại và dữ liệu gốc + lựa chọn dòng
let currentDoLunData = [];
let originalDoLunData = [];
let selectedDoLunRow = null;
let isCoordinateSearchDoLun = false;

// Trạng thái phân trang hiện tại
let currentDoLunPage = 1;
let currentDoLunPageSize = 100;

// Hàm cập nhật bảng dữ liệu độ lún
function updateDoLunTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('dolun-table-container');
        const table = document.getElementById('dolun-table');
        const tbody = table.querySelector('tbody');

        if (pagination) {
            currentDoLunPage = Number(pagination.page) || currentDoLunPage;
            currentDoLunPageSize = Number(pagination.pageSize) || currentDoLunPageSize;
        }

        console.log('Table container:', tableContainer);
        console.log('Table:', table);
        console.log('Tbody:', tbody);
        console.log('Data to display:', data);

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng độ lún');
            return;
        }

        // Sắp xếp theo id tăng dần và lưu dữ liệu hiện tại
        const sortedDoLun = (data || []).slice().sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
        currentDoLunData = sortedDoLun;
        if (!originalDoLunData.length) {
            originalDoLunData = [...sortedDoLun];
        }

        tbody.innerHTML = '';
        sortedDoLun.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.id = item.id;
            row.dataset.index = index;

            row.innerHTML = `
                <td>${item.id || ''}</td>
                <td>${item.gridcode || ''}</td>
                <td>${item.shape_area ? Number(item.shape_area).toFixed(2) : ''}</td>
                <td>${item.layer || ''}</td>
                <td>${item.geometry ? `${item.geometry.coordinates[0]?.[0]?.[0]?.toFixed(6) || ''}, ${item.geometry.coordinates[0]?.[0]?.[1]?.toFixed(6) || ''}` : ''}</td>
            `;

            row.addEventListener('click', function () {
                selectDoLunRow(this, item);
            });

            tbody.appendChild(row);
        });

        updateDoLunActionButtons();

        // Render phân trang nếu có
        renderDoLunPagination(pagination);

        console.log('Đã cập nhật bảng độ lún với', data.length, 'dòng dữ liệu');
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng độ lún:', error);
    }
}

// Hàm để người dùng cập nhật pageSize từ giao diện
function updateDoLunData(page = currentDoLunPage) {
    const pageSizeInput = document.getElementById('dolun-pageSize');
    const newPageSize = parseInt(pageSizeInput.value) || 100;

    if (newPageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    if (isCoordinateSearchDoLun) {
        const input = document.getElementById('dolun-search-input');
        const coords = parseDoLunCoordinateSearch(input ? input.value : '');
        if (coords) {
            searchDoLunByCoordinates(coords.lat, coords.lng, coords.radius, newPageSize, page);
            return;
        }
    }

    // Frontend không tự tính lại page nữa; backend chuẩn hóa phân trang
    console.log('Cập nhật dữ liệu độ lún với pageSize:', newPageSize, 'page:', page);
    fetchAndShowDoLun(newPageSize, page);
}

// Hàm parse toạ độ
function parseDoLunCoordinateSearch(input) {
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

// Gọi API tìm theo toạ độ
async function searchDoLunByCoordinates(lat, lng, radius = 0.01, pageSize = currentDoLunPageSize, page = 1) {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        page: String(page),
        pageSize: String(pageSize)
    });
    const res = await fetch(`/api/dolun-velo/search?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || ('HTTP ' + res.status));
    }
    const json = await res.json();
    isCoordinateSearchDoLun = true;
    updateDoLunTable(json.data || [], json.pagination || undefined);
}

function searchDoLunData() {
    const searchInput = document.getElementById('dolun-search-input');
    const query = (searchInput?.value || '').trim();
    if (!query) {
        isCoordinateSearchDoLun = false;
        updateDoLunTable(originalDoLunData, { page: currentDoLunPage, pageSize: currentDoLunPageSize, totalPages: 1 });
        return;
    }

    const coords = parseDoLunCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchDoLun = true;
        const pageSizeInput = document.getElementById('dolun-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchDoLunByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi tìm kiếm độ lún theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }

    const q = query.toLowerCase();
    const filtered = originalDoLunData.filter(item => {
        return (
            (item.id && item.id.toString().includes(q)) ||
            (item.gridcode && item.gridcode.toString().includes(q)) ||
            (item.layer && item.layer.toLowerCase().includes(q)) ||
            (item.geometry && item.geometry.coordinates &&
                (item.geometry.coordinates[0]?.[0]?.[0]?.toString().includes(q) ||
                    item.geometry.coordinates[0]?.[0]?.[1]?.toString().includes(q)))
        );
    });
    updateDoLunTable(filtered, { page: 1, pageSize: filtered.length, totalPages: 1 });
}

// Hàm để mở/đóng bảng dữ liệu độ lún
function toggleDoLunTable() {
    const container = document.getElementById('dolun-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="dolun"]');

    if (container.style.display === 'none' || container.style.display === '') {
        // Mở bảng
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isDoLunTableOpen = true;

        // Tự động fetch dữ liệu khi mở bảng
        const pageSizeInput = document.getElementById('dolun-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        fetchAndShowDoLun(pageSize);

        console.log('Đã mở bảng dữ liệu độ lún');
    } else {
        // Đóng bảng
        closeDoLunTable();
    }
}

// Hàm để đóng bảng dữ liệu độ lún
function closeDoLunTable() {
    const container = document.getElementById('dolun-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="dolun"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isDoLunTableOpen = false;
    console.log('Đã đóng bảng dữ liệu độ lún');
}

// Hàm để enable/disable nút toggle bảng dữ liệu
function updateDoLunTableToggleButtons() {
    const toggleDoLun = document.getElementById('toggleDoLun');
    const toggleDoLunTable = document.querySelector('.table-toggle-btn[data-layer="dolun"]');

    if (toggleDoLun && toggleDoLunTable) {
        if (toggleDoLun.checked) {
            toggleDoLunTable.disabled = false;
            toggleDoLunTable.style.opacity = '1';
        } else {
            toggleDoLunTable.disabled = true;
            toggleDoLunTable.style.opacity = '0.5';
            // Đóng bảng nếu layer bị tắt
            closeDoLunTable();
        }
    }
}

// Hàm kiểm tra xem có thể tắt toggle hay không
function canDoLunToggleOff() {
    return !isDoLunTableOpen;
}

// ==== CRUD giống bảng Chất lượng/Đê bao ====
function selectDoLunRow(row, data) {
    const allRows = document.querySelectorAll('#dolun-table tbody tr');
    allRows.forEach(r => r.classList.remove('selected-row'));

    row.classList.add('selected-row');
    selectedDoLunRow = data;

    updateDoLunActionButtons();
}

function updateDoLunActionButtons() {
    const container = document.getElementById('dolun-table-container');
    if (!container) return;

    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');

    if (editBtn && deleteBtn) {
        const hasSelection = selectedDoLunRow !== null;
        editBtn.disabled = !hasSelection;
        deleteBtn.disabled = !hasSelection;
    }
}

function addDoLunRecord() {
    const modal = createDoLunFormModal('Thêm Độ lún', null);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function editDoLunRecord() {
    if (!selectedDoLunRow) {
        alert('Vui lòng chọn một dòng để sửa');
        return;
    }
    const modal = createDoLunFormModal('Sửa Độ lún', selectedDoLunRow);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function deleteDoLunRecord() {
    if (!selectedDoLunRow) {
        alert('Vui lòng chọn một dòng để xóa');
        return;
    }
    const label = selectedDoLunRow.layer || selectedDoLunRow.id;
    if (confirm(`Bạn có chắc chắn muốn xóa bản ghi "${label}"?`)) {
        deleteDoLunFromServer(selectedDoLunRow.id);
    }
}

function createDoLunFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.editId = data.id;
    } else {
        modal.dataset.editMode = 'false';
    }

    const coordinatesValue = (data && data.geometry && data.geometry.type === 'Polygon') ? JSON.stringify(data.geometry.coordinates) : '';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form class="modal-form" onsubmit="handleDoLunFormSubmit(event)">
                <div class="form-group">
                    <label for="dolun-gridcode">Grid Code:</label>
                    <input type="number" id="dolun-gridcode" name="gridcode" value="${data && typeof data.gridcode !== 'undefined' ? data.gridcode : ''}">
                </div>
                <div class="form-group">
                    <label for="dolun-shape_area">Shape Area:</label>
                    <input type="number" step="0.01" id="dolun-shape_area" name="shape_area" value="${data && typeof data.shape_area !== 'undefined' ? data.shape_area : ''}">
                </div>
                <div class="form-group">
                    <label for="dolun-layer">Layer:</label>
                    <input type="text" id="dolun-layer" name="layer" value="${data ? (data.layer || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="dolun-kind_id">Kind ID:</label>
                    <input type="number" id="dolun-kind_id" name="kind_id" value="${data && typeof data.kind_id !== 'undefined' ? data.kind_id : ''}">
                </div>
                <div class="form-group">
                    <label for="dolun-coordinates">Tọa độ Polygon (VN2000 - [[x,y], ...]):</label>
                    <textarea id="dolun-coordinates" name="coordinates" rows="6" placeholder='VD: [[[606000,1067000],[606100,1066900],[606050,1066950],[606000,1067000]]]'>${coordinatesValue}</textarea>
                    <small>Nhập mảng toạ độ VN2000 theo GeoJSON Polygon. Server sẽ chuyển sang WGS84.</small>
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

function handleDoLunFormSubmit(event) {
    event.preventDefault();

    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const editId = modal.dataset.editId;

    const formData = new FormData(event.target);
    const raw = Object.fromEntries(formData.entries());

    const payload = {
        gridcode: raw.gridcode !== '' && raw.gridcode !== undefined ? Number(raw.gridcode) : null,
        shape_area: raw.shape_area !== '' && raw.shape_area !== undefined ? Number(raw.shape_area) : null,
        layer: raw.layer || null,
        kind_id: raw.kind_id !== '' && raw.kind_id !== undefined ? Number(raw.kind_id) : null
    };

    if (raw.coordinates && raw.coordinates.trim() !== '') {
        try {
            const coords = JSON.parse(raw.coordinates);
            if (Array.isArray(coords)) {
                payload.geometry = { type: 'Polygon', coordinates: coords };
            }
        } catch (e) {
            alert('Tọa độ không hợp lệ. Vui lòng nhập JSON hợp lệ cho coordinates.');
            return;
        }
    }

    if (isEditMode && editId) {
        updateDoLunOnServer(editId, payload);
    } else {
        addDoLunToServer(payload);
    }

    modal.remove();
}

async function addDoLunToServer(data) {
    try {
        const response = await fetch('/api/dolun-velo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Thêm bản ghi Độ lún thành công!');
            const pageSizeInput = document.getElementById('dolun-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowDoLun(pageSize);
        } else {
            alert('Lỗi khi thêm Độ lún: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi thêm Độ lún:', error);
        alert('Lỗi kết nối khi thêm Độ lún');
    }
}

async function updateDoLunOnServer(id, data) {
    try {
        const response = await fetch(`/api/dolun-velo/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Cập nhật Độ lún thành công!');
            const pageSizeInput = document.getElementById('dolun-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowDoLun(pageSize);
        } else {
            alert('Lỗi khi cập nhật Độ lún: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật Độ lún:', error);
        alert('Lỗi kết nối khi cập nhật Độ lún');
    }
}

async function deleteDoLunFromServer(id) {
    try {
        const response = await fetch(`/api/dolun-velo/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (response.ok) {
            alert('Xóa Độ lún thành công!');
            selectedDoLunRow = null;
            const pageSizeInput = document.getElementById('dolun-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowDoLun(pageSize);
        } else {
            alert('Lỗi khi xóa Độ lún: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi xóa Độ lún:', error);
        alert('Lỗi kết nối khi xóa Độ lún');
    }
}

// Export CRUD helpers
window.addDoLunRecord = addDoLunRecord;
window.editDoLunRecord = editDoLunRecord;
window.deleteDoLunRecord = deleteDoLunRecord;
window.handleDoLunFormSubmit = handleDoLunFormSubmit;
window.selectDoLunRow = selectDoLunRow;

function setupDoLunDragAndDrop() {
    const container = document.getElementById('dolun-table-container');
    const header = document.getElementById('dolun-table-header');

    if (!container || !header) return;

    // Bắt đầu drag
    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return; // Không drag khi click vào button, input hoặc resize handle
        }

        isDraggingDoLun = true;
        const rect = container.getBoundingClientRect();
        dragOffsetDoLun.x = e.clientX - rect.left;
        dragOffsetDoLun.y = e.clientY - rect.top;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingDoLun) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetDoLun.x;
        let newY = e.clientY - dragOffsetDoLun.y;

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
        if (isDraggingDoLun) {
            isDraggingDoLun = false;
            container.style.cursor = 'move';
        }
    });
}

// Hàm để thiết lập resize cho bảng độ lún
function setupDoLunResize() {
    const container = document.getElementById('dolun-table-container');
    const resizeHandles = container.querySelectorAll('.resize-handle');

    if (!container || !resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingDoLun = true;
            resizeDirectionDoLun = handle.className.split(' ')[1]; // Lấy direction từ class
            const rect = container.getBoundingClientRect();

            resizeStartDoLun = {
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
        if (!isResizingDoLun) return;

        const deltaX = e.clientX - resizeStartDoLun.x;
        const deltaY = e.clientY - resizeStartDoLun.y;

        let newWidth = resizeStartDoLun.width;
        let newHeight = resizeStartDoLun.height;
        let newLeft = resizeStartDoLun.left;
        let newTop = resizeStartDoLun.top;

        // Xử lý resize theo hướng
        if (resizeDirectionDoLun.includes('e')) {
            newWidth = Math.max(400, resizeStartDoLun.width + deltaX);
        }
        if (resizeDirectionDoLun.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartDoLun.width - 400);
            newWidth = resizeStartDoLun.width - widthChange;
            newLeft = resizeStartDoLun.left + widthChange;
        }
        if (resizeDirectionDoLun.includes('s')) {
            newHeight = Math.max(300, resizeStartDoLun.height + deltaY);
        }
        if (resizeDirectionDoLun.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartDoLun.height - 300);
            newHeight = resizeStartDoLun.height - heightChange;
            newTop = resizeStartDoLun.top + heightChange;
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
        if (isResizingDoLun) {
            isResizingDoLun = false;
            document.body.style.cursor = '';
        }
    });
}

// Phân trang
function renderDoLunPagination(pagination) {
    const paginationContainer = document.getElementById('dolun-pagination');
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
            if (isCoordinateSearchDoLun) {
                const input = document.getElementById('dolun-search-input');
                const coords = parseDoLunCoordinateSearch(input ? input.value : '');
                const pageSizeInput = document.getElementById('dolun-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || currentDoLunPageSize;
                if (coords) {
                    searchDoLunByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, targetPage);
                    return;
                }
            }
            updateDoLunData(targetPage);
        });
        return btn;
    };

    // Prev
    paginationContainer.appendChild(createBtn('«', Math.max(1, currentPage - 1), currentPage === 1));

    // Window of pages
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) {
        paginationContainer.appendChild(createBtn(String(p), p, false, p === currentPage));
    }

    // Next
    paginationContainer.appendChild(createBtn('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
}

function searchDoLunData() {
    const searchInput = document.getElementById('dolun-search-input');
    const query = (searchInput?.value || '').trim();
    if (!query) {
        isCoordinateSearchDoLun = false;
        updateDoLunTable(originalDoLunData, { page: currentDoLunPage, pageSize: currentDoLunPageSize, totalPages: 1 });
        return;
    }

    const coords = parseDoLunCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchDoLun = true;
        const pageSizeInput = document.getElementById('dolun-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchDoLunByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi tìm kiếm độ lún theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }

    const q = query.toLowerCase();
    const filtered = originalDoLunData.filter(item => {
        return (
            (item.id && item.id.toString().includes(q)) ||
            (item.gridcode && item.gridcode.toString().includes(q)) ||
            (item.layer && item.layer.toLowerCase().includes(q)) ||
            (item.geometry && item.geometry.coordinates &&
                (item.geometry.coordinates[0]?.[0]?.[0]?.toString().includes(q) ||
                    item.geometry.coordinates[0]?.[0]?.[1]?.toString().includes(q)))
        );
    });
    updateDoLunTable(filtered, { page: 1, pageSize: filtered.length, totalPages: 1 });
}

// Khởi tạo table độ lún
function initDoLunTable() {
    // Thiết lập drag and drop
    setupDoLunDragAndDrop();

    // Thiết lập resize
    setupDoLunResize();

    // Khởi tạo trạng thái ban đầu
    updateDoLunTableToggleButtons();
}

// Export các function ra window object
window.updateDoLunTable = updateDoLunTable;
window.updateDoLunData = updateDoLunData;
window.toggleDoLunTable = toggleDoLunTable;
window.closeDoLunTable = closeDoLunTable;
window.updateDoLunTableToggleButtons = updateDoLunTableToggleButtons;
window.setupDoLunDragAndDrop = setupDoLunDragAndDrop;
window.setupDoLunResize = setupDoLunResize;
window.initDoLunTable = initDoLunTable;
window.canDoLunToggleOff = canDoLunToggleOff;
window.searchDoLunData = searchDoLunData;

// Export CRUD helpers
window.addDoLunRecord = addDoLunRecord;
window.editDoLunRecord = editDoLunRecord;
window.deleteDoLunRecord = deleteDoLunRecord;
window.handleDoLunFormSubmit = handleDoLunFormSubmit;
window.selectDoLunRow = selectDoLunRow;
