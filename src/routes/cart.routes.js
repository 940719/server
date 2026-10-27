const express = require("express");
const router = express.Router();
const cartCtrl = require("../controllers/cart.controller");
const authMiddleware = require("../middleware/auth");

// 增删改查各自独立路径（购物车查用 get，因为它是单一购物车而非列表）
router.get("/cart/get", authMiddleware, cartCtrl.getCart);
router.post("/cart/add", authMiddleware, cartCtrl.addCart);
router.put("/cart/update/:id", authMiddleware, cartCtrl.updateCart);
router.delete("/cart/delete/:id", authMiddleware, cartCtrl.deleteCart);

module.exports = router;
