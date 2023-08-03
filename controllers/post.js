const Post = require("../models/post");
const User = require("../models/userAuth");
const Community = require("../models/community");
const uuid = require("uuid").v4;
const Minio = require("minio");
const Topic = require("../models/topic");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");

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

//Photo posting
exports.createPhoto = async (req, res) => {
  const { userId, commId } = req.params;
  const { title, desc, tags } = req.body;
  const comm = await Community.findById(commId);
  const image = req.files[0];

  const topic = await Topic.find({ community: commId }).find({
    title: "Posts",
  });
  if (!image) {
    res.status(400).json({ message: "Must have one image", success: false });
  } else if (comm.creator.toString() !== userId) {
    res
      .status(400)
      .json({ message: "You cannot post in this community.", success: false });
  } else {
    try {
      const uuidString = uuid();
      if (image) {
        const bucketName = "posts";
        const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
        a1 = objectName;
        a2 = image.mimetype;

        await sharp(image.buffer)
          .jpeg({ quality: 50 })
          .toBuffer()
          .then(async (data) => {
            await minioClient.putObject(bucketName, objectName, data);
          })
          .catch((err) => {
            console.log(err.message, "-error");
          });

        const p = new Post({
          title,
          desc,
          community: commId,
          sender: userId,
          post: objectName,
          contenttype: image.mimetype,
          tags: tags,
        });
        const ne = await p.save();
        await Community.updateOne(
          { _id: commId },
          { $push: { posts: ne._id }, $inc: { totalposts: 1 } }
        );
        await Topic.updateOne(
          { _id: topic[0]._id },
          { $push: { posts: ne._id }, $inc: { postcount: 1 } }
        );

        res.status(200).json({ ne, success: true });
      }
    } catch (e) {
      res.status(500).json({ message: e.message, success: false });
    }
  }
};

//videos posting
exports.createVideo = async (req, res) => {
  const { userId, commId } = req.params;
  const { title, desc, tags } = req.body;
  const { originalname, buffer, mimetype } = req.files[0];
  const comm = await Community.findById(commId);
  const topic = await Topic.find({ community: commId }).find({
    title: "Posts",
  });

  const uuidString = uuid();
  if (!originalname) {
    res.status(400).json({ message: "Please upload a video", success: false });
  } else if (comm.creator.toString() !== userId) {
    res
      .status(400)
      .json({ message: "You cannot post in this community.", success: false });
  } else {
    try {
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
      const v = new Post({
        title,
        desc,
        community: commId,
        sender: userId,
        post: objectName,
        size: size,
        contenttype: mimetype,
        tags: tags,
      });
      const ne = await v.save();
      await Community.updateOne(
        { _id: commId },
        { $push: { posts: ne._id }, $inc: { totalposts: 1 } }
      );
      await Topic.updateOne(
        { _id: topic[0]._id },
        { $push: { posts: ne._id }, $inc: { postcount: 1 } }
      );

      res.status(200).json({ ne, success: true });
    } catch (e) {
      res.status(500).json({ message: e.message, success: false });
    }
  }
};

//get posts
exports.getpost = async (req, res) => {
  try {
    const posts = await Post.find({ sender: req.params.userId }).populate(
      "sender",
      "fullname profilepic"
    );
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//fetch userfeed acc to interests
exports.fetchfeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    const post = await Post.aggregate([
      { $match: { tags: { $in: user.interest } } },
      { $sample: { size: 50 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
          community: { $arrayElemAt: ["$community", 0] },
        },
      },
      {
        $addFields: {
          "community.members": {
            $map: {
              input: { $slice: ["$members", 0, 4] },
              as: "member",
              in: {
                _id: "$$member._id",
                fullname: "$$member.fullname",
                profilepic: "$$member.profilepic",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          status: 1,
          likedby: 1,
          likes: 1,
          dislike: 1,
          comments: 1,
          totalcomments: 1,
          tags: 1,
          view: 1,
          desc: 1,
          isverified: 1,
          post: 1,
          contenttype: 1,
          date: 1,
          sharescount: 1,
          sender: {
            _id: 1,
            fullname: 1,
            profilepic: 1,
          },
          community: {
            _id: 1,
            title: 1,
            dp: 1,
            members: 1,
            memberscount: 1,
            isverified: 1,
          },
        },
      },
    ]);

    const liked = [];
    for (let i = 0; i < post.length; i++) {
      if (
        post[i].likedby?.some((id) => id.toString() === user._id.toString())
      ) {
        liked.push(true);
      } else {
        liked.push(false);
      }
    }

    const subs = [];
    for (let k = 0; k < post.length; k++) {
      const coms = await Community.findById(post[k].community);
      if (coms.members.includes(user._id)) {
        subs.push("subscribed");
      } else {
        subs.push("unsubscribed");
      }
    }

    if (!post) {
      res.status(201).json({ message: "No post found", success: false });
    } else {
      const dps = [];
      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          post[i].community.dp.toString(),
          60 * 60
        );
        dps.push(a);
      }

      const urls = [];
      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          post[i].post.toString(),
          60 * 60
        );
        urls.push(a);
      }

      let current = [];
      const memdps = [];
      for (let i = 0; i < post.length; i++) {
        for (let j = 0; j < post[i].community.members.length; j++) {
          const a = await generatePresignedUrl(
            "images",
            post[i].community.members[j].profilepic.toString(),
            60 * 60
          );

          current.push(a);
        }

        memdps.push(current);

        current = [];
      }

      res.status(200).json({
        data: { urls, memdps, dps, post, subs, liked, success: true },
      });
    }
  } catch (err) {
    res.status(500).json({ message: err, success: false });
  }
};

//fetch more data
exports.fetchmore = async (req, res) => {
  try {
    const { userId, start } = req.params;
    const user = await User.findById(userId);
    const post = await Post.aggregate([
      { $match: { tags: { $in: user.interest } } },
      { $skip: { start } },
      { $limit: { size: 10 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
          community: { $arrayElemAt: ["$community", 0] },
        },
      },
      {
        $addFields: {
          "community.members": {
            $map: {
              input: { $slice: ["$members", 0, 4] },
              as: "member",
              in: {
                _id: "$$member._id",
                fullname: "$$member.fullname",
                profilepic: "$$member.profilepic",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          status: 1,
          likedby: 1,
          likes: 1,
          dislike: 1,
          comments: 1,
          totalcomments: 1,
          tags: 1,
          view: 1,
          desc: 1,
          isverified: 1,
          post: 1,
          contenttype: 1,
          date: 1,
          sharescount: 1,
          sender: {
            _id: 1,
            fullname: 1,
            profilepic: 1,
          },
          community: {
            _id: 1,
            title: 1,
            dp: 1,
            members: 1,
            memberscount: 1,
            isverified: 1,
          },
        },
      },
    ]);

    const subs = [];
    for (let k = 0; k < post.length; k++) {
      const coms = await Community.findById(post[k].community);
      if (coms.members.includes(user._id)) {
        subs.push(coms._id);
      } else {
        subs.push("unsubscribed");
      }
    }

    const liked = [];
    for (let i = 0; i < post.length; i++) {
      if (post[i].likedby.includes(user._id)) {
        liked.push(post[i]._id);
      } else {
        liked.push("not liked");
      }
    }

    if (!post) {
      res.status(201).json({ message: "No post found" });
    } else {
      const dps = [];
      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          post[i].community.dp.toString(),
          60 * 60
        );
        dps.push(a);
      }
      const urls = [];
      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          post[i].post.toString(),
          60 * 60
        );
        urls.push(a);
      }
      let current = [];
      const memdps = [];
      for (let i = 0; i < post.length; i++) {
        for (let j = 0; j < post[i].community.members.length; j++) {
          const a = await generatePresignedUrl(
            "images",
            post[i].community.members[j].profilepic.toString(),
            60 * 60
          );

          current.push(a);
        }

        memdps.push(current);

        current = [];
      }

      res.status(200).json({
        data: { urls, memdps, dps, post, subs, liked, success: true },
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//joined community content list
exports.joinedcom = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  const time = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const community = await Community.find({
      members: { $in: user._id },
    })
      .populate("members", "profilepic")
      .populate("creator", "fullname");
    if (!community) {
      res.status(404).json({ message: "No community found", success: false });
    } else {
      const dps = [];
      const urls = [];
      const posts = [];
      const liked = [];
      let current = [];
      const memdps = [];

      for (let i = 0; i < community.length; i++) {
        const post = await Post.find({
          community: community[i]._id,
          // createdAt: { $gte: time },
        })
          .populate("sender", "fullname")
          .sort({ createdAt: -1 })
          .limit(1);
        posts.push(post);

        for (let i = 0; i < community.length; i++) {
          for (let j = 0; j < community[i].members.length; j++) {
            const a = await generatePresignedUrl(
              "images",
              community[i].members[j].profilepic.toString(),
              60 * 60
            );
            current.push(a);
          }
          memdps.push(current);
          current = [];
        }

        if (post.length > 0) {
          for (let i = 0; i < posts.length; i++) {
            const like = post[i]?.likedby?.includes(user._id);
            if (like) {
              liked.push(true);
            } else {
              liked.push(false);
            }
          }
        } else {
          null;
        }

        for (let i = 0; i < post.length; i++) {
          const a = await generatePresignedUrl(
            "posts",
            post[i].post.toString(),
            60 * 60
          );
          urls.push(a);
        }
      }
      for (let i = 0; i < community.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          community[i].dp.toString(),
          60 * 60
        );
        dps.push(a);
      }

      res.status(200).json({
        data: { community, posts, dps, urls, liked, memdps },
        success: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch one post
exports.fetchonepost = async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findById(postId).populate(
    "sender",
    "fullname profilepic"
  );

  if (!post) {
    res.status(404).json({ message: "Post not found" });
  } else {
    try {
      const dp = await generatePresignedUrl(
        "images",
        post.sender.profilepic.toString(),
        60 * 60
      );
      const url = await generatePresignedUrl(
        "posts",
        post.post[0].toString(),
        60 * 60
      );
      res.status(200).json({ data: { post, url, dp } });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

//like a post
exports.likepost = async (req, res) => {
  const { userId, postId } = req.params;
  const user = await User.findById(userId);
  const post = await Post.findById(postId).populate("sender", "fullname");
  if (!post) {
    res.status(400).json({ message: "No post found" });
  } else if (post.likedby.includes(user._id)) {
    try {
      await Post.updateOne(
        { _id: postId },
        { $pull: { likedby: user._id }, $inc: { likes: -1 } }
      );
      await User.updateOne(
        { _id: userId },
        { $pull: { likedposts: post._id } }
      );
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  } else {
    try {
      await Post.updateOne(
        { _id: postId },
        { $push: { likedby: user._id }, $inc: { likes: 1 } }
      );
      await User.updateOne(
        { _id: userId },
        { $push: { likedposts: post._id } }
      );

      if (user._id.toString() !== post.sender._id.toString()) {
        const not = new Notification({
          senderId: user._id,
          recId: post.sender,
          text: user.fullname + " liked your post",
        });
        await not.save();
        await User.updateOne(
          { _id: not.recId },
          { $push: { notifications: not._id }, $inc: { notificationscount: 1 } }
        );
        console.log("noti");
      } else if (user._id.toString() === post.sender._id.toString()) {
        null;
        console.log("no noti");
      }
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

//dislike a post / not interested
exports.dislikepost = async (req, res) => {
  const { userId, postId } = req.params;
  const user = await User.findById(userId);
  const post = await Post.findById(postId);
  if (!post) {
    res.status(400).json({ message: "No post found" });
  }
  try {
    await Post.updateOne(
      { _id: postId },
      { $pull: { dislikedby: user._id }, $inc: { dsilike: 1 } }
    );
    await User.updateOne({ _id: userId }, { $pull: { likedposts: post._id } });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

//delete a post
exports.deletepost = async (req, res) => {
  const { userId, postId } = req.params;
  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ message: "Post not found" });
  } else if (post.sender.toString() !== userId) {
    res.status(400).json({ message: "You can't delete others post" });
  } else {
    await minioClient.removeObject("posts", post.post[1]);
    await Post.findByIdAndDelete(postId);
    res.status(200).json({ success: true });
  }
};

//get all posts
exports.getallposts = async (req, res) => {
  const { comId, userId } = req.params;
  try {
    const user = await User.findById(userId);
    const coms = await Community.findById(comId);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else if (!coms) {
      res.status(404).json({ message: "Community not found", success: false });
    } else if (!coms.members.includes(user._id)) {
      const posts = await Post.find({ community: coms._id }).populate(
        "sender",
        "fullname profilepic username isverified"
      );

      const comments = [];
      for (let i = 0; i < posts.length; i++) {
        const comment = await Comment.find({ postId: posts[i]._id.toString() })
          .limit(1)
          .sort({ createdAt: -1 });

        if (comment.length > 0) {
          comments.push(comment);
        } else {
          comments.push("no comment");
        }
      }
      const liked = [];
      const content = [];
      const dps = [];
      const tc = [];
      for (let i = 0; i < posts.length; i++) {
        const totalcomments = await Comment.find({ postId: posts[i]._id });
        tc.push(totalcomments.length);
      }
      for (let i = 0; i < posts.length; i++) {
        if (posts[i].likedby.includes(user._id)) {
          liked.push(posts[i]._id);
        } else {
          liked.push("not liked");
        }
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          posts[i].post.toString(),
          60 * 60
        );
        content.push(a);
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          posts[i].sender.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }
      res.status(203).json({
        posts,
        liked,
        dps,
        content,
        comments,
        tc,
        message: "You must join the community first!",
        success: true,
      });
    } else {
      const posts = await Post.find({ community: coms._id }).populate(
        "sender",
        "fullname profilepic username isverified"
      );

      const comments = [];
      for (let i = 0; i < posts.length; i++) {
        const comment = await Comment.find({ postId: posts[i]._id.toString() })
          .limit(1)
          .sort({ createdAt: -1 });

        if (comment.length > 0) {
          comments.push(comment);
        } else {
          comments.push("no comment");
        }
      }
      const liked = [];
      const content = [];
      const dps = [];
      const tc = [];
      for (let i = 0; i < posts.length; i++) {
        const totalcomments = await Comment.find({ postId: posts[i]._id });
        tc.push(totalcomments.length);
      }
      for (let i = 0; i < posts.length; i++) {
        if (posts[i].likedby.includes(user._id)) {
          liked.push(posts[i]._id);
        } else {
          liked.push("not liked");
        }
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          posts[i].post.toString(),
          60 * 60
        );
        content.push(a);
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          posts[i].sender.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }

      res
        .status(200)
        .json({ posts, liked, dps, content, comments, tc, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.test = async (req, res) => {
  const video = req.file;
  const outputFileName = "compressed_video.mp4";
  console.log(video);
  ffmpeg(req.file.buffer)
    .size("640x320")
    .aspect("4:3")
    .on("error", function (err) {
      console.log("An error occurred: " + err.message);
    })
    .on("end", function () {
      console.log("Processing finished !");
    });
};
