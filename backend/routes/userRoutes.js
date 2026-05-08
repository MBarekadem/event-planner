import express from "express";
import crypto from "crypto";              // ✅ ES Module (natif Node)
import nodemailer from "nodemailer";       // ✅ ES Module
import bcrypt from "bcrypt";              // ✅ ES Module (pas dans reset)
import {
  registerUser, getUser, loginUser, updateUser,
  addToAdore, removeFromAdore, getAdore,
  getUserById, updateCIN
} from "../controller/userController.js";
import upload from "../middleware/upload_image.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import User from "../model/user.js";      // ✅ Ton modèle Mongoose

const router = express.Router();

// ── Routes existantes ─────────────────────────────
router.post("/register", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "patente", maxCount: 1 }
]), registerUser);
router.post("/login", loginUser);
router.get("/allusers", getUser);
router.post("/like", verifyToken, addToAdore);
router.delete("/remove", verifyToken, removeFromAdore);
router.get("/adore/:userId", getAdore);
router.get("/:id", getUserById);
router.put("/update", verifyToken, upload.single("image"), updateUser);
router.put("/update-cin", verifyToken, updateCIN);

// ── FORGOT PASSWORD ───────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Aucun compte trouvé avec cet email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = Date.now() + 3600000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "eventplanner315@gmail.com",
        pass: "glsc ataw icdj ldws",
      },
    });
    const resetUrl = `http://localhost:5000/api/users/reset-password-page/${resetToken}`;

    await transporter.sendMail({
      from: `"Event Planner" <eventplanner315@gmail.com>`,
      to: user.email,
      subject: "🔐 Réinitialisation de votre mot de passe",
      html: `
        <div style="font-family:Arial;max-width:500px;margin:auto;padding:30px">
          <h2 style="color:#9C27B0">Réinitialisation du mot de passe</h2>
          <p>Bonjour <b>${user.firstname}</b>,</p>
          <p>Cliquez sur le lien ci-dessous. Il expire dans <b>1 heure</b>.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;
            background:linear-gradient(135deg,#B832C5,#9C27B0);color:white;
            border-radius:30px;text-decoration:none;font-weight:bold;margin:20px 0">
            Réinitialiser le mot de passe
          </a>
          <p style="color:#888;font-size:12px">Si vous n'avez pas demandé ceci, ignorez cet email.</p>
        </div>`,
    });

    res.json({ message: "Email de réinitialisation envoyé !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── RESET PASSWORD ────────────────────────────────
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Lien invalide ou expiré" });
    }

    user.password = await bcrypt.hash(password, 10);  // ✅ bcrypt importé en haut
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Mot de passe mis à jour avec succès !" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});
router.get("/reset-password-page/:token", (req, res) => {
  const { token } = req.params;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Nouveau mot de passe</title>
      <style>
        body { font-family: Arial; max-width: 400px; margin: 60px auto; padding: 20px; }
        h2 { color: #9C27B0; }
        input { width: 100%; padding: 12px; margin: 8px 0 16px;
                border: 1px solid #ddd; border-radius: 8px;
                box-sizing: border-box; font-size: 14px; }
        button { width: 100%; padding: 14px;
                 background: linear-gradient(135deg, #B832C5, #9C27B0);
                 color: white; border: none; border-radius: 30px;
                 font-size: 15px; font-weight: bold; cursor: pointer; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .msg { padding: 12px; border-radius: 8px; margin-top: 12px; text-align: center; }
        .ok  { background: #e8f5e9; color: #2e7d32; }
        .err { background: #ffebee; color: #c62828; }
      </style>
    </head>
    <body>
      <h2>🔐 Nouveau mot de passe</h2>
      <p style="color:#666;font-size:14px">Choisissez un nouveau mot de passe sécurisé.</p>
      <input type="password" id="p1" placeholder="Nouveau mot de passe" />
      <input type="password" id="p2" placeholder="Confirmer le mot de passe" />
      <button id="btn" onclick="reset()">Réinitialiser</button>
      <div id="msg"></div>
      <script>
        async function reset() {
          const p1 = document.getElementById('p1').value;
          const p2 = document.getElementById('p2').value;
          const msg = document.getElementById('msg');
          const btn = document.getElementById('btn');
          if (p1.length < 6) {
            msg.className = 'msg err';
            msg.textContent = 'Minimum 6 caractères'; return;
          }
          if (p1 !== p2) {
            msg.className = 'msg err';
            msg.textContent = 'Les mots de passe ne correspondent pas'; return;
          }
          btn.disabled = true;
          btn.textContent = 'En cours...';
          const res = await fetch('/api/users/reset-password/${token}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: p1 })
          });
          const data = await res.json();
          if (res.ok) {
            msg.className = 'msg ok';
            msg.textContent = '✅ Mot de passe modifié ! Retournez sur l\\'application pour vous connecter.';
          } else {
            msg.className = 'msg err';
            msg.textContent = data.message || 'Erreur';
            btn.disabled = false;
            btn.textContent = 'Réinitialiser';
          }
        }
      </script>
    </body>
    </html>
  `);
});

export default router;