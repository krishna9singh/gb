const express = require("express");
const router = express.Router();
const stripe = require("stripe")(
  "sk_test_51NAGrZSEXlKwVDBNhya5wiyCmbRILf14f1Bk2uro1IMurrItZFsnmn7WNA0I5Q3RMnCVui1ox5v9ynOg3CGrFkHu00hLvIqqS1"
);

router.post("/testing", async (req, res) => {
  try {
    const pi = await stripe.paymentIntents.create({
      amount: req.body.topicprice * 100,
      currency: "INR",
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.json({ sec: pi.client_secret });
  } catch (e) {
    console.log(e.message);
  }
});

module.exports = router;
