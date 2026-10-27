const db = require("../config/db");
const { success, fail } = require("../utils/response");

const toCouponJSON = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  threshold: row.threshold,
  amount: row.amount,
  discount: row.discount,
  total: row.total,
  received: row.received,
  startTime: row.start_time,
  endTime: row.end_time,
});

// ========== 接口：领券中心 GET /api/coupons ==========
// 返回当前可领的券，并标注当前用户是否已领取
const getCouponCenter = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      `SELECT * FROM coupon
       WHERE status = 1 AND (end_time IS NULL OR end_time > NOW())
       ORDER BY threshold ASC, amount DESC`,
    );
    if (rows.length === 0) return success(res, []);
    const ids = rows.map((r) => r.id);
    const [mine] = await db.query(
      `SELECT coupon_id FROM user_coupon WHERE user_id = ? AND coupon_id IN (${ids.map(() => "?").join(",")})`,
      [userId, ...ids],
    );
    const got = new Set(mine.map((m) => m.coupon_id));
    success(
      res,
      rows.map((r) => ({ ...toCouponJSON(r), receivedByMe: got.has(r.id) })),
    );
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：领取优惠券 POST /api/coupons/:id/receive ==========
const receiveCoupon = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM coupon WHERE id = ? AND status = 1 AND (end_time IS NULL OR end_time > NOW())",
      [id],
    );
    if (rows.length === 0) return fail(res, "优惠券不存在或已过期", 404);
    const coupon = rows[0];
    if (coupon.total > 0 && coupon.received >= coupon.total) {
      return fail(res, "优惠券已被领完", 400);
    }
    const [mine] = await db.query("SELECT id FROM user_coupon WHERE user_id = ? AND coupon_id = ?", [userId, id]);
    if (mine.length > 0) return fail(res, "您已领取过该优惠券", 400);

    await db.query("INSERT INTO user_coupon (user_id, coupon_id) VALUES (?, ?)", [userId, id]);
    await db.query("UPDATE coupon SET received = received + 1 WHERE id = ?", [id]);
    success(res, null, "领取成功");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：我的优惠券 GET /api/user/coupons?status= ==========
// status: 0未使用 1已使用 2已过期；不传返回全部
const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    let sql = `SELECT uc.id AS uc_id, uc.status AS uc_status, uc.received_time,
                      c.* FROM user_coupon uc JOIN coupon c ON uc.coupon_id = c.id
               WHERE uc.user_id = ?`;
    const params = [userId];
    if (status !== undefined && status !== "") {
      sql += " AND uc.status = ?";
      params.push(parseInt(status, 10));
    }
    sql += " ORDER BY uc.id DESC";
    const [rows] = await db.query(sql, params);
    success(
      res,
      rows.map((r) => ({ ...toCouponJSON(r), userCouponId: r.uc_id, ucStatus: r.uc_status, receivedTime: r.received_time })),
    );
  } catch (err) {
    fail(res, err.message);
  }
};

module.exports = { getCouponCenter, receiveCoupon, getUserCoupons };
