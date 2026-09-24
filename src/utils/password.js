const crypto = require('crypto')

// 密码哈希：使用 Node 内置 crypto.scrypt（无需额外依赖）
// 说明：教学/演示项目使用项目级固定盐；生产环境建议为每个用户生成独立随机盐
const SALT = 'doubao-shop-salt-2026'

const hashPassword = (pwd) =>
  crypto.scryptSync(String(pwd ?? ''), SALT, 32).toString('hex')

module.exports = { hashPassword }
