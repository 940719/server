const express = require('express')
const cors = require('cors')
// 引入路由
const userRoutes = require('./src/routes/user.routes')
const productRoutes = require('./src/routes/product.routes')

const app = express()
app.use(cors())
// ✅ 全局中间件，所有接口都禁用缓存
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache,no-store,must-revalidate')
  next()
})
app.use(express.json({ limit: '8mb' })) // 解析post json参数（含 base64 图片，放宽体积）

// 挂载路由，统一前缀 /api
app.use('/api', userRoutes)
app.use('/api', productRoutes)

const port = 3001
app.listen(port, '0.0.0.0', () => {
  console.log(`后端运行在 http://localhost:${port}`)
})
