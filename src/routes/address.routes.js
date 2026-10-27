const express = require("express");
const router = express.Router();
const addressCtrl = require("../controllers/address.controller");
const authMiddleware = require("../middleware/auth");

// 增删改查各自独立路径
router.get("/addresses/list", authMiddleware, addressCtrl.getAddressList);
router.post("/addresses/add", authMiddleware, addressCtrl.addAddress);
router.put("/addresses/update/:id", authMiddleware, addressCtrl.updateAddress);
router.put("/addresses/setDefault/:id", authMiddleware, addressCtrl.setDefaultAddress);
router.delete("/addresses/delete/:id", authMiddleware, addressCtrl.deleteAddress);

module.exports = router;
