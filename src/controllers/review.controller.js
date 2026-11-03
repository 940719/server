const db = require("../config/db");
const { success, fail } = require("../utils/response");

// 数据库行 -> 前端友好字段（下划线 -> 驼峰）
const toReviewJSON = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    userName: row.user_name,
    rating: row.rating,
    content: row.content,
    createTime: row.create_time,
  };
};

// ========== 接口：商品评价列表 GET /api/reviews/list/:productId（公开，详情页可未登录浏览）==========
const getReviewList = async (req, res) => {
  try {
    const { productId } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM review WHERE product_id = ? ORDER BY create_time DESC, id DESC",
      [productId],
    );
    const [[agg]] = await db.query(
      "SELECT COUNT(*) AS total, IFNULL(ROUND(AVG(rating), 1), 0) AS avgRating FROM review WHERE product_id = ?",
      [productId],
    );
    success(res, {
      list: rows.map(toReviewJSON),
      total: agg.total,
      avgRating: Number(agg.avgRating),
    });
  } catch (err) {
    console.error(err);
    fail(res, err.message);
  }
};

// ========== 接口：提交评价 POST /api/reviews/add（需登录）==========
// body: { productId, rating?, content? }  rating 1-5，content 必填
const postReview = async (req, res) => {
  try {
    const { productId, rating = 5, content = "" } = req.body;
    if (!productId) return fail(res, "商品 productId 不能为空", 400);
    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) return fail(res, "评分 rating 必须为 1-5", 400);
    if (!content || !content.trim()) return fail(res, "评价内容不能为空", 400);

    // 商品必须存在
    const [prodRows] = await db.query("SELECT id FROM product WHERE id = ?", [productId]);
    if (prodRows.length === 0) return fail(res, "商品不存在", 404);

    // 取当前登录用户昵称（冗余进评价表，避免每次联表）
    const userId = req.user.userId;
    const [userRows] = await db.query(
      "SELECT nickname, username FROM user WHERE id = ?",
      [userId],
    );
    const user = userRows[0];
    const userName = (user && (user.nickname || user.username)) || "用户";

    const [result] = await db.query(
      "INSERT INTO review (product_id, user_id, user_name, rating, content) VALUES (?, ?, ?, ?, ?)",
      [productId, userId, userName, r, content.trim()],
    );
    const [rows] = await db.query("SELECT * FROM review WHERE id = ?", [result.insertId]);
    success(res, toReviewJSON(rows[0]), "评价成功");
  } catch (err) {
    console.error(err);
    fail(res, err.message);
  }
};

module.exports = { getReviewList, postReview };
