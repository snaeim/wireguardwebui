var express = require("express");
var router = express.Router();

const adminController = require("../controllers/adminController");

router.get("/login", adminController.adminLogin);
router.post("/login", adminController.adminLoginPost);
router.get("/logout", adminController.adminLogout);

module.exports = router;
