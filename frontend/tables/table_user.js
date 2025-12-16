(function () {
    const API_ENDPOINT = '/api/users';

    let allUsers = [];
    let filteredUsers = [];

    function renderTable(data) {
        const tbody = document.querySelector('#user-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'data-row';
            tr.dataset.id = u.id;
            tr.addEventListener('click', function () { selectUserRow(this, u); });
            const permNames = Array.isArray(u.permissions) ? u.permissions : [];
            const tooltip = permNames.length ? permNames.join(', ') : '';
            tr.title = tooltip;
            tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.username || ''}</td>
                <td>${u.role.name || ''}</td>
            `;
            tbody.appendChild(tr);
        });
        updateUserActionButtons();
    }

    let selectedUserRow = null;

    function selectUserRow(rowEl, data) {
        const all = document.querySelectorAll('#user-table tbody tr');
        all.forEach(r => r.classList.remove('selected-row'));
        rowEl.classList.add('selected-row');
        selectedUserRow = data;
        updateUserActionButtons();
    }

    function updateUserActionButtons() {
        const container = document.getElementById('user-table-container');
        if (!container) return;
        const editBtn = container.querySelector('.data-table-action-btn.edit-btn');
        if (editBtn) {
            editBtn.disabled = !selectedUserRow;
        }
    }

    function createUserModal(title, data) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <form class="modal-form" onsubmit="window.handleUserFormSubmit(event)">
                    <div class="form-group">
                        <label for="user-username">Tên đăng nhập:</label>
                        <input type="text" id="user-username" name="username" value="${data ? (data.username || '') : ''}" ${data ? 'readonly' : ''} required>
                    </div>
                    ${data ? '' : `
                    <div class="form-group">
                        <label for="user-password">Mật khẩu:</label>
                        <input type="password" id="user-password" name="password" required>
                    </div>`}
                    <div class="form-group">
                        <label for="user-role">Quyền (role):</label>
                        <select id="user-role" name="role" required></select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                        <button type="submit" class="btn-submit">${data ? 'Cập nhật quyền' : 'Thêm user'}</button>
                    </div>
                </form>
            </div>
        `;
        // Nạp danh sách roles động
        setTimeout(() => { populateRoleOptions(modal.querySelector('#user-role'), data && data.role); }, 0);
        return modal;
    }

    function addUserRecord() {
        const m = createUserModal('Thêm User', null);
        document.body.appendChild(m);
        setTimeout(() => { m.style.display = 'flex'; }, 10);
    }

    function editUserRecord() {
        if (!selectedUserRow) { alert('Vui lòng chọn một dòng để sửa'); return; }
        const m = createUserModal('Cập nhật quyền User', selectedUserRow);
        document.body.appendChild(m);
        setTimeout(() => { m.style.display = 'flex'; }, 10);
    }

    async function handleUserFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        try {
            const token = localStorage.getItem('access_token');
            if (selectedUserRow) {
                // Update role
                const res = await fetch('/api/update/user/role', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({ id: selectedUserRow.id, role: payload.role })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || `HTTP ${res.status}`);
                }
                alert('Cập nhật quyền thành công');
            } else {
                // Create user
                const res = await fetch('/api/create/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({ username: payload.username, password: payload.password, role: payload.role })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || `HTTP ${res.status}`);
                }
                alert('Thêm user thành công');
            }
            form.closest('.modal-overlay').remove();
            // refresh
            fetchUsers();
        } catch (e) {
            alert('Lỗi: ' + (e.message || e));
        }
    }

    async function fetchUsers() {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(API_ENDPOINT, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${res.status}`);
            }
            const data = await res.json();
            // Hỗ trợ cả {users} cũ và {data} mới
            const users = Array.isArray(data.data) ? data.data : (Array.isArray(data.users) ? data.users : []);
            allUsers = users;
            filteredUsers = allUsers;
            renderTable(filteredUsers);
        } catch (e) {
            alert('Không thể tải danh sách user: ' + (e.message || e));
        }
    }

    async function populateRoleOptions(selectEl, selectedValue) {
        if (!selectEl) return;
        // Clear
        selectEl.innerHTML = '<option value="" disabled selected>Đang tải...</option>';
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/roles', {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            const data = await res.json().catch(() => ({}));
            const roles = Array.isArray(data.data) ? data.data : (Array.isArray(data.roles) ? data.roles : []);
            selectEl.innerHTML = '';
            roles.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.name;
                opt.textContent = r.name;
                if (selectedValue && selectedValue === r.name) opt.selected = true;
                selectEl.appendChild(opt);
            });
            if (!roles.length) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Không có role';
                selectEl.appendChild(opt);
            }
        } catch (e) {
            selectEl.innerHTML = '';
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Lỗi tải role';
            selectEl.appendChild(opt);
        }
    }

    function openUserTable() {
        const container = document.getElementById('user-table-container');
        if (!container) return;
        container.style.display = 'block';
        fetchUsers();
    }

    function closeUserTable() {
        const container = document.getElementById('user-table-container');
        if (!container) return;
        container.style.display = 'none';
    }

    function searchUserData() {
        const q = (document.getElementById('user-search-input')?.value || '').trim().toLowerCase();
        if (!q) {
            filteredUsers = allUsers;
        } else {
            filteredUsers = allUsers.filter(u => (
                String(u.id).includes(q) ||
                (u.username && u.username.toLowerCase().includes(q)) ||
                (u.role && u.role.toLowerCase().includes(q))
            ));
        }
        renderTable(filteredUsers);
    }

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    function toggleAdminButtonByRole() {
        const container = document.getElementById('adminUserManageContainer');
        const userBtn = document.getElementById('manageUsersBtn');
        const roleBtn = document.getElementById('manageRolesBtn');
        const role = localStorage.getItem('role');
        const isAdmin = role === 'admin';
        if (container) container.style.display = isAdmin ? '' : 'none';
        if (userBtn) userBtn.onclick = function () { openUserTable(); };
        if (roleBtn && typeof window.openRoleManager === 'function') roleBtn.onclick = window.openRoleManager;
        if (typeof window.toggleAdminRoleButton === 'function') window.toggleAdminRoleButton();
    }

    function initUserTable() {
        toggleAdminButtonByRole();
        const input = document.getElementById('user-search-input');
        if (input) {
            input.addEventListener('input', function () {
                searchUserData();
            });
        }
    }

    // Expose to window
    window.initUserTable = initUserTable;
    window.openUserTable = openUserTable;
    window.closeUserTable = closeUserTable;
    window.searchUserData = searchUserData;
    window.toggleAdminUserButton = toggleAdminButtonByRole;
    window.addUserRecord = addUserRecord;
    window.editUserRecord = editUserRecord;
    window.handleUserFormSubmit = handleUserFormSubmit;
})();
