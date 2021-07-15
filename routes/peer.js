var express = require("express");
var router = express.Router();

const peerController = require("../controllers/peerController");

router.get("/add/:interfaceName", peerController.peerCreate);

router.post("/add/:interfaceName", peerController.peerCreatePost);

module.exports = router;
