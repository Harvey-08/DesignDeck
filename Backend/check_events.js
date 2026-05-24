import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkEvents() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const eventCount = await db.collection('events').countDocuments();
        console.log(`--- Events Diagnostic ---`);
        console.log(`Total events in DB: ${eventCount}`);

        if (eventCount > 0) {
            const latestEvents = await db.collection('events').find().sort({ createdAt: -1 }).limit(5).toArray();
            console.log('Latest 5 events:', JSON.stringify(latestEvents.map(e => ({
                id: e._id,
                canvasId: e.canvasId,
                type: e.type,
                updateSize: e.update.buffer.byteLength,
                createdAt: e.createdAt
            })), null, 2));
        }
        console.log('-------------------------');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkEvents();
