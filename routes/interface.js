var express = require("express");
var router = express.Router();
const exec = require("child_process").exec;
var _ = require("lodash");
const isCidr = require("is-cidr");
const multer = require("multer");
var ini = require("ini");

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
    res.render("interface", { action: "create", interface: keys });
  });
});

router.get("/edit/:interfaceName", function (req, res, next) {
  var interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();
  res.render("interface", { action: "edit", interface: interfaceInfo });
});

router.post("/create", function (req, res, next) {
  // updating db state
  db.read();
  // check for existing interface
  var interfaceDB = db.get("interfaces").find({ name: req.body.name }).value();

  isValidInterface(req.body)
    .then((interface) => {
      if (!_.isEmpty(interfaceDB)) {
        res.render("interface", {
          action: "create",
          err: ["Interface is already in use."],
          interface: interface,
        });
      } else {
        db.get("interfaces")
          .push({
            name: interface.name,
            desc: interface.desc,
            address: interface.address,
            port: interface.port,
            privateKey: interface.privateKey,
            publicKey: interface.publicKey,
            postUp: interface.postUp,
            postDown: interface.postDown,
            enable: interface.enable === "on" ? true : false,
            peers: interface.peers,
          })
          .write();
        res.redirect("/");
      }
    })
    .catch((err) => {
      res.render("interface", {
        action: "create",
        err: err,
        interface: req.body,
      });
    });
});

router.post("/edit/:interfaceName", function (req, res, next) {
  // updating db state
  db.read();

  // checking for new name availability
  var interfaceDB = db.get("interfaces").find({ name: req.body.name }).value();

  isValidInterface(req.body)
    .then((interface) => {
      if (req.params.interfaceName !== interface.name && !_.isEmpty(interfaceDB)) {
        res.render("interface", {
          action: "edit",
          err: ["Interface is already in use."],
          interface: interface,
        });
      } else {
        db.get("interfaces").remove({ name: req.params.interfaceName }).write();
        db.get("interfaces")
          .push({
            name: interface.name,
            desc: interface.desc,
            address: interface.address,
            port: interface.port,
            privateKey: interface.privateKey,
            publicKey: interface.publicKey,
            postUp: interface.postUp,
            postDown: interface.postDown,
            enable: interface.enable === "on" ? true : false,
            peers: interface.peers,
          })
          .write();
        res.redirect("/");
      }
    })
    .catch((err) => {
      res.render("interface", {
        action: "edit",
        err: err,
        interface: req.body,
      });
    });
});

router.get("/delete/:interfaceName", function (req, res, next) {
  // updating db state
  db.read();

  db.get("interfaces").remove({ name: req.params.interfaceName }).write();
  res.redirect("/");
});

router.get("/import", function (req, res, next) {
  res.render("import");
});

router.post("/import", multer({ storage: multer.memoryStorage() }).single("configFile"), function (req, res, next) {
  // check file size and mime type
  if (req.file.size > 10000 || req.file.size < 10 || req.file.mimetype !== "application/octet-stream") {
    // if its not valid send error to import page
    res.render("import", { err: ["Invalid configuration file."] });
  } else {
    // if file size and mime type is valid
    // read config file then save it to var
    let config = req.file.buffer.toString("utf-8");

    // parse config file
    parseConfig(config).then((config) => {
      // set interface name from filename
      config.name = req.file.originalname.replace(".conf", "");
      config.desc = "imported interface";

      // generate public key for interface
      exec("./script.sh genPublicKey " + config.privateKey, function (err, stdout, stderr) {
        if (err) {
          console.error(`exec error: ${err}`);
          return;
        }

        var keys = JSON.parse(stdout);
        config.publicKey = keys.publicKey;

        // check for interface field validity
        isValidInterface(config)
          .then((interface) => {
            res.render("interface", { action: "create", interface: interface });
          })
          .catch((err) => {
            res.render("interface", {
              action: "create",
              err: err,
              interface: config,
            });
          });
      });
    });
  }
});

function isValidInterface(interface) {
  var errList = [];
  return new Promise((resolve, reject) => {
    // check interface info

    if (!isCidr.v4(interface.address)) {
      errList.push("Invalid CIDR.");
    }

    if (parseInt(interface.port) < 1 || parseInt(interface.port) > 65535) {
      errList.push("Invalid Port.");
    }

    if (!isValidKey(interface.privateKey)) {
      errList.push(interface.privateKey + " is not valid private key.");
    }

    if (!isValidKey(interface.publicKey)) {
      errList.push(interface.publicKey + " is not valid public key.");
    }

    if (interface.peers) {
      interface.peers.forEach((peer) => {
        if (!isCidr.v4(peer.address)) {
          errList.push(peer.address + " is not valid address.");
        }
        if (!isValidKey(peer.publicKey)) {
          errList.push(peer.publicKey + " is not valid public key.");
        }
      });
    }

    if (errList.length > 0) {
      reject(errList);
    } else {
      resolve(interface);
    }
  });
}

function isValidKey(key) {
  if (key === undefined) {
    return false;
  }
  if (key.length === 44 && Buffer.from(key, "base64").byteLength === 32) {
    return true;
  }
  return false;
}

function parseConfig(config) {
  return new Promise((resolve) => {
    let configExplodeBySection = config.match(/^\[[^\]\r\n]+](?:\r?\n(?:[^[\r\n].*)?)*/gm);
    var interface = { name: "", desc: "", address: "", port: "", privateKey: "", publicKey: "", postUp: "", postDown: "", enable: false, peers: [] };
    configExplodeBySection.forEach((section) => {
      var parsedSection = ini.parse(section);
      if (parsedSection.Interface) {
        interface.address = parsedSection.Interface.Address;
        interface.port = parsedSection.Interface.ListenPort;
        interface.privateKey = parsedSection.Interface.PrivateKey;
        interface.postUp = parsedSection.Interface.PostUp;
        interface.postDown = parsedSection.Interface.PostDown;
      }
      if (parsedSection.Peer) {
        interface.peers.push({
          address: parsedSection.Peer.AllowedIPs,
          publicKey: parsedSection.Peer.PublicKey,
        });
      }
    });
    resolve(interface);
  });
}

function dotConfToObj(config) {}

module.exports = router;
