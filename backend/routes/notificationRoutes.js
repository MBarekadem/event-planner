import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  fixOldNotifications
} from '../controller/notificationController.js';

const router = express.Router();

router.get('/', verifyToken, getUserNotifications);
router.put('/:id/read', verifyToken, markAsRead);
router.put('/read-all', verifyToken, markAllAsRead);
router.delete('/:id', verifyToken, deleteNotification);

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