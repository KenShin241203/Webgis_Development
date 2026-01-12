// ===== TABLE ELEMENTS - LOGIC ===== //

let isDraggingElements = false;
let dragOffsetElements = { x: 0, y: 0 };

let isResizingElements = false;
let resizeDirectionElements = '';
let resizeStartElements = { x: 0, y: 0, width: 0, height: 0 };

let isElementsTableOpen = false;

let currentElementsPage = 1;
let currentElementsPageSize = 500;
let currentElementsData = [];
let originalElementsData = [];
let selectedElementsRow = null;

function updateElementsTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('elements-table-container');
        const table = document.getElementById('elements-table');
        const tbody = table ? table.querySelector('tbody') : null;

        if (pagination) {
            currentElementsPage = Number(pagination.page) || currentElementsPage;
            currentElementsPageSize = Number(pagination.pageSize) || currentElementsPageSize;
        }

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng elements');
            return;
        }

        currentElementsData = data || [];
        if (!originalElementsData.length) {
            originalElementsData = [...currentElementsData];
        }

        tbody.innerHTML = '';
        currentElementsData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.index = index;
            row.addEventListener('click', function () {
                selectElementsRow(this, item);
            });
            row.innerHTML = `
                <td>${item.element_id ?? ''}</td>
                <td>${item.x ?? ''}</td>
                <td>${item.y ?? ''}</td>
                <td>${item.area ?? ''}</td>
            `;
            tbody.appendChild(row);
        });

        renderElementsPagination(pagination);

        const pageSizeInput = document.getElementById('elements-pageSize');
        if (pageSizeInput && pagination && pagination.pageSize) {
            pageSizeInput.value = pagination.pageSize;
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng elements:', error);
    }
}

function updateElementsData(page = currentElementsPage) {
    const pageSizeInput = document.getElementById('elements-pageSize');
    const hydroPageSizeInput = document.getElementById('hydro-pageSize');
    const newPageSize = parseInt(pageSizeInput?.value) || 500;
    const hydroPageSize = parseInt(hydroPageSizeInput?.value) || 50;

    if (newPageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    // Gọi function gộp để refresh cả 2 layer
    if (typeof window.fetchAndShowElementsAndHydro === 'function') {
        window.fetchAndShowElementsAndHydro(newPageSize, hydroPageSize, page);
    } else if (typeof window.fetchAndShowElements === 'function') {
        // Fallback nếu function cũ vẫn còn
        window.fetchAndShowElements(newPageSize, page);
    }
}

function toggleElementsTable() {
    const container = document.getElementById('elements-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="elements-hydro"]');

    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isElementsTableOpen = true;

        const pageSizeInput = document.getElementById('elements-pageSize');
        const hydroPageSizeInput = document.getElementById('hydro-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 500;
        const hydroPageSize = parseInt(hydroPageSizeInput?.value) || 50;

        if (typeof window.fetchAndShowElementsAndHydro === 'function') {
            window.fetchAndShowElementsAndHydro(pageSize, hydroPageSize);
        } else if (typeof window.fetchAndShowElements === 'function') {
            window.fetchAndShowElements(pageSize);
        }
    } else {
        closeElementsTable();
    }
}

function closeElementsTable() {
    const container = document.getElementById('elements-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="elements"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isElementsTableOpen = false;
}

function canElementsToggleOff() {
    return !isElementsTableOpen;
}

function selectElementsRow(row, data) {
    const allRows = document.querySelectorAll('#elements-table tbody tr');
    allRows.forEach(r => r.classList.remove('selected-row'));
    row.classList.add('selected-row');
    selectedElementsRow = data;
    updateElementsActionButtons();
}

function updateElementsActionButtons() {
    const container = document.getElementById('elements-table-container');
    if (!container) return;
    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');
    const hasSelection = selectedElementsRow !== null;
    if (editBtn) editBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

function setupElementsDragAndDrop() {
    const container = document.getElementById('elements-table-container');
    const header = document.getElementById('elements-table-header');

    if (!container || !header) return;

    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return;
        }
        isDraggingElements = true;
        const rect = container.getBoundingClientRect();
        dragOffsetElements.x = e.clientX - rect.left;
        dragOffsetElements.y = e.clientY - rect.top;
        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDraggingElements) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetElements.x;
        let newY = e.clientY - dragOffsetElements.y;

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
        if (isDraggingElements) {
            isDraggingElements = false;
            container.style.cursor = 'move';
        }
    });
}

function setupElementsResize() {
    const container = document.getElementById('elements-table-container');
    if (!container) return;
    const resizeHandles = container.querySelectorAll('.resize-handle');
    if (!resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingElements = true;
            resizeDirectionElements = handle.className.split(' ')[1];
            const rect = container.getBoundingClientRect();

            resizeStartElements = {
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
        if (!isResizingElements) return;

        const deltaX = e.clientX - resizeStartElements.x;
        const deltaY = e.clientY - resizeStartElements.y;

        let newWidth = resizeStartElements.width;
        let newHeight = resizeStartElements.height;
        let newLeft = resizeStartElements.left;
        let newTop = resizeStartElements.top;

        if (resizeDirectionElements.includes('e')) {
            newWidth = Math.max(400, resizeStartElements.width + deltaX);
        }
        if (resizeDirectionElements.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartElements.width - 400);
            newWidth = resizeStartElements.width - widthChange;
            newLeft = resizeStartElements.left + widthChange;
        }
        if (resizeDirectionElements.includes('s')) {
            newHeight = Math.max(300, resizeStartElements.height + deltaY);
        }
        if (resizeDirectionElements.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartElements.height - 300);
            newHeight = resizeStartElements.height - heightChange;
            newTop = resizeStartElements.top + heightChange;
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
        if (isResizingElements) {
            isResizingElements = false;
            document.body.style.cursor = '';
        }
    });
}

function renderElementsPagination(pagination) {
    const paginationContainer = document.getElementById('elements-pagination');
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
            updateElementsData(targetPage);
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

function initElementsTable() {
    setupElementsDragAndDrop();
    setupElementsResize();
}

// CRUD + search
function searchElementsData() {
    const input = document.getElementById('elements-search-input');
    const query = (input?.value || '').trim();
    if (!query) {
        updateElementsTable(originalElementsData, {
            page: currentElementsPage,
            pageSize: currentElementsPageSize,
            totalPages: 1
        });
        return;
    }
    const q = query.toLowerCase();
    const filtered = originalElementsData.filter(it =>
        (it.element_id && it.element_id.toString().includes(q)) ||
        (it.x && it.x.toString().includes(q)) ||
        (it.y && it.y.toString().includes(q)) ||
        (it.area && it.area.toString().includes(q))
    );
    updateElementsTable(filtered, {
        page: 1,
        pageSize: filtered.length || 1,
        totalPages: 1
    });
}

function createElementsFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.elementId = data.element_id;
    } else {
        modal.dataset.editMode = 'false';
    }
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form class="modal-form" onsubmit="handleElementsFormSubmit(event)">
                <div class="form-group">
                    <label for="elements-element_id">Element ID:</label>
                    <input type="number" id="elements-element_id" name="element_id"
                        value="${data ? (data.element_id || '') : ''}" ${data ? 'readonly' : 'required'}>
                </div>
                <div class="form-group">
                    <label for="elements-x">X:</label>
                    <input type="number" step="any" id="elements-x" name="x"
                        value="${data ? (data.x || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="elements-y">Y:</label>
                    <input type="number" step="any" id="elements-y" name="y"
                        value="${data ? (data.y || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="elements-area">Area:</label>
                    <input type="number" step="any" id="elements-area" name="area"
                        value="${data ? (data.area || '') : ''}">
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

function addElementRecord() {
    const modal = createElementsFormModal('Thêm Element mới', null);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function editElementRecord() {
    if (!selectedElementsRow) {
        alert('Vui lòng chọn một dòng để sửa');
        return;
    }
    const modal = createElementsFormModal('Sửa Element', selectedElementsRow);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
}

function deleteElementRecord() {
    if (!selectedElementsRow) {
        alert('Vui lòng chọn một dòng để xóa');
        return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa Element ID "${selectedElementsRow.element_id}"?`)) {
        deleteElementFromServer(selectedElementsRow.element_id);
    }
}

function handleElementsFormSubmit(event) {
    event.preventDefault();
    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const elementIdAttr = modal.dataset.elementId;

    const formData = new FormData(event.target);
    const raw = Object.fromEntries(formData.entries());

    const payload = {
        element_id: raw.element_id ? Number(raw.element_id) : null,
        x: raw.x !== '' ? Number(raw.x) : null,
        y: raw.y !== '' ? Number(raw.y) : null,
        area: raw.area !== '' ? Number(raw.area) : null
    };

    if (!payload.element_id) {
        alert('Element ID là bắt buộc');
        return;
    }
    if (payload.x === null || payload.y === null) {
        alert('X và Y là bắt buộc');
        return;
    }

    if (isEditMode && elementIdAttr) {
        updateElementOnServer(elementIdAttr, payload);
    } else {
        addElementToServer(payload);
    }
    modal.remove();
}

async function addElementToServer(data) {
    try {
        const res = await fetch('/api/elements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Thêm element thành công!');
            const pageSizeInput = document.getElementById('elements-pageSize');
            const hydroPageSizeInput = document.getElementById('hydro-pageSize');
            const pageSize = parseInt(pageSizeInput?.value) || 500;
            const hydroPageSize = parseInt(hydroPageSizeInput?.value) || 50;

            if (typeof window.fetchAndShowElementsAndHydro === 'function') {
                window.fetchAndShowElementsAndHydro(pageSize, hydroPageSize, 1);
            } else if (typeof window.fetchAndShowElements === 'function') {
                window.fetchAndShowElements(pageSize, 1);
            }
        } else {
            const txt = await res.text();
            alert('Lỗi khi thêm element: ' + txt);
        }
    } catch (err) {
        console.error('Lỗi khi thêm element:', err);
        alert('Lỗi kết nối khi thêm element');
    }
}

async function updateElementOnServer(elementId, data) {
    try {
        const res = await fetch(`/api/elements/${elementId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Cập nhật element thành công!');
            const pageSizeInput = document.getElementById('elements-pageSize');
            const hydroPageSizeInput = document.getElementById('hydro-pageSize');
            const pageSize = parseInt(pageSizeInput?.value) || 500;
            const hydroPageSize = parseInt(hydroPageSizeInput?.value) || 50;

            if (typeof window.fetchAndShowElementsAndHydro === 'function') {
                window.fetchAndShowElementsAndHydro(pageSize, hydroPageSize, currentElementsPage);
            } else if (typeof window.fetchAndShowElements === 'function') {
                window.fetchAndShowElements(pageSize, currentElementsPage);
            }
        } else {
            const txt = await res.text();
            alert('Lỗi khi cập nhật element: ' + txt);
        }
    } catch (err) {
        console.error('Lỗi khi cập nhật element:', err);
        alert('Lỗi kết nối khi cập nhật element');
    }
}

async function deleteElementFromServer(elementId) {
    try {
        const res = await fetch(`/api/elements/${elementId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        if (res.ok) {
            alert('Xóa element thành công!');
            selectedElementsRow = null;
            const pageSizeInput = document.getElementById('elements-pageSize');
            const hydroPageSizeInput = document.getElementById('hydro-pageSize');
            const pageSize = parseInt(pageSizeInput?.value) || 500;
            const hydroPageSize = parseInt(hydroPageSizeInput?.value) || 50;

            if (typeof window.fetchAndShowElementsAndHydro === 'function') {
                window.fetchAndShowElementsAndHydro(pageSize, hydroPageSize, currentElementsPage);
            } else if (typeof window.fetchAndShowElements === 'function') {
                window.fetchAndShowElements(pageSize, currentElementsPage);
            }
        } else {
            const txt = await res.text();
            alert('Lỗi khi xóa element: ' + txt);
        }
    } catch (err) {
        console.error('Lỗi khi xóa element:', err);
        alert('Lỗi kết nối khi xóa element');
    }
}

// Export ra window
window.updateElementsTable = updateElementsTable;
window.updateElementsData = updateElementsData;
window.toggleElementsTable = toggleElementsTable;
window.closeElementsTable = closeElementsTable;
window.canElementsToggleOff = canElementsToggleOff;
window.initElementsTable = initElementsTable;
window.searchElementsData = searchElementsData;
window.addElementRecord = addElementRecord;
window.editElementRecord = editElementRecord;
window.deleteElementRecord = deleteElementRecord;


