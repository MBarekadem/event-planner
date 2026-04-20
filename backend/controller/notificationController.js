import Notification from "../model/Notification.js";

// 🔧 Fonction utilitaire pour corriger les liens
const fixNotificationLink = (link) => {
  if (!link) return link;
  
  // Corriger les liens de ressources : /les_ressources/:id → /RessourceDetail/:id
  if (link.match(/\/les_ressources\/[a-fA-F0-9]{24}/)) {
    return link.replace('/les_ressources/', '/RessourceDetail/');
  }
  
  // Corriger les liens de demandes prestataire
  if (link === '/demandes' || link === '/demande') {
    return '/mes-demandes';
  }
  
  // Corriger les liens de réservations organisateur
  if (link === '/reservations' || link === '/mes-reservations-old') {
    return '/mes-reservations';
  }
  
  return link;
};

// 🔔 CREATE NOTIFICATION (réutilisable partout)
export const createNotification = async (
  userId,
  title,
  message,
  type = "info",
  link = null
) => {
  try {
    // ✅ Corriger le lien AVANT de le sauvegarder
    const correctedLink = fixNotificationLink(link);
    
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      link: correctedLink
    });

    await notification.save();
    console.log(`🔔 Notification créée pour ${userId}: ${title} → ${correctedLink || 'pas de lien'}`);
    return notification;
  } catch (error) {
    console.error("Erreur création notification:", error);
  }
};

// 📥 GET toutes les notifications d'un user (avec unreadCount pour le Navbar)
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