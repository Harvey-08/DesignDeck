import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['canvas_invite', 'meeting_reminder', 'meeting_invite'],
    required: true
  },
  canvasId: {
    type: String
  },
  canvasName: {
    type: String
  },
  meetingId: {
    type: String
  },
  meetingTitle: {
    type: String
  },
  role: {
    type: String,
    enum: ['editor', 'viewer'],
    default: 'viewer'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'accepted', 'declined'],
    default: 'unread'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
