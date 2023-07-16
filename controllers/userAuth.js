const User = require("../models/userAuth");
const jwt = require("jsonwebtoken");
const sng = require("@sendgrid/mail");
const { errorHandler } = require("../helpers/dbErrorHandler");
const Minio = require("minio");
const Test = require("../models/test");
const uuid = require("uuid").v4;
const sharp = require("sharp");
const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.site",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

//function to ge nerate a presignedurl of minio
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

//signup via email
exports.signup = async (req, res) => {
  sng.setApiKey(process.env.SENDGRID_API_KEY);
  const otp = Math.floor(10000 + Math.random() * 90000);
  const { email } = await req.body;
  const newUser = new User({ email, otp });
  const oldUser = await User.findOne({ email });
  if (oldUser) {
    try {
      const otp = Math.floor(10000 + Math.random() * 90000);
      const token = jwt.sign({ email }, process.env.JWT_ACCOUNT_ACTIVATION, {
        expiresIn: "10m",
      });
      const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Hi, Your Otp for Grovyo",
        html: `<p>Your OTP is</p> <h1>${otp}</h1> and <br/>${token}
      <hr/>
      <p>This email may contain sensitive information<p/>
      <p>${process.env.CLIENT_URL}<p/>`,
      };
      oldUser.otp = otp;
      await oldUser.save();
      sng.send(emailData);
      return res.status(200).json({ message: "User exists but Otp Sent" });
    } catch (err) {
      res.status(400).json({ message: "Access Denied" });
    }
  }
  try {
    const token = jwt.sign({ email }, process.env.JWT_ACCOUNT_ACTIVATION, {
      expiresIn: "10m",
    });
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Hi, Your Otp for Grovyo",
      html: `<p>Your OTP is</p> <h1>${otp}</h1> and <br/>${token}
      <hr/>
      <p>This email may contain sensitive information<p/>
      <p>${process.env.CLIENT_URL}<p/>`,
    };

    await newUser.save();
    sng.send(emailData).then(() => {
      return res
        .status(200)
        .json({ message: `Email has been sent to ${email}.` });
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

//signup via mobile
exports.signupmobile = async (req, res) => {
  const { phone } = req.body;

  try {
    const user = await User.findOne({ phone: phone });
    if (user) {
      const a = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60 * 24
      );
      res.status(200).json({
        message: "user exists signup via mobile success",
        user,
        userexists: true,
        a,
      });
    } else if (!user) {
      res.status(200).json({
        message: "signup via mobile success",
        userexists: false,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.signout = (req, res) => {
  res.clearCookie("t");
  res.json({ message: "signout Success" });
};

exports.verify = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }
    if (user.otp === otp) {
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("t", token, { expire: new Date() + 9999 });
      const { _id, email, role } = user;
      return res.status(200).json({ token, user: { email, role, _id } });
    } else {
      return res.status(400).json({ message: "Invalid Otp" });
    }
  } catch (err) {
    res.status(400).json({ message: "Access Denied" });
  }
};

exports.filldetails = async (req, res, next) => {
  const { originalname, buffer } = req.file;
  const { fullname, username, phone, DOB } = req.body;
  const { userId } = req.params;
  const uuidString = uuid();
  try {
    // Save image to Minio
    const bucketName = "images";
    const objectName = `${Date.now()}_${uuidString}_${originalname}`;
    await minioClient.putObject(bucketName, objectName, buffer, buffer.length);

    const image = await User.findByIdAndUpdate(
      { _id: userId },
      {
        $set: {
          fullname: fullname,
          profilepic: objectName,
          username: username,
          phone: phone,
          DOB: DOB,
        },
      },
      { new: true }
    );

    res.status(200).json(image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.filldetailsphone = async (req, res) => {
  const { originalname, buffer } = req.file;
  const { fullname, username, gender, DOB } = req.body;
  const { userId } = req.params;
  const uuidString = uuid();
  const user = await User.findById(userId);

  if (userId === user._id.toString()) {
    try {
      // Save image to Minio
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${originalname}`;
      const updated = await User.findByIdAndUpdate(
        { _id: userId },
        {
          $set: {
            fullname: fullname,
            profilepic: objectName,
            username: username,
            gender: gender,
            DOB: DOB,
          },
        },
        { new: true }
      );
      await minioClient.putObject(
        bucketName,
        objectName,
        buffer,
        buffer.length
      );

      {
        /*  console.log(user.profilepic);
      const a = await generatePresignedUrl(
        "images",
        user.profilepic,
        60 * 60 * 24
      );*/
      }
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  } else {
    res.status(500).json({ message: "Id mismatch" });
  }
};

exports.returnuser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic,
        60 * 60 * 24
      );
      res.status(200).json({ user, dp, success: true });
    } else {
      res.status(404).json({ message: e.message, success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.interests = async (req, res) => {
  try {
    const userId = req.params.userId;
    const interest = req.body.data;
    await User.findByIdAndUpdate(
      { _id: userId },
      { $addToSet: { interest: interest } },
      { new: true }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: "Failed to update user interests" });
      });
  } catch (err) {
    return res.status(400).json({
      error: errorHandler(err),
    });
  }
};

exports.gettest = async (req, res) => {
  const { id } = req.params;
  try {
    // Find the image metadata in MongoDB
    const image = await Test.findById(id);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Get image file from Minio
    const [bucketName, objectName] = image.location.split("/");
    const stream = await minioClient.getObject(bucketName, objectName);

    // Set response headers
    res.setHeader("Content-Type", stream.headers["content-type"]);
    res.setHeader("Content-Length", stream.headers["content-length"]);
    res.setHeader("Content-Disposition", `inline; filename="${image.name}"`);

    // Pipe the file stream to the response
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.test = async (req, res) => {
  console.log(req.file, "file", req.files);
  console.log(req.body.name, "body");
};

//admin login
exports.adminlogin = async (req, res) => {
  const { number } = req.body;
  try {
    const user = await User.findOne({ phone: number });
    if (user) {
      res.status(200).json({
        message: "user exists signup via mobile success",
        user,
        userexists: true,
      });
    }
    if (!user) {
      const user = new User({ phone: number, role: "admin" });

      await user.save();
      res.status(200).json({
        message: "signup via mobile success",
        user,
        userexists: false,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.checkusername = async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });
  try {
    if (user) {
      return res.status(200).json({
        message: "username exists",
        userexists: true,
        success: true,
      });
    } else {
      return res.status(200).json({
        message: "username does not exist",
        userexists: false,
        success: true,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.createnewaccount = async (req, res) => {
  const { fullname, gender, username, number, bio, image, interest } = req.body;
  const uuidString = uuid();
  const image1 = req.file;

  const interestsArray = [interest];
  const interestsString = interestsArray[0];

  const individualInterests = interestsString.split(",");

  if (image === "male-1.png" || image === "female-1.png") {
    try {
      const user = new User({
        fullname: fullname,
        username: username,
        phone: number,
        profilepic: image,
        desc: bio,
        interest: individualInterests,
        gender: gender,
      });
      await user.save();

      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );

      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  } else {
    try {
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${image1.originalname}`;
      a1 = objectName;
      a2 = image1.mimetype;

      await sharp(image1.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-Sharp error");
        });

      const user = new User({
        fullname: fullname,
        username: username,
        phone: number,
        profilepic: objectName,
        desc: bio,
        interest: individualInterests,
        gender: gender,
      });
      await user.save();
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );

      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  }
};
{
  /* */
}
