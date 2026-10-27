const express = require("express");
const router = express.Router();
const categoryCtrl = require("../controllers/category.controller");
const authMiddleware = require("../middleware/auth");
// 增删改查各自独立路径
router.get("/categories/list", authMiddleware, categoryCtrl.getCategoryList);
router.post("/categories/add", authMiddleware, categoryCtrl.addCategory);
router.put(
  "/categories/update/:id",
  authMiddleware,
  categoryCtrl.updateCategoryById,
);
router.delete(
  "/categories/delete/:id",
  authMiddleware,
  categoryCtrl.deleteCategoryById,
);
module.exports = router;
