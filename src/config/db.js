const mysql = require('mysql2/promise')

// 连接池配置，连接本地MySQL8
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '123456', // ⚠️改成你自己的密码
  database: 'shop_db',
  charset: 'utf8mb4',
  connectionLimit: 10
})

// 导出连接池，所有接口引入这个db
module.exports = pool
