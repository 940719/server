const express = require("express");
const router = express.Router();
const categoryCtrl = require("../controllers/category.controller");
const authMiddleware = require("../middleware/auth");
router.get("/getCategories", authMiddleware, categoryCtrl.getCategoryList);
router.post("/addCategory", authMiddleware, categoryCtrl.addCategory);
router.put(
  "/updateCategoryById/:id",
  authMiddleware,
  categoryCtrl.updateCategoryById,
);
router.delete(
  "/deleteCategoryById/:id",
  authMiddleware,
  categoryCtrl.deleteCategoryById,
);
module.exports = router;
