import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  canvasId: {
    type: String,
    required: true
  },
  shareLink: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'scheduled', 'cancelled'],
    default: 'active'
  },
  scheduledAt: {
    type: Date
  },
  invitedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  notifiedBefore: {
    type: Boolean,
    default: false
  },
  participants: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, { timestamps: true });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
