const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const productCtrl = require('../controllers/product.controller')

// ========== 新方案：图片上传，保存到服务器本地 uploads 目录 ==========
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    // 随机文件名，避免重名覆盖 / 路径注入
    cb(null, `p-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || '.png'}`)
  }
})
// 通用图片上传（multipart，字段名 file），单张限 5MB，仅允许图片扩展名
const uploadDisk = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (!IMAGE_EXTS.includes(ext)) {
      return cb(new Error('仅支持 png / jpg / jpeg / gif / webp 图片'))
    }
    cb(null, true)
  }
})

// 旧方案：图片上传内存存储（直接 base64 入库，不落盘），保留兼容
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

router.get('/products', productCtrl.getProductList)
router.post('/product', productCtrl.postProduct)
router.get('/product/:id', productCtrl.getProductById)
router.put('/product/:id', productCtrl.putProductById)
router.delete('/product/:id', productCtrl.deleteProductById)

// 新方案：通用图片上传 → 保存本地目录，返回访问 URL
router.post('/upload', uploadDisk.single('file'), productCtrl.uploadImage)

// 旧方案：图片上传（multipart，字段名 image）与读取
router.post('/product/:id/image', upload.single('image'), productCtrl.uploadProductImage)
router.get('/product/:id/image', productCtrl.getProductImage)

module.exports = router
