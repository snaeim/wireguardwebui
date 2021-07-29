var express = require("express");
var router = express.Router();
const multer = require("multer");

const interfaceController = require("../controllers/interfaceController");

router.get("/", interfaceController.interfaceList);
router.get("/create", interfaceController.interfaceCreate);
router.get("/edit/:interfaceName", interfaceController.interfaceUpdate);
router.get("/delete/:interfaceName", interfaceController.interfaceDelete);
router.get("/import", interfaceController.interfaceImport);
router.get("/activate/:interfaceName", interfaceController.interfaceActivate);
router.get("/deactivate/:interfaceName", interfaceController.interfaceDeactivate);
router.get("/export", interfaceController.interfaceExport);

router.post("/create", interfaceController.interfaceCreatePost);
router.post("/edit/:interfaceName", interfaceController.interfaceUpdatePost);
router.post("/import", multer({ storage: multer.memoryStorage() }).single("configFile"), interfaceController.interfaceImportPost);
router.post("/export", interfaceController.interfaceExportPost)

module.exports = router;
