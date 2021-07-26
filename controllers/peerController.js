const Netmask = require("netmask").Netmask;
const exec = require("child_process").exec;
const isCidr = require("is-cidr");
const _ = require("lodash");

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("src/db.json");
const db = low(adapter);

/**
 *
 * Get Routers
 *
 */
exports.peerCreate = async (req, res) => {
  // read database
  db.read();

  const interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();
  try {
    var nextIpAddress = await getNextIpAddress(interfaceInfo);
    if (nextIpAddress === null) {
      throw new Error("No IP address available.");
    }
    res.render("addPeer", { nextIpAddress: nextIpAddress });
  } catch (err) {
    res.render("addPeer", { err: err, nextIpAddress: nextIpAddress });
  }
};

/**
 *
 * Post Routers
 *
 */
exports.peerCreatePost = async (req, res) => {
  // read database
  db.read();

  // check ip availability
  const interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();

  const inuseIpAddress = await getInuseIpAddress(interfaceInfo);
  const reqIpAddress = req.body.address + "/32";
  var nextIpAddress;

  try {
    if (!isCidr.v4(reqIpAddress)) {
      throw new Error("Address is not valid");
    }
    if (inuseIpAddress.includes(req.body.address)) {
      throw new Error("Address is inused.");
    }

    var keys;

    if (await isActiveInterface(req.params.interfaceName)) {
      keys = await shellExec("sudo src/script.sh addPeerToActiveInterface " + req.params.interfaceName + " " + reqIpAddress);
    } else {
      keys = await shellExec("sudo src/script.sh addPeerToDeactiveInterface " + req.params.interfaceName + " " + reqIpAddress);
    }

    keys = JSON.parse(keys);

    db.get("interfaces")
      .find({ name: req.params.interfaceName })
      .get("peers")
      .push({
        desc: req.body.desc,
        address: reqIpAddress,
        publicKey: keys.publicKey,
      })
      .write();

    newClientConfig = generatePeerConfig(keys.privateKey, reqIpAddress, req.body.dns, interfaceInfo.publicKey, req.body.endpoint, interfaceInfo.port);
    nextIpAddress = await getNextIpAddress(interfaceInfo);
    if (nextIpAddress === null) {
      throw new Error("No IP address available.");
    }

    res.render("addPeer", { nextIpAddress: nextIpAddress, newClientConfig: newClientConfig });
  } catch (err) {
    console.log("get error");
    nextIpAddress = await getNextIpAddress(interfaceInfo);
    res.render("addPeer", { err: err, nextIpAddress: nextIpAddress, newClientConfig: typeof newClientConfig === "undefined" ? undefined : newClientConfig });
  }
};

/**
 *
 * Helper Functions
 *
 */
function getInuseIpAddress(interface) {
  return new Promise((resolve) => {
    var inuseIpAddress = [interface.address.split("/")[0]];

    if (typeof interface.peers === "object") {
      interface.peers.forEach((peer) => {
        inuseIpAddress.push(peer.address.split("/")[0]);
      });
    }

    resolve(inuseIpAddress);
  });
}

async function getNextIpAddress(interface) {
  let inuseIpAddress = await getInuseIpAddress(interface);
  let addressInfo = new Netmask(interface.address);
  let nextIpAddress = null;

  return new Promise((resolve) => {
    addressInfo.forEach((ip) => {
      if (!inuseIpAddress.includes(ip) && nextIpAddress === null) {
        nextIpAddress = ip;
      }
    });

    resolve(nextIpAddress);
  });
}

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

function generatePeerConfig(privateKey, address, dns, interfacePublicKey, endpoint, port) {
  peerConfig = "[Interface]\nPrivateKey = " + privateKey;
  peerConfig += "\nAddress = " + address + "\nDNS = " + dns;
  peerConfig += "\n\n[Peer]\nPublicKey = " + interfacePublicKey;
  peerConfig += "\nEndpoint = " + endpoint + ":" + port;
  return peerConfig;
}

// now cant get interface name
async function getActiveInterface() {
  let wgResult = await shellExec("sudo src/script.sh getActiveInterface");
  let activeInterface = [];
  return new Promise((resolve) => {
    // get name of active interface and clean them
    matchedItem = wgResult.match(/interface: (\w*)/gm);
    if (!_.isEmpty(matchedItem)) {
      matchedItem.forEach((item) => {
        activeInterface.push(item.substring(11));
      });
    }
    resolve(activeInterface);
  });
}

async function isActiveInterface(interfaceName) {
  let activeInterface = await getActiveInterface();
  return activeInterface.includes(interfaceName);
}
