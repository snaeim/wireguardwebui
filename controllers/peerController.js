const Netmask = require("netmask").Netmask;
const exec = require("child_process").exec;
const isCidr = require("is-cidr");

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
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
    const nextIpAddress = await getNextIpAddress(interfaceInfo);
    res.render("addPeer", { nextIpAddress: nextIpAddress });
  } catch (err) {
    res.render("addPeer", { nextIpAddress: err });
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
  var interfaceInfo = db.get("interfaces").find({ name: req.params.interfaceName }).value();

  const inuseIpAddress = await getInuseIpAddress(interfaceInfo);
  const reqIpAddress = req.body.address + "/32";

  try {
    if (!isCidr.v4(reqIpAddress)) {
      throw new Error("Address is not valid");
    }
    if (inuseIpAddress.includes(req.body.address)) {
      throw new Error("Address is inused.");
    }

    var keys = await shellExec("./script.sh getKeys").catch(console.error("Can't run bash script"));
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
    const nextIpAddress = await getNextIpAddress(interfaceInfo);

    res.render("addPeer", { nextIpAddress: nextIpAddress, newClientConfig: newClientConfig });
  } catch (err) {
    const nextIpAddress = await getNextIpAddress(interfaceInfo);
    res.render("addPeer", { nextIpAddress: nextIpAddress, err: err });
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
  console.log(addressInfo);

  return new Promise((resolve, reject) => {
    addressInfo.forEach((ip) => {
      if (!inuseIpAddress.includes(ip) && nextIpAddress === null) {
        nextIpAddress = ip;
      }
    });

    if (nextIpAddress === null) {
      reject("No IP address available");
    } else {
      resolve(nextIpAddress);
    }
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
