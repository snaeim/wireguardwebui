var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var adminRouter = require("./routes/admin");
var interfaceRouter = require("./routes/interface");
var peerRouter = require("./routes/peer");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.all("*", function (req, res, next) {
  if (req.path == "/admin/login") {
    return next();
  }

  const low = require("lowdb");
  const FileSync = require("lowdb/adapters/FileSync");
  const adapter = new FileSync("db.json");
  const db = low(adapter);
  db.defaults({ admin: {}, interfaces: [] }).write();

  // check for existing admin
  var admin = db.get("admin").value();

  // check for user login
  let cookieToken = req.cookies.ADMIN_TOKEN;
  if (admin.token && cookieToken && admin.token === cookieToken) {
    next(); // pass control to the next handler
  } else {
    res.redirect("/admin/login");
  }
});
app.use("/", indexRouter);
app.use("/admin", adminRouter);
app.use("/interface", interfaceRouter);
app.use("/peer", peerRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
