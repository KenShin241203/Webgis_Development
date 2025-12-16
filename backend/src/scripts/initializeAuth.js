const db = require('../models');
const { initializePermissions } = require('../services/auth/permissionService');
const { initializeRoles } = require('../services/auth/roleService');

async function initializeAuthSystem() {
    try {
        console.log('🚀 Bắt đầu khởi tạo hệ thống phân quyền...');

        // Khởi tạo permissions trước
        console.log('📋 Khởi tạo permissions...');
        await initializePermissions();

        // Khởi tạo roles sau
        console.log('👥 Khởi tạo roles...');
        await initializeRoles();

        console.log('✅ Khởi tạo hệ thống phân quyền hoàn tất!');

        // Hiển thị thống kê
        const roleCount = await db.Role.count();
        const permissionCount = await db.Permission.count();

        console.log(`📊 Thống kê:`);
        console.log(`   - Số roles: ${roleCount}`);
        console.log(`   - Số permissions: ${permissionCount}`);

        // Hiển thị danh sách roles với permissions
        const roles = await db.Role.findAll({
            include: [{
                model: db.Permission,
                as: 'permissions',
                through: { attributes: [] },
                attributes: ['name']
            }]
        });

        console.log('\n📋 Chi tiết roles:');
        roles.forEach(role => {
            console.log(`   - ${role.name}: ${role.permissions.length} permissions`);
        });

        return true;
    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo hệ thống phân quyền:', error);
        return false;
    }
}

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
    initializeAuthSystem()
        .then(success => {
            if (success) {
                console.log('🎉 Khởi tạo thành công!');
                process.exit(0);
            } else {
                console.log('💥 Khởi tạo thất bại!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Lỗi không mong đợi:', error);
            process.exit(1);
        });
}

module.exports = { initializeAuthSystem };
