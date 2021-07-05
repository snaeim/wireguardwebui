var express = require("express");
var router = express.Router();

/**
 *
 */
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ admin: {}, interfaces: [] }).write();

/* GET home page. */
router.get("/", function (req, res, next) {
  // updating db state
  db.read();

  let interfaces = db.get("interfaces").sortBy("name").value();
  res.render("index", { interfaces: interfaces });
});

module.exports = router;
