const express = require('express');
const router = express.Router();
const { createUserController, updateRoleUserController, getAllUsersController, getUserByIdController, deleteUserController } = require('../../controllers/users/userController');
const verifyToken = require('../../middleware/verifyJwt');
const authorize = require('../../middleware/authRoutes')

router.post('/create/users', createUserController);
router.put('/update/user/role', verifyToken, authorize({ roles: ["admin"] }), updateRoleUserController);
router.get('/users', verifyToken, authorize({ roles: ["admin"] }), getAllUsersController);
router.get('/user/:id', verifyToken, authorize({ roles: ["admin"] }), getUserByIdController);
router.delete('/delete/user/:id', verifyToken, authorize({ roles: ["admin"] }), deleteUserController);
module.exports = router;
