var express = require("express");
var router = express.Router();
const multer = require("multer");

const interfaceController = require("../controllers/interfaceController");

router.get("/", interfaceController.interfaceList);
router.get("/create", interfaceController.interfaceCreate);
router.get("/edit/:interfaceName", interfaceController.interfaceUpdate);
router.get("/delete/:interfaceName", interfaceController.interfaceDelete);
router.get("/import", interfaceController.interfaceImport);

router.post("/create", interfaceController.interfaceCreatePost);
router.post("/edit/:interfaceName", interfaceController.interfaceUpdatePost);
router.post("/import", multer({ storage: multer.memoryStorage() }).single("configFile"), interfaceController.interfaceImportPost);

module.exports = router;
