const db = require('../config/db')
const { success, fail } = require('../utils/response')
// 将数据库行转为前端友好的 JSON 字段（下划线 -> 驼峰）
const toJSON = (row) => {
  if (!row) return null
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    price: row.price,
    emoji: row.emoji,
    bg: row.bg,
    originPrice: row.origin_price,
    flashPrice: row.flash_price,
    sales: row.sales,
    image: row.img
  }
}
// 从 data URI（如 data:image/png;base64,xxx）中解析出 mime 与 buffer
// 也兼容普通 URL / 空值
const parseImage = (image) => {
  if (!image) return null
  const match = /^data:([^;,]+);base64,(.+)$/.exec(image)
  if (!match) return null // 不是 base64 data URI（可能是 URL 或空）
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64')
  }
}
// 组装图片访问 URL：优先环境变量 IMG_BASE_URL（nginx/域名场景），否则按当前请求 host 推导
const buildImageUrl = (req, filename) => {
  const base = (process.env.IMG_BASE_URL || req.protocol + '://' + req.get('host')).replace(/\/+$/, '')
  return base + '/uploads/' + filename
}
// ========== 接口：商品列表 GET /api/products（支持 ?type= 按类型过滤）==========
const getProductList = async (req, res) => {
  try {
    const { type, pageNum, pageSize } = req.query
    let sql = 'SELECT * FROM product WHERE 1=1'
    let params = []

    // 拼接type条件
    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    sql += ' ORDER BY id'

    // 核心：同时传 pageNum、pageSize 才加分页，否则查全部
    let needPagination = pageNum && pageSize
    if (needPagination) {
      const offset = (Number(pageNum) - 1) * Number(pageSize)
      sql += ' LIMIT ?, ?'
      params.push(offset, Number(pageSize))
    }

    const [rows] = await db.query(sql, params)

    if (needPagination) {
      // 需要分页：查询符合条件的总条数（带上type过滤）
      let countSql = sql.split('ORDER BY')[0].replace('SELECT *', 'SELECT COUNT(*) AS total')
      const [[totalRow]] = await db.query(countSql, params.slice(0, params.length - 2))
      const list = rows.map(toJSON)
      success(res, {
        list,
        total: totalRow.total,
        pageNum,
        pageSize
      })
    } else {
      // 不传分页参数，直接返回全部数组，不带分页对象
      const list = rows.map(toJSON)
      success(res, list)
    }
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：新增商品 POST /api/product ==========
// body: { type, name, price, seckillPrice, image, emoji }
// image 可为：data URI(base64 字符串) / URL / 空，三种都支持
const postProduct = async (req, res) => {
  try {
    const { type = '', name, price = 0, seckillPrice = null, image = null, flash_price = null, emoji = null } = req.body
    if (!name) return fail(res, '商品名称 name 不能为空', 400)
    if (price === '' || price === null || price === undefined || isNaN(Number(price))) {
      return fail(res, '商品价格 price 必须为数字', 400)
    }
    const [result] = await db.query(
      'INSERT INTO product (type, name, price, flash_price, img, emoji) VALUES (?, ?, ?, ?, ?, ?)',
      [type, name, Number(price), flash_price === '' ? null : flash_price, image, emoji]
    )
    const insertId = result.insertId
    const [rows] = await db.query('SELECT * FROM product WHERE id = ?', [insertId])
    const row = rows[0]
    success(res, toJSON(row), '新增成功')
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：根据 id 查询单个商品 GET /api/product/:id ==========
const getProductById = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.query('SELECT * FROM product WHERE id = ?', [id])
    const row = rows[0]
    if (!row) return fail(res, '商品不存在', 404)
    success(res, toJSON(row))
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：修改商品 PUT /api/product/:id ==========
const putProductById = async (req, res) => {
  try {
    const { id } = req.params
    const { type, name, price, seckillPrice, image, emoji, originPrice } = req.body
    const [existRows] = await db.query('SELECT * FROM product WHERE id = ?', [id])
    const exist = existRows[0]
    if (!exist) return fail(res, '商品不存在', 404)
    // 未传的字段保留原值
    const newType = type !== undefined ? type : exist.type
    const newName = name !== undefined ? name : exist.name
    const newPrice = price !== undefined ? Number(price) : exist.price
    const newSeckill = seckillPrice !== undefined ? (seckillPrice === '' ? null : seckillPrice) : exist.flash_price
    const newImage = image !== undefined ? image : exist.img
    const newEmoji = emoji !== undefined ? emoji : exist.emoji
    const newOriginPrice = originPrice !== undefined ? Number(originPrice) : exist.origin_price
    if (newPrice !== null && isNaN(newPrice)) return fail(res, '价格必须为数字', 400)

    await db.query(
      'UPDATE product SET type = ?, name = ?, price = ?, flash_price = ?, img = ?, emoji = ?, origin_price = ? WHERE id = ?',
      [newType, newName, newPrice, newSeckill, newImage, newEmoji, newOriginPrice, id]
    )
    const [rows] = await db.query('SELECT * FROM product WHERE id = ?', [id])
    const row = rows[0]
    success(res, toJSON(row), '修改成功')
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：删除商品 DELETE /api/product/:id ==========
const deleteProductById = async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await db.query('DELETE FROM product WHERE id = ?', [id])
    if (result.affectedRows === 0) return fail(res, '商品不存在', 404)
    success(res, result.affectedRows, '删除成功')
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：上传商品图片 POST /api/product/:id/image（multipart/form-data，字段名 image）==========
// 图片以 base64 data URI 形式存入数据库 image 字段
const uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params
    const [rowArr] = await db.query('SELECT * FROM product WHERE id = ?', [id])
    const row = rowArr[0]
    if (!row) return fail(res, '商品不存在', 404)
    if (!req.file) return fail(res, '请上传图片文件（字段名 image）', 400)
    const { mimetype, buffer } = req.file
    const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`
    await db.query('UPDATE product SET img = ? WHERE id = ?', [dataUri, id])
    const [updatedArr] = await db.query('SELECT * FROM product WHERE id = ?', [id])
    const updated = updatedArr[0]
    success(res, toJSON(updated), '图片上传成功')
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：通用图片上传 POST /api/upload（multipart/form-data，字段名 file）==========
// 图片保存到服务器本地 uploads 目录，返回可直接访问的 URL
const uploadImage = async (req, res) => {
  try {
    if (!req.file) return fail(res, '请上传图片文件（字段名 file）', 400)
    success(res, { url: buildImageUrl(req, req.file.filename), filename: req.file.filename }, '上传成功')
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：读取商品图片 GET /api/product/:id/image ==========
// 把数据库中存的 base64 data URI 还原为图片二进制返回
const getProductImage = async (req, res) => {
  try {
    const { id } = req.params
    const [rowArr] = await db.query('SELECT img FROM product WHERE id = ?', [id])
    const row = rowArr[0]
    if (!row) return fail(res, '商品不存在', 404)
    const img = parseImage(row.img)
    if (!img) return fail(res, '该商品没有存 base64 图片（可能是 URL 或未上传）', 404)
    res.setHeader('Content-Type', img.mime)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(img.buffer)
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
module.exports = {
  getProductList,
  postProduct,
  getProductById,
  putProductById,
  deleteProductById,
  uploadProductImage,
  uploadImage,
  getProductImage
}
