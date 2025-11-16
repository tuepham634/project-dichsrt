const jwt = require('jsonwebtoken');
const UserModel = require('../../models/user.model');
const variableConfig = require('../../config/variable');
const RoleModel = require('../../models/role.model');

module.exports.verifyToken = async (req, res, next) => {
  try {
    // const token = req.cookies.token;
    let token;

  // 1. Lấy token từ Authorization header (Bearer)
  if (req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }


    if (!token) {
      return res.redirect(`/${variableConfig.pathAdmin}/account/login`);

    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, email } = decoded;

    // Chỉ kiểm tra account có tồn tại và active
    const existAccount = await UserModel.findOneByIdAndEmail(id, email);
    const Role = await RoleModel.getRoleById(existAccount.role);
    console.log("Role:", Role)
    //console.log("Sau verify:", existAccount);

    if (Role) {
      existAccount.rolename = Role.name;
      req.permissions = Role.permissions;
      res.locals.permissions = Role.permissions
    }


    if (!existAccount) {
      res.clearCookie("token");
      return res.redirect(`/${variableConfig.pathAdmin}/account/login`);
    }

    // Gán thông tin user vào request và locals (để view pug dùng được)
    req.account = existAccount;
    res.locals.account = existAccount;
    //console.log(req.account);
    next();
  } catch (error) {
    console.error("JWT verify error:", error.message);
    console.log("bị lỗi hệ thống")
    res.clearCookie("token");
    res.redirect(`/${variableConfig.pathAdmin}/account/login`);
  }
};
