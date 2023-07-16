const express = require("express");
const router = express.Router();

const {
  create,
  deletetopic,
  getmessages,
  newmessage,
  hiddenmes,
  initiatetopic,
  jointopic,
} = require("../controllers/topic");

router.post("/createtopic/:userId/:comId", create);

router.delete("/deletetopic/:topicId", deletetopic);

router.get("/getmessages/:topicId/:userId", getmessages);

router.get("/hiddenmes/:comId/:id", hiddenmes);

router.post("/newmessage/:topicId", newmessage);

router.post("/initiatetopic/:topicId", initiatetopic);

router.post("/jointopic/:topicId/:id/:comId/:orderId", jointopic);

module.exports = router;
