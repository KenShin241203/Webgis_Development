// ===== BẢNG DỮ LIỆU ĐIỂM KHẢO SÁT ===== //
let khaoSatTableData = [];
let originalKhaoSatData = [];
let selectedKhaoSatRow = null;
let currentKhaoSatPage = 1;
let khaoSatPageSize = 100;
let khaoSatTotalPages = 1;
let isSearchingKhaoSat = false;
let isCoordinateSearch = false;

// Upload ảnh lên backend (multipart) và trả về URL
async function uploadKhaoSatImageAndGetUrl(file) {
    const form = new FormData();
    form.append('image', file);
    const token = localStorage.getItem('access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const resp = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: form
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Upload failed');
    }
    const json = await resp.json();
    return json.url; // ví dụ: /uploads/<filename>
}

// Khởi tạo bảng điểm khảo sát
window.initKhaoSatTable = function () {
    console.log('Khởi tạo bảng điểm khảo sát...');

    // Sử dụng dữ liệu cứng từ layer_khaosat.js
    if (typeof window.imageData !== 'undefined' && Array.isArray(window.imageData)) {
        khaoSatTableData = window.imageData.map((item, index) => ({
            id: item.id || index + 1,
            ten: item.caption,
            lat: item.lat,
            lng: item.lng,
            hinhAnh: item.image
        }));
        originalKhaoSatData = [...khaoSatTableData];
        khaoSatTotalPages = Math.ceil(khaoSatTableData.length / khaoSatPageSize) || 1;
        renderKhaoSatTable();
    } else {
        // Nếu chưa có dữ liệu, gọi fetchAndShowKhaoSat để load dữ liệu cứng
        if (typeof window.fetchAndShowKhaoSat === 'function') {
            window.fetchAndShowKhaoSat(khaoSatPageSize, 1);
        }
    }
};

// Render bảng điểm khảo sát
function renderKhaoSatTable() {
    const table = document.getElementById('khaosat-table');
    const tableBody = table ? table.querySelector('tbody') : null;
    if (!tableBody) return;

    const startIndex = (currentKhaoSatPage - 1) * khaoSatPageSize;
    const endIndex = startIndex + khaoSatPageSize;
    const pageData = khaoSatTableData.slice(startIndex, endIndex);

    tableBody.innerHTML = '';

    pageData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'data-row';
        row.dataset.id = item.id;
        row.dataset.index = index;
        row.innerHTML = `
			<td>${item.id ?? ''}</td>
			<td>${item.ten ?? ''}</td>
			<td>${typeof item.lat === 'number' ? item.lat.toFixed(6) : ''}</td>
			<td>${typeof item.lng === 'number' ? item.lng.toFixed(6) : ''}</td>
			<td>
				<img src="${item.hinhAnh || ''}" alt="${item.ten || ''}" style="width: 50px; height: 50px; object-fit: cover; cursor: pointer;" 
					onclick="showKhaoSatImage('${item.hinhAnh || ''}', '${item.ten || ''}')" title="Click để xem ảnh lớn">
			</td>
		`;
        row.addEventListener('click', function () {
            selectKhaoSatRow(this, item);
        });
        tableBody.appendChild(row);
    });

    updateKhaoSatPagination();
    updateKhaoSatActionButtons();
}

// Cập nhật phân trang
function updateKhaoSatPagination(pagination) {
    const paginationContainer = document.getElementById('khaosat-pagination');
    if (!paginationContainer) return;

    // Nếu backend gửi pagination thì sử dụng; nếu không, dùng client-side tạm thời
    if (pagination && typeof pagination.total !== 'undefined') {
        currentKhaoSatPage = Number(pagination.page) || 1;
        khaoSatPageSize = Number(pagination.pageSize) || khaoSatPageSize;
        khaoSatTotalPages = Number(pagination.totalPages) || 1;
    } else {
        khaoSatTotalPages = Math.ceil(khaoSatTableData.length / khaoSatPageSize) || 1;
    }

    paginationContainer.innerHTML = '';

    const createBtn = (text, targetPage, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = 'pagination-btn' + (active ? ' active' : '');
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (isCoordinateSearch) {
                // Nếu đang tìm kiếm theo tọa độ, gọi API search
                const searchInput = document.getElementById('khaosat-search-input');
                const coords = parseCoordinateSearch(searchInput ? searchInput.value : '');
                if (coords) {
                    window.searchKhaoSatByCoordinates(coords.lat, coords.lng, coords.radius, khaoSatPageSize, targetPage);
                }
            } else {
                window.updateKhaoSatData(targetPage);
            }
        });
        return btn;
    };

    const currentPage = Number(currentKhaoSatPage) || 1;
    const totalPages = Number(khaoSatTotalPages) || 1;

    paginationContainer.appendChild(createBtn('«', Math.max(1, currentPage - 1), currentPage === 1));

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) {
        paginationContainer.appendChild(createBtn(String(p), p, false, p === currentPage));
    }

    paginationContainer.appendChild(createBtn('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
}

// Hàm parse tọa độ từ input search
function parseCoordinateSearch(input) {
    const trimmed = input.trim();

    // Kiểm tra format: lat, lng hoặc lat,lng
    const coordMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)(?:\s*,\s*(\d+\.?\d*))?$/);
    if (coordMatch) {
        return {
            lat: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2]),
            radius: coordMatch[3] ? parseFloat(coordMatch[3]) : 0.01
        };
    }

    return null;
}

// Hiển thị ảnh lớn
window.showKhaoSatImage = function (imageSrc, caption) {
    const modal = document.createElement('div');
    modal.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10000;
		cursor: pointer;
	`;

    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
		max-width: 90%;
		max-height: 90%;
		text-align: center;
	`;

    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = caption;
    img.style.cssText = `
		max-width: 100%;
		max-height: 80vh;
		object-fit: contain;
		border-radius: 8px;
	`;

    const captionDiv = document.createElement('div');
    captionDiv.textContent = caption;
    captionDiv.style.cssText = `
		color: white;
		margin-top: 10px;
		font-size: 16px;
		font-weight: 500;
	`;

    imageContainer.appendChild(img);
    imageContainer.appendChild(captionDiv);
    modal.appendChild(imageContainer);

    modal.onclick = () => {
        document.body.removeChild(modal);
    };

    document.body.appendChild(modal);
};

// Nhận dữ liệu từ layer và cập nhật bảng
window.updateKhaoSatTable = function (data, pagination) {
    try {
        // Lưu dữ liệu hiện tại
        khaoSatTableData = (data || []).map(item => ({
            id: item.id ?? item.ID ?? '',
            ten: item.caption || item.ten || '',
            lat: typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat,
            lng: typeof item.lng === 'string' ? parseFloat(item.lng) : item.lng,
            hinhAnh: item.image || item.hinhAnh || ''
        }));
        if (!isSearchingKhaoSat) {
            originalKhaoSatData = [...khaoSatTableData];
        }

        // Cập nhật pageSize input nếu có pagination từ backend
        const pageSizeInput = document.getElementById('khaosat-pageSize');
        if (pageSizeInput && pagination && pagination.pageSize) {
            pageSizeInput.value = pagination.pageSize;
            khaoSatPageSize = Number(pagination.pageSize) || khaoSatPageSize;
        }

        // Render bảng và phân trang
        updateKhaoSatPagination(pagination);
        renderKhaoSatTable();
    } catch (error) {
        console.error('Lỗi khi cập nhật bảng khảo sát:', error);
    }
};

// Hàm để người dùng cập nhật pageSize từ giao diện
window.updateKhaoSatData = function (page = currentKhaoSatPage) {
    const pageSizeInput = document.getElementById('khaosat-pageSize');
    const newPageSize = parseInt(pageSizeInput.value) || 100;
    if (newPageSize < 1) {
        alert('Số dòng phải từ 1');
        return;
    }
    // Gọi layer fetch (backend chuẩn hóa phân trang)
    if (typeof window.fetchAndShowKhaoSat === 'function') {
        window.fetchAndShowKhaoSat(newPageSize, page);
    }
};

// Tìm kiếm dữ liệu khảo sát (hỗ trợ cả text và tọa độ)
window.searchKhaoSatData = function () {
    const searchInput = document.getElementById('khaosat-search-input');
    const query = (searchInput ? searchInput.value : '').trim();

    if (query === '') {
        isSearchingKhaoSat = false;
        isCoordinateSearch = false;
        khaoSatTableData = [...originalKhaoSatData];
        currentKhaoSatPage = 1;
        renderKhaoSatTable();
        return;
    }

    // Kiểm tra xem có phải tìm kiếm theo tọa độ không
    const coords = parseCoordinateSearch(query);
    if (coords) {
        isCoordinateSearch = true;
        isSearchingKhaoSat = true;

        // Gọi API search theo tọa độ
        if (typeof window.searchKhaoSatByCoordinates === 'function') {
            const pageSizeInput = document.getElementById('khaosat-pageSize');
            const pageSize = parseInt(pageSizeInput?.value) || 100;

            window.searchKhaoSatByCoordinates(coords.lat, coords.lng, coords.radius, pageSize, 1)
                .then(() => {
                    console.log('Tìm kiếm theo tọa độ thành công');
                })
                .catch(error => {
                    console.error('Lỗi khi tìm kiếm theo tọa độ:', error);
                    alert('Lỗi khi tìm kiếm theo tọa độ: ' + error.message);
                });
        }
        return;
    }

    // Tìm kiếm text thông thường
    isCoordinateSearch = false;
    isSearchingKhaoSat = true;
    const queryLower = query.toLowerCase();
    const filtered = originalKhaoSatData.filter(item => {
        return (
            (item.id && item.id.toString().toLowerCase().includes(queryLower)) ||
            (item.ten && item.ten.toLowerCase().includes(queryLower)) ||
            (typeof item.lat === 'number' && item.lat.toString().toLowerCase().includes(queryLower)) ||
            (typeof item.lng === 'number' && item.lng.toString().toLowerCase().includes(queryLower))
        );
    });
    khaoSatTableData = filtered;
    currentKhaoSatPage = 1;
    renderKhaoSatTable();
};

// Chọn dòng
function selectKhaoSatRow(row, data) {
    const allRows = document.querySelectorAll('#khaosat-table tbody tr');
    allRows.forEach(r => r.classList.remove('selected-row'));
    row.classList.add('selected-row');
    selectedKhaoSatRow = data;
    updateKhaoSatActionButtons();
}

function updateKhaoSatActionButtons() {
    const container = document.getElementById('khaosat-table-container');
    if (!container) return;
    const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
    const deleteBtn = container.querySelector('.data-table-action-btn.delete-btn');
    const hasSelection = selectedKhaoSatRow !== null;
    if (editBtn) editBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

// Modal helper
function createKhaoSatFormModal(title, data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    if (data) {
        modal.dataset.editMode = 'true';
        modal.dataset.editId = data.id;
    } else {
        modal.dataset.editMode = 'false';
    }
    modal.innerHTML = `
		<div class="modal-content">
			<div class="modal-header">
				<h3>${title}</h3>
				<button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
			</div>
			<form class="modal-form" onsubmit="handleKhaoSatFormSubmit(event)">
				<div class="form-group">
					<label for="khaosat-caption">Tên điểm:</label>
					<input type="text" id="khaosat-caption" name="caption" value="${data ? (data.ten || '') : ''}" required>
				</div>
				<div class="form-group">
					<label for="khaosat-image">Ảnh (URL hoặc tự điền khi chọn file):</label>
					<input type="text" id="khaosat-image" name="image" value="${data ? (data.hinhAnh || '') : ''}" placeholder="https://... hoặc sẽ được điền từ file">
				</div>
				<div class="form-group">
					<label for="khaosat-image-file">Chọn ảnh (tùy chọn):</label>
					<input type="file" id="khaosat-image-file" accept="image/*">
				</div>
				<div class="form-group">
					<img id="khaosat-image-preview" src="${data && data.hinhAnh ? data.hinhAnh : ''}" style="max-width: 100%; max-height: 160px; border-radius: 6px; display: ${data && data.hinhAnh ? 'block' : 'none'};" alt="Xem trước ảnh" />
				</div>
				<div class="form-group">
					<label for="khaosat-lat">Vĩ độ (lat):</label>
					<input type="number" step="any" id="khaosat-lat" name="lat" value="${data && typeof data.lat !== 'undefined' ? data.lat : ''}" required>
				</div>
				<div class="form-group">
					<label for="khaosat-lng">Kinh độ (lng):</label>
					<input type="number" step="any" id="khaosat-lng" name="lng" value="${data && typeof data.lng !== 'undefined' ? data.lng : ''}" required>
				</div>
				<div class="form-actions">
					<button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-cancel">Hủy</button>
					<button type="submit" class="btn-submit">${data ? 'Cập nhật' : 'Thêm'}</button>
				</div>
			</form>
		</div>
	`;

    // Wire file input: upload multipart -> nhận URL -> điền vào input + preview
    const fileInput = modal.querySelector('#khaosat-image-file');
    const imageUrlInput = modal.querySelector('#khaosat-image');
    const previewImg = modal.querySelector('#khaosat-image-preview');
    if (fileInput && imageUrlInput && previewImg) {
        fileInput.addEventListener('change', async function () {
            const file = this.files && this.files[0];
            if (!file) return;
            try {
                // Hiển thị tạm thời trạng thái loading
                imageUrlInput.value = 'Đang tải ảnh...';
                previewImg.style.display = 'none';

                const url = await uploadKhaoSatImageAndGetUrl(file);
                imageUrlInput.value = url;
                previewImg.src = url;
                previewImg.style.display = 'block';
            } catch (err) {
                console.error('Upload ảnh thất bại:', err);
                alert('Tải ảnh thất bại: ' + (err.message || 'Không rõ nguyên nhân'));
                imageUrlInput.value = '';
                previewImg.style.display = 'none';
            }
        });
    }
    return modal;
}

// CRUD public APIs - Cập nhật theo chuẩn table_cong.js
window.addKhaoSatRecord = function () {
    const modal = createKhaoSatFormModal('Thêm điểm khảo sát', null);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
};

window.editKhaoSatRecord = function () {
    if (!selectedKhaoSatRow) {
        alert('Vui lòng chọn một dòng để sửa');
        return;
    }
    const modal = createKhaoSatFormModal('Sửa điểm khảo sát', selectedKhaoSatRow);
    document.body.appendChild(modal);
    setTimeout(() => { modal.style.display = 'flex'; }, 10);
};

window.deleteKhaoSatRecord = function () {
    if (!selectedKhaoSatRow) {
        alert('Vui lòng chọn một dòng để xóa');
        return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa điểm "${selectedKhaoSatRow.ten || selectedKhaoSatRow.id}"?`)) {
        // Gọi API để xóa
        deleteKhaoSatFromServer(selectedKhaoSatRow.id);
    }
};

// Hàm thêm khảo sát vào dữ liệu cứng (chỉ thêm vào bảng, không lưu server)
async function addKhaoSatToServer(data) {
    try {
        // Thêm vào dữ liệu cứng
        const newId = Math.max(...imageData.map(item => item.id || 0), 0) + 1;
        const newItem = {
            id: newId,
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lng),
            image: data.image,
            caption: data.caption
        };

        // Thêm vào biến imageData trong layer_khaosat.js
        if (typeof imageData !== 'undefined') {
            imageData.push(newItem);
        }

        alert('Thêm điểm khảo sát thành công!');

        // Refresh dữ liệu
        const pageSizeInput = document.getElementById('khaosat-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        if (typeof window.fetchAndShowKhaoSat === 'function') {
            window.fetchAndShowKhaoSat(pageSize, 1);
        }
    } catch (error) {
        console.error('Lỗi khi thêm điểm khảo sát:', error);
        alert('Lỗi khi thêm điểm khảo sát');
    }
}

// Hàm cập nhật khảo sát trong dữ liệu cứng
async function updateKhaoSatOnServer(id, data) {
    try {
        // Tìm và cập nhật trong dữ liệu cứng
        if (typeof imageData !== 'undefined') {
            const index = imageData.findIndex(item => item.id == id);
            if (index !== -1) {
                imageData[index] = {
                    id: id,
                    lat: parseFloat(data.lat),
                    lng: parseFloat(data.lng),
                    image: data.image,
                    caption: data.caption
                };
            }
        }

        alert('Cập nhật điểm khảo sát thành công!');

        // Refresh dữ liệu
        const pageSizeInput = document.getElementById('khaosat-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        if (typeof window.fetchAndShowKhaoSat === 'function') {
            window.fetchAndShowKhaoSat(pageSize, 1);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật điểm khảo sát:', error);
        alert('Lỗi khi cập nhật điểm khảo sát');
    }
}

// Hàm xóa khảo sát khỏi dữ liệu cứng
async function deleteKhaoSatFromServer(id) {
    try {
        // Xóa khỏi dữ liệu cứng
        if (typeof imageData !== 'undefined') {
            const index = imageData.findIndex(item => item.id == id);
            if (index !== -1) {
                imageData.splice(index, 1);
            }
        }

        alert('Xóa điểm khảo sát thành công!');

        // Reset selection
        selectedKhaoSatRow = null;

        // Refresh dữ liệu
        const pageSizeInput = document.getElementById('khaosat-pageSize');
        const pageSize = parseInt(pageSizeInput.value) || 100;
        if (typeof window.fetchAndShowKhaoSat === 'function') {
            window.fetchAndShowKhaoSat(pageSize, 1);
        }
    } catch (error) {
        console.error('Lỗi khi xóa điểm khảo sát:', error);
        alert('Lỗi khi xóa điểm khảo sát');
    }
}

// Hàm xử lý submit form khảo sát
window.handleKhaoSatFormSubmit = function (event) {
    event.preventDefault();

    const modal = event.target.closest('.modal-overlay');
    const isEditMode = modal.dataset.editMode === 'true';
    const editId = modal.dataset.editId;

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    if (isEditMode && editId) {
        updateKhaoSatOnServer(editId, data);
    } else {
        addKhaoSatToServer(data);
    }

    // Đóng modal
    modal.remove();
};

// Toggle bảng điểm khảo sát
window.toggleKhaoSatTable = function () {
    const container = document.getElementById('khaosat-table-container');
    if (container) {
        if (container.style.display === 'none' || container.style.display === '') {
            container.style.display = 'block';
            if (khaoSatTableData.length === 0 && typeof window.fetchAndShowKhaoSat === 'function') {
                const pageSizeInput = document.getElementById('khaosat-pageSize');
                const pageSize = parseInt(pageSizeInput?.value) || 100;
                window.fetchAndShowKhaoSat(pageSize);
            }
        } else {
            container.style.display = 'none';
        }
    }
};

// Đóng bảng điểm khảo sát
window.closeKhaoSatTable = function () {
    const container = document.getElementById('khaosat-table-container');
    if (container) {
        container.style.display = 'none';
    }
};

// Kiểm tra xem có thể đóng bảng không
window.canKhaoSatToggleOff = function () {
    const container = document.getElementById('khaosat-table-container');
    return !container || container.style.display === 'none';
};

// Thiết lập event Enter cho ô tìm kiếm
(function setupKhaoSatSearchInput() {
    const searchInput = document.getElementById('khaosat-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                window.searchKhaoSatData();
            }
        });
    }
})(); 