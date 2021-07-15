const exec = require("child_process").exec;
const isCidr = require("is-cidr");
const _ = require("lodash");
const ini = require("ini");

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);

/**
 *
 * Get Routers
 *
 */
exports.interfaceList = async (req, res) => {
  // updating db state
  db.read();

  let interfaces = db.get("interfaces").sortBy("name").value();
  res.render("index", { interfaces: interfaces });
};

exports.interfaceCreate = async (req, res) => {
  var keys = await shellExec("./script.sh getKeys").catch(console.error("Can't run bash script"));
  keys = JSON.parse(keys);
  res.render("interface", { action: "create", interface: keys });
};

exports.interfaceImport = async (req, res) => {
  res.render("import");
};

exports.interfaceUpdate = async (req, res) => {
  // updating db state
  db.read();

  var interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();
  res.render("interface", { action: "edit", interface: interfaceInfo });
};

exports.interfaceDelete = async (req, res) => {
  // updating db state
  db.read();

  db.get("interfaces").remove({ name: req.params.interfaceName }).write();
  res.redirect("/interface");
};

/**
 *
 * Post Route
 *
 */
exports.interfaceCreatePost = async (req, res) => {
  // updating db state
  db.read();
  // check for existing interface
  var interfaceDB = db.get("interfaces").find({ name: req.body.name }).value();

  try {
    const interface = await validateInterface(req.body);
    if (!_.isEmpty(interfaceDB)) {
      throw new Error("Interface is already in use.");
    }
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
    res.redirect("/interface");
  } catch (err) {
    res.render("interface", { action: "create", err: err, interface: req.body });
  }
};

exports.interfaceUpdatePost = async (req, res) => {
  // updating db state
  db.read();

  // checking for new name availability
  var interfaceDB = db.get("interfaces").find({ name: req.body.name }).value();

  try {
    const interface = await validateInterface(req.body);
    if (req.params.interfaceName !== interface.name && !_.isEmpty(interfaceDB)) {
      throw new Error("Interface is already in use.");
    }
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
    res.redirect("/interface");
  } catch (err) {
    res.render("interface", { action: "edit", err: err, interface: req.body });
  }
};

exports.interfaceImportPost = async (req, res) => {
  try {
    // check file size and mime type
    if (req.file.size > 10000 || req.file.size < 10 || req.file.mimetype !== "application/octet-stream") {
      throw new Error("Invalid configuration file.");
    }
    // if file size and mime type is valid
    // read config file then save it to var
    const config = req.file.buffer.toString("utf-8");

    // parse dotconf file
    let interface = await dotConfToInterface(config);

    // generate public key for interface
    let keys = await shellExec("./script.sh genPublicKey " + interface.privateKey);
    keys = JSON.parse(keys);
    interface.publicKey = keys.publicKey;

    // set interface name from filename
    interface.name = req.file.originalname.replace(".conf", "");
    interface.desc = "imported interface";

    res.render("interface", { action: "create", interface: interface });
  } catch (err) {
    res.render("import", { err: err });
  }
};

/**
 *
 *
 * Helper Functions
 *
 *
 */

function shellExec(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(stdout);
    });
  });
}

function validateInterface(interface) {
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

function dotConfToInterface(config) {
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

function interfaceToDotConf(interface) {
  return new Promise((resolve) => {
    let conf = "[Interface]";
    conf += "\nAddress = " + interface.address;
    conf += "\nPort = " + interface.port;
    conf += "\nPrivateKey = " + interface.privateKey;
    conf += interface.postUp === "" ? "" : "\nPostUp = " + interface.postUp;
    conf += interface.postDown === "" ? "" : "\npostDown = " + interface.postDown;

    interface.peers.forEach((peer) => {
      conf += "\n\n[Peer]";
      conf += "\nPublicKey = " + peer.publicKey;
      conf += "\nAllowedIPs = " + peer.address;
    });
    resolve(conf);
  });
}
