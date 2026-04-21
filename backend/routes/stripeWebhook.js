import express from "express";
import Stripe from "stripe";
import Location from "../model/location.js";
import { generateInvoice } from "../utils/invoice.js";

const router = express.Router();

//const stripe = new Stripe("sk_test_51TNBjcRqjNGfrecsK0kC8PkziXuHYfccmwjjKtp6t2WIqcEPr5rzLlAOMyJVS5lpeLXMq3PFhjbgj9vXHFldLPvx00LcOuv3ls");

// 🔑 Ton secret webhook (depuis Stripe Dashboard ou stripe listen)
//const endpointSecret = "whsec_346aac35a72d94c5c40455e3bf2796773f361b939128e284e97d0b94909d9cdb";

router.post(
    "/webhook",
    express.raw({ type: "application/json" }), // ⚠️ raw body obligatoire pour vérifier la signature
    async (req, res) => {
        console.log("✅ WEBHOOK HIT");

        const sig = req.headers["stripe-signature"];
        let event;

        try {
            // ✅ Vérification de signature (production)
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error("❌ Webhook signature invalide:", err.message);
            // ⚠️ En mode test local sans Stripe CLI, décommente la ligne suivante et commente le try/catch :
            // event = JSON.parse(req.body);
            return res.status(400).json({ message: `Webhook Error: ${err.message}` });
        }

        // ── Paiement réussi ──────────────────────────────────────────
        if (event.type === "payment_intent.succeeded") {
            const paymentIntent = event.data.object;

            const locationId = paymentIntent.metadata?.locationId;
            const amount = paymentIntent.metadata?.amount;

            if (!locationId) {
                console.warn("⚠️ Webhook: locationId manquant dans metadata");
                return res.json({ received: true });
            }

            try {
                const location = await Location.findById(locationId)
                    .populate("organisateur", "firstname lastname email numTel")
                    .populate({
                        path: "resource",
                        populate: { path: "prestataire", select: "firstname lastname email numTel" }
                    })
                    .populate("event", "title");

                if (!location) {
                    console.warn("⚠️ Webhook: location non trouvée:", locationId);
                    return res.json({ received: true });
                }

                // Éviter double traitement
                if (location.payer === "payer") {
                    console.log("ℹ️ Déjà payé, webhook ignoré");
                    return res.json({ received: true });
                }

                location.payer = "payer";
                location.paymentDate = new Date();

                // Générer la facture
                const invoicePath = generateInvoice(location, amount);
                location.invoice = invoicePath;

                await location.save();

                console.log("✅ Paiement enregistré + facture générée:", invoicePath);

            } catch (err) {
                console.error("❌ Erreur traitement webhook paiement:", err);
            }
        }

        // ── Paiement échoué ──────────────────────────────────────────
        if (event.type === "payment_intent.payment_failed") {
            const paymentIntent = event.data.object;
            console.warn("❌ Paiement échoué pour locationId:", paymentIntent.metadata?.locationId);
        }

        res.json({ received: true });
    }
);

export default router;