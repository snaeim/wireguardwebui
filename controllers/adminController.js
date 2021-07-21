const _ = require("lodash");
const bcrypt = require("bcrypt");

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("src/db.json");
const db = low(adapter);

/**
 *
 * Get Routers
 *
 */
exports.adminLogin = (req, res) => {
  db.read();

  // check for existing admin
  var admin = db.get("admin").value();
  // check for user login
  let cookieToken = req.cookies.ADMIN_TOKEN;

  // admin not registered
  if (_.isEmpty(admin)) {
    res.render("login", { firstLogin: true });
  }

  // admin is registered but not logged in
  if (!_.isEmpty(admin) && !cookieToken) {
    res.render("login");
  }

  // admin registred and loggedin with valid token
  if (!_.isEmpty(admin) && cookieToken && admin.token === cookieToken) {
    res.render("login", { alreadyLoggedin: true });
  }

  // admin registred and loggedin with invalid token
  if (!_.isEmpty(admin) && cookieToken && admin.token !== cookieToken) {
    res.redirect("/admin/logout");
  }
};

exports.adminLogout = (req, res) => {
  res.clearCookie("ADMIN_TOKEN").redirect("/");
};

/**
 *
 * Post Routers
 *
 */
exports.adminLoginPost = (req, res) => {
  db.read();

  // check for existing admin
  var admin = db.get("admin").value();
  // check for user login
  let cookieToken = req.cookies.ADMIN_TOKEN;
  // check for password is existing in submitted form
  var password = req.body.password;

  // admin registred and loggedin with invalid token
  if (!_.isEmpty(admin) && cookieToken) {
    res.render("login", { alreadyLoggedin: true });
  }

  if (!password) {
    res.render("login", { err: "Something went wrong!" });
  }

  // admin not registered, must be create account and set token
  if (_.isEmpty(admin) && password) {
    // encrypt password and generate token
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);
    const token = require("crypto").randomBytes(32).toString("hex");

    // write to db
    db.set("admin", { password: hashedPassword, token: token }).write();

    // set token to cookies n redirect to homepage
    res.cookie("ADMIN_TOKEN", token).redirect("/");
  }

  // if registred admin is exist and not loggedin,
  // then check for password if its valid set cookie
  if (admin.password && password && bcrypt.compareSync(password, admin.password)) {
    res.cookie("ADMIN_TOKEN", admin.token).redirect("/");
  }

  // if registred admin is exist and not loggedin,
  // then check for password if its not valid show error
  if (admin.password && password && !bcrypt.compareSync(password, admin.password)) {
    res.render("login", { err: "Invalid password." });
  }
};
