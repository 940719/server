const db = require("../config/db");
const { success, fail } = require("../utils/response");

const toAddressJSON = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    receiver: row.receiver,
    phone: row.phone,
    province: row.province,
    city: row.city,
    district: row.district,
    detail: row.detail,
    isDefault: !!row.is_default,
  };
};

// ========== 接口：地址列表 GET /api/address（默认地址排前） ==========
const getAddressList = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      "SELECT * FROM address WHERE user_id = ? ORDER BY is_default DESC, id DESC",
      [userId],
    );
    success(res, rows.map(toAddressJSON));
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：新增地址 POST /api/address ==========
// body: { receiver, phone, province, city, district, detail, isDefault? }
const addAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { receiver, phone, province = "", city = "", district = "", detail, isDefault } = req.body;
    if (!receiver || !receiver.trim()) return fail(res, "请填写收货人", 400);
    if (!phone || !/^1\d{10}$/.test(phone)) return fail(res, "请填写正确的手机号", 400);
    if (!detail || !detail.trim()) return fail(res, "请填写详细地址", 400);

    const [[{ cnt }]] = await db.query("SELECT COUNT(*) AS cnt FROM address WHERE user_id = ?", [userId]);
    const makeDefault = isDefault || cnt === 0; // 第一条地址自动设为默认
    if (makeDefault) {
      await db.query("UPDATE address SET is_default = 0 WHERE user_id = ?", [userId]);
    }
    const [result] = await db.query(
      "INSERT INTO address (user_id, receiver, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, receiver.trim(), phone, province, city, district, detail.trim(), makeDefault ? 1 : 0],
    );
    success(res, { id: result.insertId }, "新增成功");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：编辑地址 PUT /api/address/:id ==========
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { receiver, phone, province, city, district, detail, isDefault } = req.body;
    const [rows] = await db.query("SELECT id FROM address WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "地址不存在", 404);
    if (!receiver || !receiver.trim()) return fail(res, "请填写收货人", 400);
    if (!phone || !/^1\d{10}$/.test(phone)) return fail(res, "请填写正确的手机号", 400);

    if (isDefault) {
      await db.query("UPDATE address SET is_default = 0 WHERE user_id = ?", [userId]);
    }
    await db.query(
      "UPDATE address SET receiver = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, is_default = ? WHERE id = ?",
      [receiver.trim(), phone, province || "", city || "", district || "", detail ? detail.trim() : "", isDefault ? 1 : 0, id],
    );
    success(res, null, "保存成功");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：设为默认 PUT /api/address/:id/default ==========
const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query("SELECT id FROM address WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "地址不存在", 404);
    await db.query("UPDATE address SET is_default = 0 WHERE user_id = ?", [userId]);
    await db.query("UPDATE address SET is_default = 1 WHERE id = ?", [id]);
    success(res, null, "已设为默认");
  } catch (err) {
    fail(res, err.message);
  }
};

// ========== 接口：删除地址 DELETE /api/address/:id ==========
const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const [rows] = await db.query("SELECT is_default FROM address WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return fail(res, "地址不存在", 404);
    await db.query("DELETE FROM address WHERE id = ?", [id]);
    // 若删的是默认地址，剩余第一条设为默认
    if (rows[0].is_default) {
      const [rest] = await db.query(
        "SELECT id FROM address WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [userId],
      );
      if (rest.length > 0) {
        await db.query("UPDATE address SET is_default = 1 WHERE id = ?", [rest[0].id]);
      }
    }
    success(res, null, "删除成功");
  } catch (err) {
    fail(res, err.message);
  }
};

module.exports = { getAddressList, addAddress, updateAddress, setDefaultAddress, deleteAddress };
