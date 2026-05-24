import Canvas from '../models/Canvas.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { docs } = require('y-websocket/bin/utils');
import jwt from 'jsonwebtoken';

// @desc    Create a new canvas
// @route   POST /api/canvas/create
// @access  Private
export const createCanvas = async (req, res) => {
    const { name } = req.body;

    try {
        const canvasId = Math.random().toString(36).substring(2, 9); // Simple ID generation

        const canvas = await Canvas.create({
            canvasId,
            name: name || 'Untitled Canvas',
            owner: req.user._id,
            groupId: canvasId, // Root of a new family
        });

        res.status(201).json(canvas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Join/Get canvas metadata
// @route   GET /api/canvas/:id
// @access  Private
export const getCanvas = async (req, res) => {
    try {
        const canvas = await Canvas.findOne({ canvasId: req.params.id })
            .populate('owner', 'name email')
            .populate('members.user', 'name email');

        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // --- GUEST BYPASS ---
        if (req.params.id.startsWith('guest-')) {
            return res.json(canvas);
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, login required for this canvas' });
        }

        // Check permissions (Owner or Member)
        const isOwner = canvas.owner?._id.equals(req.user._id);
        const isMember = canvas.members.some(m => m.user?._id.equals(req.user._id));

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to view this canvas' });
        }

        res.json(canvas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all canvases for current user
// @route   GET /api/canvas/my-canvases
// @access  Private
export const getMyCanvases = async (req, res) => {
    try {
        const canvases = await Canvas.find({
            $and: [
                {
                    $or: [
                        { owner: req.user._id },
                        { 'members.user': req.user._id }
                    ]
                },
                {
                    // A canvas is a "Master" if it has no parentId
                    $or: [
                        { parentId: { $exists: false } },
                        { parentId: null },
                        { parentId: "" }
                    ]
                }
            ]
        }).sort({ updatedAt: -1 });
        res.json(canvases);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Invite user to canvas
// @route   POST /api/canvas/:id/invite
// @access  Private (Owner only)
export const inviteUser = async (req, res) => {
    const { email, role } = req.body; // role: 'editor' or 'viewer'

    try {
        const canvas = await Canvas.findOne({ canvasId: req.params.id });

        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // Only owner can invite
        if (!canvas.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only owner can invite collaborators' });
        }

        const userToInvite = await User.findOne({ email });
        if (!userToInvite) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (canvas.owner.equals(userToInvite._id)) {
            return res.status(400).json({ message: 'User is already the owner' });
        }

        // Check if already a member
        const alreadyMember = canvas.members.some(m => m.user.equals(userToInvite._id));
        if (alreadyMember) {
            return res.status(400).json({ message: 'User is already a member' });
        }

        canvas.members.push({
            user: userToInvite._id,
            role: role || 'viewer'
        });

        await canvas.save();

        res.json({ message: 'User invited successfully', canvas });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a canvas
// @route   DELETE /api/canvas/:id
// @access  Private (Owner only)
export const deleteCanvas = async (req, res) => {
    try {
        const canvas = await Canvas.findOne({ canvasId: req.params.id });

        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // --- GUEST BYPASS ---
        // For non-guest canvases, ensure ownership
        if (!req.params.id.startsWith('guest-')) {
            if (!req.user || (canvas.owner && canvas.owner.toString() !== req.user._id.toString())) {
                return res.status(403).json({ message: 'Not authorized to delete this canvas' });
            }
        }

        // If it's a master canvas (no parentId), perform cascading delete
        if (!canvas.parentId) {
            console.log(`[API] Master canvas deletion detected. Performing cascading delete for groupId: ${canvas.groupId}`);
            await Canvas.deleteMany({ groupId: canvas.groupId || canvas.canvasId });
            res.json({ message: 'Master canvas and all its branches deleted successfully' });
        } else {
            console.log(`[API] Branch deletion detected for canvasId: ${req.params.id}`);
            await Canvas.deleteOne({ canvasId: req.params.id });
            res.json({ message: 'Branch deleted successfully' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle favorite status
// @route   PUT /api/canvas/:id/favorite
// @access  Private
export const toggleFavorite = async (req, res) => {
    try {
        const canvas = await Canvas.findOne({ canvasId: req.params.id });
        if (!canvas) return res.status(404).json({ message: 'Canvas not found' });

        // Ensure user is owner or member
        const isOwner = canvas.owner.toString() === req.user._id.toString();
        const isMember = canvas.members.some(m => {
            const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
            return memberId === req.user._id.toString();
        });

        if (!isOwner && !isMember) return res.status(403).json({ message: 'Not authorized' });

        // For simplicity, we'll store favorites in a metadata field or just toggle a boolean if we add it to schema
        // Let's assume we add a 'isFavorite' field to the schema or just use metadata
        canvas.isFavorite = !canvas.isFavorite;
        await canvas.save();
        res.json(canvas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update canvas name
// @route   PUT /api/canvas/:id/name
// @access  Private
export const updateCanvasName = async (req, res) => {
    const { name } = req.body;
    const { id } = req.params;

    console.log(`[API] Attempting to update canvas name. ID: ${id}, New Name: ${name}`);

    try {
        const canvas = await Canvas.findOne({ canvasId: id });

        if (!canvas) {
            console.log(`[API] Canvas ${id} not found in DB`);
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // --- GUEST BYPASS ---
        // Allow anyone to rename a guest canvas
        if (!id.startsWith('guest-')) {
            if (!req.user) {
                return res.status(401).json({ message: 'Login required to rename this canvas' });
            }

            // Only owner can update name
            const isOwner = canvas.owner && canvas.owner.toString() === req.user._id.toString();
            if (!isOwner) {
                return res.status(403).json({ message: 'Only owner can update canvas name' });
            }
        }

        canvas.name = name;
        const updatedCanvas = await canvas.save();

        console.log(`[API] Canvas name updated successfully: ${updatedCanvas.name}`);
        res.json(updatedCanvas);
    } catch (error) {
        console.error('[API] Update Canvas Name Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove member from canvas
// @route   DELETE /api/canvas/:id/members/:userId
// @access  Private (Owner only)
export const removeMember = async (req, res) => {
    try {
        const canvas = await Canvas.findOne({ canvasId: req.params.id });

        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // Only owner can remove members
        if (canvas.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only owner can remove collaborators' });
        }

        // Filter out the member robustly (handles both populated and unpopulated user ids)
        canvas.members = canvas.members.filter(m => {
            const memberId = m.user && m.user._id ? m.user._id.toString() : m.user.toString();
            return memberId !== req.params.userId;
        });
        await canvas.save();

        res.json({ message: 'Member removed successfully', canvas });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Branch a canvas
// @route   POST /api/canvas/:id/branch
// @access  Private
export const branchCanvas = async (req, res) => {
    try {
        const sourceCanvas = await Canvas.findOne({ canvasId: req.params.id });

        if (!sourceCanvas) {
            return res.status(404).json({ message: 'Source canvas not found' });
        }

        const { eventId } = req.body || {};
        let targetDocumentState = sourceCanvas.documentState;
        let eventFilter = { canvasId: sourceCanvas.canvasId };

        console.log(`[Branching] Branching canvas ${sourceCanvas.canvasId}. Target eventId: ${eventId || 'None (Live)'}`);

        // US4: If an eventId is specified, we are branching from a historical rollback point
        if (eventId) {
            const targetEvent = await Event.findOne({ _id: eventId, canvasId: sourceCanvas.canvasId });
            if (targetEvent) {
                console.log(`[Branching] Found target historical event! Reverting branch's initial documentState to this event.`);
                targetDocumentState = targetEvent.update;
                // Safest chronological slice in MongoDB is by intrinsic ObjectId
                eventFilter._id = { $lte: targetEvent._id };
            } else {
                console.log(`[Branching] Target historical event ${eventId} NOT FOUND. Defaulting to live state.`);
            }
        }

        const newCanvasId = Math.random().toString(36).substring(2, 9);
        const finalId = req.params.id.startsWith('guest-') ? `guest-${newCanvasId}` : newCanvasId;

        const branchedCanvas = await Canvas.create({
            canvasId: finalId,
            name: `Branch of ${sourceCanvas.name}`,
            owner: sourceCanvas.owner || req.user?._id,
            members: sourceCanvas.members,
            documentState: targetDocumentState,
            groupId: sourceCanvas.groupId || sourceCanvas.canvasId,
            parentId: sourceCanvas.canvasId,
        });

        // US4: Inherit Event History from Parent up to the strict monotonic branch point
        const parentEvents = await Event.find(eventFilter).sort({ createdAt: 1 });
        console.log(`[Branching] Duplicating ${parentEvents.length} events into the new branch ${finalId}`);

        if (parentEvents.length > 0) {
            // Duplicate the events with the new branch's canvasId
            const branchedEvents = parentEvents.map(ev => ({
                canvasId: finalId,
                update: ev.update,
                type: ev.type,
                name: ev.name,
                user: ev.user,
                createdAt: ev.createdAt // Keep original timestamps
            }));

            await Event.insertMany(branchedEvents);
        }

        res.status(201).json(branchedCanvas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all branches in a group
// @route   GET /api/canvas/:id/branches
// @access  Private
export const getRelatedBranches = async (req, res) => {
    console.log('>>> [API ENTRY] getRelatedBranches called for ID:', req.params.id);
    try {
        const canvas = await Canvas.findOne({ canvasId: req.params.id }).lean();
        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // The absolute master ID is the groupId, or the canvasId itself if no groupId exists
        const rootMasterId = canvas.groupId || (canvas.parentId ? canvas.parentId : canvas.canvasId);

        let branches = await Canvas.find({
            $or: [
                { groupId: rootMasterId },
                { canvasId: rootMasterId }
            ]
        })
            .select('canvasId name updatedAt createdAt owner groupId parentId')
            .sort({ createdAt: 1 })
            .lean();

        // Map through branches to add isMaster flag and ensure self is included if missing
        let processedBranches = branches.map(b => ({
            ...b,
            createdAt: b.createdAt || b.updatedAt || new Date(), // Robust fallback
            isMaster: (!b.parentId || b.parentId === "")
        }));

        console.log(`[DEBUG] getRelatedBranches for ${req.params.id}: returning ${processedBranches.length} branches`);
        processedBranches.forEach(pb => {
            console.log(`  - Branch: ${pb.name}, isMaster: ${pb.isMaster}, createdAt: ${pb.createdAt}`);
        });

        // Ensure the source/master canvas itself is included in the list (fallback)
        const hasSelf = processedBranches.some(b => b.canvasId === canvas.canvasId);
        if (!hasSelf) {
            processedBranches.push({
                canvasId: canvas.canvasId,
                name: canvas.name,
                updatedAt: canvas.updatedAt,
                createdAt: canvas.createdAt,
                owner: canvas.owner,
                groupId: canvas.groupId,
                parentId: canvas.parentId,
                isMaster: (!canvas.parentId || canvas.parentId === "")
            });
        }

        res.json(processedBranches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// US1: Get timeline events for replay
export const getTimeline = async (req, res) => {
    try {
        const { id: canvasId } = req.params;

        // Check if canvas exists
        const canvas = await Canvas.findOne({ canvasId });
        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // Fetch all events for this canvas, sorted by time
        const events = await Event.find({ canvasId }).sort({ createdAt: 1 });

        res.status(200).json({
            canvasId,
            totalEvents: events.length,
            events: events.map(e => ({
                id: e._id,
                update: e.update.toString('base64'), // Send as base64 for JSON transport
                timestamp: e.createdAt,
                type: e.type,
                name: e.name // Include tag name for milestones
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// US7: Tag current timeline state
export const tagTimelineEvent = async (req, res) => {
    try {
        const { id: canvasId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Tag name is required' });
        }

        const canvas = await Canvas.findOne({ canvasId });
        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        if (!canvas.documentState) {
            return res.status(400).json({ message: 'Canvas has no state to tag' });
        }

        // Save a new milestone event with the current canvas state
        const milestoneEvent = await Event.create({
            canvasId,
            update: canvas.documentState,
            type: 'milestone',
            name,
            user: req.user?._id
        });

        res.status(201).json({
            message: 'Timeline tagged successfully',
            event: {
                id: milestoneEvent._id,
                name: milestoneEvent.name,
                timestamp: milestoneEvent.createdAt,
                type: milestoneEvent.type
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// US7: Remove a tag from the timeline
export const removeTimelineEventTag = async (req, res) => {
    try {
        const { id: canvasId, eventId } = req.params;

        const event = await Event.findOne({ _id: eventId, canvasId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // We can safely delete purely milestone events
        if (event.type === 'milestone') {
            await Event.findByIdAndDelete(eventId);
            res.status(200).json({ message: 'Tag removed successfully' });
        } else {
            return res.status(400).json({ message: 'Can only remove milestone tags' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// US4: Rollback Canvas
export const rollbackCanvas = async (req, res) => {
    try {
        const { id: canvasId } = req.params;
        const { eventId } = req.body;

        if (!eventId) {
            return res.status(400).json({ message: 'Target eventId is required' });
        }

        const canvas = await Canvas.findOne({ canvasId });
        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // Only owner or members can rollback
        const isOwner = canvas.owner && req.user && canvas.owner.toString() === req.user._id.toString();
        const isMember = canvas.members && req.user && canvas.members.some(m => m.user.toString() === req.user._id.toString());
        const isGuestCanvas = canvasId.startsWith('guest-');

        if (!isGuestCanvas && !isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to rollback this canvas' });
        }

        const targetEvent = await Event.findOne({ _id: eventId, canvasId });
        if (!targetEvent) {
            return res.status(404).json({ message: 'Target event not found' });
        }

        // 1. Delete all events that occurred strictly *after* the target event
        await Event.deleteMany({
            canvasId,
            createdAt: { $gt: targetEvent.createdAt }
        });

        // 2. Update the main DocumentState to the target event's state
        canvas.documentState = targetEvent.update;
        await canvas.save();

        // 3. FORCE EVICT THE YDOC FROM WEBSOCKET SERVER MEMORY
        // If we don't do this, y-websocket will just serve the cached "future" state 
        // to re-connecting clients, entirely circumventing our database rollback.
        const cachedDoc = docs.get(canvasId);
        if (cachedDoc) {
            console.log(`[Rollback] Evicting cached YDoc for canvas ${canvasId}`);
            // Forcefully close all websockets connected to this specific document
            for (const [conn] of cachedDoc.conns) {
                conn.close();
            }
            // Remove the document from the y-websocket memory map
            docs.delete(canvasId);
        }

        res.status(200).json({
            message: 'Canvas rolled back successfully',
            updatedState: canvas.documentState
        });

    } catch (error) {
        console.error('Rollback Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// US1/US5: Generate RBAC Invite Link
export const generateLink = async (req, res) => {
    try {
        const { id: canvasId } = req.params;
        const { role } = req.body; // 'viewer' or 'editor'

        const canvas = await Canvas.findOne({ canvasId });
        if (!canvas) return res.status(404).json({ message: 'Canvas not found' });

        if (!canvas.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only owner can generate invite links' });
        }

        const token = jwt.sign(
            { canvasId, role: role || 'viewer' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({ token, role: role || 'viewer' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// US1/US5: Join via RBAC Invite Link
export const joinViaLink = async (req, res) => {
    try {
        const { id: canvasId } = req.params;
        const { token } = req.body;

        if (!token) return res.status(400).json({ message: 'Invite token is required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.canvasId !== canvasId) {
            return res.status(400).json({ message: 'Invalid invite link for this canvas' });
        }

        const canvas = await Canvas.findOne({ canvasId });
        if (!canvas) return res.status(404).json({ message: 'Canvas not found' });

        // Don't modify owner
        if (canvas.owner.equals(req.user._id)) {
            return res.status(200).json({ message: 'You are the owner', canvasId });
        }

        const memberIndex = canvas.members.findIndex(m => m.user.equals(req.user._id));

        if (memberIndex === -1) {
            canvas.members.push({ user: req.user._id, role: decoded.role });
            await canvas.save();
        } else if (canvas.members[memberIndex].role !== decoded.role && decoded.role === 'editor') {
            // Upgrade role if link is editor and they are viewer
            canvas.members[memberIndex].role = 'editor';
            await canvas.save();
        }

        res.status(200).json({ message: 'Successfully joined canvas', canvasId });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Invite link has expired' });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update member role in canvas
// @route   PUT /api/canvas/:id/members/:userId/role
// @access  Private (Owner only)
export const updateMemberRole = async (req, res) => {
    const { role } = req.body; // 'editor' or 'viewer'

    try {
        console.log(`[RoleUpdate] Request - canvasId: ${req.params.id}, userId: ${req.params.userId}, role: ${role}`);
        
        const canvas = await Canvas.findOne({ canvasId: req.params.id });

        if (!canvas) {
            console.log(`[RoleUpdate] Canvas not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Canvas not found' });
        }

        // Only owner can update member roles
        const canvasOwnerId = canvas.owner?._id || canvas.owner;
        const currentUserId = req.user?._id || req.user?.id;

        console.log(`[RoleUpdate] Checking owner - canvasOwnerId: ${canvasOwnerId}, currentUserId: ${currentUserId}`);

        if (!canvasOwnerId || !currentUserId || canvasOwnerId.toString() !== currentUserId.toString()) {
            console.log(`[RoleUpdate] Forbidden: canvasOwnerId: ${canvasOwnerId}, currentUserId: ${currentUserId}`);
            return res.status(403).json({ message: 'Only owner can manage member roles' });
        }

        console.log(`[RoleUpdate] Members list:`, JSON.stringify(canvas.members));

        const memberIndex = canvas.members.findIndex(m => {
            if (!m.user) return false;
            const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
            return memberId === req.params.userId;
        });

        console.log(`[RoleUpdate] memberIndex found: ${memberIndex} for target userId: ${req.params.userId}`);

        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Member not found' });
        }

        canvas.members[memberIndex].role = role;
        await canvas.save();

        console.log(`[RoleUpdate] Role updated successfully to ${role}`);

        const io = req.app.get('socketio');
        if (io) {
            console.log(`[RoleUpdate] Broadcasting member_role_updated to room ${req.params.id} for user ${req.params.userId}`);
            io.to(req.params.id).emit('member_role_updated', {
                userId: req.params.userId,
                role: role
            });
        }

        res.json({ message: 'Member role updated successfully', canvas });
    } catch (error) {
        console.error(`[RoleUpdate] Error:`, error);
        res.status(500).json({ message: error.message });
    }
};

export default {
    createCanvas,
    getCanvas,
    getMyCanvases,
    inviteUser,
    deleteCanvas,
    toggleFavorite,
    updateCanvasName,
    removeMember,
    updateMemberRole,
    branchCanvas,
    getRelatedBranches,
    getTimeline,
    tagTimelineEvent,
    removeTimelineEventTag,
    rollbackCanvas,
    generateLink,
    joinViaLink
};
