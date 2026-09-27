// 成功返回
const success = (res, data, msg='ok') => {
  res.json({
    code:200,
    data,
    msg
  })
}
// 失败返回
const fail = (res, msg='请求失败', code=500) => {
  res.json({
    code,
    data:null,
    msg
  })
}

module.exports = { success, fail }
