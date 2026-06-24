import fs from 'fs';
import Meeting from '../models/Meeting.js';
import MeetingMessage from '../models/MeetingMessage.js';
import MeetingRecording from '../models/MeetingRecording.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

// Create a meeting
export const createMeeting = async (req, res) => {
  const { title, canvasId, scheduledAt, invitedUsers } = req.body;
  if (!title || !canvasId) {
    return res.status(400).json({ message: 'Title and canvasId are required' });
  }

  try {
    const meetingId = `meet-${Math.random().toString(36).substring(2, 10)}`;
    const shareLink = `${req.protocol}://${req.get('host')}/canvas/${canvasId}?meetingId=${meetingId}`;

    const isScheduled = !!scheduledAt;

    const newMeeting = await Meeting.create({
      meetingId,
      title,
      host: req.user._id,
      canvasId,
      shareLink,
      status: isScheduled ? 'scheduled' : 'active',
      scheduledAt: isScheduled ? new Date(scheduledAt) : null,
      invitedUsers: invitedUsers || [],
      participants: isScheduled ? [] : [{ user: req.user._id, joinedAt: new Date() }],
      startedAt: isScheduled ? null : new Date()
    });

    // Create notifications for invited users
    if (invitedUsers && invitedUsers.length > 0) {
      for (const inviteeId of invitedUsers) {
        await Notification.create({
          recipient: inviteeId,
          sender: req.user._id,
          type: 'meeting_invite',
          meetingId: newMeeting.meetingId,
          meetingTitle: newMeeting.title,
          status: 'unread'
        });
      }
    }

    res.status(201).json(newMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ message: 'Error creating meeting', error: error.message });
  }
};

// Get meeting details
export const getMeeting = async (req, res) => {
  const { meetingId } = req.params;

  try {
    const meeting = await Meeting.findOne({ meetingId })
      .populate('host', 'name email')
      .populate('participants.user', 'name email');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Error getting meeting:', error);
    res.status(500).json({ message: 'Error fetching meeting', error: error.message });
  }
};
// Get all meetings (history)
export const getMeetingHistory = async (req, res) => {
  try {
    // Find all meeting invitations that this user has accepted
    const acceptedNotifications = await Notification.find({
      recipient: req.user._id,
      type: 'meeting_invite',
      status: 'accepted'
    });

    const acceptedMeetingIds = acceptedNotifications.map(n => n.meetingId);

    // Fetch meetings where:
    // 1. User is the host
    // 2. OR User has accepted the invite
    // 3. OR User has already participated in it
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
        { meetingId: { $in: acceptedMeetingIds } }
      ]
    })
      .populate('host', 'name email')
      .populate('participants.user', 'name email')
      .sort({ startedAt: -1 });

    res.json(meetings);
  } catch (error) {
    console.error('Error getting meeting history:', error);
    res.status(500).json({ message: 'Error fetching meeting history', error: error.message });
  }
};
// End meeting
export const endMeeting = async (req, res) => {
  const { meetingId } = req.params;

  try {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    await meeting.save();

    // Notify all participants in the meeting room that the meeting has ended
    const io = req.app.get('socketio');
    if (io) {
      io.to(`meeting:${meetingId}`).emit('meeting-ended');
    }

    res.json({
      meeting
    });
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({ message: 'Error ending meeting', error: error.message });
  }
};

// Save a recording to Cloudinary & Metadata to Mongo
export const saveRecording = async (req, res) => {
  const { meetingId } = req.params;
  const { duration } = req.body; // Duration in seconds

  if (!req.file) {
    return res.status(400).json({ message: 'No video recording file provided' });
  }

  const filePath = req.file.path;
  console.log(`[Cloudinary] Starting upload of temp file: ${filePath}`);

  try {
    console.log(`[Cloudinary] Eagerly transcoding video recording to MP4...`);
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'designdeck_meetings',
      eager: [
        { format: 'mp4', video_codec: 'h264' }
      ],
      eager_async: false
    });

    // Delete temporary local file
    fs.unlinkSync(filePath);
    console.log(`[Cloudinary] Upload complete. Deleted temp file: ${filePath}`);

    let recordingUrl = '';
    if (result.eager && result.eager.length > 0) {
      recordingUrl = result.eager[0].secure_url;
      console.log(`[Cloudinary] Using eagerly transcoded MP4 URL: ${recordingUrl}`);
    } else if (result.secure_url) {
      recordingUrl = result.secure_url.replace(/\.[^/.]+$/, ".mp4");
      console.log(`[Cloudinary] Fallback to dynamic MP4 URL: ${recordingUrl}`);
    }

    // Create recording metadata in MongoDB
    const newRecording = await MeetingRecording.create({
      meetingId,
      user: req.user._id,
      fileName: req.file.originalname || `recording-${Date.now()}.webm`,
      recordingUrl,
      publicId: result.public_id,
      duration: duration ? Number(duration) : 0,
      createdAt: new Date()
    });

    res.status(201).json(newRecording);
  } catch (error) {
    console.error('Error uploading recording to Cloudinary:', error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ message: 'Error uploading recording to Cloudinary', error: error.message });
  }
};

// Get recordings for a meeting
export const getRecordings = async (req, res) => {
  const { meetingId } = req.params;

  try {
    const recordings = await MeetingRecording.find({ meetingId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: 'Error fetching recordings', error: error.message });
  }
};

// Get chat messages for a meeting
export const getMessages = async (req, res) => {
  const { meetingId } = req.params;

  try {
    const messages = await MeetingMessage.find({ meetingId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching meeting messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

// Start a scheduled meeting
export const startScheduledMeeting = async (req, res) => {
  const { meetingId } = req.params;

  try {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the meeting host can start the meeting' });
    }

    meeting.status = 'active';
    meeting.startedAt = new Date();
    // Add host as first participant
    if (!meeting.participants.some(p => p.user.toString() === req.user._id.toString())) {
      meeting.participants.push({ user: req.user._id, joinedAt: new Date() });
    }
    await meeting.save();

    res.json(meeting);
  } catch (error) {
    console.error('Error starting scheduled meeting:', error);
    res.status(500).json({ message: 'Error starting scheduled meeting', error: error.message });
  }
};

// Cancel a meeting
export const cancelMeeting = async (req, res) => {
  const { meetingId } = req.params;

  try {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the meeting host can cancel the meeting' });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    // Notify invitees of cancellation
    for (const inviteeId of meeting.invitedUsers || []) {
      await Notification.create({
        recipient: inviteeId,
        sender: req.user._id,
        type: 'meeting_reminder',
        meetingId: meeting.meetingId,
        meetingTitle: `CANCELLED: ${meeting.title}`,
        status: 'unread'
      });
    }

    res.json({ message: 'Meeting cancelled successfully', meeting });
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    res.status(500).json({ message: 'Error cancelling meeting', error: error.message });
  }
};

// Invite someone to an existing meeting
export const inviteToMeeting = async (req, res) => {
  const { meetingId } = req.params;
  const { userId, usernameOrEmail } = req.body;

  try {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    let targetUserId = userId;

    if (!targetUserId && usernameOrEmail) {
      const emailQuery = usernameOrEmail.toLowerCase().trim();
      const nameQuery = usernameOrEmail.trim();

      const user = await User.findOne({
        $or: [
          { email: emailQuery },
          { name: { $regex: new RegExp(`^${nameQuery}$`, 'i') } }
        ]
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found in database. Please verify name/email.' });
      }
      targetUserId = user._id;
    }

    if (!targetUserId) {
      return res.status(400).json({ message: 'User identifier or email/username is required' });
    }

    const alreadyInvited = meeting.invitedUsers.some(uid => uid.toString() === targetUserId.toString());
    if (!alreadyInvited) {
      meeting.invitedUsers.push(targetUserId);
      await meeting.save();
    }

    // Create notification
    await Notification.create({
      recipient: targetUserId,
      sender: req.user._id,
      type: 'meeting_invite',
      meetingId: meeting.meetingId,
      meetingTitle: meeting.title,
      status: 'unread'
    });

    res.json({ message: 'Invitation sent successfully', meeting });
  } catch (error) {
    console.error('Error inviting to meeting:', error);
    res.status(500).json({ message: 'Error inviting to meeting', error: error.message });
  }
};
