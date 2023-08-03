const express = require("express");
const {
  newconv,
  getallconv,
  getoneconv,
  gettoken,
  convexists,
} = require("../controllers/conversation");
const router = express.Router();

//new conversation private
router.post("/newconv", newconv);

//get latest message of conversations
router.get("/getconv/:userId", getallconv);

//get a conversation
router.get("/getoneconv/:convId/:id", getoneconv);

//check a conversation if it exists
router.post("/checkconv", convexists);

//get token of notification
router.get("/gettoken/:id", gettoken);

module.exports = router;
