const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const AdTransactionsSchema = new mongoose.Schema(
  {
    transactionid: { type: String, required: true },
    amount: { type: Number },
    advertiserid: { type: ObjectId, ref: "Advertiser" },
    adid: { type: ObjectId, ref: "Ads" },
  },
  { timestamps: true }
);

AdTransactionsSchema.index({ title: "text" });

module.exports = mongoose.model("AdTransactions", AdTransactionsSchema);
