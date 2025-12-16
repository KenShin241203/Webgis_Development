// ===== TABLE ĐÊ BÀO - LOGIC ===== //

// Biến để lưu trạng thái drag
let isDraggingDeBao = false;
let dragOffsetDeBao = { x: 0, y: 0 };

// Biến để lưu trạng thái resize
let isResizingDeBao = false;
let resizeDirectionDeBao = '';
let resizeStartDeBao = { x: 0, y: 0, width: 0, height: 0 };

// Biến để theo dõi trạng thái bảng
let isDeBaoTableOpen = false;

// Biến để lưu dữ liệu hiện tại và dữ liệu gốc + lựa chọn dòng
let currentDeBaoData = [];
let originalDeBaoData = [];
let selectedDeBaoRow = null;
let isCoordinateSearchDeBao = false;

// Trạng thái phân trang hiện tại
let currentDeBaoPage = 1;
let currentDeBaoPageSize = 100;

// Hàm cập nhật bảng dữ liệu đê bao
function updateDeBaoTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('debao-table-container');
        const table = document.getElementById('debao-table');
        const tbody = table.querySelector('tbody');

        // Lưu state phân trang
        if (pagination) {
            currentDeBaoPage = Number(pagination.page) || currentDeBaoPage;
            currentDeBaoPageSize = Number(pagination.pageSize) || currentDeBaoPageSize;
        }

        console.log('Table container:', tableContainer);
        console.log('Table:', table);
        console.log('Tbody:', tbody);
        console.log('Data to display:', data);

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng đê bao');
            return;
        }

        // Sắp xếp theo f_id tăng dần và lưu dữ liệu hiện tại
        const sortedDeBao = (data || []).slice().sort((a, b) => Number(a?.f_id ?? 0) - Number(b?.f_id ?? 0));
        currentDeBaoData = sortedDeBao;
        if (!originalDeBaoData.length) {
            originalDeBaoData = [...sortedDeBao];
        }

        tbody.innerHTML = '';
        // Hiển thị theo thứ tự ID tăng dần (f_id)
        sortedDeBao.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.id = item.f_id;
            row.dataset.index = index;

            row.innerHTML = `
                <td>${item.f_id || ''}</td>
                <td>${item.entity || ''}</td>
                <td>${item.layer || ''}</td>
                <td>${item.color || ''}</td>
                <td>${item.linetype || ''}</td>
                <td>${item.elevation || ''}</td>
                <td>${item.line_wt || '0'}</td>
                <td>${item.geometry ? `${item.geometry.coordinates[0]?.[0]?.toFixed(6) || ''}, ${item.geometry.coordinates[0]?.[1]?.toFixed(6) || ''}` : ''}</td>
            `;

            // Thêm event listener cho việc chọn dòng
            row.addEventListener('click', function () {
                selectDeBaoRow(this, item);
            });

            tbody.appendChild(row);
        });

        // Cập nhật trạng thái các button
        updateDeBaoActionButtons();

        // Render phân trang
        renderDeBaoPagination(pagination);

        console.log('Đã cập nhật bảng đê bao với', data.length, 'dòng dữ liệu');
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng đê bao:', error);
    }
}

// Hàm để người dùng cập nhật pageSize từ giao diện
function updateDeBaoData(page = currentDeBaoPage) {
    const pageSizeInput = document.getElementById('debao-pageSize');
    const newPageSize = parseInt(pageSizeInput.value) || 100;

    if (newPageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    if (isCoordinateSearchDeBao) {
        const input = document.getElementById('debao-search-input');
        const coords = parseDeBaoCoordinateSearch(input ? input.value : '');
        if (coords) {
            searchDeBaoByCoordinates(coords.lat, coords.lng, coords.radius, newPageSize, page);
            return;
        }
    }

    // Frontend không tự tính lại page nữa; backend chuẩn hóa phân trang
    console.log('Cập nhật dữ liệu đê bao với pageSize:', newPageSize, 'page:', page);
    fetchAndShowDeBao(newPageSize, page);
}

// Hàm để mở/đóng bảng dữ liệu đê bao
function toggleDeBaoTable() {
    const container = document.getElementById('debao-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="debao"]');

    if (container.style.display === 'none' || container.style.display === '') {
        // Mở bảng
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isDeBaoTableOpen = true;

        // Tự động fetch dữ liệu khi mở bảng
        const pageSizeInput = document.getElementById('debao-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        fetchAndShowDeBao(pageSize);

        console.log('Đã mở bảng dữ liệu đê bao');
    } else {
        // Đóng bảng
        closeDeBaoTable();
    }
}

// Hàm để đóng bảng dữ liệu đê bao
function closeDeBaoTable() {
    const container = document.getElementById('debao-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="debao"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isDeBaoTableOpen = false;
    console.log('Đã đóng bảng dữ liệu đê bao');
}

// Hàm để enable/disable nút toggle bảng dữ liệu
function updateDeBaoTableToggleButtons() {
    const toggleDeBao = document.getElementById('toggleDeBao');
    const toggleDeBaoTable = document.querySelector('.table-toggle-btn[data-layer="debao"]');

    if (toggleDeBao && toggleDeBaoTable) {
        if (toggleDeBao.checked) {
            toggleDeBaoTable.disabled = false;
            toggleDeBaoTable.style.opacity = '1';
        } else {
            toggleDeBaoTable.disabled = true;
            toggleDeBaoTable.style.opacity = '0.5';
            // Đóng bảng nếu layer bị tắt
            closeDeBaoTable();
        }
    }
}

// Hàm kiểm tra xem có thể tắt toggle hay không
function canDeBaoToggleOff() {
    return !isDeBaoTableOpen;
}

// ==== CRUD giống bảng Chất lượng ====
// Hàm để chọn dòng trong bảng
function selectDeBaoRow(row, data) {
    // Bỏ chọn dòng cũ
    const allRows = document.querySelectorAll('#debao-table tbody tr');
    allRows.forEach(r => r.classList.remove('selected-row'));

    // Chọn dòng mới
    row.classList.add('selected-row');
    selectedDeBaoRow = data;

    // Cập nhật trạng thái các button
    updateDeBaoActionButtons();
}

// Hàm cập nhật trạng thái các button action
function updateDeBaoActionButtons() {
    const container = document.getElementById('debao-table-container');
    if (!container) return;

    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');

    if (editBtn && deleteBtn) {
        const hasSelection = selectedDeBaoRow !== null;
        editBtn.disabled = !hasSelection;
        deleteBtn.disabled = !hasSelection;
    }
}

// Thêm bản ghi mới
function addDeBaoRecord() {
    const modal = createDeBaoFormModal('Thêm Đê bao', null);
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.style.display = 'flex';
    }, 10);
}

// Sửa bản ghi
function editDeBaoRecord() {
    if (!selectedDeBaoRow) {
        alert('Vui lòng chọn một dòng để sửa');
        return;
    }
    const modal = createDeBaoFormModal('Sửa Đê bao', selectedDeBaoRow);
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.style.display = 'flex';
    }, 10);
}

// Xóa bản ghi
function deleteDeBaoRecord() {
    if (!selectedDeBaoRow) {
        alert('Vui lòng chọn một dòng để xóa');
        return;
    }
    const label = selectedDeBaoRow.layer || selectedDeBaoRow.f_id;
    if (confirm(`Bạn có chắc chắn muốn xóa bản ghi "${label}"?`)) {
        deleteDeBaoFromServer(selectedDeBaoRow.f_id);
    }
}

// Tạo modal form cho Đê bao
function createDeBaoFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.editId = data.f_id;
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
            <form class="modal-form" onsubmit="handleDeBaoFormSubmit(event)">
                <div class="form-group">
                    <label for="debao-entity">Entity:</label>
                    <input type="text" id="debao-entity" name="entity" value="${data ? (data.entity || '') : ''}" required>
                </div>
                <div class="form-group">
                    <label for="debao-layer">Layer:</label>
                    <input type="text" id="debao-layer" name="layer" value="${data ? (data.layer || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="debao-color">Color:</label>
                    <input type="number" id="debao-color" name="color" value="${data && typeof data.color !== 'undefined' ? data.color : ''}" placeholder="VD: 1">
                </div>
                <div class="form-group">
                    <label for="debao-linetype">Line Type:</label>
                    <input type="text" id="debao-linetype" name="linetype" value="${data ? (data.linetype || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="debao-elevation">Elevation:</label>
                    <input type="number" id="debao-elevation" name="elevation" value="${data && typeof data.elevation !== 'undefined' ? data.elevation : ''}" placeholder="VD: 5">
                </div>
                <div class="form-group">
                    <label for="debao-line_wt">Line Weight:</label>
                    <input type="number" id="debao-line_wt" name="line_wt" value="${data && typeof data.line_wt !== 'undefined' ? data.line_wt : '0'}" placeholder="VD: 0">
                </div>
                <div class="form-group">
                    <label for="debao-kind_id">Kind ID:</label>
                    <input type="number" id="debao-kind_id" name="kind_id" value="${data && typeof data.kind_id !== 'undefined' ? data.kind_id : ''}" placeholder="VD: 2">
                </div>
                <div class="form-group">
                    <label for="debao-coordinates">Tọa độ LineString (VN2000 - [x, y, z]):</label>
                    <textarea id="debao-coordinates" name="coordinates" rows="5" placeholder='VD: [[606000.00,1067000.00,5],[606100.00,1066900.00,5]]'>${coordinatesValue}</textarea>
                    <small>Nhập mảng các cặp [x, y, z] theo VN2000. Server sẽ chuyển đổi sang WGS84.</small>
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
function handleDeBaoFormSubmit(event) {
    event.preventDefault();

    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const editId = modal.dataset.editId;

    const formData = new FormData(event.target);
    const raw = Object.fromEntries(formData.entries());

    // Xây dựng payload chuẩn cho API
    const payload = {
        entity: raw.entity || '',
        layer: raw.layer || null,
        color: raw.color !== '' && raw.color !== undefined ? Number(raw.color) : null,
        linetype: raw.linetype || null,
        elevation: raw.elevation !== '' && raw.elevation !== undefined ? Number(raw.elevation) : null,
        line_wt: raw.line_wt !== '' && raw.line_wt !== undefined ? Number(raw.line_wt) : 0,
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
        updateDeBaoOnServer(editId, payload);
    } else {
        addDeBaoToServer(payload);
    }

    modal.remove();
}

// Gọi API thêm
async function addDeBaoToServer(data) {
    try {
        const response = await fetch('/api/debao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Thêm bản ghi Đê bao thành công!');
            const pageSizeInput = document.getElementById('debao-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowDeBao(pageSize);
        } else {
            alert('Lỗi khi thêm Đê bao: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi thêm Đê bao:', error);
        alert('Lỗi kết nối khi thêm Đê bao');
    }
}

// Gọi API cập nhật
async function updateDeBaoOnServer(id, data) {
    try {
        const response = await fetch(`/api/debao/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Cập nhật Đê bao thành công!');
            const pageSizeInput = document.getElementById('debao-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowDeBao(pageSize);
        } else {
            alert('Lỗi khi cập nhật Đê bao: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật Đê bao:', error);
        alert('Lỗi kết nối khi cập nhật Đê bao');
    }
}

// Gọi API xóa
async function deleteDeBaoFromServer(id) {
    try {
        const response = await fetch(`/api/debao/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (response.ok) {
            alert('Xóa Đê bao thành công!');
            selectedDeBaoRow = null;
            const pageSizeInput = document.getElementById('debao-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowDeBao(pageSize);
        } else {
            alert('Lỗi khi xóa Đê bao: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi xóa Đê bao:', error);
        alert('Lỗi kết nối khi xóa Đê bao');
    }
}

// Hàm để thiết lập drag and drop cho bảng đê bao
function setupDeBaoDragAndDrop() {
    const container = document.getElementById('debao-table-container');
    const header = document.getElementById('debao-table-header');

    if (!container || !header) return;

    // Bắt đầu drag
    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return; // Không drag khi click vào button, input hoặc resize handle
        }

        isDraggingDeBao = true;
        const rect = container.getBoundingClientRect();
        dragOffsetDeBao.x = e.clientX - rect.left;
        dragOffsetDeBao.y = e.clientY - rect.top;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingDeBao) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetDeBao.x;
        let newY = e.clientY - dragOffsetDeBao.y;

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
        if (isDraggingDeBao) {
            isDraggingDeBao = false;
            container.style.cursor = 'move';
        }
    });
}

// Hàm để thiết lập resize cho bảng đê bao
function setupDeBaoResize() {
    const container = document.getElementById('debao-table-container');
    const resizeHandles = container.querySelectorAll('.resize-handle');

    if (!container || !resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingDeBao = true;
            resizeDirectionDeBao = handle.className.split(' ')[1]; // Lấy direction từ class
            const rect = container.getBoundingClientRect();

            resizeStartDeBao = {
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
        if (!isResizingDeBao) return;

        const deltaX = e.clientX - resizeStartDeBao.x;
        const deltaY = e.clientY - resizeStartDeBao.y;

        let newWidth = resizeStartDeBao.width;
        let newHeight = resizeStartDeBao.height;
        let newLeft = resizeStartDeBao.left;
        let newTop = resizeStartDeBao.top;

        // Xử lý resize theo hướng
        if (resizeDirectionDeBao.includes('e')) {
            newWidth = Math.max(400, resizeStartDeBao.width + deltaX);
        }
        if (resizeDirectionDeBao.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartDeBao.width - 400);
            newWidth = resizeStartDeBao.width - widthChange;
            newLeft = resizeStartDeBao.left + widthChange;
        }
        if (resizeDirectionDeBao.includes('s')) {
            newHeight = Math.max(300, resizeStartDeBao.height + deltaY);
        }
        if (resizeDirectionDeBao.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartDeBao.height - 300);
            newHeight = resizeStartDeBao.height - heightChange;
            newTop = resizeStartDeBao.top + heightChange;
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
        if (isResizingDeBao) {
            isResizingDeBao = false;
            document.body.style.cursor = '';
        }
    });
}

// Phân trang Đê bao
function renderDeBaoPagination(pagination) {
    const paginationContainer = document.getElementById('debao-pagination');
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
            if (isCoordinateSearchDeBao) {
                const input = document.getElementById('debao-search-input');
                const coords = parseDeBaoCoordinateSearch(input ? input.value : '');
                const pageSizeInput = document.getElementById('debao-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || currentDeBaoPageSize;
                if (coords) {
                    searchDeBaoByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, targetPage);
                    return;
                }
            }
            updateDeBaoData(targetPage);
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

function searchDeBaoData() {
    const input = document.getElementById('debao-search-input');
    const query = (input?.value || '').trim();
    if (!query) {
        isCoordinateSearchDeBao = false;
        updateDeBaoTable(originalDeBaoData, { page: currentDeBaoPage, pageSize: currentDeBaoPageSize, totalPages: 1 });
        return;
    }

    // Thử parse toạ độ: "lat, lng" hoặc "lng, lat" hoặc có radius
    const coords = parseDeBaoCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchDeBao = true;
        const pageSizeInput = document.getElementById('debao-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchDeBaoByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi khi tìm kiếm đê bao theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }

    const q = query.toLowerCase();
    const filtered = originalDeBaoData.filter(item => {
        return (
            (item.f_id && item.f_id.toString().includes(q)) ||
            (item.entity && item.entity.toLowerCase().includes(q)) ||
            (item.layer && item.layer.toLowerCase().includes(q)) ||
            (item.linetype && item.linetype.toLowerCase().includes(q)) ||
            (item.geometry && item.geometry.coordinates &&
                (item.geometry.coordinates[0]?.[0]?.toString().includes(q) ||
                    item.geometry.coordinates[0]?.[1]?.toString().includes(q)))
        );
    });
    updateDeBaoTable(filtered, { page: 1, pageSize: filtered.length, totalPages: 1 });
}

// Parse input tìm theo toạ độ
function parseDeBaoCoordinateSearch(input) {
    const trimmed = (input || '').trim();
    const m = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)(?:\s*,\s*(\d+\.?\d*))?$/);
    if (!m) return null;
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    let lat = a;
    let lng = b;
    // Auto hoán đổi nếu người dùng nhập lng, lat
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

async function searchDeBaoByCoordinates(lat, lng, radius = 0.01, pageSize = currentDeBaoPageSize, page = 1) {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        page: String(page),
        pageSize: String(pageSize),
        fromSrid: '9209',
        toSrid: '4326'
    });
    const res = await fetch(`/api/debao/search?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || ('HTTP ' + res.status));
    }
    const json = await res.json();
    updateDeBaoTable(json.data || [], json.pagination || undefined);
}

// Khởi tạo table đê bao
function initDeBaoTable() {
    // Thiết lập drag and drop
    setupDeBaoDragAndDrop();

    // Thiết lập resize
    setupDeBaoResize();

    // Khởi tạo trạng thái ban đầu
    updateDeBaoTableToggleButtons();
}

// Export các function ra window object
window.updateDeBaoTable = updateDeBaoTable;
window.updateDeBaoData = updateDeBaoData;
window.toggleDeBaoTable = toggleDeBaoTable;
window.closeDeBaoTable = closeDeBaoTable;
window.updateDeBaoTableToggleButtons = updateDeBaoTableToggleButtons;
window.setupDeBaoDragAndDrop = setupDeBaoDragAndDrop;
window.setupDeBaoResize = setupDeBaoResize;
window.initDeBaoTable = initDeBaoTable;
window.canDeBaoToggleOff = canDeBaoToggleOff;

// Export CRUD helpers
window.addDeBaoRecord = addDeBaoRecord;
window.editDeBaoRecord = editDeBaoRecord;
window.deleteDeBaoRecord = deleteDeBaoRecord;
window.handleDeBaoFormSubmit = handleDeBaoFormSubmit;
window.selectDeBaoRow = selectDeBaoRow;
window.searchDeBaoData = searchDeBaoData;
window.searchDeBaoByCoordinates = searchDeBaoByCoordinates;
