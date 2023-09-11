const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const AdvertiserSchema = new mongoose.Schema(
  {
    firstname: { type: String },
    lastname: { type: String },
    type: {
      type: String,
      default: "Individual",
      enum: ["Individual", "Organization"],
    },
    email: { type: String, unique: true },
    phone: { type: String, unique: true },
    organizationname: { type: String },
    pan: { type: String },
    panphoto: { type: String },
    gst: { type: String },
    gstphoto: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: Number },
    landmark: { type: String },
    ads: [{ type: ObjectId, ref: "Ads" }],
    currentbalance: { type: Number },
    transactions: [{ type: ObjectId, ref: "AdTransactions" }],
    popularity: { type: String },
    idstatus: { type: String, default: "active" },
    totalconversions: { type: String },
    amountspent: [
      {
        date: { type: String, default: Date.now().toString() },
        amount: { type: String },
      },
    ],
    verificationstatus: { type: String, default: "unverified" },
    advertiserid: { type: String, unique: true },
    image: { type: String },
    taxinfo: { type: String },
  },
  { timestamps: true }
);

AdvertiserSchema.index({ title: "text" });

module.exports = mongoose.model("Advertiser", AdvertiserSchema);
