// ===== TABLE NGẬP LỤT - LOGIC ===== //

// Biến để lưu trạng thái drag
let isDraggingNgaplut = false;
let dragOffsetNgaplut = { x: 0, y: 0 };

// Biến để lưu trạng thái resize
let isResizingNgaplut = false;
let resizeDirectionNgaplut = '';
let resizeStartNgaplut = { x: 0, y: 0, width: 0, height: 0 };

// Biến để theo dõi trạng thái bảng
let isNgaplutTableOpen = false;

// Trạng thái phân trang hiện tại
let currentNgaplutPage = 1;
let currentNgaplutPageSize = 100;

// CRUD state
let selectedNgaplutRow = null;
let currentNgaplutData = [];
let originalNgaplutData = [];

// Hàm cập nhật bảng dữ liệu ngập lụt
function updateNgaplutTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('ngaplut-table-container');
        const table = document.getElementById('ngaplut-table');
        const tbody = table.querySelector('tbody');

        if (pagination) {
            currentNgaplutPage = Number(pagination.page) || currentNgaplutPage;
            currentNgaplutPageSize = Number(pagination.pageSize) || currentNgaplutPageSize;
        }

        // console.log('Table container:', tableContainer);
        // console.log('Table:', table);
        // console.log('Tbody:', tbody);
        // console.log('Data to display:', data);

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng ngập lụt');
            return;
        }

        // Lưu dữ liệu hiện tại và sort theo id tăng dần
        currentNgaplutData = data || [];
        if (!originalNgaplutData.length) {
            originalNgaplutData = [...currentNgaplutData];
        }

        tbody.innerHTML = '';
        currentNgaplutData.slice().sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0)).forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.id = item.id;
            row.dataset.index = index;
            row.addEventListener('click', function () { selectNgaplutRow(this, item); });

            row.innerHTML = `
                <td>${item.id || ''}</td>
                <td>${item.mean_value ? item.mean_value.toFixed(4) : ''}</td>
                <td>${item.shape_length ? item.shape_length.toFixed(2) : ''}</td>
                <td>${item.shape_area ? item.shape_area.toFixed(2) : ''}</td>
                <td>${item.layer || ''}</td>
            `;
            tbody.appendChild(row);
        });

        // Render phân trang
        renderNgaplutPagination(pagination);

        console.log('Đã cập nhật bảng ngập lụt với', currentNgaplutData.length, 'dòng dữ liệu');
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng ngập lụt:', error);
    }
}

// Hàm để người dùng cập nhật pageSize từ giao diện
function updateNgaplutData(page = currentNgaplutPage) {
    const pageSizeInput = document.getElementById('ngaplut-pageSize');
    const pageSize = parseInt(pageSizeInput.value) || 100;

    if (pageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    console.log('Cập nhật dữ liệu ngập lụt với pageSize:', pageSize, 'page:', page);
    fetchAndShowNgaplut(pageSize, page);
}

// Hàm để mở/đóng bảng dữ liệu ngập lụt
function toggleNgaplutTable() {
    const container = document.getElementById('ngaplut-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="ngaplut"]');

    if (container.style.display === 'none' || container.style.display === '') {
        // Mở bảng
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isNgaplutTableOpen = true;

        // Tự động fetch dữ liệu khi mở bảng
        const pageSizeInput = document.getElementById('ngaplut-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        fetchAndShowNgaplut(pageSize);

        console.log('Đã mở bảng dữ liệu ngập lụt');
    } else {
        // Đóng bảng
        closeNgaplutTable();
    }
}

// Hàm để đóng bảng dữ liệu ngập lụt
function closeNgaplutTable() {
    const container = document.getElementById('ngaplut-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="ngaplut"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isNgaplutTableOpen = false;
    console.log('Đã đóng bảng dữ liệu ngập lụt');
}

// Hàm để enable/disable nút toggle bảng dữ liệu
function updateNgaplutTableToggleButtons() {
    const toggleNgaplut = document.getElementById('toggleNgaplut');
    const toggleNgaplutTable = document.querySelector('.table-toggle-btn[data-layer="ngaplut"]');

    if (toggleNgaplut && toggleNgaplutTable) {
        if (toggleNgaplut.checked) {
            toggleNgaplutTable.disabled = false;
            toggleNgaplutTable.style.opacity = '1';
        } else {
            toggleNgaplutTable.disabled = true;
            toggleNgaplutTable.style.opacity = '0.5';
            // Đóng bảng nếu layer bị tắt
            closeNgaplutTable();
        }
    }
}

// Hàm kiểm tra xem có thể tắt toggle hay không
function canNgaplutToggleOff() {
    return !isNgaplutTableOpen;
}

// Hàm để thiết lập drag and drop cho bảng ngập lụt
function setupNgaplutDragAndDrop() {
    const container = document.getElementById('ngaplut-table-container');
    const header = document.getElementById('ngaplut-table-header');

    if (!container || !header) return;

    // Bắt đầu drag
    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return; // Không drag khi click vào button, input hoặc resize handle
        }

        isDraggingNgaplut = true;
        const rect = container.getBoundingClientRect();
        dragOffsetNgaplut.x = e.clientX - rect.left;
        dragOffsetNgaplut.y = e.clientY - rect.top;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingNgaplut) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetNgaplut.x;
        let newY = e.clientY - dragOffsetNgaplut.y;

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
        if (isDraggingNgaplut) {
            isDraggingNgaplut = false;
            container.style.cursor = 'move';
        }
    });
}

// Hàm để thiết lập resize cho bảng ngập lụt
function setupNgaplutResize() {
    const container = document.getElementById('ngaplut-table-container');
    const resizeHandles = container.querySelectorAll('.resize-handle');

    if (!container || !resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingNgaplut = true;
            resizeDirectionNgaplut = handle.className.split(' ')[1]; // Lấy direction từ class
            const rect = container.getBoundingClientRect();

            resizeStartNgaplut = {
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
        if (!isResizingNgaplut) return;

        const deltaX = e.clientX - resizeStartNgaplut.x;
        const deltaY = e.clientY - resizeStartNgaplut.y;

        let newWidth = resizeStartNgaplut.width;
        let newHeight = resizeStartNgaplut.height;
        let newLeft = resizeStartNgaplut.left;
        let newTop = resizeStartNgaplut.top;

        // Xử lý resize theo hướng
        if (resizeDirectionNgaplut.includes('e')) {
            newWidth = Math.max(400, resizeStartNgaplut.width + deltaX);
        }
        if (resizeDirectionNgaplut.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartNgaplut.width - 400);
            newWidth = resizeStartNgaplut.width - widthChange;
            newLeft = resizeStartNgaplut.left + widthChange;
        }
        if (resizeDirectionNgaplut.includes('s')) {
            newHeight = Math.max(300, resizeStartNgaplut.height + deltaY);
        }
        if (resizeDirectionNgaplut.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartNgaplut.height - 300);
            newHeight = resizeStartNgaplut.height - heightChange;
            newTop = resizeStartNgaplut.top + heightChange;
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
        if (isResizingNgaplut) {
            isResizingNgaplut = false;
            document.body.style.cursor = '';
        }
    });
}

// CRUD: chọn dòng
function selectNgaplutRow(row, data) {
    const all = document.querySelectorAll('#ngaplut-table tbody tr');
    all.forEach(r => r.classList.remove('selected-row'));
    row.classList.add('selected-row');
    selectedNgaplutRow = data;
    updateNgaplutActionButtons();
}

function updateNgaplutActionButtons() {
    const container = document.getElementById('ngaplut-table-container');
    if (!container) return;
    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');
    if (editBtn && deleteBtn) {
        const has = selectedNgaplutRow !== null;
        editBtn.disabled = !has;
        deleteBtn.disabled = !has;
    }
}

function createNgaplutFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.editId = data.id;
    } else {
        modal.dataset.editMode = 'false';
    }
    const coordinatesValue = (data && data.geometry && data.geometry.type === 'MultiPolygon') ? JSON.stringify(data.geometry.coordinates) : '';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form class="modal-form" onsubmit="handleNgaplutFormSubmit(event)">
                <div class="form-group">
                    <label for="ngaplut-mean_value">Giá trị trung bình:</label>
                    <input type="number" id="ngaplut-mean_value" name="mean_value" step="0.0001" value="${data ? (data.mean_value || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="ngaplut-shape_length">Chiều dài (m):</label>
                    <input type="number" id="ngaplut-shape_length" name="shape_length" step="0.01" value="${data ? (data.shape_length || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="ngaplut-shape_area">Diện tích (m²):</label>
                    <input type="number" id="ngaplut-shape_area" name="shape_area" step="0.01" value="${data ? (data.shape_area || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="ngaplut-layer">Lớp:</label>
                    <input type="text" id="ngaplut-layer" name="layer" value="${data ? (data.layer || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="ngaplut-coordinates">Tọa độ MultiPolygon (VN2000 - [[[x, y]]]):</label>
                    <textarea id="ngaplut-coordinates" name="coordinates" rows="5" placeholder='VD: [[[[606000.00,1067000.00],[606100.00,1066900.00]]]]'>${coordinatesValue}</textarea>
                    <small>Nhập mảng các polygon với tọa độ VN2000. Server sẽ chuyển đổi sang WGS84. Mỗi polygon là mảng các điểm [x, y].</small>
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

function addNgaplutRecord() {
    const modal = createNgaplutFormModal('Thêm Ngập lụt', null);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function editNgaplutRecord() {
    if (!selectedNgaplutRow) { alert('Vui lòng chọn một dòng để sửa'); return; }
    const modal = createNgaplutFormModal('Sửa Ngập lụt', selectedNgaplutRow);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function deleteNgaplutRecord() {
    if (!selectedNgaplutRow) { alert('Vui lòng chọn một dòng để xóa'); return; }
    const label = selectedNgaplutRow.layer || selectedNgaplutRow.id;
    if (confirm(`Bạn có chắc chắn muốn xóa bản ghi "${label}"?`)) {
        deleteNgaplutFromServer(selectedNgaplutRow.id);
    }
}

function handleNgaplutFormSubmit(event) {
    event.preventDefault();
    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const editId = modal.dataset.editId;
    const formData = new FormData(event.target);
    const raw = Object.fromEntries(formData.entries());

    const payload = {
        mean_value: parseFloat(raw.mean_value) || 0,
        shape_length: parseFloat(raw.shape_length) || 0,
        shape_area: parseFloat(raw.shape_area) || 0,
        layer: raw.layer || null
    };

    if (raw.coordinates && raw.coordinates.trim() !== '') {
        try {
            const coords = JSON.parse(raw.coordinates);
            if (Array.isArray(coords)) {
                payload.geometry = { type: 'MultiPolygon', coordinates: coords };
            }
        } catch (e) {
            alert('Tọa độ không hợp lệ. Vui lòng nhập JSON hợp lệ cho coordinates.');
            return;
        }
    }

    if (isEditMode && editId) {
        updateNgaplutOnServer(editId, payload);
    } else {
        addNgaplutToServer(payload);
    }

    modal.remove();
}

async function addNgaplutToServer(data) {
    try {
        const response = await fetch('/api/ngaplut', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            alert('Thêm Ngập lụt thành công!');
            const pageSizeInput = document.getElementById('ngaplut-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowNgaplut(pageSize, currentNgaplutPage);
        } else { alert('Lỗi khi thêm Ngập lụt: ' + response.statusText); }
    } catch (error) { console.error('Lỗi khi thêm Ngập lụt:', error); alert('Lỗi kết nối khi thêm Ngập lụt'); }
}

async function updateNgaplutOnServer(id, data) {
    try {
        const response = await fetch(`/api/ngaplut/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            alert('Cập nhật Ngập lụt thành công!');
            const pageSizeInput = document.getElementById('ngaplut-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowNgaplut(pageSize, currentNgaplutPage);
        } else { alert('Lỗi khi cập nhật Ngập lụt: ' + response.statusText); }
    } catch (error) { console.error('Lỗi khi cập nhật Ngập lụt:', error); alert('Lỗi kết nối khi cập nhật Ngập lụt'); }
}

async function deleteNgaplutFromServer(id) {
    try {
        const response = await fetch(`/api/ngaplut/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (response.ok) {
            alert('Xóa Ngập lụt thành công!');
            selectedNgaplutRow = null;
            const pageSizeInput = document.getElementById('ngaplut-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowNgaplut(pageSize, currentNgaplutPage);
        } else { alert('Lỗi khi xóa Ngập lụt: ' + response.statusText); }
    } catch (error) { console.error('Lỗi khi xóa Ngập lụt:', error); alert('Lỗi kết nối khi xóa Ngập lụt'); }
}

function renderNgaplutPagination(pagination) {
    const paginationContainer = document.getElementById('ngaplut-pagination');
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
        btn.addEventListener('click', () => updateNgaplutData(targetPage));
        return btn;
    };
    paginationContainer.appendChild(createBtn('«', Math.max(1, currentPage - 1), currentPage === 1));
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) { paginationContainer.appendChild(createBtn(String(p), p, false, p === currentPage)); }
    paginationContainer.appendChild(createBtn('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
}

function searchNgaplutData() {
    const searchInput = document.getElementById('ngaplut-search-input');
    const query = (searchInput?.value || '').trim().toLowerCase();
    if (!query) {
        updateNgaplutTable(originalNgaplutData, { page: currentNgaplutPage, pageSize: currentNgaplutPageSize, totalPages: 1 });
        return;
    }
    const filtered = originalNgaplutData.filter(item => {
        return (
            (item.id && item.id.toString().includes(query)) ||
            (item.mean_value && item.mean_value.toString().includes(query)) ||
            (item.shape_length && item.shape_length.toString().includes(query)) ||
            (item.shape_area && item.shape_area.toString().includes(query)) ||
            (item.layer && item.layer.toLowerCase().includes(query)) ||
            (item.geometry && item.geometry.coordinates &&
                JSON.stringify(item.geometry.coordinates).toLowerCase().includes(query))
        );
    });
    updateNgaplutTable(filtered, { page: 1, pageSize: filtered.length, totalPages: 1 });
}

// Khởi tạo table ngập lụt
function initNgaplutTable() {
    // Thiết lập drag and drop
    setupNgaplutDragAndDrop();

    // Thiết lập resize
    setupNgaplutResize();

    // Khởi tạo trạng thái ban đầu
    updateNgaplutTableToggleButtons();
}

// Export các function ra window object
window.updateNgaplutTable = updateNgaplutTable;
window.updateNgaplutData = updateNgaplutData;
window.toggleNgaplutTable = toggleNgaplutTable;
window.closeNgaplutTable = closeNgaplutTable;
window.updateNgaplutTableToggleButtons = updateNgaplutTableToggleButtons;
window.setupNgaplutDragAndDrop = setupNgaplutDragAndDrop;
window.setupNgaplutResize = setupNgaplutResize;
window.initNgaplutTable = initNgaplutTable;
window.canNgaplutToggleOff = canNgaplutToggleOff;

// CRUD functions
window.selectNgaplutRow = selectNgaplutRow;
window.updateNgaplutActionButtons = updateNgaplutActionButtons;
window.addNgaplutRecord = addNgaplutRecord;
window.editNgaplutRecord = editNgaplutRecord;
window.deleteNgaplutRecord = deleteNgaplutRecord;
window.handleNgaplutFormSubmit = handleNgaplutFormSubmit;
window.searchNgaplutData = searchNgaplutData;
