const Conversation = require("../models/conversation");
const Message = require("../models/message");
const uuid = require("uuid").v4;
const Minio = require("minio");
const User = require("../models/userAuth");

const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.site",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

//function to generate a presignedurl of minio
async function generatePresignedUrl(bucketName, objectName, expiry = 604800) {
  try {
    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      expiry
    );
    return presignedUrl;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to generate presigned URL");
  }
}

exports.newconv = async (req, res) => {
  const conv = new Conversation({
    members: [req.body.first, req.body.second],
  });
  const convf = await Conversation.findOne({
    members: { $all: [req.body.first, req.body.second] },
  });

  try {
    if (convf) {
      res.status(203).json({ success: false, covId: convf._id });
    } else {
      const savedConv = await conv.save();
      res.status(200).json(savedConv);
    }
  } catch (e) {
    res.status(500).json(e);
  }
};

//check if conversation exists
exports.convexists = async (req, res) => {
  const conv = await Conversation.findOne({
    members: { $all: [req.body.first, req.body.second] },
  });
  try {
    if (conv) {
      res.status(200).json({ success: true, covId: conv._id });
    } else {
      res.status(203).json({ success: false });
    }
  } catch (e) {
    res.status(500).json(e.message);
  }
};

exports.getallconv = async (req, res) => {
  try {
    const conv = await Conversation.find({
      members: req.params.userId,
    }).populate("members", "fullname profilepic isverified");

    //check latest message
    let message = [];
    for (let i = 0; i < conv.length; i++) {
      const m = await Message.find({ conversationId: conv[i]._id })
        .sort({ createdAt: -1 })
        .limit(1);
      message.push(...m);
    }

    const receiver = [];
    //checking the reciever
    for (let i = 0; i < conv.length; i++) {
      for (let j = 0; j < conv[i].members.length; j++) {
        if (conv[i].members[j]._id.toString() !== req.params.userId) {
          const receiving = conv[i].members[j];
          receiver.push(receiving);
        }
      }
    }

    //for genrating prsignurl of reciever
    const receiverdp = [];
    for (let i = 0; i < conv.length; i++) {
      for (let j = 0; j < conv[i].members.length; j++) {
        if (conv[i].members[j]._id.toString() !== req.params.userId) {
          const a = await generatePresignedUrl(
            "images",
            conv[i].members[j].profilepic.toString(),
            60 * 60
          );
          receiverdp.push(a);
        }
      }
    }

    res.status(200).json({ data: { conv, receiver, receiverdp, message } });
  } catch (e) {
    res.status(500).json(e.message);
  }
};

exports.getoneconv = async (req, res) => {
  const { convId } = req.params;
  const time = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const conv = await Message.find({
      conversationId: convId,
      hidden: { $size: 0 },
      $or: [
        { dissapear: false },
        { createdAt: { $gt: time }, dissapear: true },
      ],
    })
      .limit(10)
      .sort({ createdAt: -1 });

    let content = [];
    for (let i = 0; i < conv.length; i++) {
      if (conv[i].image) {
        const a = await generatePresignedUrl(
          "messages",
          conv[i].image.toString(),
          60 * 60
        );
        content.push(a);
      } else if (conv[i].video) {
        const a = await generatePresignedUrl(
          "messages",
          conv[i].video.toString(),
          60 * 60
        );
        content.push(a);
      } else if (conv[i].audio) {
        const a = await generatePresignedUrl(
          "messages",
          conv[i].audio.toString(),
          60 * 60
        );
        content.push(a);
      } else {
        content.push("Nothing");
      }
    }

    const reversedConv = conv.reverse();
    const reversedCont = content.reverse();
    if (!conv) {
      res.status(404).json({ message: "Conversation not found" });
    } else {
      res.status(200).json({ reversedConv, reversedCont });
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

exports.gettoken = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "No user found" });
    } else {
      const token = await user.token;
      res.status(200).json(token);
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};
