const jwt = require("jsonwebtoken");
const JWT_SECRET = "admin-secret-202609";
const { fail } = require("../utils/response");
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return fail(res, "未登录，请先登录", 401);
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // 挂载到req，后续接口可以拿userId
    next();
  } catch (err) {
    return fail(res, "token已过期，请重新登录", 401);
  }
};
module.exports = authMiddleware;
