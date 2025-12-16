(function () {
    const API_ENDPOINT = '/api/roles';
    const MODULES = ['CONG', 'SUTLUN', 'CHATLUONG', 'DEBAO', 'DOLUN', 'HIENTRANG', 'NGAPLUT', 'KHAOSAT', 'USER', 'ROLE', 'SYSTEM'];
    const ACTIONS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'];
    const SPECIAL_PERMISSIONS = ['CONG_BACKUP', 'WEATHER_VIEW'];

    function getAuthHeaders() {
        const token = localStorage.getItem('access_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    function buildPermissionName(module, action) {
        return `${module}_${action}`;
    }

    function renderPermissionsCheckboxes(selected = []) {
        const container = document.createElement('div');
        container.className = 'permissions-grid';

        // Render module permissions
        MODULES.forEach(m => {
            const section = document.createElement('div');
            section.className = 'perm-section';
            const title = document.createElement('div');
            title.className = 'perm-title';
            title.textContent = getModuleDisplayName(m);
            section.appendChild(title);
            const group = document.createElement('div');
            group.className = 'perm-group';
            ACTIONS.forEach(a => {
                const permName = buildPermissionName(m, a);
                const label = document.createElement('label');
                label.className = 'perm-item';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.name = 'permissions';
                input.value = permName;
                if (selected.includes(permName)) input.checked = true;
                const text = document.createTextNode(getActionDisplayName(a));
                label.appendChild(input);
                label.appendChild(text);
                group.appendChild(label);
            });
            section.appendChild(group);
            container.appendChild(section);
        });

        // Render special permissions
        if (SPECIAL_PERMISSIONS.length > 0) {
            const specialSection = document.createElement('div');
            specialSection.className = 'perm-section';
            const specialTitle = document.createElement('div');
            specialTitle.className = 'perm-title';
            specialTitle.textContent = 'Quyền đặc biệt';
            specialSection.appendChild(specialTitle);
            const specialGroup = document.createElement('div');
            specialGroup.className = 'perm-group';
            SPECIAL_PERMISSIONS.forEach(perm => {
                const label = document.createElement('label');
                label.className = 'perm-item';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.name = 'permissions';
                input.value = perm;
                if (selected.includes(perm)) input.checked = true;
                const text = document.createTextNode(getSpecialPermissionDisplayName(perm));
                label.appendChild(input);
                label.appendChild(text);
                specialGroup.appendChild(label);
            });
            specialSection.appendChild(specialGroup);
            container.appendChild(specialSection);
        }

        return container;
    }

    function getModuleDisplayName(module) {
        const names = {
            'CONG': 'Cống',
            'SUTLUN': 'Sụt lún',
            'CHATLUONG': 'Chất lượng',
            'DEBAO': 'Đê bao',
            'DOLUN': 'Độ lún',
            'HIENTRANG': 'Hiện trạng',
            'NGAPLUT': 'Ngập lụt',
            'KHAOSAT': 'Khảo sát',
            'USER': 'Quản lý User',
            'ROLE': 'Quản lý Role',
            'SYSTEM': 'Hệ thống'
        };
        return names[module] || module;
    }

    function getActionDisplayName(action) {
        const names = {
            'VIEW': 'Xem',
            'CREATE': 'Thêm',
            'UPDATE': 'Sửa',
            'DELETE': 'Xóa'
        };
        return names[action] || action;
    }

    function getSpecialPermissionDisplayName(permission) {
        const names = {
            'CONG_BACKUP': 'Backup cống',
            'WEATHER_VIEW': 'Xem thời tiết'
        };
        return names[permission] || permission;
    }

    function createRoleModal(title, role) {
        const permsSelected = role && role.permissions ? role.permissions.map(p => p.name) : [];
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <form class="modal-form" onsubmit="window.handleRoleFormSubmit(event)">
                    <div class="form-group">
                        <label for="role-name">Tên role:</label>
                        <input type="text" id="role-name" name="name" value="${role ? (role.name || '') : ''}" required ${role ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label for="role-desc">Mô tả:</label>
                        <input type="text" id="role-desc" name="description" value="${role ? (role.description || '') : ''}">
                    </div>
                    <div class="form-group">
                        <label>Quyền thao tác:</label>
                        <div id="permissions-container"></div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                        <button type="submit" class="btn-submit">${role ? 'Cập nhật' : 'Thêm role'}</button>
                    </div>
                </form>
            </div>
        `;
        setTimeout(() => {
            const permsDom = renderPermissionsCheckboxes(permsSelected);
            modal.querySelector('#permissions-container').appendChild(permsDom);
        }, 0);
        modal.dataset.roleId = role && role.id ? role.id : '';
        return modal;
    }

    let rolesCache = [];
    let selectedRole = null;

    function renderRolesTable() {
        const tbody = document.querySelector('#roles-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rolesCache.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = 'data-row';
            tr.onclick = () => { selectRoleRow(tr, r); };
            const count = Array.isArray(r.permissions) ? r.permissions.length : 0;
            const permNames = Array.isArray(r.permissions) ? r.permissions.map(p => p.name) : [];
            const maxPreview = 5;
            const preview = permNames.slice(0, maxPreview).join(', ');
            const more = permNames.length > maxPreview ? ` …(+${permNames.length - maxPreview})` : '';
            tr.innerHTML = `
                <td>${r.id}</td>
                <td>${r.name || ''}</td>
                <td>${r.description || ''}</td>
                <td>${count}</td>
                <td title="${permNames.join(', ')}">${preview}${more}</td>
            `;
            tbody.appendChild(tr);
        });
        updateRoleActionButtons();
    }

    function selectRoleRow(rowEl, data) {
        document.querySelectorAll('#roles-table tbody tr').forEach(r => r.classList.remove('selected-row'));
        rowEl.classList.add('selected-row');
        selectedRole = data;
        updateRoleActionButtons();
    }

    function updateRoleActionButtons() {
        const container = document.querySelector('#role-manager .data-table-actions');
        if (!container) return;
        const editBtn = container.querySelector('.edit-btn');
        const delBtn = container.querySelector('.delete-btn');
        if (editBtn) editBtn.disabled = !selectedRole;
        if (delBtn) delBtn.disabled = !selectedRole;
    }

    async function fetchRoles() {
        const res = await fetch(API_ENDPOINT, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
        const data = await res.json();
        // API mới trả về { success, data: roles, total }
        const roles = Array.isArray(data.data) ? data.data : (Array.isArray(data.roles) ? data.roles : []);
        rolesCache = roles;
        renderRolesTable();
    }

    function openRoleManager() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content" id="role-manager" style="width: 800px; max-width: 95vw;">
                <div class="modal-header">
                    <h3>Quản lý Role & Quyền</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="data-table-controls">
                    <div class="data-table-actions">
                        <button class="data-table-action-btn add-btn" onclick="window.addRole()">➕ Thêm</button>
                        <button class="data-table-action-btn edit-btn" onclick="window.editRole()" disabled>✏️ Sửa</button>
                        <button class="data-table-action-btn delete-btn" onclick="window.deleteRole()" disabled>🗑️ Xóa</button>
                    </div>
                </div>
                <div class="data-table-content">
                    <table id="roles-table" class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên role</th>
                                <th>Mô tả</th>
                                <th>Số quyền</th>
                                <th>Quyền</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.style.display = 'flex'; }, 10);
        fetchRoles().catch(e => alert('Không tải được roles: ' + (e.message || e)));
    }

    function addRole() {
        const m = createRoleModal('Thêm Role', null);
        document.body.appendChild(m);
        setTimeout(() => { m.style.display = 'flex'; }, 10);
    }

    function editRole() {
        if (!selectedRole) { alert('Vui lòng chọn một role'); return; }
        const m = createRoleModal('Sửa Role', selectedRole);
        document.body.appendChild(m);
        setTimeout(() => { m.style.display = 'flex'; }, 10);
    }

    async function deleteRole() {
        if (!selectedRole) { alert('Vui lòng chọn một role'); return; }
        if (!confirm('Xóa role này?')) return;
        const res = await fetch(`${API_ENDPOINT}/${selectedRole.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert('Xóa thất bại: ' + (err.message || `HTTP ${res.status}`));
            return;
        }
        alert('Đã xóa role');
        selectedRole = null;
        fetchRoles().catch(() => { });
    }

    async function handleRoleFormSubmit(evt) {
        evt.preventDefault();
        const form = evt.target;
        const modal = form.closest('.modal-overlay');
        const roleId = modal.dataset.roleId || '';
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked')).map(i => i.value);
        payload.permissions = permissions;

        try {
            const headers = getAuthHeaders();
            const isEdit = !!roleId;
            const url = isEdit ? `${API_ENDPOINT}/${roleId}` : API_ENDPOINT;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${res.status}`);
            }
            alert(isEdit ? 'Cập nhật role thành công' : 'Thêm role thành công');
            modal.remove();
            // refresh list
            const manager = document.getElementById('role-manager');
            if (manager) fetchRoles().catch(() => { });
        } catch (e) {
            alert('Lỗi: ' + (e.message || e));
        }
    }

    function toggleAdminRoleButton() {
        const container = document.getElementById('adminUserManageContainer');
        const btn = document.getElementById('manageRolesBtn');
        const role = localStorage.getItem('role');
        const isAdmin = role === 'admin';
        if (container) container.style.display = isAdmin ? '' : 'none';
        if (btn) btn.onclick = openRoleManager;
    }

    // Expose
    window.openRoleManager = openRoleManager;
    window.addRole = addRole;
    window.editRole = editRole;
    window.deleteRole = deleteRole;
    window.handleRoleFormSubmit = handleRoleFormSubmit;
    window.toggleAdminRoleButton = toggleAdminRoleButton;
})();


