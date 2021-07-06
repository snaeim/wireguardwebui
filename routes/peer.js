var express = require("express");
var router = express.Router();
var Netmask = require("netmask").Netmask;
const exec = require("child_process").exec;

/**
 *
 */
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ admin: {}, interfaces: [] }).write();

/* GET home page. */
router.get("/add/:interfaceName", function (req, res, next) {
  db.read();

  var interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();
  var addressInfo = new Netmask(interfaceInfo.address);
  var nextIpAddress = null;

  getInuseIpAddress(interfaceInfo).then((inuseIpAddress) => {
    addressInfo.forEach((ip) => {
      if (!inuseIpAddress.includes(ip) && nextIpAddress === null) {
        nextIpAddress = ip;
      }
    });

    res.render("addPeer", { nextIpAddress: nextIpAddress });
  });
});

/* GET home page. */
router.post("/add/:interfaceName", function (req, res, next) {
  db.read();
  exec("./script.sh getKeys", function (err, stdout, stderr) {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
    var keys = JSON.parse(stdout);
    var peers = db
      .get("interfaces")
      .find({ name: req.params.interfaceName })
      .get("peers")
      .push({
        desc: req.body.desc,
        address: req.body.address + "/32",
        publicKey: keys.publicKey,
      })
      .write();

    db.read();

    var interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();

    var addressInfo = new Netmask(interfaceInfo.address);
    var nextIpAddress = null;

    getInuseIpAddress(interfaceInfo).then((inuseIpAddress) => {
      addressInfo.forEach((ip) => {
        if (!inuseIpAddress.includes(ip) && nextIpAddress === null) {
          nextIpAddress = ip;
        }
      });

      newClientConfig = "[Interface]\nPrivateKey = " + keys.privateKey + "\nAddress = " + req.body.address + "/32\nDNS = " + req.body.dns;
      newClientConfig += "\n\n[Peer]\nPublicKey = " + interfaceInfo.publicKey + "\nEndpoint = " + req.body.endpoint + ":" + interfaceInfo.port;
      res.render("addPeer", { nextIpAddress: nextIpAddress, newClientConfig: newClientConfig });
    });
  });
});

function getInuseIpAddress(interface) {
  return new Promise((resolve) => {
    var inuseIpAddress = [interface.address.split("/")[0]];

    interface.peers.forEach((peer) => {
      inuseIpAddress.push(peer.address.split("/")[0]);
    });

    resolve(inuseIpAddress);
  });
}

module.exports = router;
