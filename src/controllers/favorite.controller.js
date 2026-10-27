const db = require("../config/db");
const { success, fail } = require("../utils/response");

const toFavoriteJSON = (row) => ({
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
  createTime: row.create_time,
});

// ========== 接口：收藏列表 GET /api/favorites ==========
const getFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      `SELECT f.id, f.product_id, f.create_time,
              p.name, p.price, p.emoji, p.bg, p.origin_price, p.flash_price, p.sales, p.img
       FROM favorite f JOIN product p ON f.product_id = p.id
       WHERE f.user_id = ? ORDER BY f.id DESC`,
      [userId],
    );
    success(res, rows.map(toFavoriteJSON));
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：收藏商品 POST /api/favorites ==========
// body: { productId }
const addFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;
    if (!productId) return fail(res, "商品 productId 不能为空", 400);
    const [prod] = await db.query("SELECT id FROM product WHERE id = ?", [productId]);
    if (prod.length === 0) return fail(res, "商品不存在", 404);
    const [exists] = await db.query("SELECT id FROM favorite WHERE user_id = ? AND product_id = ?", [userId, productId]);
    if (exists.length > 0) return success(res, null, "已收藏"); // 幂等
    await db.query("INSERT INTO favorite (user_id, product_id) VALUES (?, ?)", [userId, productId]);
    success(res, null, "收藏成功");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：取消收藏 DELETE /api/favorites/:id ==========
const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query("SELECT id FROM favorite WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "收藏记录不存在", 404);
    await db.query("DELETE FROM favorite WHERE id = ?", [id]);
    success(res, null, "已取消收藏");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：已收藏商品 id 集合 GET /api/favorites/ids ==========
const getFavoriteIds = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query("SELECT product_id FROM favorite WHERE user_id = ?", [userId]);
    success(res, rows.map((r) => r.product_id));
  } catch (err) {
    fail(res, err.message);
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite, getFavoriteIds };
