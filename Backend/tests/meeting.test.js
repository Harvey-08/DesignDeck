import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Meeting from '../models/Meeting.js';
import MeetingMessage from '../models/MeetingMessage.js';
import MeetingRecording from '../models/MeetingRecording.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTests() {
  console.log('--- STARTING WEBRTC MEETING SYSTEM INTEGRATION TESTS ---');
  
  const mongoURI = process.env.MONGO_URI;
  console.log(`[Test] Connecting to MongoDB: ${mongoURI}`);
  
  try {
    await mongoose.connect(mongoURI);
    console.log('[Test] MongoDB Connected successfully.');
    
    // Clear test data if existing
    const testMeetingId = 'test-meet-12345';
    await Meeting.deleteMany({ meetingId: testMeetingId });
    await MeetingMessage.deleteMany({ meetingId: testMeetingId });
    await MeetingRecording.deleteMany({ meetingId: testMeetingId });
    
    console.log('[Test] Cleared any existing test documents.');

    // 1. Test Meeting Schema Creation
    console.log('[Test] Validating Meeting model save...');
    const testUser = new mongoose.Types.ObjectId();
    const meeting = await Meeting.create({
      meetingId: testMeetingId,
      title: 'Sprint Planning Test',
      host: testUser,
      canvasId: 'test-canvas-abc',
      status: 'active',
      participants: [{ user: testUser, joinedAt: new Date() }],
      startedAt: new Date()
    });
    
    if (meeting.meetingId !== testMeetingId) throw new Error('Meeting creation ID mismatch');
    console.log('[Test] Meeting model validation: PASSED');

    // 2. Test Meeting Message Persistence
    console.log('[Test] Validating MeetingMessage model save...');
    const message = await MeetingMessage.create({
      meetingId: testMeetingId,
      sender: testUser,
      senderName: 'Test Developer',
      message: 'Hello WebRTC',
      timestamp: new Date()
    });
    
    if (message.message !== 'Hello WebRTC') throw new Error('Message text mismatch');
    console.log('[Test] MeetingMessage model validation: PASSED');

    // 3. Test Meeting Recording Schema
    console.log('[Test] Validating MeetingRecording model save...');
    const recording = await MeetingRecording.create({
      meetingId: testMeetingId,
      user: testUser,
      fileName: 'test-recording.webm',
      recordingUrl: 'https://res.cloudinary.com/test/video/upload/v1/test.webm',
      publicId: 'test_cloudinary_public_id',
      duration: 120,
      createdAt: new Date()
    });
    
    if (recording.duration !== 120) throw new Error('Recording duration mismatch');
    console.log('[Test] MeetingRecording model validation: PASSED');



    // Cleanup test data
    await Meeting.deleteMany({ meetingId: testMeetingId });
    await MeetingMessage.deleteMany({ meetingId: testMeetingId });
    await MeetingRecording.deleteMany({ meetingId: testMeetingId });
    console.log('[Test] Cleaned up all test records successfully.');
    
    console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('[Test Error] Test suite failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Test] Disconnected from MongoDB.');
  }
}

runTests();
