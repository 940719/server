const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");

// 登录（独立路径，不走增删改查）
router.post("/auth/login", userCtrl.login);
// 免登录恢复（商城跳转场景：token 在 body 中校验，不走请求头鉴权）
router.post("/auth/restore", userCtrl.restoreByToken);
// 当前用户资料接口（独立路径）
router.put("/users/me", authMiddleware, userCtrl.updateMe);
// 增删改查各自独立路径
router.get("/users/list", authMiddleware, userCtrl.getUserList);
router.post("/users/add", authMiddleware, userCtrl.postUser);
router.get("/users/detail/:id", authMiddleware, userCtrl.getUserById);
router.put("/users/update/:id", authMiddleware, userCtrl.putUserById);
router.delete("/users/delete/:id", authMiddleware, userCtrl.deleteUserById);
module.exports = router;
