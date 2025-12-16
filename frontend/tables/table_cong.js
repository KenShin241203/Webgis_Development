// ===== TABLE CỐNG - LOGIC ===== //

// Biến để lưu trạng thái drag
let isDraggingCong = false;
let dragOffsetCong = { x: 0, y: 0 };

// Biến để lưu trạng thái resize
let isResizingCong = false;
let resizeDirectionCong = '';
let resizeStartCong = { x: 0, y: 0, width: 0, height: 0 };

// Biến để theo dõi trạng thái bảng
let isCongTableOpen = false;

// Biến để lưu dữ liệu hiện tại và dữ liệu gốc
let currentCongData = [];
let originalCongData = [];
let selectedCongRow = null;

// Trạng thái phân trang hiện tại
let currentCongPage = 1;
let currentCongPageSize = 100;

// Biến để lưu trạng thái tìm kiếm
let isSearchingCong = false;
let searchQueryCong = '';
// Thêm trạng thái tìm theo tọa độ
let isCoordinateSearchCong = false;

// Hàm cập nhật bảng dữ liệu cống
function updateCongTable(data, pagination) {
    try {
        const tableContainer = document.getElementById('cong-table-container');
        const table = document.getElementById('cong-table');
        const tbody = table.querySelector('tbody');

        // Lưu state phân trang nếu có
        if (pagination) {
            currentCongPage = Number(pagination.page) || currentCongPage;
            currentCongPageSize = Number(pagination.pageSize) || currentCongPageSize;
        }

        if (!tableContainer || !table || !tbody) {
            console.error('Không tìm thấy các element cần thiết cho bảng cống');
            return;
        }

        // Lưu dữ liệu hiện tại
        currentCongData = data;
        if (!isSearchingCong) {
            originalCongData = [...data];
        }

        tbody.innerHTML = '';
        // Hiển thị theo thứ tự ID tăng dần
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.dataset.id = item.id;
            row.dataset.index = index;

            row.innerHTML = `
                <td>${item.id || ''}</td>
                <td>${item.ten || ''}</td>
                <td>${item.cap || ''}</td>
                <td>${item.namxaydung || ''}</td>
                <td>${item.tenxa || ''}</td>
                <td>${item.sophai || ''}</td>
                <td>${item.bkhoang_c || ''}</td>
                <td>${item.tongcua_c || ''}</td>
                <td>${item.ghichu || ''}</td>
                <td>${item.codecong || ''}</td>
                <td>${item.ctrinh_day || ''}</td>
                <td>${item.ten_chung || ''}</td>
                <td>${item.ten_rieng || ''}</td>
                <td>${item.geometry ? `${item.geometry.coordinates[0]?.toFixed(6) || ''}, ${item.geometry.coordinates[1]?.toFixed(6) || ''}` : ''}</td>
            `;

            // Thêm event listener cho việc chọn dòng
            row.addEventListener('click', function () {
                selectCongRow(this, item);
            });

            tbody.appendChild(row);
        });

        // Cập nhật trạng thái các button
        updateCongActionButtons();

        // Render phân trang
        renderCongPagination(pagination);

        // Lưu pagination state vào DOM (optional)
        const pageSizeInput = document.getElementById('cong-pageSize');
        if (pageSizeInput && pagination && pagination.pageSize) {
            pageSizeInput.value = pagination.pageSize;
        }

    } catch (error) {
        console.error('Lỗi khi cập nhật bảng cống:', error);
    }
}

// Hàm để người dùng cập nhật pageSize từ giao diện
function updateCongData(page = currentCongPage) {
    const pageSizeInput = document.getElementById('cong-pageSize');
    const newPageSize = parseInt(pageSizeInput.value) || 100;

    if (newPageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }

    // Nếu đang ở chế độ tìm theo tọa độ, phân trang theo kết quả tìm kiếm
    if (isCoordinateSearchCong) {
        const searchInput = document.getElementById('cong-search-input');
        const coords = parseCongCoordinateSearch(searchInput ? searchInput.value : '');
        if (coords) {
            searchCongByCoordinates(coords.lat, coords.lng, coords.radius, newPageSize, page);
            return;
        }
    }

    // Frontend không tự tính lại page nữa; backend chuẩn hóa phân trang
    fetchAndShowCong(newPageSize, page);
}

// Hàm để mở/đóng bảng dữ liệu cống
function toggleCongTable() {
    const container = document.getElementById('cong-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="cong"]');

    if (container.style.display === 'none' || container.style.display === '') {
        // Mở bảng
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.textContent = '📊';
            toggleBtn.style.background = '#dc3545';
        }
        isCongTableOpen = true;

        // Tự động fetch dữ liệu khi mở bảng
        const pageSizeInput = document.getElementById('cong-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        fetchAndShowCong(pageSize);


    } else {
        // Đóng bảng
        closeCongTable();
    }
}

// Hàm để đóng bảng dữ liệu cống
function closeCongTable() {
    const container = document.getElementById('cong-table-container');
    const toggleBtn = document.querySelector('.table-toggle-btn[data-layer="cong"]');

    if (container) {
        container.style.display = 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = '📊';
        toggleBtn.style.background = '#f0f0f0';
    }

    isCongTableOpen = false;

}

// Hàm để chọn dòng trong bảng
function selectCongRow(row, data) {
    console.log('selectCongRow called with:', row, data);

    // Bỏ chọn dòng cũ
    const allRows = document.querySelectorAll('#cong-table tbody tr');
    allRows.forEach(r => r.classList.remove('selected-row'));

    // Chọn dòng mới
    row.classList.add('selected-row');
    selectedCongRow = data;
    console.log('Selected row data:', selectedCongRow);

    // Cập nhật trạng thái các button
    updateCongActionButtons();
}

// Hàm cập nhật trạng thái các button action
function updateCongActionButtons() {
    const container = document.getElementById('cong-table-container');
    if (!container) return;

    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');

    if (editBtn && deleteBtn) {
        const hasSelection = selectedCongRow !== null;
        editBtn.disabled = !hasSelection;
        deleteBtn.disabled = !hasSelection;
        console.log('Updated buttons - hasSelection:', hasSelection, 'editBtn disabled:', editBtn.disabled, 'deleteBtn disabled:', deleteBtn.disabled);
    } else {
        console.log('Buttons not found - editBtn:', editBtn, 'deleteBtn:', deleteBtn);
    }
}

// Hàm tìm kiếm dữ liệu cống
function searchCongData() {
    const searchInput = document.getElementById('cong-search-input');
    const query = searchInput.value.trim();

    // Kiểm tra tìm kiếm theo tọa độ định dạng: lat, lng[, radius]
    const coords = parseCongCoordinateSearch(query);
    if (coords) {
        isCoordinateSearchCong = true;
        isSearchingCong = true;
        // Gọi API tìm kiếm theo tọa độ (WGS84)
        const pageSizeInput = document.getElementById('cong-pageSize');
        const pageSize = parseInt(pageSizeInput?.value) || 100;
        searchCongByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
            .catch(err => {
                console.error('Lỗi khi tìm kiếm cống theo tọa độ:', err);
                alert('Lỗi khi tìm kiếm theo tọa độ: ' + err.message);
            });
        return;
    }

    const queryLower = query.toLowerCase();

    if (queryLower === '') {
        // Nếu không có query, hiển thị lại dữ liệu gốc
        isSearchingCong = false;
        isCoordinateSearchCong = false;
        searchQueryCong = '';
        updateCongTable(originalCongData);
        return;
    }

    isSearchingCong = true;
    isCoordinateSearchCong = false;
    searchQueryCong = queryLower;

    // Lọc dữ liệu từ originalCongData
    const filteredData = originalCongData.filter(item => {
        return (
            (item.id && item.id.toString().toLowerCase().includes(queryLower)) ||
            (item.ten && item.ten.toLowerCase().includes(queryLower)) ||
            (item.cap && item.cap.toLowerCase().includes(queryLower)) ||
            (item.tenxa && item.tenxa.toLowerCase().includes(queryLower)) ||
            (item.codecong && item.codecong.toLowerCase().includes(queryLower)) ||
            (item.ten_chung && item.ten_chung.toLowerCase().includes(queryLower)) ||
            (item.ten_rieng && item.ten_rieng.toLowerCase().includes(queryLower)) ||
            (item.geometry && item.geometry.coordinates &&
                (item.geometry.coordinates[0]?.toString().includes(queryLower) ||
                    item.geometry.coordinates[1]?.toString().includes(queryLower)))
        );
    });

    updateCongTable(filteredData);

}

// Hàm thêm bản ghi cống mới
function addCongRecord() {
    // Tạo form modal để nhập dữ liệu
    const modal = createCongFormModal('Thêm cống mới', null);
    document.body.appendChild(modal);

    // Hiển thị modal
    setTimeout(() => {
        modal.style.display = 'flex';
        console.log('🎯 Modal đã hiển thị (add mode)');

        // Debug: kiểm tra các trường tọa độ
        const longitudeInput = modal.querySelector('#cong-longitude');
        const latitudeInput = modal.querySelector('#cong-latitude');
        console.log('📍 Longitude input:', longitudeInput);
        console.log('📍 Latitude input:', latitudeInput);
        console.log('📍 Longitude value:', longitudeInput ? longitudeInput.value : 'Not found');
        console.log('📍 Latitude value:', latitudeInput ? latitudeInput.value : 'Not found');
    }, 10);
}

// Hàm sửa bản ghi cống
function editCongRecord() {
    if (!selectedCongRow) {
        alert('Vui lòng chọn một dòng để sửa');
        return;
    }



    // Tạo form modal để sửa dữ liệu
    const modal = createCongFormModal('Sửa thông tin cống', selectedCongRow);
    document.body.appendChild(modal);

    // Hiển thị modal
    setTimeout(() => {
        modal.style.display = 'flex';
        console.log('🎯 Modal đã hiển thị (edit mode)');

        // Debug: kiểm tra các trường tọa độ
        const longitudeInput = modal.querySelector('#cong-longitude');
        const latitudeInput = modal.querySelector('#cong-latitude');
        console.log('📍 Longitude input:', longitudeInput);
        console.log('📍 Latitude input:', latitudeInput);
        console.log('📍 Longitude value:', longitudeInput ? longitudeInput.value : 'Not found');
        console.log('📍 Latitude value:', latitudeInput ? latitudeInput.value : 'Not found');
    }, 10);
}

// Hàm xóa bản ghi cống
function deleteCongRecord() {
    if (!selectedCongRow) {
        alert('Vui lòng chọn một dòng để xóa');
        return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa cống "${selectedCongRow.ten || selectedCongRow.id}"?`)) {
        // Gọi API để xóa
        deleteCongFromServer(selectedCongRow.id);
    }
}

// Hàm tạo modal form cho cống
function createCongFormModal(title, data) {
    console.log('🔧 Tạo modal với data:', data);
    console.log('📍 Geometry data:', data ? data.geometry : 'No geometry');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    // Lưu data vào dataset của modal để truyền cho form submit
    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.editId = data.id;
        console.log('✏️ Modal edit mode với ID:', data.id);
    } else {
        modal.dataset.editMode = 'false';
        console.log('➕ Modal add mode');
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form class="modal-form" onsubmit="handleCongFormSubmit(event)">
                <div class="form-group">
                    <label for="cong-ten">Tên cống:</label>
                    <input type="text" id="cong-ten" name="ten" value="${data ? data.ten || '' : ''}" required>
                </div>
                <div class="form-group">
                    <label for="cong-cap">Cấp:</label>
                    <input type="text" id="cong-cap" name="cap" value="${data ? data.cap || '' : ''}">
                </div>
                <div class="form-group">
                    <label for="cong-namxaydung">Năm xây dựng:</label>
                    <input type="number" id="cong-namxaydung" name="namxaydung" value="${data ? (data.namxaydung || '') : ''}" placeholder="VD: 2020">
                </div>
                <div class="form-group">
                    <label for="cong-tenxa">Tên xã:</label>
                    <input type="text" id="cong-tenxa" name="tenxa" value="${data ? data.tenxa || '' : ''}">
                </div>
                <div class="form-group">
                    <label for="cong-sophai">Số phai:</label>
                    <input type="text" id="cong-sophai" name="sophai" value="${data ? data.sophai || '' : ''}">
                </div>
                <div class="form-group">
                    <label for="cong-bkhoang_c">Bề khoảng (m):</label>
                    <input type="number" step="0.01" id="cong-bkhoang_c" name="bkhoang_c" value="${data ? (data.bkhoang_c || '') : ''}" placeholder="VD: 2.5">
                </div>
                <div class="form-group">
                    <label for="cong-tongcua_c">Tổng cửa:</label>
                    <input type="number" id="cong-tongcua_c" name="tongcua_c" value="${data ? (data.tongcua_c || '') : ''}" placeholder="VD: 3">
                </div>
                <div class="form-group">
                    <label for="cong-ghichu">Ghi chú:</label>
                    <textarea id="cong-ghichu" name="ghichu">${data ? data.ghichu || '' : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="cong-codecong">Mã cống:</label>
                    <input type="text" id="cong-codecong" name="codecong" value="${data ? data.codecong || '' : ''}">
                </div>
                <div class="form-group">
                    <label for="cong-ctrinh_day">Cao trình đáy:</label>
                    <input type="number" step="0.01" id="cong-ctrinh_day" name="ctrinh_day" value="${data ? (data.ctrinh_day || '') : ''}" placeholder="VD: 1.5">
                </div>
                <div class="form-group">
                    <label for="cong-ten_chung">Tên chung:</label>
                    <input type="text" id="cong-ten_chung" name="ten_chung" value="${data ? data.ten_chung || '' : ''}">
                </div>
                <div class="form-group">
                    <label for="cong-ten_rieng">Tên riêng:</label>
                    <input type="text" id="cong-ten_rieng" name="ten_rieng" value="${data ? data.ten_rieng || '' : ''}">
                </div>
                <div class="form-group">
                    <label for="cong-longitude">Kinh độ (VN2000):</label>
                    <input type="number" step="any" id="cong-longitude" name="longitude" value="${data && data.geometry ? data.geometry.coordinates[0] || '' : ''}" placeholder="VD: 606000.00">
                </div>
                <div class="form-group">
                    <label for="cong-latitude">Vĩ độ (VN2000):</label>
                    <input type="number" step="any" id="cong-latitude" name="latitude" value="${data && data.geometry ? data.geometry.coordinates[1] || '' : ''}" placeholder="VD: 1067000.00">
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

// Hàm xử lý submit form cống
function handleCongFormSubmit(event) {
    event.preventDefault();

    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const editId = modal.dataset.editId;

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());



    if (isEditMode && editId) {

        updateCongOnServer(editId, data);
    } else {

        addCongToServer(data);
    }

    // Đóng modal
    modal.remove();
}



// Hàm gọi API thêm cống
async function addCongToServer(data) {
    try {
        const response = await fetch('/api/cong', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Thêm cống thành công!');
            // Refresh dữ liệu
            const pageSizeInput = document.getElementById('cong-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowCong(pageSize);
        } else {
            alert('Lỗi khi thêm cống: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi thêm cống:', error);
        alert('Lỗi kết nối khi thêm cống');
    }
}

// Hàm gọi API cập nhật cống
async function updateCongOnServer(id, data) {
    try {
        const response = await fetch(`/api/cong/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Cập nhật cống thành công!');
            // Refresh dữ liệu
            const pageSizeInput = document.getElementById('cong-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowCong(pageSize);
        } else {
            alert('Lỗi khi cập nhật cống: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật cống:', error);
        alert('Lỗi kết nối khi cập nhật cống');
    }
}

// Hàm gọi API xóa cống
async function deleteCongFromServer(id) {
    try {
        const response = await fetch(`/api/cong/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (response.ok) {
            alert('Xóa cống thành công!');
            // Reset selection
            selectedCongRow = null;
            // Refresh dữ liệu
            const pageSizeInput = document.getElementById('cong-pageSize');
            const pageSize = parseInt(pageSizeInput.value) || 100;
            fetchAndShowCong(pageSize);
        } else {
            alert('Lỗi khi xóa cống: ' + response.statusText);
        }
    } catch (error) {
        console.error('Lỗi khi xóa cống:', error);
        alert('Lỗi kết nối khi xóa cống');
    }
}

// Hàm backup dữ liệu cống
async function backupCongData() {
    try {
        // Hiển thị thông báo đang xử lý
        const backupBtn = document.querySelector('.backup-btn');
        if (backupBtn) {
            backupBtn.disabled = true;
            backupBtn.innerHTML = '⏳ Đang backup...';
        }

        // Lấy tất cả dữ liệu cống từ server
        const response = await fetch('/api/cong/backup', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Tạo tên file backup với timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `cong_backup_${timestamp}.json`;

        // Tạo và tải xuống file JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        alert(`Backup dữ liệu cống thành công!\nFile: ${filename}\nSố bản ghi: ${data.length}`);

    } catch (error) {
        console.error('Lỗi khi backup dữ liệu cống:', error);
        alert('Lỗi khi backup dữ liệu cống: ' + error.message);
    } finally {
        // Khôi phục trạng thái nút
        const backupBtn = document.querySelector('.backup-btn');
        if (backupBtn) {
            backupBtn.disabled = false;
            backupBtn.innerHTML = '💾 Backup data';
        }
    }
}

// Hàm để enable/disable nút toggle bảng dữ liệu
function updateCongTableToggleButtons() {
    const toggleCong = document.getElementById('toggleCong');
    const toggleCongTable = document.querySelector('.table-toggle-btn[data-layer="cong"]');

    if (toggleCong && toggleCongTable) {
        if (toggleCong.checked) {
            toggleCongTable.disabled = false;
            toggleCongTable.style.opacity = '1';
        } else {
            toggleCongTable.disabled = true;
            toggleCongTable.style.opacity = '0.5';
            // Đóng bảng nếu layer bị tắt
            closeCongTable();
        }
    }
}

// Hàm kiểm tra xem có thể tắt toggle hay không
function canCongToggleOff() {
    return !isCongTableOpen;
}

// Hàm để thiết lập drag and drop cho bảng cống
function setupCongDragAndDrop() {
    const container = document.getElementById('cong-table-container');
    const header = document.getElementById('cong-table-header');

    if (!container || !header) return;

    // Bắt đầu drag
    header.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.resize-handle')) {
            return; // Không drag khi click vào button, input hoặc resize handle
        }

        isDraggingCong = true;
        const rect = container.getBoundingClientRect();
        dragOffsetCong.x = e.clientX - rect.left;
        dragOffsetCong.y = e.clientY - rect.top;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingCong) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();

        let newX = e.clientX - dragOffsetCong.x;
        let newY = e.clientY - dragOffsetCong.y;

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
        if (isDraggingCong) {
            isDraggingCong = false;
            container.style.cursor = 'move';
        }
    });
}

// Hàm để thiết lập resize cho bảng cống
function setupCongResize() {
    const container = document.getElementById('cong-table-container');
    const resizeHandles = container.querySelectorAll('.resize-handle');

    if (!container || !resizeHandles.length) return;

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            isResizingCong = true;
            resizeDirectionCong = handle.className.split(' ')[1]; // Lấy direction từ class
            const rect = container.getBoundingClientRect();

            resizeStartCong = {
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
        if (!isResizingCong) return;

        const deltaX = e.clientX - resizeStartCong.x;
        const deltaY = e.clientY - resizeStartCong.y;

        let newWidth = resizeStartCong.width;
        let newHeight = resizeStartCong.height;
        let newLeft = resizeStartCong.left;
        let newTop = resizeStartCong.top;

        // Xử lý resize theo hướng
        if (resizeDirectionCong.includes('e')) {
            newWidth = Math.max(400, resizeStartCong.width + deltaX);
        }
        if (resizeDirectionCong.includes('w')) {
            const widthChange = Math.min(deltaX, resizeStartCong.width - 400);
            newWidth = resizeStartCong.width - widthChange;
            newLeft = resizeStartCong.left + widthChange;
        }
        if (resizeDirectionCong.includes('s')) {
            newHeight = Math.max(300, resizeStartCong.height + deltaY);
        }
        if (resizeDirectionCong.includes('n')) {
            const heightChange = Math.min(deltaY, resizeStartCong.height - 300);
            newHeight = resizeStartCong.height - heightChange;
            newTop = resizeStartCong.top + heightChange;
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
        if (isResizingCong) {
            isResizingCong = false;
            document.body.style.cursor = '';
        }
    });
}

// Khởi tạo table cống
function renderCongPagination(pagination) {
    const paginationContainer = document.getElementById('cong-pagination');
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
            if (isCoordinateSearchCong) {
                const searchInput = document.getElementById('cong-search-input');
                const coords = parseCongCoordinateSearch(searchInput ? searchInput.value : '');
                const pageSizeInput = document.getElementById('cong-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || currentCongPageSize;
                if (coords) {
                    searchCongByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, targetPage);
                    return;
                }
            }
            updateCongData(targetPage);
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

function initCongTable() {
    // Thiết lập drag and drop
    setupCongDragAndDrop();

    // Thiết lập resize
    setupCongResize();

    // Thiết lập event listener cho thanh tìm kiếm
    setupCongSearchInput();

    // Khởi tạo trạng thái ban đầu
    updateCongTableToggleButtons();
}

// Thiết lập event listener cho thanh tìm kiếm
function setupCongSearchInput() {
    const searchInput = document.getElementById('cong-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                searchCongData();
            }
        });
    }
}

// Parse input tìm kiếm theo tọa độ: "lat, lng" hoặc "lat, lng, radius"
function parseCongCoordinateSearch(input) {
    const trimmed = (input || '').trim();
    const coordMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)(?:\s*,\s*(\d+\.?\d*))?$/);
    if (coordMatch) {
        const a = parseFloat(coordMatch[1]);
        const b = parseFloat(coordMatch[2]);
        let lat = a;
        let lng = b;
        // Tự động nhận diện nếu người dùng nhập theo thứ tự lng, lat
        if (Math.abs(a) > 90 && Math.abs(a) <= 180 && Math.abs(b) <= 90) {
            lat = b;
            lng = a;
        }
        return {
            lat,
            lng,
            radius: coordMatch[3] ? parseFloat(coordMatch[3]) : 0.01
        };
    }
    return null;
}

// Gọi API search theo tọa độ (WGS84) và cập nhật bảng
async function searchCongByCoordinates(lat, lng, radius = 0.01, pageSize = currentCongPageSize, page = 1) {
    try {
        const params = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            radius: String(radius),
            page: String(page),
            pageSize: String(pageSize),
            fromSrid: '9209',
            toSrid: '4326'
        });
        const response = await fetch(`/api/cong/search?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || ('HTTP ' + response.status));
        }
        const json = await response.json();
        isSearchingCong = true;
        isCoordinateSearchCong = true;
        updateCongTable(json.data || [], json.pagination || undefined);
    } catch (error) {
        console.error('Lỗi searchCongByCoordinates:', error);
        throw error;
    }
}

// Export các function ra window object
window.updateCongTable = updateCongTable;
window.updateCongData = updateCongData;
window.toggleCongTable = toggleCongTable;
window.closeCongTable = closeCongTable;
window.updateCongTableToggleButtons = updateCongTableToggleButtons;
window.setupCongDragAndDrop = setupCongDragAndDrop;
window.setupCongResize = setupCongResize;
window.initCongTable = initCongTable;
window.canCongToggleOff = canCongToggleOff;

// Export các function mới
window.searchCongData = searchCongData;
window.addCongRecord = addCongRecord;
window.editCongRecord = editCongRecord;
window.deleteCongRecord = deleteCongRecord;
window.backupCongData = backupCongData;
window.handleCongFormSubmit = handleCongFormSubmit;
window.selectCongRow = selectCongRow;
window.setupCongSearchInput = setupCongSearchInput;
window.searchCongByCoordinates = searchCongByCoordinates;
