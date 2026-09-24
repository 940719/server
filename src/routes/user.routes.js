const express = require('express')
const router = express.Router()
const userCtrl = require('../controllers/user.controller')

router.post('/login', userCtrl.login)
router.get('/users', userCtrl.getUserList)
router.post('/user', userCtrl.postUser)
router.get('/user/:id', userCtrl.getUserById)
router.put('/user/:id', userCtrl.putUserById)
router.delete('/user/:id', userCtrl.deleteUserById)
module.exports = router
