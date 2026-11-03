const express = require("express");
const router = express.Router();
const reviewCtrl = require("../controllers/review.controller");
const authMiddleware = require("../middleware/auth");

// 增查独立路径（同项目语义化风格）
router.get("/reviews/list/:productId", reviewCtrl.getReviewList);
router.post("/reviews/add", authMiddleware, reviewCtrl.postReview);

module.exports = router;
