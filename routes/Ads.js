const express = require("express");
const { newad, getad, getallads } = require("../controllers/Ads");
const router = express.Router();
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/newad/:id", upload.any(), newad);
router.get("/getad/:id", getad);
router.get("/getallads/:id", getallads);

module.exports = router;
