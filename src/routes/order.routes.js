const express = require("express");
const router = express.Router();
const orderCtrl = require("../controllers/order.controller");
const authMiddleware = require("../middleware/auth");

// 增删改查与业务操作各自独立路径
router.get("/orders/list", authMiddleware, orderCtrl.getOrderList);
router.post("/orders/add", authMiddleware, orderCtrl.createOrder);
router.post("/orders/pay/:id", authMiddleware, orderCtrl.payOrder);
router.post("/orders/confirm/:id", authMiddleware, orderCtrl.confirmOrder);
router.post("/orders/cancel/:id", authMiddleware, orderCtrl.cancelOrder);

module.exports = router;
