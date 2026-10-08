const express = require('express')
const cors = require('cors')
const path = require('path')
// 引入路由
const userRoutes = require('./src/routes/user.routes')
const productRoutes = require('./src/routes/product.routes')
const categoryRoutes = require('./src/routes/category.routes')
const app = express()
app.use(cors())

// ✅ 静态托管上传的图片：http://<host>/uploads/xxx.png
// （生产环境可改用 nginx 托管，见 deploy/ 目录说明）
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }))

// ✅ 全局中间件，所有接口都禁用缓存
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache,no-store,must-revalidate')
  next()
})
app.use(express.json({ limit: '8mb' })) // 解析post json参数（含 base64 图片，放宽体积）

// 挂载路由，统一前缀 /api
app.use('/api', userRoutes)
app.use('/api', productRoutes)
app.use('/api', categoryRoutes)
// 上传（multer）等错误统一返回 JSON，避免返回 HTML 错误页
app.use((err, req, res, next) => {
  if (err) {
    const msg = err.message || '上传失败'
    return res.status(400).json({ code: 400, data: null, msg })
  }
  next()
})

const port = 3001
app.listen(port, '0.0.0.0', () => {
  console.log(`后端运行在 http://localhost:${port}`)
})
