import Notification from "../model/Notification.js";
import axios from "axios";
import User from "../model/user.js";

const fixNotificationLink = (link) => {
  if (!link) return link;
  if (link.match(/\/les_ressources\/[a-fA-F0-9]{24}/)) {
    return link.replace('/les_ressources/', '/RessourceDetail/');
  }
  if (link === '/demandes' || link === '/demande') return '/mes-demandes';
  if (link === '/reservations' || link === '/mes-reservations-old') return '/mes-reservations';
  return link;
};

// 🔥 Non-bloquant
const sendEmailViaN8n = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user?.email) return;

    const BASE_URL = 'http://localhost:5173';

    // ✅ Éviter la duplication si le lien est déjà une URL complète
    const fullLink = payload.link
      ? payload.link.startsWith('http')
        ? payload.link
        : `${BASE_URL}${payload.link}`
      : BASE_URL;

    const response = await axios.post(
      'http://localhost:5678/webhook/send-email',
      { email: user.email, ...payload, link: fullLink },
      { timeout: 5000 }
    );
    console.log(`📧 Email envoyé à ${user.email} → ${response.status}`);
  } catch (error) {
    console.error('❌ Webhook n8n échoué:', error.message, error.code);
  }
};
export const createNotification = async (userId, title, message, type = "info", link = null) => {
  try {
    const correctedLink = fixNotificationLink(link);

    const notification = new Notification({ userId, title, message, type, link: correctedLink });
    await notification.save();
    console.log(`✅ Notification créée pour ${userId}: ${title} → ${correctedLink || 'pas de lien'}`);

    // 🔥 Email via n8n — ne bloque pas
    sendEmailViaN8n(userId, { title, message, type, link: correctedLink });

    return notification;
  } catch (error) {
    console.error("Erreur création notification:", error);
  }
};

// ... reste du fichier inchangé

//  GET toutes les notifications d'un user (avec unreadCount pour le Navbar)
export const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // ✅ unreadCount attendu par le Navbar
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 MARQUER comme lu
export const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notif);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 MARQUER toutes comme lues
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );

    res.json({ message: "Toutes les notifications sont marquées comme lues" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑 DELETE une notification
export const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(req.params.id);

    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification supprimée" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔧 CORRIGER LES ANCIENNES NOTIFICATIONS (à exécuter une fois)
export const fixOldNotifications = async (req, res) => {
  try {
    // Trouver toutes les notifications avec le mauvais lien
    const oldNotifications = await Notification.find({
      $or: [
        { link: { $regex: /\/les_ressources\// } },
        { link: '/demandes' },
        { link: '/reservations' }
      ]
    });

    let fixed = 0;
    for (const notif of oldNotifications) {
      const oldLink = notif.link;
      const newLink = fixNotificationLink(notif.link);

      if (oldLink !== newLink) {
        notif.link = newLink;
        await notif.save();
        fixed++;
        console.log(`✅ Notification corrigée: ${oldLink} → ${newLink}`);
      }
    }

    res.json({
      message: `${fixed} notifications corrigées`,
      fixed
    });
  } catch (error) {
    console.error("Erreur correction notifications:", error);
    res.status(500).json({ message: error.message });
  }
};