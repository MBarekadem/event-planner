import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../model/user.js";
import bcrypt from "bcryptjs";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    console.log("=== GOOGLE AUTH DEBUG ===");
    console.log("Token reçu:", token ? "OUI " : "NON ");
    console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "OUI " : "NON ");

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    console.log("Email Google:", email);

    let user = await User.findOne({ email });

    if (user) {
      if (user.role !== "organisateur") {
        return res.status(403).json({
          message: "Accès refusé — seuls les organisateurs peuvent se connecter via Google.",
        });
      }
    } else {
      user = await User.create({
        firstname: name?.split(" ")[0] || "Utilisateur",
lastname: name?.split(" ").slice(1).join(" ") || ".",
        email,
        googleId: sub,
        image: picture || "",
        role: "organisateur",
        status: "en_attente",
      });
      console.log("Nouvel utilisateur créé ");
    }

    const appToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("JWT généré ");
    res.status(200).json({ user, 
  token: appToken,
  needsPassword: !user.hasAppPassword });

  } catch (err) {
    console.error("=== ERREUR GOOGLE AUTH ===");
    console.error("Message:", err.message);  // ← copiez cette ligne ici
    res.status(401).json({ message: "Google auth failed", detail: err.message });
  }
};

export const setAppPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(req.user.id, {
      password: hashedPassword,
      hasAppPassword: true
    });

    res.status(200).json({ message: "Mot de passe créé avec succès !" });

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
};