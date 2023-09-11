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
const Advertiser = require("../models/Advertiser");

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

//genrate a random id
function generateUniqueID() {
  let advertiserID;
  advertiserID = Math.floor(100000000 + Math.random() * 900000000);

  return advertiserID.toString();
}

exports.checkaccount = async (req, res) => {
  const { phone, email, password } = req.body;
  try {
    let advertiser;
    if (email && password) {
      advertiser = await Advertiser.findOne({ email, password });
    } else if (phone) {
      advertiser = await Advertiser.findOne({ phone });
    } else {
      return res.status(400).json({
        message: "Invalid request. Please provide email, password, or phone.",
        success: false,
      });
    }

    if (advertiser) {
      const dp = await generatePresignedUrl(
        "images",
        advertiser.image.toString(),
        60 * 60
      );
      return res
        .status(200)
        .json({ message: "Advertiser exists", advertiser, dp, success: true });
    } else {
      return res
        .status(404)
        .json({ message: "Advertiser not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.createadvacc = async (req, res) => {
  const {
    firstname,
    lastname,
    city,
    state,
    landmark,
    email,
    phone,
    type,
    pincode,
    address,
    organizationname,
    pan,
    gst,
  } = req.body;
  try {
    const advid = generateUniqueID();
    const uuidString = uuid();
    const image = req.file;
    const bucketName = "images";
    const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
    console.log(req.body, req.file);
    const adv = new Advertiser({
      firstname,
      lastname,
      city,
      state,
      landmark,
      email,
      phone,
      type,
      pincode,
      address,
      advertiserid: advid,
      image: objectName,
      organizationname,
      pan,
      gst,
    });

    await sharp(image.buffer)
      .jpeg({ quality: 60 })
      .toBuffer()
      .then(async (data) => {
        await minioClient.putObject(bucketName, objectName, data);
      })
      .catch((err) => {
        console.log(err.message, "-error");
      });

    await adv.save();
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.newad = async (req, res) => {
  const { id } = req.params;
  const {
    adname,
    startdate,
    enddate,
    cta,
    ctalink,
    goal,
    headline,
    desc,
    preferedsection,
    tags,
    location,
    agerange,
    maxage,
    minage,
    totalbudget,
    dailybudget,
    estaudience,
    category,
    contenttype,
  } = req.body;
  try {
    const user = await Advertiser.findById(id);
    const uuidString = uuid();
    if (!user) {
      res.status(404).json({ message: "No user found!", success: false });
    } else {
      if (contenttype === "image") {
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
          adname,
          startdate,
          enddate,
          cta,
          ctalink,
          goal,
          headline,
          desc,
          preferedsection,
          tags,
          location,
          agerange,
          maxage,
          minage,
          totalbudget,
          dailybudget,
          estaudience,
          category,
          content: objectName,
          adveriserid: id,
        });
        await newAd.save();
        res.status(200).json({ success: true });
      } else {
        const { originalname, buffer, mimetype } = req.files[0];

        const size = buffer.byteLength;
        const bucketName = "ads";
        const objectName = `${Date.now()}_${uuidString}_${originalname}`;

        await minioClient.putObject(
          bucketName,
          objectName,
          buffer,
          size,
          mimetype
        );
        const newAd = new Ads({
          adname,
          startdate,
          enddate,
          cta,
          ctalink,
          goal,
          headline,
          desc,
          preferedsection,
          tags,
          location,
          agerange,
          maxage,
          minage,
          totalbudget,
          dailybudget,
          estaudience,
          category,
          content: objectName,
          adveriserid: id,
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
      const birthdateString = user.DOB;
      const [birthDay, birthMonth, birthYear] = birthdateString
        .split("/")
        .map(Number);

      // Get the current date
      const currentDate = new Date();

      // Get the current day, month, and year
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.getMonth() + 1; // Month is zero-based
      const currentYear = currentDate.getFullYear();

      // Calculate the age
      let age = currentYear - birthYear;
      if (
        currentMonth < birthMonth ||
        (currentMonth === birthMonth && currentDay < birthDay)
      ) {
        age--; // Adjust age if birthday hasn't occurred yet this year
      }

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
    const user = await Advertiser.findById(id);
    if (user) {
      const content = [];
      const ads = await Ads.find({ adveriserid: user._id });
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
