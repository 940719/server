const db = require("../config/db");
const { success, fail } = require("../utils/response");
const toJSON = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    sort: row.sort,
    name: row.name,
    img: row.img,
    createTime: row.created_at,
  };
};
const getCategoryList = async (req, res) => {
  try {
    // 获取前端传的分页参数，默认 pageNum=1，pageSize=10
    const pageNum = parseInt(req.query.pageNum);
    const pageSize = parseInt(req.query.pageSize);
    // 计算偏移量
    const offset = (pageNum - 1) * pageSize;
    // ① 查询当前页数据
    const [rows] = await db.query(
      "SELECT * FROM category ORDER BY sort DESC LIMIT ?, ?",
      [offset, pageSize],
    );
    // ② 查询总条数
    const [[totalRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM category",
    );

    const list = rows.map(toJSON);
    success(res, {
      list,
      total: totalRow.total,
      pageNum,
      pageSize,
    });
  } catch (err) {
    fail(res, err.message);
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, sort, img } = req.body;
    if (!name) return fail(res, "商品类型名称 name 不能为空", 400);
    // 校验重名
    const [existingRows] = await db.query(
      "SELECT * FROM category WHERE name = ?",
      [name],
    );
    if (existingRows.length > 0) {
      return fail(res, "商品类型名称已存在", 400);
    }
    if (
      sort === "" ||
      sort === null ||
      sort === undefined ||
      isNaN(Number(sort))
    ) {
      return fail(res, "商品类型排序 sort 必须为数字", 400);
    }
    // 校验排序重复
    const [existingSortRows] = await db.query(
      "SELECT * FROM category WHERE sort = ?",
      [sort],
    );
    if (existingSortRows.length > 0) {
      return fail(res, "商品类型排序已存在", 400);
    }
    const [result] = await db.query(
      "INSERT INTO category (name, sort, img) VALUES (?, ?, ?)",
      [name, sort, img],
    );
    const insertId = result.insertId;
    const [rows] = await db.query("SELECT * FROM category WHERE id = ?", [
      insertId,
    ]);
    const row = rows[0];
    success(res, toJSON(row), "新增成功");
  } catch (err) {
    fail(res, err.message);
  }
};

const updateCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort, img } = req.body;

    const [existingRows] = await db.query(
      "SELECT * FROM category WHERE id = ?",
      [id],
    );
    if (existingRows.length === 0) {
      return fail(res, "商品类型不存在", 404);
    }

    if (!name) return fail(res, "商品类型名称 name 不能为空", 400);
    if (
      sort === "" ||
      sort === null ||
      sort === undefined ||
      isNaN(Number(sort))
    ) {
      return fail(res, "商品类型排序 sort 必须为数字", 400);
    }

    const [existingNameRows] = await db.query(
      "SELECT * FROM category WHERE name = ? AND id != ?",
      [name, id],
    );
    if (existingNameRows.length > 0) {
      return fail(res, "商品类型名称已存在", 400);
    }

    const [existingSortRows] = await db.query(
      "SELECT * FROM category WHERE sort = ? AND id != ?",
      [sort, id],
    );
    if (existingSortRows.length > 0) {
      return fail(res, "商品类型排序已存在", 400);
    }

    await db.query(
      "UPDATE category SET name = ?, sort = ?, img = ? WHERE id = ?",
      [name, sort, img, id],
    );

    const [rows] = await db.query("SELECT * FROM category WHERE id = ?", [id]);
    const row = rows[0];
    success(res, toJSON(row), "更新成功");
  } catch (err) {
    fail(res, err.message);
  }
};

const deleteCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [existingRows] = await db.query(
      "SELECT * FROM category WHERE id = ?",
      [id],
    );
    if (existingRows.length === 0) {
      return fail(res, "商品类型不存在", 404);
    }

    await db.query("DELETE FROM category WHERE id = ?", [id]);
    success(res, null, "删除成功");
  } catch (err) {
    fail(res, err.message);
  }
};

module.exports = {
  getCategoryList,
  addCategory,
  updateCategoryById,
  deleteCategoryById,
};
