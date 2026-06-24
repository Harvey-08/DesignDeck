import Folder from '../models/Folder.js';
import Canvas from '../models/Canvas.js';

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
export const createFolder = async (req, res) => {
    try {
        const { name, parentFolder } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Folder name is required' });
        }

        const folder = await Folder.create({
            name,
            owner: req.user._id,
            parentFolder: parentFolder || null
        });

        res.status(201).json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all folders for current user
// @route   GET /api/folders
// @access  Private
export const getFolders = async (req, res) => {
    try {
        const folders = await Folder.find({ owner: req.user._id }).sort({ createdAt: -1 });
        res.json(folders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update folder details (rename or move)
// @route   PATCH /api/folders/:id
// @access  Private
export const updateFolder = async (req, res) => {
    try {
        const { name, parentFolder } = req.body;
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        if (name) folder.name = name;
        if (parentFolder !== undefined) folder.parentFolder = parentFolder || null;

        await folder.save();
        res.json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private
export const deleteFolder = async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // Dissolve folder: set folderId = null on all canvases in this folder
        await Canvas.updateMany({ folderId: folder._id }, { folderId: null });

        // Delete subfolders recursively (if nested)
        await Folder.deleteMany({ parentFolder: folder._id });

        await Folder.deleteOne({ _id: folder._id });

        res.json({ message: 'Folder deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default {
    createFolder,
    getFolders,
    updateFolder,
    deleteFolder
};
