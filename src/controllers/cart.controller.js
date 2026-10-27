const db = require("../config/db");
const { success, fail } = require("../utils/response");

const toCartJSON = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    price: row.price,
    emoji: row.emoji,
    bg: row.bg,
    originPrice: row.origin_price,
    flashPrice: row.flash_price,
    sales: row.sales,
    image: row.img,
    quantity: row.quantity,
    stock: row.stock ?? 999,
  };
};

// ========== 接口：购物车列表 GET /api/cart ==========
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      `SELECT c.id, c.product_id, c.quantity,
              p.name, p.price, p.emoji, p.bg, p.origin_price, p.flash_price, p.sales, p.img, p.stock
       FROM cart c
       JOIN product p ON c.product_id = p.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [userId],
    );
    success(res, rows.map(toCartJSON));
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：加入购物车 POST /api/cart ==========
// body: { productId, quantity? }  已存在则数量累加
const addCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;
    if (!productId) return fail(res, "商品 productId 不能为空", 400);
    const qty = parseInt(quantity, 10) || 1;

    // 商品必须存在
    const [prodRows] = await db.query("SELECT id FROM product WHERE id = ?", [productId]);
    if (prodRows.length === 0) return fail(res, "商品不存在", 404);

    const [existing] = await db.query(
      "SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?",
      [userId, productId],
    );
    if (existing.length > 0) {
      const newQty = Math.min(existing[0].quantity + qty, 999);
      await db.query("UPDATE cart SET quantity = ? WHERE id = ?", [newQty, existing[0].id]);
    } else {
      await db.query("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [
        userId,
        productId,
        Math.min(qty, 999),
      ]);
    }
    success(res, null, "已加入购物车");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：更新数量 PUT /api/cart/:id ==========
// body: { quantity }
const updateCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const qty = parseInt(req.body.quantity, 10);
    if (!qty || qty < 1) return fail(res, "数量 quantity 必须为正整数", 400);

    const [rows] = await db.query("SELECT id FROM cart WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "购物车记录不存在", 404);

    await db.query("UPDATE cart SET quantity = ? WHERE id = ?", [Math.min(qty, 999), id]);
    success(res, null, "更新成功");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：删除单项 DELETE /api/cart/:id ==========
const deleteCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query("SELECT id FROM cart WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "购物车记录不存在", 404);

    await db.query("DELETE FROM cart WHERE id = ?", [id]);
    success(res, null, "删除成功");
  } catch (err) {
    fail(res, err.message);
  }
};

module.exports = { getCart, addCart, updateCart, deleteCart };
