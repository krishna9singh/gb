const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const AdsSchema = new mongoose.Schema(
  {
    Adname: { type: String },
    status: { type: String, default: "review" },
    engagementrate: { type: String },
    amountspent: [{ type: String }],
    adveriserid: { type: ObjectId, ref: "Adveriser" },
    startdate: { type: String },
    enddate: { type: String },
    goal: { type: String },
    category: { type: String },
    cta: { type: String },
    ctalink: { type: String },
    content: [{ extension: { type: String }, name: { type: String } }],
    preferedsection: { type: String },
    tags: [{ type: String }],
    location: [{ type: String }],
    gender: { type: String },
    agerange: { type: String },
    maxage: { type: Number },
    minage: { type: Number },
    totalbudget: { type: Number },
    dailybudget: { type: Number },
    audiencesize: { type: Number },
    category: { type: String },
    transactions: [{ type: ObjectId, ref: "AdTransactions" }],
    adid: { type: String, required: true },
  },
  { timestamps: true }
);

AdsSchema.index({ title: "text" });

module.exports = mongoose.model("Ads", AdsSchema);
