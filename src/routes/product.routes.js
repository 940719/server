const express = require('express')
const multer = require('multer')
const router = express.Router()
const productCtrl = require('../controllers/product.controller')

// 图片上传：内存存储（直接入库，不落盘），限制单张 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

router.get('/products', productCtrl.getProductList)
router.post('/product', productCtrl.postProduct)
router.get('/product/:id', productCtrl.getProductById)
router.put('/product/:id', productCtrl.putProductById)
router.delete('/product/:id', productCtrl.deleteProductById)

// 图片：上传（multipart，字段名 image）与读取
router.post('/product/:id/image', upload.single('image'), productCtrl.uploadProductImage)
router.get('/product/:id/image', productCtrl.getProductImage)

module.exports = router
