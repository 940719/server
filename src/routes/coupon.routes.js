const express = require("express");
const router = express.Router();
const couponCtrl = require("../controllers/coupon.controller");
const authMiddleware = require("../middleware/auth");

// 各操作独立路径
router.get("/coupons/list", authMiddleware, couponCtrl.getCouponCenter);
router.get("/coupons/mine", authMiddleware, couponCtrl.getUserCoupons);
router.post("/coupons/receive/:id", authMiddleware, couponCtrl.receiveCoupon);

module.exports = router;
