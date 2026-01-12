// ===== TABLE HYDRO - LOGIC ===== //

let isDraggingHydro = false;
let dragOffsetHydro = { x: 0, y: 0 };

let isResizingHydro = false;
let resizeDirectionHydro = '';
let resizeStartHydro = { x: 0, y: 0, width: 0, height: 0 };

let isHydroTableOpen = false;

let currentHydroPage = 1;
let currentHydroPageSize = 50;
let currentHydroData = [];
let originalHydroData = [];
let selectedHydroRow = null;

function updateHydroTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('hydro-table-container');
        const table = document.getElementById('hydro-table');
        const tbody = table ? table.querySelector('tbody') : null;

        if (pagination) {
            currentHydroPage = Number(pagination.page) || currentHydroPage;
            currentHydroPageSize = Number(pagination.pageSize) || currentHydroPageSize;
        }

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng hydro');
            return;
        }

        currentHydroData = data || [];
        if (!originalHydroData.length) {
            originalHydroData = [...currentHydroData];
        }

        tbody.innerHTML = '';
        currentHydroData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.index = index;
            row.addEventListener('click', function () {
                selectHydroRow(this, item);
            });

            const timeStr = item.time ? new Date(item.time).toLocaleString('vi-VN') : '';
            const speed = item.u != null && item.v != null
                ? Math.sqrt(item.u * item.u + item.v * item.v).toFixed(3)
                : '--';

            row.innerHTML = `
                <td>${item.id ?? ''}</td>
                <td>${item.element_id ?? ''}</td>
                <td>${timeStr}</td>
                <td>${item.surface_elev != null ? item.surface_elev.toFixed(2) : '--'}</td>
                <td>${item.total_depth != null ? item.total_depth.toFixed(2) : '--'}</td>
                <td>${item.u != null ? item.u.toFixed(3) : '--'}</td>
                <td>${item.v != null ? item.v.toFixed(3) : '--'}</td>
                <td>${speed}</td>
                <td>${item.direction != null ? item.direction.toFixed(1) + '°' : '--'}</td>
            `;
            tbody.appendChild(row);
        });

        renderHydroPagination(pagination);

        const pageSizeInput = document.getElementById('hydro-pageSize');
        if (pageSizeInput && pagination && pagination.pageSize) {
            pageSizeInput.value = pagination.pageSize;
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng hydro:', error);
    }
}

function updateHydroData(page = currentHydroPage) {
    const elementsPageSizeInput = document.getElementById('elements-pageSize');
    const pageSizeInput = document.getElementById('hydro-pageSize');
    const elementsPageSize = parseInt(elementsPageSizeInput?.value) || 500;
    const newPageSize = parseInt(pageSizeInput?.value) || 50;

    if (newPageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    // Lấy thời gian filter nếu có
    const timeFilter = document.getElementById('hydro-time-filter')?.value || null;

    // Gọi function gộp để refresh cả 2 layer
    if (typeof window.fetchAndShowElementsAndHydro === 'function') {
        window.fetchAndShowElementsAndHydro(elementsPageSize, newPageSize, page, timeFilter);
    } else if (typeof window.fetchAndShowHydro === 'function') {
        // Fallback nếu function cũ vẫn còn
        window.fetchAndShowHydro(newPageSize, page, timeFilter);
    }
}

function toggleHydroTable() {
    const container = document.getElementById('hydro-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="elements-hydro"]');

    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isHydroTableOpen = true;

        const elementsPageSizeInput = document.getElementById('elements-pageSize');
        const pageSizeInput = document.getElementById('hydro-pageSize');
        const elementsPageSize = parseInt(elementsPageSizeInput?.value) || 500;
        const pageSize = parseInt(pageSizeInput?.value) || 50;

        if (typeof window.fetchAndShowElementsAndHydro === 'function') {
            window.fetchAndShowElementsAndHydro(elementsPageSize, pageSize);
        } else if (typeof window.fetchAndShowHydro === 'function') {
            window.fetchAndShowHydro(pageSize);
        }
    } else {
        closeHydroTable();
    }
}

function closeHydroTable() {
    const container = document.getElementById('hydro-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="hydro"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isHydroTableOpen = false;
}

function canHydroToggleOff() {
    return !isHydroTableOpen;
}

function selectHydroRow(row, data) {
    const allRows = document.querySelectorAll('#hydro-table tbody tr');
    allRows.forEach(r => r.classList.remove('selected-row'));
    row.classList.add('selected-row');
    selectedHydroRow = data;
    updateHydroActionButtons();
}

function updateHydroActionButtons() {
    const container = document.getElementById('hydro-table-container');
    if (!container) return;
    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');
    const hasSelection = selectedHydroRow !== null;
    if (editBtn) editBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

function setupHydroDragAndDrop() {
    const container = document.getElementById('hydro-table-container');
    const header = document.getElementById('hydro-table-header');

    if (!container || !header) return;

    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return;
        }
        isDraggingHydro = true;
        const rect = container.getBoundingClientRect();
        dragOffsetHydro.x = e.clientX - rect.left;
        dragOffsetHydro.y = e.clientY - rect.top;
        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDraggingHydro) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetHydro.x;
        let newY = e.clientY - dragOffsetHydro.y;

        const maxX = viewportWidth - containerRect.width;
        const maxY = viewportHeight - containerRect.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        container.style.position = 'fixed';
        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.transform = 'none';
    });

    document.addEventListener('mouseup', function () {
        if (isDraggingHydro) {
            isDraggingHydro = false;
            container.style.cursor = 'move';
        }
    });
}

function setupHydroResize() {
    const container = document.getElementById('hydro-table-container');
    if (!container) return;
    const resizeHandles = container.querySelectorAll('.resize-handle');
    if (!resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingHydro = true;
            resizeDirectionHydro = handle.className.split(' ')[1];
            const rect = container.getBoundingClientRect();

            resizeStartHydro = {
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

    document.addEventListener('mousemove', function (e) {
        if (!isResizingHydro) return;

        const deltaX = e.clientX - resizeStartHydro.x;
        const deltaY = e.clientY - resizeStartHydro.y;

        let newWidth = resizeStartHydro.width;
        let newHeight = resizeStartHydro.height;
        let newLeft = resizeStartHydro.left;
        let newTop = resizeStartHydro.top;

        if (resizeDirectionHydro.includes('e')) {
            newWidth = Math.max(400, resizeStartHydro.width + deltaX);
        }
        if (resizeDirectionHydro.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartHydro.width - 400);
            newWidth = resizeStartHydro.width - widthChange;
            newLeft = resizeStartHydro.left + widthChange;
        }
        if (resizeDirectionHydro.includes('s')) {
            newHeight = Math.max(300, resizeStartHydro.height + deltaY);
        }
        if (resizeDirectionHydro.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartHydro.height - 300);
            newHeight = resizeStartHydro.height - heightChange;
            newTop = resizeStartHydro.top + heightChange;
        }

        newWidth = Math.min(newWidth, window.innerWidth - 20);
        newHeight = Math.min(newHeight, window.innerHeight - 20);

        container.style.position = 'fixed';
        container.style.left = newLeft + 'px';
        container.style.top = newTop + 'px';
        container.style.width = newWidth + 'px';
        container.style.height = newHeight + 'px';
        container.style.transform = 'none';
    });

    document.addEventListener('mouseup', function () {
        if (isResizingHydro) {
            isResizingHydro = false;
            document.body.style.cursor = '';
        }
    });
}

function renderHydroPagination(pagination) {
    const paginationContainer = document.getElementById('hydro-pagination');
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
            updateHydroData(targetPage);
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

function initHydroTable() {
    setupHydroDragAndDrop();
    setupHydroResize();
}

// CRUD + search
function searchHydroData() {
    const input = document.getElementById('hydro-search-input');
    const query = (input?.value || '').trim();
    if (!query) {
        updateHydroTable(originalHydroData, {
            page: currentHydroPage,
            pageSize: currentHydroPageSize,
            totalPages: 1
        });
        return;
    }
    const q = query.toLowerCase();
    const filtered = originalHydroData.filter(it =>
        (it.id && it.id.toString().includes(q)) ||
        (it.element_id && it.element_id.toString().includes(q)) ||
        (it.time && new Date(it.time).toLocaleString('vi-VN').toLowerCase().includes(q)) ||
        (it.surface_elev != null && it.surface_elev.toString().includes(q)) ||
        (it.total_depth != null && it.total_depth.toString().includes(q)) ||
        (it.u != null && it.u.toString().includes(q)) ||
        (it.v != null && it.v.toString().includes(q)) ||
        (it.direction != null && it.direction.toString().includes(q))
    );
    updateHydroTable(filtered, {
        page: 1,
        pageSize: filtered.length || 1,
        totalPages: 1
    });
}

function createHydroFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.hydroId = data.id;
    } else {
        modal.dataset.editMode = 'false';
    }

    const timeValue = data && data.time ? new Date(data.time).toISOString().slice(0, 16) : '';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form class="modal-form" onsubmit="handleHydroFormSubmit(event)">
                <div class="form-group">
                    <label for="hydro-element_id">Element ID:</label>
                    <input type="number" id="hydro-element_id" name="element_id"
                        value="${data ? (data.element_id || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="hydro-time">Thời gian:</label>
                    <input type="datetime-local" id="hydro-time" name="time"
                        value="${timeValue}" required>
                </div>
                <div class="form-group">
                    <label for="hydro-surface_elev">Độ cao mặt nước (m):</label>
                    <input type="number" step="any" id="hydro-surface_elev" name="surface_elev"
                        value="${data ? (data.surface_elev || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="hydro-total_depth">Độ sâu tổng (m):</label>
                    <input type="number" step="any" id="hydro-total_depth" name="total_depth"
                        value="${data ? (data.total_depth || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="hydro-u">Vận tốc U (m/s):</label>
                    <input type="number" step="any" id="hydro-u" name="u"
                        value="${data ? (data.u || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="hydro-v">Vận tốc V (m/s):</label>
                    <input type="number" step="any" id="hydro-v" name="v"
                        value="${data ? (data.v || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="hydro-direction">Hướng (độ):</label>
                    <input type="number" step="any" id="hydro-direction" name="direction"
                        value="${data ? (data.direction || '') : ''}">
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

function addHydroRecord() {
    const modal = createHydroFormModal('Thêm Hydro Data mới', null);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function editHydroRecord() {
    if (!selectedHydroRow) {
        alert('Vui lòng chọn một dòng để sửa');
        return;
    }
    const modal = createHydroFormModal('Sửa Hydro Data', selectedHydroRow);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function deleteHydroRecord() {
    if (!selectedHydroRow) {
        alert('Vui lòng chọn một dòng để xóa');
        return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa Hydro Data ID "${selectedHydroRow.id}"?`)) {
        deleteHydroFromServer(selectedHydroRow.id);
    }
}

function handleHydroFormSubmit(event) {
    event.preventDefault();
    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const hydroIdAttr = modal.dataset.hydroId;

    const formData = new FormData(event.target);
    const raw = Object.fromEntries(formData.entries());

    const payload = {
        element_id: raw.element_id ? Number(raw.element_id) : null,
        time: raw.time || null,
        surface_elev: raw.surface_elev !== '' ? Number(raw.surface_elev) : null,
        total_depth: raw.total_depth !== '' ? Number(raw.total_depth) : null,
        u: raw.u !== '' ? Number(raw.u) : null,
        v: raw.v !== '' ? Number(raw.v) : null,
        direction: raw.direction !== '' ? Number(raw.direction) : null
    };

    if (!payload.element_id || !payload.time) {
        alert('Element ID và Thời gian là bắt buộc');
        return;
    }

    if (isEditMode && hydroIdAttr) {
        updateHydroOnServer(hydroIdAttr, payload);
    } else {
        addHydroToServer(payload);
    }
    modal.remove();
}

async function addHydroToServer(data) {
    try {
        const res = await fetch('/api/hydro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Thêm hydro data thành công!');
            const elementsPageSizeInput = document.getElementById('elements-pageSize');
            const pageSizeInput = document.getElementById('hydro-pageSize');
            const elementsPageSize = parseInt(elementsPageSizeInput?.value) || 500;
            const pageSize = parseInt(pageSizeInput?.value) || 50;

            if (typeof window.fetchAndShowElementsAndHydro === 'function') {
                window.fetchAndShowElementsAndHydro(elementsPageSize, pageSize, 1);
            } else if (typeof window.fetchAndShowHydro === 'function') {
                window.fetchAndShowHydro(pageSize, 1);
            }
        } else {
            const txt = await res.text();
            alert('Lỗi khi thêm hydro data: ' + txt);
        }
    } catch (err) {
        console.error('Lỗi khi thêm hydro data:', err);
        alert('Lỗi kết nối khi thêm hydro data');
    }
}

async function updateHydroOnServer(hydroId, data) {
    try {
        const res = await fetch(`/api/hydro/${hydroId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Cập nhật hydro data thành công!');
            const elementsPageSizeInput = document.getElementById('elements-pageSize');
            const pageSizeInput = document.getElementById('hydro-pageSize');
            const elementsPageSize = parseInt(elementsPageSizeInput?.value) || 500;
            const pageSize = parseInt(pageSizeInput?.value) || 50;

            if (typeof window.fetchAndShowElementsAndHydro === 'function') {
                window.fetchAndShowElementsAndHydro(elementsPageSize, pageSize, currentHydroPage);
            } else if (typeof window.fetchAndShowHydro === 'function') {
                window.fetchAndShowHydro(pageSize, currentHydroPage);
            }
        } else {
            const txt = await res.text();
            alert('Lỗi khi cập nhật hydro data: ' + txt);
        }
    } catch (err) {
        console.error('Lỗi khi cập nhật hydro data:', err);
        alert('Lỗi kết nối khi cập nhật hydro data');
    }
}

async function deleteHydroFromServer(hydroId) {
    try {
        const res = await fetch(`/api/hydro/${hydroId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        if (res.ok) {
            alert('Xóa hydro data thành công!');
            selectedHydroRow = null;
            const elementsPageSizeInput = document.getElementById('elements-pageSize');
            const pageSizeInput = document.getElementById('hydro-pageSize');
            const elementsPageSize = parseInt(elementsPageSizeInput?.value) || 500;
            const pageSize = parseInt(pageSizeInput?.value) || 50;

            if (typeof window.fetchAndShowElementsAndHydro === 'function') {
                window.fetchAndShowElementsAndHydro(elementsPageSize, pageSize, currentHydroPage);
            } else if (typeof window.fetchAndShowHydro === 'function') {
                window.fetchAndShowHydro(pageSize, currentHydroPage);
            }
        } else {
            const txt = await res.text();
            alert('Lỗi khi xóa hydro data: ' + txt);
        }
    } catch (err) {
        console.error('Lỗi khi xóa hydro data:', err);
        alert('Lỗi kết nối khi xóa hydro data');
    }
}

// Export ra window
window.updateHydroTable = updateHydroTable;
window.updateHydroData = updateHydroData;
window.toggleHydroTable = toggleHydroTable;
window.closeHydroTable = closeHydroTable;
window.canHydroToggleOff = canHydroToggleOff;
window.initHydroTable = initHydroTable;
window.searchHydroData = searchHydroData;
window.addHydroRecord = addHydroRecord;
window.editHydroRecord = editHydroRecord;
window.deleteHydroRecord = deleteHydroRecord;

