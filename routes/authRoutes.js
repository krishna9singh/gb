const express = require("express");
const router = express.Router();
const formidable = require("express-formidable");
const multer = require("multer");

//imports
const {
  signup,
  verify,
  signout,
  filldetails,
  interests,
  test,
  gettest,
  signupmobile,
  filldetailsphone,
  adminlogin,
  returnuser,
  checkusername,
  createnewaccount,
  createnew,
  checkemail,
  createnewaccountemail,
  getdetails,
  postdetails,
} = require("../controllers/userAuth");
const { userbyId } = require("../controllers/user");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/signup", signup);
router.post("/signup-mobile", signupmobile);
router.post("/verify", verify);
router.get("/signout", signout);
router.get("/getdetails/:id", returnuser);
router.post("/checkusername", checkusername);
router.post("/v1/createnewaccount", upload.single("image"), createnewaccount);
router.post(
  "/v1/createnewaccountemail",
  upload.single("image"),
  createnewaccountemail
);
router.post("/v1/checkacc", checkemail);
router.post("/filldetailsemail/:userId", upload.single("image"), filldetails);

router.post(
  "/filldetailsphone/:userId",
  upload.single("image"),
  filldetailsphone
);
router.post("/interest/:userId", interests);
router.post("/adminlogin007", adminlogin);
router.get("/:id", gettest);
router.post("/test", upload.any(), test);
router.get("/getdetails/:id", getdetails);
router.post("/postdetails/:id", postdetails);

router.param("userId", userbyId);

module.exports = router;
