const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");

router.post("/login", userCtrl.login);
router.get("/users", authMiddleware, userCtrl.getUserList);
router.post("/user", authMiddleware, userCtrl.postUser);
router.get("/user/:id", authMiddleware, userCtrl.getUserById);
router.put("/user/:id", authMiddleware, userCtrl.putUserById);
router.delete("/user/:id", authMiddleware, userCtrl.deleteUserById);
module.exports = router;
