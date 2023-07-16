const express = require("express");
const router = express.Router();

const {
  editbio,
  fetchmedia,
  fetchproducts,
  getproduct,
  getcommunities,
  getbio,
  getprosite,
  fetchallglimpse,
} = require("../controllers/prosite");

router.post("/edituser/:userId", editbio);
router.get("/fetchmedia/:userId", fetchmedia);
router.get("/fetchproduct/:userId", fetchproducts);
router.get("/getproduct/:productId", getproduct);
router.get("/getcommunities/:userId", getcommunities);
router.get("/getbio/:userId", getbio);
router.get("/getprosite/:userId", getprosite);
router.get("/fetchallglimpse/:userId", fetchallglimpse);

module.exports = router;
