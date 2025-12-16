// ===== TABLE SỤT LÚN - LOGIC ===== //

// Biến để lưu trạng thái drag
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Biến để lưu trạng thái resize
let isResizing = false;
let resizeDirection = '';
let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

// Biến để theo dõi trạng thái bảng
let isTableOpen = false;

// Trạng thái phân trang + CRUD state
let currentSutLunPage = 1;
let currentSutLunPageSize = 100;
let currentSutLunData = [];
let originalSutLunData = [];
let selectedSutLunRow = null;
let isCoordinateSearchSutLun = false;

function formatSutLunDate(value) {
    if (typeof window !== 'undefined' && typeof window.formatDateSlash === 'function') {
        return window.formatDateSlash(value);
    }
    if (value === null || value === undefined) return '';
    const clean = `${value}`.trim();
    if (/^\d{8}$/.test(clean)) {
        return `${clean.slice(0, 4)}/${clean.slice(4, 6)}/${clean.slice(6, 8)}`;
    }
    return clean.replace(/-/g, '/');
}

// Hàm cập nhật bảng dữ liệu sụt lún
function updateSutLunTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('sutlun-table-container');
        const table = document.getElementById('sutlun-table');
        const tbody = table.querySelector('tbody');

        if (pagination) {
            currentSutLunPage = Number(pagination.page) || currentSutLunPage;
            currentSutLunPageSize = Number(pagination.pageSize) || currentSutLunPageSize;
        }

        console.log('Table container:', tableContainer);
        console.log('Table:', table);
        console.log('Tbody:', tbody);
        console.log('Data to display:', data);

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng sụt lún');
            return;
        }

        // Lưu và sort theo objectid tăng dần
        currentSutLunData = (data || []).slice().sort((a, b) => Number(a?.objectid ?? 0) - Number(b?.objectid ?? 0));
        if (!originalSutLunData.length) originalSutLunData = [...currentSutLunData];

        tbody.innerHTML = '';
        currentSutLunData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.id = item.objectid;
            row.dataset.index = index;
            row.addEventListener('click', function () { selectSutLunRow(this, item); });
            row.innerHTML = `
                <td>${item.objectid || ''}</td>
                <td>${item.id || ''}</td>
                <td>${item.vel_avg || ''}</td>
                <td>${item.vel_sd || ''}</td>
                <td>${item.vel_cum || ''}</td>
                <td>${formatSutLunDate(item.t_start)} - ${formatSutLunDate(item.t_stop)}</td>
                <td>${item.geometry ? `${item.geometry.coordinates[0]?.toFixed(6) || ''}, ${item.geometry.coordinates[1]?.toFixed(6) || ''}` : ''}</td>
            `;
            tbody.appendChild(row);
        });

        // Render phân trang
        renderSutLunPagination(pagination);

        console.log('Đã cập nhật bảng với', currentSutLunData.length, 'dòng dữ liệu');
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng sụt lún:', error);
    }
}

function searchSutLunData() {
    const input = document.getElementById('sutlun-search-input');
    const query = (input?.value || '').trim();
    if (!query) {
        isCoordinateSearchSutLun = false;
        updateSutLunTable(originalSutLunData, { page: currentSutLunPage, pageSize: currentSutLunPageSize, totalPages: 1 });
        return;
    }

    // Nếu người dùng chỉ nhập một số mà không có dấu phẩy -> yêu cầu nhập cả lat, lng
    const onlyNumber = !query.includes(',') && !Number.isNaN(parseFloat(query));


    // Thử parse toạ độ: "lat, lng" hoặc "lng, lat" hoặc có radius
    const coords = parseSutLunCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchSutLun = true;
        const pageSizeInput = document.getElementById('sutlun-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchSutLunByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi khi tìm kiếm sụt lún theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }

    const q = query.toLowerCase();
    const f = originalSutLunData.filter(it =>
        (it.objectid && it.objectid.toString().includes(q)) ||
        (it.id && it.id.toString().includes(q)) ||
        (it.vel_avg && it.vel_avg.toString().includes(q)) ||
        (it.t_start && it.t_start.toString().includes(q)) ||
        (it.t_stop && it.t_stop.toString().includes(q)) ||
        (it.geometry && it.geometry.coordinates &&
            (it.geometry.coordinates[0]?.toString().includes(q) ||
                it.geometry.coordinates[1]?.toString().includes(q)))
    );
    updateSutLunTable(f, { page: 1, pageSize: f.length, totalPages: 1 });
}

// Parse input tìm theo toạ độ
function parseSutLunCoordinateSearch(input) {
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

async function searchSutLunByCoordinates(lat, lng, radius = 0.01, pageSize = currentSutLunPageSize, page = 1) {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        page: String(page),
        pageSize: String(pageSize),
        fromSrid: '3405',
        toSrid: '4326'
    });
    const res = await fetch(`/api/sutlun/search?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || ('HTTP ' + res.status));
    }
    const json = await res.json();
    updateSutLunTable(json.data || [], json.pagination || undefined);
}

// Hàm để người dùng cập nhật pageSize từ giao diện
function updateSutLunData(page = currentSutLunPage) {
    const pageSizeInput = document.getElementById('sutlun-pageSize');
    const pageSize = parseInt(pageSizeInput.value) || 100;

    if (pageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    if (isCoordinateSearchSutLun) {
        const input = document.getElementById('sutlun-search-input');
        const coords = parseSutLunCoordinateSearch(input ? input.value : '');
        if (coords) {
            searchSutLunByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, page);
            return;
        }
    }

    console.log('Cập nhật dữ liệu sụt lún với pageSize:', pageSize, 'page:', page);
    fetchAndShowSutLun(pageSize, page);
}

// Hàm để mở/đóng bảng dữ liệu sụt lún
function toggleSutLunTable() {
    const container = document.getElementById('sutlun-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="sutlun"]');

    if (container.style.display === 'none' || container.style.display === '') {
        // Mở bảng
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isTableOpen = true;

        // Tự động fetch dữ liệu khi mở bảng
        const pageSizeInput = document.getElementById('sutlun-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        fetchAndShowSutLun(pageSize);

        console.log('Đã mở bảng dữ liệu sụt lún');
    } else {
        // Đóng bảng
        closeSutLunTable();
    }
}

// Hàm để đóng bảng dữ liệu sụt lún
function closeSutLunTable() {
    const container = document.getElementById('sutlun-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="sutlun"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isTableOpen = false;
    console.log('Đã đóng bảng dữ liệu sụt lún');
}

// Hàm để enable/disable nút toggle bảng dữ liệu
function updateTableToggleButtons() {
    const toggleSutLun = document.getElementById('toggleSutLun');
    const toggleSutLunTable = document.querySelector('.table-toggle-btn[data-layer="sutlun"]');

    if (toggleSutLun && toggleSutLunTable) {
        if (toggleSutLun.checked) {
            toggleSutLunTable.disabled = false;
            toggleSutLunTable.style.opacity = '1';
        } else {
            toggleSutLunTable.disabled = true;
            toggleSutLunTable.style.opacity = '0.5';
            // Đóng bảng nếu layer bị tắt
            closeSutLunTable();
        }
    }
}

// Hàm kiểm tra xem có thể tắt toggle hay không
function canToggleOff() {
    return !isTableOpen;
}

// Hàm để thiết lập drag and drop cho bảng
function setupDragAndDrop() {
    const container = document.getElementById('sutlun-table-container');
    const header = document.getElementById('sutlun-table-header');

    if (!container || !header) return;

    // Bắt đầu drag
    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return; // Không drag khi click vào button, input hoặc resize handle
        }

        isDragging = true;
        const rect = container.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;

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
        if (isDragging) {
            isDragging = false;
            container.style.cursor = 'move';
        }
    });
}

// Hàm để thiết lập resize cho bảng
function setupResize() {
    const container = document.getElementById('sutlun-table-container');
    const resizeHandles = container.querySelectorAll('.resize-handle');

    if (!container || !resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            resizeDirection = handle.className.split(' ')[1]; // Lấy direction từ class
            const rect = container.getBoundingClientRect();

            resizeStart = {
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
        if (!isResizing) return;

        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;

        // Xử lý resize theo hướng
        if (resizeDirection.includes('e')) {
            newWidth = Math.max(400, resizeStart.width + deltaX);
        }
        if (resizeDirection.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStart.width - 400);
            newWidth = resizeStart.width - widthChange;
            newLeft = resizeStart.left + widthChange;
        }
        if (resizeDirection.includes('s')) {
            newHeight = Math.max(300, resizeStart.height + deltaY);
        }
        if (resizeDirection.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStart.height - 300);
            newHeight = resizeStart.height - heightChange;
            newTop = resizeStart.top + heightChange;
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
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });
}

// CRUD
function selectSutLunRow(row, data) {
    const all = document.querySelectorAll('#sutlun-table tbody tr');
    all.forEach(r => r.classList.remove('selected-row'));
    row.classList.add('selected-row');
    selectedSutLunRow = data;
    updateSutLunActionButtons();
}

function updateSutLunActionButtons() {
    const container = document.getElementById('sutlun-table-container');
    if (!container) return;
    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');
    if (editBtn && deleteBtn) {
        const has = selectedSutLunRow !== null;
        editBtn.disabled = !has;
        deleteBtn.disabled = !has;
    }
}

function createSutLunFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    if (data) { modal.dataset.editMode = 'true'; modal.dataset.editId = data.objectid; } else { modal.dataset.editMode = 'false'; }
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form class="modal-form" onsubmit="handleSutLunFormSubmit(event)">
                <div class="form-group">
                    <label for="sutlun-id">ID:</label>
                    <input type="number" id="sutlun-id" name="id" value="${data ? (data.id || '') : ''}" placeholder="VD: 654182" required>
                </div>
                <div class="form-group">
                    <label for="sutlun-vel_avg">Vận tốc TB:</label>
                    <input type="number" step="any" id="sutlun-vel_avg" name="vel_avg" value="${data ? (data.vel_avg || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="sutlun-vel_sd">Vận tốc SD:</label>
                    <input type="number" step="any" id="sutlun-vel_sd" name="vel_sd" value="${data ? (data.vel_sd || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="sutlun-vel_cum">Vận tốc tích lũy:</label>
                    <input type="number" step="any" id="sutlun-vel_cum" name="vel_cum" value="${data ? (data.vel_cum || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="sutlun-t_start">Thời gian bắt đầu:</label>
                    <input type="text" id="sutlun-t_start" name="t_start" value="${data ? (data.t_start || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="sutlun-t_stop">Thời gian kết thúc:</label>
                    <input type="text" id="sutlun-t_stop" name="t_stop" value="${data ? (data.t_stop || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="sutlun-longitude">Kinh độ (VN2000):</label>
                    <input type="number" step="any" id="sutlun-longitude" name="longitude" value="${data && data.geometry ? data.geometry.coordinates[0] || '' : ''}" placeholder="VD: 606000.00">
                </div>
                <div class="form-group">
                    <label for="sutlun-latitude">Vĩ độ (VN2000):</label>
                    <input type="number" step="any" id="sutlun-latitude" name="latitude" value="${data && data.geometry ? data.geometry.coordinates[1] || '' : ''}" placeholder="VD: 1067000.00">
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

function addSutLunRecord() { const m = createSutLunFormModal('Thêm Sụt lún', null); document.body.appendChild(m); setTimeout(() => { m.style.display = 'flex'; }, 10); }
function editSutLunRecord() { if (!selectedSutLunRow) { alert('Vui lòng chọn một dòng để sửa'); return; } const m = createSutLunFormModal('Sửa Sụt lún', selectedSutLunRow); document.body.appendChild(m); setTimeout(() => { m.style.display = 'flex'; }, 10); }
function deleteSutLunRecord() { if (!selectedSutLunRow) { alert('Vui lòng chọn một dòng để xóa'); return; } if (confirm(`Bạn có chắc chắn muốn xóa ObjectID "${selectedSutLunRow.objectid}"?`)) { deleteSutLunFromServer(selectedSutLunRow.objectid); } }

function handleSutLunFormSubmit(event) {
    event.preventDefault();
    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const editObjectId = modal.dataset.editId;
    const formData = new FormData(event.target);
    const raw = Object.fromEntries(formData.entries());

    // Tạo payload với geometry
    const payload = {
        id: raw.id !== '' ? Number(raw.id) : null,
        vel_avg: raw.vel_avg !== '' ? Number(raw.vel_avg) : null,
        vel_sd: raw.vel_sd !== '' ? Number(raw.vel_sd) : null,
        vel_cum: raw.vel_cum !== '' ? Number(raw.vel_cum) : null,
        t_start: raw.t_start || null,
        t_stop: raw.t_stop || null
    };

    // Validation: ID là bắt buộc
    if (!payload.id) {
        alert('Vui lòng nhập ID');
        return;
    }

    // Thêm geometry nếu có tọa độ
    if (raw.longitude && raw.latitude) {
        payload.geometry = {
            type: "Point",
            coordinates: [Number(raw.longitude), Number(raw.latitude)]
        };
    }

    if (isEditMode && editObjectId) {
        updateSutLunOnServer(editObjectId, payload);
    } else {
        addSutLunToServer(payload);
    }
    modal.remove();
}

async function addSutLunToServer(data) {
    try {
        const res = await fetch('/api/sutlun', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Thêm Sụt lún thành công!');
            // Sau khi thêm thành công, lấy dữ liệu mới và chuyển đến trang cuối
            const ps = parseInt(document.getElementById('sutlun-pageSize').value) || 100;
            // Đầu tiên lấy trang 1 để biết tổng số dữ liệu
            fetch(`/api/sutlun?page=1&pageSize=${ps}`)
                .then(res => res.json())
                .then(json => {
                    if (json.pagination && json.pagination.totalPages) {
                        // Chuyển đến trang cuối cùng
                        fetchAndShowSutLun(ps, json.pagination.totalPages);
                    } else {
                        // Fallback: chuyển đến trang cuối bằng cách dùng số lớn
                        fetchAndShowSutLun(ps, 999999);
                    }
                })
                .catch(() => {
                    // Fallback nếu có lỗi
                    fetchAndShowSutLun(ps, 999999);
                });
        } else {
            alert('Lỗi khi thêm Sụt lún: ' + res.statusText);
        }
    } catch (err) {
        console.error('Lỗi khi thêm Sụt lún:', err);
        alert('Lỗi kết nối khi thêm Sụt lún');
    }
}
async function updateSutLunOnServer(objectid, data) { try { const res = await fetch(`/api/sutlun/${objectid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }, body: JSON.stringify(data) }); if (res.ok) { alert('Cập nhật Sụt lún thành công!'); const ps = parseInt(document.getElementById('sutlun-pageSize').value) || 100; fetchAndShowSutLun(ps, currentSutLunPage); } else { alert('Lỗi khi cập nhật Sụt lún: ' + res.statusText); } } catch (err) { console.error('Lỗi khi cập nhật Sụt lún:', err); alert('Lỗi kết nối khi cập nhật Sụt lún'); } }
async function deleteSutLunFromServer(objectid) { try { const res = await fetch(`/api/sutlun/${objectid}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } }); if (res.ok) { alert('Xóa Sụt lún thành công!'); selectedSutLunRow = null; const ps = parseInt(document.getElementById('sutlun-pageSize').value) || 100; fetchAndShowSutLun(ps, currentSutLunPage); } else { alert('Lỗi khi xóa Sụt lún: ' + res.statusText); } } catch (err) { console.error('Lỗi khi xóa Sụt lún:', err); alert('Lỗi kết nối khi xóa Sụt lún'); } }

function renderSutLunPagination(pagination) { const c = document.getElementById('sutlun-pagination'); if (!c) return; c.innerHTML = ''; if (!pagination || !pagination.totalPages) return; const cur = Number(pagination.page) || 1; const total = Number(pagination.totalPages) || 1; const mk = (t, p, d = false, a = false) => { const b = document.createElement('button'); b.textContent = t; b.className = 'pagination-btn' + (a ? ' active' : ''); b.disabled = d; b.addEventListener('click', () => { if (isCoordinateSearchSutLun) { const input = document.getElementById('sutlun-search-input'); const coords = parseSutLunCoordinateSearch(input ? input.value : ''); const pageSizeInput = document.getElementById('sutlun-pageSize'); const pageSize = parseInt(pageSizeInput?.value) || currentSutLunPageSize; if (coords) { searchSutLunByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, p); return; } } updateSutLunData(p); }); return b; }; c.appendChild(mk('«', Math.max(1, cur - 1), cur === 1)); const s = Math.max(1, cur - 2); const e = Math.min(total, cur + 2); for (let p = s; p <= e; p++) { c.appendChild(mk(String(p), p, false, p === cur)); } c.appendChild(mk('»', Math.min(total, cur + 1), cur === total)); }

// Khởi tạo table sụt lún
function initSutLunTable() {
    // Thiết lập drag and drop
    setupDragAndDrop();

    // Thiết lập resize
    setupResize();

    // Khởi tạo trạng thái ban đầu
    updateTableToggleButtons();
}

/* Table cống logic đã được chuyển sang file table_cong.js riêng biệt */

// Export các function ra window object
window.updateSutLunTable = updateSutLunTable;
window.updateSutLunData = updateSutLunData;
window.toggleSutLunTable = toggleSutLunTable;
window.closeSutLunTable = closeSutLunTable;
window.updateTableToggleButtons = updateTableToggleButtons;
window.setupDragAndDrop = setupDragAndDrop;
window.setupResize = setupResize;
window.initSutLunTable = initSutLunTable;
window.canToggleOff = canToggleOff;

// Export CRUD/Search helpers
window.addSutLunRecord = addSutLunRecord;
window.editSutLunRecord = editSutLunRecord;
window.deleteSutLunRecord = deleteSutLunRecord;
window.handleSutLunFormSubmit = handleSutLunFormSubmit;
window.selectSutLunRow = selectSutLunRow;
window.searchSutLunData = searchSutLunData;
/* Table cống functions đã được export từ file table_cong.js riêng biệt */

