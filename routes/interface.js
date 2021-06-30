var express = require("express");
var router = express.Router();
const exec = require("child_process").exec;
var _ = require("lodash");
const isCidr = require("is-cidr");

/**
 *
 */
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ admin: {}, interfaces: [] }).write();

router.get("/create", function (req, res, next) {
  var wgKeys = exec("./script.sh getKeys", function (err, stdout, stderr) {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
    var keys = JSON.parse(stdout);
    res.render("createInterface", { privateKey: keys.privateKey, publicKey: keys.publicKey });
  });
});

router.get("/edit/:interfaceName", function (req, res, next) {
  var interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();
  res.send(interfaceInfo);
});

router.post("/create", function (req, res, next) {
  // check for existing interface
  var interface = db.get("interfaces").find({ name: req.body.name }).value();

  if (!_.isEmpty(interface)) {
    res.render("createInterface", {
      err: "Interface is already in use.",
      privateKey: req.body.privateKey,
      publicKey: req.body.publicKey,
    });
  } else if (!isCidr.v4(req.body.cidr)) {
    res.render("createInterface", {
      err: "Invalid CIDR.",
      privateKey: req.body.privateKey,
      publicKey: req.body.publicKey,
    });
  } else if (parseInt(req.body.port) < 1 || parseInt(req.body.port) > 65535) {
    res.render("createInterface", {
      err: "Invalid Port.",
      privateKey: req.body.privateKey,
      publicKey: req.body.publicKey,
    });
  } else {
    db.get("interfaces")
      .push({
        name: req.body.name,
        desc: req.body.desc,
        address: req.body.cidr,
        port: req.body.port,
        privateKey: req.body.privateKey,
        publicKey: req.body.publicKey,
        postUp: req.body.postup,
        postDown: req.body.postdown,
        enable: false,
        peers: [],
      })
      .write();
    res.redirect("/interface/edit/" + req.body.name);
  }
});

module.exports = router;
