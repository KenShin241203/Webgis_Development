const db = require('../../models');
const { initializePermissions } = require('./permissionService');

// Khởi tạo roles mặc định
const DEFAULT_ROLES = [
    {
        name: 'admin',
        description: 'Quản trị viên - có toàn quyền truy cập',
        permissions: [
            'SYSTEM_ADMIN',
            'USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
            'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE',
            'CONG_VIEW', 'CONG_CREATE', 'CONG_UPDATE', 'CONG_DELETE', 'CONG_BACKUP',
            'SUTLUN_VIEW', 'SUTLUN_CREATE', 'SUTLUN_UPDATE', 'SUTLUN_DELETE',
            'CHATLUONG_VIEW', 'CHATLUONG_CREATE', 'CHATLUONG_UPDATE', 'CHATLUONG_DELETE',
            'DEBAO_VIEW', 'DEBAO_CREATE', 'DEBAO_UPDATE', 'DEBAO_DELETE',
            'DOLUN_VIEW', 'DOLUN_CREATE', 'DOLUN_UPDATE', 'DOLUN_DELETE',
            'HIENTRANG_VIEW', 'HIENTRANG_CREATE', 'HIENTRANG_UPDATE', 'HIENTRANG_DELETE',
            'NGAPLUT_VIEW', 'NGAPLUT_CREATE', 'NGAPLUT_UPDATE', 'NGAPLUT_DELETE',
            'KHAOSAT_VIEW', 'KHAOSAT_CREATE', 'KHAOSAT_UPDATE', 'KHAOSAT_DELETE',
            'WEATHER_VIEW',
            'ELEMENTS_VIEW', 'ELEMENTS_CREATE', 'ELEMENTS_UPDATE', 'ELEMENTS_DELETE',
            'HYDRO_VIEW', 'HYDRO_CREATE', 'HYDRO_UPDATE', 'HYDRO_DELETE'
        ]
    },
    {
        name: 'editor',
        description: 'Biên tập viên - có quyền xem và chỉnh sửa dữ liệu',
        permissions: [
            'CONG_VIEW', 'CONG_CREATE', 'CONG_UPDATE', 'CONG_BACKUP',
            'SUTLUN_VIEW', 'SUTLUN_CREATE', 'SUTLUN_UPDATE',
            'CHATLUONG_VIEW', 'CHATLUONG_CREATE', 'CHATLUONG_UPDATE',
            'DEBAO_VIEW', 'DEBAO_CREATE', 'DEBAO_UPDATE',
            'DOLUN_VIEW', 'DOLUN_CREATE', 'DOLUN_UPDATE',
            'HIENTRANG_VIEW', 'HIENTRANG_CREATE', 'HIENTRANG_UPDATE',
            'NGAPLUT_VIEW', 'NGAPLUT_CREATE', 'NGAPLUT_UPDATE',
            'KHAOSAT_VIEW', 'KHAOSAT_CREATE', 'KHAOSAT_UPDATE',
            'WEATHER_VIEW'
        ]
    },
    {
        name: 'viewer',
        description: 'Người xem - chỉ có quyền xem dữ liệu',
        permissions: [
            'CONG_VIEW',
            'SUTLUN_VIEW',
            'CHATLUONG_VIEW',
            'DEBAO_VIEW',
            'DOLUN_VIEW',
            'HIENTRANG_VIEW',
            'NGAPLUT_VIEW',
            'KHAOSAT_VIEW',
            'WEATHER_VIEW'
        ]
    }
];

// Khởi tạo roles mặc định
async function initializeRoles() {
    try {
        console.log('🔄 Đang khởi tạo roles...');

        // Đảm bảo permissions đã được khởi tạo
        await initializePermissions();

        for (const roleData of DEFAULT_ROLES) {
            const { permissions, ...roleInfo } = roleData;

            // Tạo role
            const [role, created] = await db.Role.findOrCreate({
                where: { name: roleInfo.name },
                defaults: roleInfo
            });

            if (created || permissions.length > 0) {
                // Lấy permissions
                const permissionObjects = await db.Permission.findAll({
                    where: { name: permissions }
                });

                // Gán permissions cho role
                await role.setPermissions(permissionObjects);

                console.log(`✅ Role "${role.name}" đã được cập nhật với ${permissionObjects.length} permissions`);
            }
        }

        console.log('✅ Đã khởi tạo roles thành công');
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo roles:', error);
        return false;
    }
}

// Lấy tất cả roles với permissions
async function getAllRoles() {
    try {
        const roles = await db.Role.findAll({
            include: [{
                model: db.Permission,
                as: 'permissions',
                through: { attributes: [] },
                attributes: ['id', 'name', 'description']
            }],
            order: [['name', 'ASC']]
        });
        return roles;
    } catch (error) {
        console.error('Lỗi khi lấy roles:', error);
        throw error;
    }
}

// Lấy role theo ID
async function getRoleById(id) {
    try {
        const role = await db.Role.findByPk(id, {
            include: [{
                model: db.Permission,
                as: 'permissions',
                through: { attributes: [] },
                attributes: ['id', 'name', 'description']
            }]
        });
        return role;
    } catch (error) {
        console.error('Lỗi khi lấy role:', error);
        throw error;
    }
}

// Lấy role theo tên
async function getRoleByName(name) {
    try {
        const role = await db.Role.findOne({
            where: { name },
            include: [{
                model: db.Permission,
                as: 'permissions',
                through: { attributes: [] },
                attributes: ['id', 'name', 'description']
            }]
        });
        return role;
    } catch (error) {
        console.error('Lỗi khi lấy role:', error);
        throw error;
    }
}

// Tạo role mới
async function createRole(name, description, permissions = []) {
    try {
        const role = await db.Role.create({
            name,
            description
        });

        if (permissions.length > 0) {
            const permissionObjects = await db.Permission.findAll({
                where: { name: permissions }
            });
            await role.setPermissions(permissionObjects);
        }

        // Trả về role với permissions
        return await getRoleById(role.id);
    } catch (error) {
        console.error('Lỗi khi tạo role:', error);
        throw error;
    }
}

// Cập nhật role
async function updateRole(id, data) {
    try {
        const { permissions, ...roleData } = data;
        const role = await db.Role.findByPk(id);

        if (!role) {
            throw new Error('Role không tồn tại');
        }

        // Cập nhật thông tin role
        await role.update(roleData);

        // Cập nhật permissions nếu có
        if (permissions !== undefined) {
            const permissionObjects = await db.Permission.findAll({
                where: { name: permissions }
            });
            await role.setPermissions(permissionObjects);
        }

        // Trả về role với permissions
        return await getRoleById(role.id);
    } catch (error) {
        console.error('Lỗi khi cập nhật role:', error);
        throw error;
    }
}

// Xóa role
async function deleteRole(id) {
    try {
        const role = await db.Role.findByPk(id);

        if (!role) {
            throw new Error('Role không tồn tại');
        }

        // Kiểm tra xem role có đang được sử dụng không
        const userCount = await db.User.count({
            where: { role_id: id }
        });

        if (userCount > 0) {
            throw new Error(`Không thể xóa role này vì có ${userCount} user đang sử dụng`);
        }

        await role.destroy();
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa role:', error);
        throw error;
    }
}

// Kiểm tra user có permission không
async function checkUserPermission(userId, permissionName) {
    try {
        const user = await db.User.findByPk(userId, {
            include: [{
                model: db.Role,
                as: 'role',
                include: [{
                    model: db.Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            }]
        });

        if (!user || !user.role) {
            return false;
        }

        const hasPermission = user.role.permissions.some(perm => perm.name === permissionName);
        return hasPermission;
    } catch (error) {
        console.error('Lỗi khi kiểm tra permission:', error);
        return false;
    }
}

// Lấy tất cả permissions của user
async function getUserPermissions(userId) {
    try {
        const user = await db.User.findByPk(userId, {
            include: [{
                model: db.Role,
                as: 'role',
                include: [{
                    model: db.Permission,
                    as: 'permissions',
                    through: { attributes: [] },
                    attributes: ['name']
                }]
            }]
        });

        if (!user || !user.role) {
            return [];
        }

        return user.role.permissions.map(perm => perm.name);
    } catch (error) {
        console.error('Lỗi khi lấy permissions của user:', error);
        return [];
    }
}

module.exports = {
    initializeRoles,
    getAllRoles,
    getRoleById,
    getRoleByName,
    createRole,
    updateRole,
    deleteRole,
    checkUserPermission,
    getUserPermissions,
    DEFAULT_ROLES
};
