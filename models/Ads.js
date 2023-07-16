const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const AdsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    cta: { type: String },
    content: { type: String },
    status: { type: String, default: "Review" },
    ageup: { type: String },
    agedown: { type: String },
    gender: { type: String },
    creator: { type: ObjectId, ref: "User" },
    category: { type: String },
    tags: [{ type: String }],
    location: { type: String },
    type: { type: String },
    community: { type: ObjectId, ref: "Community" },
    budget: { type: String },
    contenttype: { type: String },
    display: { type: String },
    target: { type: String },
  },
  { timestamps: true }
);

AdsSchema.index({ title: "text" });

module.exports = mongoose.model("Ads", AdsSchema);
