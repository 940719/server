const express = require("express");
const router = express.Router();
const favCtrl = require("../controllers/favorite.controller");
const authMiddleware = require("../middleware/auth");

// 增删改查各自独立路径
router.get("/favorites/list", authMiddleware, favCtrl.getFavorites);
router.get("/favorites/ids", authMiddleware, favCtrl.getFavoriteIds);
router.post("/favorites/add", authMiddleware, favCtrl.addFavorite);
router.delete("/favorites/delete/:id", authMiddleware, favCtrl.removeFavorite);

module.exports = router;
