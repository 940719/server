const db = require("../config/db");
const { success, fail } = require("../utils/response");

const STATUS_TEXT = {
  1: "待付款",
  2: "待发货",
  3: "待收货",
  4: "待评价",
  5: "已完成",
  6: "已取消",
};

const toItemJSON = (row) => ({
  id: row.id,
  goodsId: row.goods_id,
  goodsName: row.goods_name,
  price: row.price,
  num: row.num,
  emoji: row.emoji,
  bg: row.bg,
});

const toOrderJSON = (row, items) => ({
  id: row.id,
  orderNo: row.order_no,
  status: row.status,
  statusText: STATUS_TEXT[row.status] || "未知",
  totalPrice: row.total_price,
  receiver: row.receiver,
  phone: row.phone,
  address: row.address,
  payTime: row.pay_time,
  createTime: row.create_time,
  items: items || [],
});

// 生成订单号：时间戳 + 用户id + 随机数
const genOrderNo = (userId) =>
  new Date().toISOString().replace(/\D/g, "").slice(0, 14) + String(userId).padStart(4, "0") + String(Math.floor(Math.random() * 900) + 100);

// ========== 接口：订单列表 GET /api/orders?status= ==========
const getOrderList = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    let sql = "SELECT * FROM orders WHERE user_id = ?";
    const params = [userId];
    if (status) {
      sql += " AND status = ?";
      params.push(parseInt(status, 10));
    }
    sql += " ORDER BY id DESC";
    const [orders] = await db.query(sql, params);
    if (orders.length === 0) return success(res, []);

    const ids = orders.map((o) => o.id);
    const [items] = await db.query(
      `SELECT * FROM order_item WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
      ids,
    );
    const itemMap = {};
    items.forEach((it) => {
      (itemMap[it.order_id] = itemMap[it.order_id] || []).push(toItemJSON(it));
    });
    success(res, orders.map((o) => toOrderJSON(o, itemMap[o.id] || [])));
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：下单 POST /api/orders ==========
// body: { addressId, cartIds: [购物车记录id] }
const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId, cartIds } = req.body;
    if (!addressId) return fail(res, "请选择收货地址", 400);
    if (!Array.isArray(cartIds) || cartIds.length === 0) return fail(res, "请选择要结算的商品", 400);

    // 收货地址
    const [addrRows] = await db.query(
      "SELECT * FROM address WHERE id = ? AND user_id = ?",
      [addressId, userId],
    );
    if (addrRows.length === 0) return fail(res, "收货地址不存在", 404);
    const addr = addrRows[0];
    const addressText = [addr.province, addr.city, addr.district, addr.detail].filter(Boolean).join(" ");

    // 购物车项（校验归属 + 关联商品）
    const [cartRows] = await db.query(
      `SELECT c.id AS cart_id, c.quantity, p.id AS product_id, p.name, p.price, p.emoji, p.bg
       FROM cart c JOIN product p ON c.product_id = p.id
       WHERE c.user_id = ? AND c.id IN (${cartIds.map(() => "?").join(",")})`,
      [userId, ...cartIds],
    );
    if (cartRows.length === 0) return fail(res, "购物车商品不存在", 400);

    const totalPrice = cartRows.reduce((s, r) => s + Number(r.price) * r.quantity, 0);
    const orderNo = genOrderNo(userId);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [orderResult] = await conn.query(
        "INSERT INTO orders (order_no, user_id, status, total_price, receiver, phone, address) VALUES (?, ?, 1, ?, ?, ?, ?)",
        [orderNo, userId, totalPrice.toFixed(2), addr.receiver, addr.phone, addressText],
      );
      const orderId = orderResult.insertId;
      for (const r of cartRows) {
        await conn.query(
          "INSERT INTO order_item (order_id, goods_id, goods_name, price, num, emoji, bg) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [orderId, r.product_id, r.name, r.price, r.quantity, r.emoji || "", r.bg || ""],
        );
      }
      // 从购物车移除已下单商品
      await conn.query(
        `DELETE FROM cart WHERE user_id = ? AND id IN (${cartIds.map(() => "?").join(",")})`,
        [userId, ...cartIds],
      );
      await conn.commit();
      success(res, { id: orderId, orderNo, totalPrice: totalPrice.toFixed(2) }, "下单成功");
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：订单付款（模拟） POST /api/orders/:id/pay ==========
// 待付款(1) -> 待发货(2)
const payOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query("SELECT status FROM orders WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "订单不存在", 404);
    if (rows[0].status !== 1) return fail(res, "订单状态不允许付款", 400);

    await db.query("UPDATE orders SET status = 2, pay_time = NOW() WHERE id = ?", [id]);
    success(res, null, "支付成功");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：确认收货 POST /api/orders/:id/confirm ==========
// 待收货(3) -> 待评价(4)
const confirmOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query("SELECT status FROM orders WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "订单不存在", 404);
    if (rows[0].status !== 3) return fail(res, "订单状态不允许确认收货", 400);

    await db.query("UPDATE orders SET status = 4 WHERE id = ?", [id]);
    success(res, null, "已确认收货");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：取消订单 POST /api/orders/:id/cancel ==========
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query("SELECT status FROM orders WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "订单不存在", 404);
    if (rows[0].status !== 1) return fail(res, "仅待付款订单可取消", 400);

    await db.query("UPDATE orders SET status = 6 WHERE id = ?", [id]);
    success(res, null, "订单已取消");
  } catch (err) {
    fail(res, err.message);
  }
};

module.exports = { getOrderList, createOrder, payOrder, confirmOrder, cancelOrder };
