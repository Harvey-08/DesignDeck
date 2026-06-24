import mongoose from 'mongoose';

const meetingRecordingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  recordingUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MeetingRecording = mongoose.model('MeetingRecording', meetingRecordingSchema);
export default MeetingRecording;
