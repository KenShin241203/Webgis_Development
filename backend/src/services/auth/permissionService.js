const db = require('../../models');

// Khởi tạo các permissions cơ bản
const DEFAULT_PERMISSIONS = [
    // Cống permissions
    { name: 'CONG_VIEW', description: 'Xem dữ liệu cống' },
    { name: 'CONG_CREATE', description: 'Thêm cống mới' },
    { name: 'CONG_UPDATE', description: 'Sửa thông tin cống' },
    { name: 'CONG_DELETE', description: 'Xóa cống' },
    { name: 'CONG_BACKUP', description: 'Backup dữ liệu cống' },

    // Sụt lún permissions
    { name: 'SUTLUN_VIEW', description: 'Xem dữ liệu sụt lún' },
    { name: 'SUTLUN_CREATE', description: 'Thêm dữ liệu sụt lún' },
    { name: 'SUTLUN_UPDATE', description: 'Sửa dữ liệu sụt lún' },
    { name: 'SUTLUN_DELETE', description: 'Xóa dữ liệu sụt lún' },

    // Chất lượng permissions
    { name: 'CHATLUONG_VIEW', description: 'Xem dữ liệu chất lượng' },
    { name: 'CHATLUONG_CREATE', description: 'Thêm dữ liệu chất lượng' },
    { name: 'CHATLUONG_UPDATE', description: 'Sửa dữ liệu chất lượng' },
    { name: 'CHATLUONG_DELETE', description: 'Xóa dữ liệu chất lượng' },

    // Đê bao permissions
    { name: 'DEBAO_VIEW', description: 'Xem dữ liệu đê bao' },
    { name: 'DEBAO_CREATE', description: 'Thêm dữ liệu đê bao' },
    { name: 'DEBAO_UPDATE', description: 'Sửa dữ liệu đê bao' },
    { name: 'DEBAO_DELETE', description: 'Xóa dữ liệu đê bao' },

    // Độ lún permissions
    { name: 'DOLUN_VIEW', description: 'Xem dữ liệu độ lún' },
    { name: 'DOLUN_CREATE', description: 'Thêm dữ liệu độ lún' },
    { name: 'DOLUN_UPDATE', description: 'Sửa dữ liệu độ lún' },
    { name: 'DOLUN_DELETE', description: 'Xóa dữ liệu độ lún' },

    // Hiện trạng permissions
    { name: 'HIENTRANG_VIEW', description: 'Xem dữ liệu hiện trạng' },
    { name: 'HIENTRANG_CREATE', description: 'Thêm dữ liệu hiện trạng' },
    { name: 'HIENTRANG_UPDATE', description: 'Sửa dữ liệu hiện trạng' },
    { name: 'HIENTRANG_DELETE', description: 'Xóa dữ liệu hiện trạng' },

    // Ngập lụt permissions
    { name: 'NGAPLUT_VIEW', description: 'Xem dữ liệu ngập lụt' },
    { name: 'NGAPLUT_CREATE', description: 'Thêm dữ liệu ngập lụt' },
    { name: 'NGAPLUT_UPDATE', description: 'Sửa dữ liệu ngập lụt' },
    { name: 'NGAPLUT_DELETE', description: 'Xóa dữ liệu ngập lụt' },

    // Khảo sát permissions
    { name: 'KHAOSAT_VIEW', description: 'Xem dữ liệu khảo sát' },
    { name: 'KHAOSAT_CREATE', description: 'Thêm dữ liệu khảo sát' },
    { name: 'KHAOSAT_UPDATE', description: 'Sửa dữ liệu khảo sát' },
    { name: 'KHAOSAT_DELETE', description: 'Xóa dữ liệu khảo sát' },

    // User management permissions
    { name: 'USER_VIEW', description: 'Xem danh sách user' },
    { name: 'USER_CREATE', description: 'Tạo user mới' },
    { name: 'USER_UPDATE', description: 'Sửa thông tin user' },
    { name: 'USER_DELETE', description: 'Xóa user' },

    // Role management permissions
    { name: 'ROLE_VIEW', description: 'Xem danh sách role' },
    { name: 'ROLE_CREATE', description: 'Tạo role mới' },
    { name: 'ROLE_UPDATE', description: 'Sửa role' },
    { name: 'ROLE_DELETE', description: 'Xóa role' },

    // System permissions
    { name: 'SYSTEM_ADMIN', description: 'Quản trị hệ thống' },
    { name: 'WEATHER_VIEW', description: 'Xem thông tin thời tiết' }
];

// Khởi tạo permissions mặc định
async function initializePermissions() {
    try {
        console.log('🔄 Đang khởi tạo permissions...');

        for (const perm of DEFAULT_PERMISSIONS) {
            await db.Permission.findOrCreate({
                where: { name: perm.name },
                defaults: perm
            });
        }

        console.log('✅ Đã khởi tạo permissions thành công');
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo permissions:', error);
        return false;
    }
}

// Lấy tất cả permissions
async function getAllPermissions() {
    try {
        const permissions = await db.Permission.findAll({
            order: [['name', 'ASC']]
        });
        return permissions;
    } catch (error) {
        console.error('Lỗi khi lấy permissions:', error);
        throw error;
    }
}

// Lấy permission theo tên
async function getPermissionByName(name) {
    try {
        const permission = await db.Permission.findOne({
            where: { name }
        });
        return permission;
    } catch (error) {
        console.error('Lỗi khi lấy permission:', error);
        throw error;
    }
}

// Lấy permissions theo module
async function getPermissionsByModule(module) {
    try {
        const permissions = await db.Permission.findAll({
            where: {
                name: {
                    [db.Sequelize.Op.like]: `${module}_%`
                }
            },
            order: [['name', 'ASC']]
        });
        return permissions;
    } catch (error) {
        console.error('Lỗi khi lấy permissions theo module:', error);
        throw error;
    }
}

// Tạo permission mới
async function createPermission(name, description) {
    try {
        const permission = await db.Permission.create({
            name,
            description
        });
        return permission;
    } catch (error) {
        console.error('Lỗi khi tạo permission:', error);
        throw error;
    }
}

// Cập nhật permission
async function updatePermission(id, data) {
    try {
        const permission = await db.Permission.findByPk(id);
        if (!permission) {
            throw new Error('Permission không tồn tại');
        }

        await permission.update(data);
        return permission;
    } catch (error) {
        console.error('Lỗi khi cập nhật permission:', error);
        throw error;
    }
}

// Xóa permission
async function deletePermission(id) {
    try {
        const permission = await db.Permission.findByPk(id);
        if (!permission) {
            throw new Error('Permission không tồn tại');
        }

        await permission.destroy();
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa permission:', error);
        throw error;
    }
}

module.exports = {
    initializePermissions,
    getAllPermissions,
    getPermissionByName,
    getPermissionsByModule,
    createPermission,
    updatePermission,
    deletePermission,
    DEFAULT_PERMISSIONS
};
