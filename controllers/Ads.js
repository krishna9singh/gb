const Ads = require("../models/Ads");
const User = require("../models/userAuth");
const Minio = require("minio");
const uuid = require("uuid").v4;
const sharp = require("sharp");
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

exports.newad = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    cta,
    age,
    gender,
    tags,
    location,
    type,
    community,
    budget,
    contenttype,
    display,
    target,
    ageup,
    agedown,
  } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "No user found!", success: false });
    } else {
      if (contenttype === "image") {
        const uuidString = uuid();
        const image = req.files[0];
        const bucketName = "ads";
        const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;

        await sharp(image.buffer)
          .jpeg({ quality: 60 })
          .toBuffer()
          .then(async (data) => {
            await minioClient.putObject(bucketName, objectName, data);
          })
          .catch((err) => {
            console.log(err.message, "-error");
          });

        const newAd = new Ads({
          title: title,
          creator: id,
          community: community,
          target: target,
          cta: cta,
          content: objectName,
          age: age,
          gender: gender,
          tags: tags,
          location: location,
          budget: budget,
          type: type,
          contenttype: contenttype,
          display: display,
          ageup: ageup,
          agedown: agedown,
        });
        await newAd.save();
        res.status(200).json({ success: true });
      } else {
        const { originalname, buffer, mimetype } = req.files[0];

        const size = buffer.byteLength;
        const bucketName = "posts";
        const objectName = `${Date.now()}_${uuidString}_${originalname}`;

        await minioClient.putObject(
          bucketName,
          objectName,
          buffer,
          size,
          mimetype
        );
        const newAd = new Ads({
          title: title,
          creator: id,
          community: community,
          cta: cta,
          content: objectName,
          age: age,
          gender: gender,
          tags: tags,
          location: location,
          budget: budget,
          type: type,
          contenttype: contenttype,
          post: objectName,
          target: target,
          ageup: ageup,
          agedown: agedown,
        });
        await newAd.save();
        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.getad = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "No user found!", success: false });
    } else {
      const birthDate = new Date(user.DOB);
      const ageDiff = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDiff);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      const ads = [];
      const ad = await Ads.aggregate([
        {
          $match: {
            tags: { $in: user.interest },
            // location: { $eq: user.location },
            status: { $eq: "Active" },
          },
        },
        {
          $lookup: {
            from: "users", // Assuming the collection name for users is "users"
            localField: "creator", // Assuming the field storing the creator ObjectId is "creator"
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $addFields: {
            creatorName: { $arrayElemAt: ["$creator.fullname", 0] },
            creatorProfilePic: { $arrayElemAt: ["$creator.profilepic", 0] },
            isverified: { $arrayElemAt: ["$creator.isverified", 0] },
          },
        },
        {
          $project: {
            creator: 0, // Exclude the creator field if needed
          },
        },
        { $sample: { size: 1 } },
      ]);
      for (let i = 0; i < ad.length; i++) {
        if (ad[i].ageup > age && ad[i].agedown < age) {
          ads.push(ad[i]);
        }
      }
      const content = [];
      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "ads",
          ads[i].content.toString(),
          60 * 60
        );
        content.push(dp);
      }
      const dps = [];
      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "images",
          ads[i].creatorProfilePic.toString(),
          60 * 60
        );
        dps.push(dp);
      }
      res.status(200).json({ ads, content, dps, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.getallads = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (user) {
      const content = [];
      const ads = await Ads.find({ creator: user._id });
      for (let i = 0; i < ads.length; i++) {
        const a = await generatePresignedUrl(
          "ads",
          ads[i].content.toString(),
          60 * 60
        );
        content.push(a);
      }
      res.status(200).json({ ads, content, success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
