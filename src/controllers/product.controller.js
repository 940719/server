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
    image: row.image
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
// ========== 接口：商品列表 GET /api/products（支持 ?type= 按类型过滤）==========
const getProductList = async (req, res) => {
  try {
    const { type } = req.query
    let rows
    if (type) {
      const [result] = await db.query('SELECT * FROM product WHERE type = ? ORDER BY id', [type])
      rows = result
    } else {
      const [result] = await db.query('SELECT * FROM product ORDER BY id')
      rows = result
    }
    success(res, rows.map(toJSON))
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：新增商品 POST /api/product ==========
// body: { type, name, price, seckillPrice, image }
// image 可为：data URI(base64 字符串) / URL / 空，三种都支持
const postProduct = async (req, res) => {
  try {
    const { type = '', name, price = 0, seckillPrice = null, image = null } = req.body
    if (!name) return fail(res, '商品名称 name 不能为空', 400)
    if (price === '' || price === null || price === undefined || isNaN(Number(price))) {
      return fail(res, '商品价格 price 必须为数字', 400)
    }
    const [result] = await db.query(
      'INSERT INTO product (type, name, price, seckill_price, image) VALUES (?, ?, ?, ?, ?)',
      [type, name, Number(price), seckillPrice === '' ? null : seckillPrice, image]
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
    const { type, name, price, seckillPrice, image } = req.body
    const [existRows] = await db.query('SELECT * FROM product WHERE id = ?', [id])
    const exist = existRows[0]
    if (!exist) return fail(res, '商品不存在', 404)
    // 未传的字段保留原值
    const newType = type !== undefined ? type : exist.type
    const newName = name !== undefined ? name : exist.name
    const newPrice = price !== undefined ? Number(price) : exist.price
    const newSeckill = seckillPrice !== undefined ? (seckillPrice === '' ? null : seckillPrice) : exist.seckill_price
    const newImage = image !== undefined ? image : exist.image
    if (newPrice !== null && isNaN(newPrice)) return fail(res, '价格必须为数字', 400)

    await db.query(
      'UPDATE product SET type = ?, name = ?, price = ?, seckill_price = ?, image = ? WHERE id = ?',
      [newType, newName, newPrice, newSeckill, newImage, id]
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
    await db.query('UPDATE product SET image = ? WHERE id = ?', [dataUri, id])
    const [updatedArr] = await db.query('SELECT * FROM product WHERE id = ?', [id])
    const updated = updatedArr[0]
    success(res, toJSON(updated), '图片上传成功')
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
    const [rowArr] = await db.query('SELECT image FROM product WHERE id = ?', [id])
    const row = rowArr[0]
    if (!row) return fail(res, '商品不存在', 404)
    const img = parseImage(row.image)
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
  getProductImage
}
