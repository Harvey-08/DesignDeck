import Notification from '../models/Notification.js';
import Canvas from '../models/Canvas.js';
import Meeting from '../models/Meeting.js';
import mongoose from 'mongoose';

// Get notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 });

    const notificationsWithStatus = await Promise.all(
      notifications.map(async (n) => {
        const nObj = n.toObject();
        if (nObj.meetingId) {
          const meeting = await Meeting.findOne({ meetingId: nObj.meetingId });
          if (meeting) {
            nObj.meetingStatus = meeting.status;
          } else {
            nObj.meetingStatus = 'ended';
          }
        }
        return nObj;
      })
    );

    res.json(notificationsWithStatus);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await Notification.findOne({ _id: id, recipient: req.user._id });
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notif.status = 'read';
    await notif.save();
    res.json(notif);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

// Accept invite
export const acceptInvite = async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await Notification.findOne({ _id: id, recipient: req.user._id });
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notif.type === 'canvas_invite') {
      // Find the canvas
      const canvas = await Canvas.findOne({ canvasId: notif.canvasId });
      if (!canvas) {
        return res.status(404).json({ message: 'Canvas not found' });
      }

      // Check if already a member
      const alreadyMember = canvas.members.some(m => m.user.toString() === req.user._id.toString());
      const isOwner = canvas.owner && canvas.owner.toString() === req.user._id.toString();

      if (!alreadyMember && !isOwner) {
        // Add user to members list
        canvas.members.push({
          user: req.user._id,
          role: notif.role || 'viewer'
        });
        await canvas.save();
      }

      // Mark invitation notification as accepted
      notif.status = 'accepted';
      await notif.save();

      return res.json({ message: 'Canvas invitation accepted successfully', canvasId: notif.canvasId });
    } else if (notif.type === 'meeting_invite') {
      // Mark meeting invitation as accepted
      notif.status = 'accepted';
      await notif.save();

      return res.json({ message: 'Meeting invitation accepted successfully', meetingId: notif.meetingId });
    } else {
      return res.status(400).json({ message: 'Invalid notification type' });
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ message: 'Error accepting invitation', error: error.message });
  }
};

// Decline invite
export const declineInvite = async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await Notification.findOne({ _id: id, recipient: req.user._id });
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notif.status = 'declined';
    await notif.save();

    // Send a notification back to the meeting host/sender if it's a meeting invite
    if (notif.type === 'meeting_invite') {
      await Notification.create({
        recipient: notif.sender, // host/sender
        sender: req.user._id, // decliner user
        type: 'meeting_reminder',
        meetingId: notif.meetingId,
        meetingTitle: `${req.user.name} declined meeting: ${notif.meetingTitle}`,
        status: 'unread'
      });
    }

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({ message: 'Error declining invitation', error: error.message });
  }
};
