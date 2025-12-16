const express = require('express')
const route = express.Router()
const { loginController } = require('../../controllers/loginController')

route.post('/login', loginController)

module.exports = route

