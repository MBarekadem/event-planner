import express from "express";
import Stripe from "stripe";

const router = express.Router();

const stripe = new Stripe("sk_test_51TNBjcRqjNGfrecsK0kC8PkziXuHYfccmwjjKtp6t2WIqcEPr5rzLlAOMyJVS5lpeLXMq3PFhjbgj9vXHFldLPvx00LcOuv3ls");

router.post("/", async (req, res) => {
  try {
    console.log("✅ PAY API HIT");

    const { amount, locationId } = req.body;

    if (!amount || !locationId) {
      return res.status(400).json({ message: "amount et locationId requis" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      payment_method_types: ["card"],
      // ✅ Ajoute cette ligne — permet la confirmation côté client
      metadata: {
        locationId: locationId,
        amount: amount,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("ERREUR PAY:", error);
    res.status(500).json({ error: error.message });
  }
});
// Dans votre fichier de routes pay.js, ajoutez cette route

export default router;