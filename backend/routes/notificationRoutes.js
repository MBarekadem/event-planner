import express from 'express';
import Notification from '../model/Notification.js';
import { verifyToken } from '../middleware/authMiddleware.js';  

const router = express.Router();

// Fonction utilitaire pour créer une notification
const createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      link
    });
    await notification.save();
    console.log(`✅ Notification créée: ${title} pour ${userId}`);
    return notification;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    return null;
  }
};

// Obtenir les notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30);
    
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Marquer comme lue
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true }
    );
    res.json({ message: 'OK' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur' });
  }
});

// Marquer toutes comme lues
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: 'OK' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur' });
  }
});

// Supprimer une notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'OK' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur' });
  }
});

// Route de test
router.post('/test', verifyToken, async (req, res) => {
  try {
    const notification = await createNotification(
      req.user.id,
      '🔔 Test notification',
      'Ceci est une notification de test',
      'info',
      '/'
    );
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
export { createNotification };