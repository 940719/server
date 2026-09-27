const db = require('../config/db')
const { success, fail } = require('../utils/response')
const { hashPassword } = require('../utils/password')
// 返回给前端的用户对象（剔除 password 敏感字段）
const toUserJSON = (row) => {
  if (!row) return null
  return {
    id: row.id,
    name: row.username, // 数据库字段是 username，映射给前端name
    nickname: row.nickname,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role, // 直接返回数字，前端做中文映射
    createTime: row.create_time
  }
}
// ========== 接口：登录 POST /api/login ==========
// body: { name, password }
// 角色：'admin' 管理员 / 'user' 普通用户
const login = async (req, res) => {
  console.log('login', req.body);
  try {
    const { name, password } = req.body
    if (!name || !password) return fail(res, '用户名和密码不能为空', 400)
    const [rows] = await db.query('SELECT * FROM user WHERE username = ?', [name])
    const row = rows[0]
    // 统一提示，避免暴露"用户是否存在"（防枚举）
    console.log('11111', row.password, hashPassword(password));
    if (!row || row.password !== hashPassword(password)) {
      return fail(res, '用户名或密码错误', 401)
    }
    success(res, toUserJSON(row), '登录成功')
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// 获取用户列表
const getUserList = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM user')
    success(res, rows.map(toUserJSON))
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：新增用户 POST /api/user ==========
// body: { name, age, role?, password? }  role 默认 'user'，password 默认 '123456'
const postUser = async (req, res) => {
  try {
    const { name, age, role = 'user', password = '123456' } = req.body
    if (!name) return fail(res, '用户名 name 不能为空', 400)
    if (role !== 'admin' && role !== 'user') return fail(res, '角色 role 只能是 admin 或 user', 400)
    const [result] = await db.query(
      'INSERT INTO user (name, age, role, password) VALUES (?, ?, ?, ?)',
      [name, age, role, hashPassword(password)]
    )
    const insertId = result.insertId
    const [rows] = await db.query('SELECT * FROM user WHERE id = ?', [insertId])
    const row = rows[0]
    success(res, toUserJSON(row), '新增成功') // 返回新增用户（不含密码）
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：根据id查询单个用户 GET /api/user/:id ==========
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM user WHERE id = ?', [id])
    const row = rows[0]
    if (!row) return fail(res, '用户不存在', 404)
    success(res, toUserJSON(row))
  } catch (err) {
    console.error(err)
    fail(res, err.message)
  }
}
// ========== 接口：修改用户 PUT /api/user/:id ==========
// body 可含 name / age / role / password（未传的字段保留原值）
const putUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, role, password } = req.body;
    const [existRows] = await db.query('SELECT * FROM user WHERE id = ?', [id])
    const exist = existRows[0]
    if (!exist) return fail(res, '用户不存在', 404)
    const newName = name !== undefined ? name : exist.name
    const newAge = age !== undefined ? age : exist.age
    const newRole = role !== undefined ? role : exist.role
    const newPassword = password !== undefined ? hashPassword(password) : exist.password
    if (newRole !== 'admin' && newRole !== 'user') return fail(res, '角色 role 只能是 admin 或 user', 400)
    await db.query('UPDATE user SET name=?, age=?, role=?, password=? WHERE id=?',
      [newName, newAge, newRole, newPassword, id]);
    const [rows] = await db.query('SELECT * FROM user WHERE id = ?', [id]);
    const row = rows[0]
    success(res, toUserJSON(row), '修改成功'); // 返回修改后的用户（不含密码）
  } catch (err) {
    console.error(err)
    fail(res, err.message);
  }
}
// ========== 接口：删除用户 DELETE /api/user/:id ==========
const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM user WHERE id=?', [id]);
    if (result.affectedRows === 0) return fail(res, '用户不存在', 404)
    success(res, result.affectedRows, '删除成功'); // 返回删除的行数
  } catch (err) {
    console.error(err)
    fail(res, err.message);
  }
}
module.exports = { login, getUserList, postUser, getUserById, putUserById, deleteUserById }
