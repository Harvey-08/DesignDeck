import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, Layout, Clock, User, ArrowRight, Trash2, LogOut, Search,
    Grid, List, Settings, Users, Star, Filter, SortAsc, SortDesc, Video, Bell, Loader, Home, X,
    Folder, FolderPlus, Edit, ChevronRight
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import MeetingHistory from './Meeting/MeetingHistory';

const Dashboard = () => {
    const [canvases, setCanvases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('updatedAt'); // updatedAt, name
    const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
    const [filterBy, setFilterBy] = useState('home'); // home, my-canvases, favorites

    // Folders state
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [editingFolder, setEditingFolder] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [canvasToMove, setCanvasToMove] = useState(null);
    const [targetFolderId, setTargetFolderId] = useState('');

    // Completed Meeting Modal states
    const [selectedCompletedMeeting, setSelectedCompletedMeeting] = useState(null);
    const [completedMessages, setCompletedMessages] = useState([]);
    const [completedRecordings, setCompletedRecordings] = useState([]);
    const [detailsTab, setDetailsTab] = useState('details'); // 'details', 'chat', 'recordings', 'participants'
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Notifications state (lifted)
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsError, setNotificationsError] = useState(null);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchNotifications = async (showLoading = true) => {
        if (!token) return;
        try {
            if (showLoading) setNotificationsLoading(true);
            const res = await axios.get(`${API_BASE_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
            if (showLoading) setNotificationsLoading(false);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setNotificationsError('Failed to load notifications');
            if (showLoading) setNotificationsLoading(false);
        }
    };

    useEffect(() => {
        fetchCanvases();
        fetchFolders();
        fetchNotifications(true);

        const interval = setInterval(() => {
            fetchNotifications(false);
        }, 10000); // Poll every 10 seconds for notifications badge

        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => n.status === 'unread').length;

    const fetchCanvases = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/canvas/my-canvases`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCanvases(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching canvases:', err);
            if (err.response?.status === 401) {
                localStorage.clear();
                navigate('/login');
            } else {
                setError('Failed to load canvases');
                setLoading(false);
            }
        }
    };

    const handleCreateCanvas = async () => {
        if (localStorage.getItem('isGuest') === 'true' && !token) {
            // Guest fallback
            const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
            navigate(`/canvas/${guestId}`);
            return;
        }

        try {
            const res = await axios.post(`${API_BASE_URL}/canvas/create`, { name: 'Untitled Canvas' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate(`/canvas/${res.data.canvasId}`);
        } catch (err) {
            console.error('API failed, trying fallback...', err);
            const fallbackId = `temp-${Math.random().toString(36).substring(2, 9)}`;
            navigate(`/canvas/${fallbackId}`);
        }
    };

    const handleDeleteCanvas = async (e, canvas) => {
        e.stopPropagation();
        const currentUserId = user._id || user.id;
        const ownerId = canvas.owner?._id || canvas.owner;
        const isOwner = !ownerId || ownerId.toString() === currentUserId.toString();

        const warningMsg = isOwner 
            ? 'Are you sure you want to delete this workspace? This will permanently delete it for all collaborators.' 
            : 'Are you sure you want to remove this workspace from your dashboard? You will lose access to this canvas.';

        if (!window.confirm(warningMsg)) return;

        try {
            await axios.delete(`${API_BASE_URL}/canvas/${canvas.canvasId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCanvases(canvases.filter(c => c.canvasId !== canvas.canvasId));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const toggleFavorite = async (e, canvasId) => {
        e.stopPropagation();
        try {
            const res = await axios.put(`${API_BASE_URL}/canvas/${canvasId}/favorite`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCanvases(canvases.map(c => c.canvasId === canvasId ? res.data : c));
        } catch (err) {
            console.error('Failed to toggle favorite');
        }
    };

    const fetchFolders = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/folders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFolders(res.data);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!folderName.trim()) return;
        try {
            const res = await axios.post(`${API_BASE_URL}/folders`, { name: folderName.trim() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFolders([res.data, ...folders]);
            setFolderName('');
            setShowFolderModal(false);
        } catch (err) {
            console.error('Error creating folder:', err);
            alert('Failed to create folder');
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!folderName.trim() || !editingFolder) return;
        try {
            const res = await axios.patch(`${API_BASE_URL}/folders/${editingFolder._id}`, { name: folderName.trim() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFolders(folders.map(f => f._id === editingFolder._id ? res.data : f));
            setFolderName('');
            setEditingFolder(null);
            setShowFolderModal(false);
        } catch (err) {
            console.error('Error renaming folder:', err);
            alert('Failed to rename folder');
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Are you sure you want to delete this folder? Canvases inside will be moved to workspaces root.')) return;
        try {
            await axios.delete(`${API_BASE_URL}/folders/${folderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFolders(folders.filter(f => f._id !== folderId));
            setCanvases(canvases.map(c => c.folderId === folderId ? { ...c, folderId: null } : c));
        } catch (err) {
            console.error('Error deleting folder:', err);
            alert('Failed to delete folder');
        }
    };

    const handleMoveCanvas = async (e) => {
        e.preventDefault();
        if (!canvasToMove) return;
        try {
            const res = await axios.patch(`${API_BASE_URL}/canvas/${canvasToMove.canvasId}/move`, { folderId: targetFolderId || null }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCanvases(canvases.map(c => c.canvasId === canvasToMove.canvasId ? { ...c, folderId: res.data.folderId } : c));
            setCanvasToMove(null);
            setTargetFolderId('');
            setShowMoveModal(false);
            alert('Canvas moved successfully');
        } catch (err) {
            console.error('Error moving canvas:', err);
            alert('Failed to move canvas');
        }
    };

    const openCompletedMeetingDetails = async (meeting) => {
        setSelectedCompletedMeeting(meeting);
        setDetailsTab('details');
        setDetailsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const msgRes = await axios.get(`${API_BASE_URL}/meetings/${meeting.meetingId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompletedMessages(msgRes.data);

            const recRes = await axios.get(`${API_BASE_URL}/meetings/${meeting.meetingId}/recordings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompletedRecordings(recRes.data);
        } catch (err) {
            console.error('Error fetching completed meeting details:', err);
        } finally {
            setDetailsLoading(false);
        }
    };

    const filteredAndSortedCanvases = canvases
        .filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            
            const ownerId = c.owner?._id || c.owner;
            const currentUserId = user._id || user.id;
            const isOwner = localStorage.getItem('isGuest') === 'true' || !ownerId || ownerId.toString() === currentUserId.toString();

            let matchesFilter = false;
            if (filterBy === 'my-canvases') {
                if (searchQuery) {
                    matchesFilter = isOwner;
                } else {
                    matchesFilter = isOwner && (currentFolderId ? c.folderId === currentFolderId : !c.folderId);
                }
            } else if (filterBy === 'home' || filterBy === 'all') {
                if (searchQuery) {
                    matchesFilter = true;
                } else {
                    matchesFilter = currentFolderId ? c.folderId === currentFolderId : !c.folderId;
                }
            } else if (filterBy === 'favorites') {
                matchesFilter = c.isFavorite;
            } else if (filterBy === 'shared') {
                matchesFilter = ownerId && ownerId.toString() !== currentUserId.toString();
            }

            // Unified Master Canvas Check:
            // 1. If it has no groupId, it's a legacy master.
            // 2. If it has a groupId, it must be the same as its canvasId.
            // 3. It must not have a parentId.
            const isMaster = (!c.groupId) || (c.canvasId === c.groupId) || (!c.parentId);
            const isActuallyBranch = c.parentId && c.parentId !== "";

            return matchesSearch && matchesFilter && !isActuallyBranch;
        })
        .sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            if (sortBy === 'name') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50">
                <div className="h-20 flex items-center px-6 gap-3 shrink-0 border-b border-slate-50">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                        <div className="w-4 h-4 bg-white/30 rounded-sm" />
                    </div>
                    <span className="hidden lg:block text-xl font-black tracking-tight uppercase">DesignDeck</span>
                </div>

                <div className="flex-1 py-8 px-4 space-y-2">
                    <button
                        onClick={() => setFilterBy('home')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'home' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Home size={20} />
                        <span className="hidden lg:block">Home</span>
                    </button>
                    <button
                        onClick={() => setFilterBy('my-canvases')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'my-canvases' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Layout size={20} />
                        <span className="hidden lg:block">My Canvases</span>
                    </button>
                    <button
                        onClick={() => setFilterBy('favorites')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'favorites' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Star size={20} />
                        <span className="hidden lg:block">Favorites</span>
                    </button>
                    <button
                        onClick={() => setFilterBy('shared')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'shared' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Users size={20} />
                        <span className="hidden lg:block">Shared With Me</span>
                    </button>
                    <button
                        onClick={() => setFilterBy('meetings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'meetings' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Video size={20} />
                        <span className="hidden lg:block">Meetings</span>
                    </button>
                    <button
                        onClick={() => setFilterBy('notifications')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'notifications' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <div className="relative">
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                            )}
                        </div>
                        <span className="hidden lg:block flex-1 text-left">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="hidden lg:inline-flex items-center justify-center px-2.5 py-0.5 ml-auto text-[10px] font-black leading-none text-white bg-red-500 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-all"
                    >
                        <User size={20} />
                        <span className="hidden lg:block">Profile Settings</span>
                    </button>
                    <div className="pt-4 pb-2 px-4">
                        <p className="hidden lg:block text-[10px] font-black text-slate-300 uppercase tracking-widest">Recent Activity</p>
                    </div>
                    {canvases.slice(0, 3).map(c => (
                        <div key={c.canvasId} className="hidden lg:flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            <span className="truncate">{c.name}</span>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={() => { localStorage.clear(); navigate('/login'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all"
                    >
                        <LogOut size={20} />
                        <span className="hidden lg:block">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-8 flex-1 max-w-2xl">
                        <div className="relative w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search Workspaces..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 ml-8">
                        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => { setSortBy(sortBy === 'name' ? 'updatedAt' : 'name'); }}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all flex items-center gap-2"
                                title="Toggle Sort"
                            >
                                <Filter size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{sortBy === 'name' ? 'Name' : 'Date Updated'}</span>
                            </button>
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                            >
                                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                            </button>
                        </div>
                        <button
                            onClick={handleCreateCanvas}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-black tracking-wide text-xs uppercase flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 hover:-translate-y-0.5 active:scale-95 shrink-0"
                        >
                            <Plus size={18} strokeWidth={3} />
                            New Canvas
                        </button>
                        <div
                            onClick={() => navigate('/profile')}
                            className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 cursor-pointer hover:scale-110 transition-transform"
                        >
                            {user.name?.[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Content */}
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-7xl mx-auto">
                        {filterBy === 'home' ? (
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome Back, {user.name || 'Designer'}!</h2>
                                    <p className="text-slate-500 font-medium">Create a new canvas, start or join a meeting call instantly.</p>
                                </div>
                            </div>
                        ) : filterBy === 'meetings' ? (
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Meetings Dashboard</h2>
                                    <p className="text-slate-500 font-medium">Join or view active, upcoming, and completed collaborative meetings.</p>
                                </div>
                            </div>
                        ) : filterBy === 'notifications' ? (
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Notifications</h2>
                                    <p className="text-slate-500 font-medium">Manage pending workspace invites and requests.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                                        {filterBy === 'favorites' ? 'Favorite Workspaces' : filterBy === 'shared' ? 'Shared With Me' : 'My Workspaces'}
                                    </h2>
                                    <p className="text-slate-500 font-medium">Manage and collaborate on your digital canvases.</p>
                                </div>
                                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Grid size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <List size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {filterBy === 'home' ? (
                            <HomeView canvases={canvases} handleCreateCanvas={handleCreateCanvas} />
                        ) : filterBy === 'meetings' ? (
                            <MeetingsDashboardView canvases={canvases} openCompletedMeetingDetails={openCompletedMeetingDetails} />
                        ) : filterBy === 'notifications' ? (
                            <NotificationsView 
                                notifications={notifications}
                                loading={notificationsLoading}
                                error={notificationsError}
                                fetchNotifications={fetchNotifications}
                            />
                        ) : loading ? (
                            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-64 bg-white animate-pulse rounded-[2rem] border border-slate-100" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filterBy === 'my-canvases' && currentFolderId && (
                                    <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-400">
                                        <button onClick={() => setCurrentFolderId(null)} className="hover:text-indigo-600">My Canvases</button>
                                        <ChevronRight size={14} />
                                        <span className="text-slate-800">{folders.find(f => f._id === currentFolderId)?.name}</span>
                                    </div>
                                )}

                                {filterBy === 'my-canvases' && !currentFolderId && !searchQuery && (
                                    <div className="mb-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">Folders</h3>
                                            <button
                                                onClick={() => { setEditingFolder(null); setFolderName(''); setShowFolderModal(true); }}
                                                className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={14} /> Add Folder
                                            </button>
                                        </div>
                                        {folders.length === 0 ? (
                                            <p className="text-xs text-slate-400 font-medium py-4 border border-dashed border-slate-100 rounded-2xl px-4 bg-slate-50/20">No folders created yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {folders.map(folder => (
                                                    <div
                                                        key={folder._id}
                                                        onClick={() => setCurrentFolderId(folder._id)}
                                                        className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                                                <Folder size={20} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{folder.name}</h4>
                                                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                                                    {canvases.filter(c => c.folderId === folder._id).length} canvases
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingFolder(folder);
                                                                    setFolderName(folder.name);
                                                                    setShowFolderModal(true);
                                                                }}
                                                                className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600"
                                                            >
                                                                <Edit size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteFolder(folder._id);
                                                                }}
                                                                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {filterBy === 'my-canvases' && !searchQuery && (
                                    <div className="flex justify-between items-center mb-4 mt-6">
                                        <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">Canvases</h3>
                                    </div>
                                )}

                                {filteredAndSortedCanvases.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 w-full">
                                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                            <Layout className="text-slate-200" size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">No canvases found</h3>
                                        <p className="text-slate-400 mb-8 max-w-xs text-center">Create your first collaborative workspace to start designing with your team.</p>
                                        <button
                                            onClick={handleCreateCanvas}
                                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-600 transition-all flex items-center gap-2"
                                        >
                                            <Plus size={20} />
                                            Create First Canvas
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                                        {filteredAndSortedCanvases.map((canvas) => (
                                            <div
                                                key={canvas.canvasId}
                                                onClick={() => navigate(`/canvas/${canvas.canvasId}`)}
                                                className={`group bg-white rounded-[2rem] border p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 cursor-pointer flex flex-col justify-between h-64 relative overflow-hidden border-b-4 ${canvas.isFavorite ? 'border-amber-400 shadow-amber-50' : 'border-slate-100 hover:border-b-indigo-500'}`}
                                            >
                                                <div className="absolute top-4 right-4 z-10 flex gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCanvasToMove(canvas);
                                                            setTargetFolderId(canvas.folderId || '');
                                                            setShowMoveModal(true);
                                                        }}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Move to Folder"
                                                    >
                                                        <Folder size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => toggleFavorite(e, canvas.canvasId)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${canvas.isFavorite ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100'}`}
                                                    >
                                                        <Star size={16} fill={canvas.isFavorite ? "currentColor" : "none"} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteCanvas(e, canvas)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div>
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform mb-6 ${canvas.isFavorite ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500 group-hover:scale-110'}`}>
                                                        <Layout size={24} />
                                                    </div>
                                                    <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors truncate pr-16">{canvas.name}</h3>
                                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                        <Clock size={12} />
                                                        <span>{new Date(canvas.updatedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                                                    <div className="flex -space-x-2">
                                                        <div className="w-7 h-7 rounded-lg bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                            {user.name?.[0].toUpperCase()}
                                                        </div>
                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                            +
                                                        </div>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${canvas.isFavorite ? 'bg-amber-500 text-white' : 'bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                        <ArrowRight size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* CREATE/RENAME FOLDER MODAL */}
                {showFolderModal && (
                    <div className="fixed inset-0 bg-[#0c0e17]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-white text-slate-800 border border-slate-100 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative">
                            <button
                                onClick={() => setShowFolderModal(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold tracking-tight mb-2">{editingFolder ? 'Rename Folder' : 'Create Folder'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                                {editingFolder ? `Enter a new name for "${editingFolder.name}"` : 'Organize your workspaces'}
                            </p>

                            <form onSubmit={editingFolder ? handleRenameFolder : handleCreateFolder} className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Folder Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={folderName}
                                        onChange={(e) => setFolderName(e.target.value)}
                                        placeholder="e.g. Design Inspiration"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md shadow-indigo-100 animate-in zoom-in-95 duration-200"
                                >
                                    {editingFolder ? 'Rename Folder' : 'Create Folder'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* MOVE CANVAS MODAL */}
                {showMoveModal && canvasToMove && (
                    <div className="fixed inset-0 bg-[#0c0e17]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-white text-slate-800 border border-slate-100 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative">
                            <button
                                onClick={() => setShowMoveModal(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold tracking-tight mb-2">Move Workspace</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Select target folder for "{canvasToMove.name}"</p>

                            <form onSubmit={handleMoveCanvas} className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Folder</label>
                                    <select
                                        value={targetFolderId}
                                        onChange={(e) => setTargetFolderId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Root (No Folder)</option>
                                        {folders.map(f => (
                                            <option key={f._id} value={f._id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md shadow-indigo-100 animate-in zoom-in-95 duration-200"
                                >
                                    Move Workspace
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* COMPLETED MEETING DETAILS MODAL */}
                {selectedCompletedMeeting && (
                    <div className="fixed inset-0 bg-[#0c0e17]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-white text-slate-800 border border-slate-100 rounded-[2rem] p-8 max-w-2xl w-full max-h-[85vh] shadow-2xl relative flex flex-col">
                            <button
                                onClick={() => setSelectedCompletedMeeting(null)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-xl font-bold tracking-tight text-slate-800">{selectedCompletedMeeting.title}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Completed Meeting Details & logs</p>
                            </div>

                            {/* Modal Tabs */}
                            <div className="flex border-b border-slate-100 mb-6 shrink-0">
                                {['details', 'chat', 'recordings', 'participants'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setDetailsTab(tab)}
                                        className={`py-2 px-4 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                                            detailsTab === tab
                                                ? 'border-indigo-600 text-indigo-600'
                                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                                {detailsLoading ? (
                                    <div className="flex items-center justify-center py-12 text-slate-400">
                                        <Loader className="animate-spin mr-2 text-indigo-600" size={18} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Loading details...</span>
                                    </div>
                                ) : (
                                    <>
                                        {detailsTab === 'details' && (
                                            <div className="space-y-4 text-xs font-semibold text-slate-600">
                                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Meeting ID</p>
                                                        <p className="text-slate-800 font-bold font-mono">{selectedCompletedMeeting.meetingId}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                                                        <p className="text-slate-800 font-bold capitalize">{selectedCompletedMeeting.status}</p>
                                                    </div>
                                                    <div className="mt-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Started At</p>
                                                        <p className="text-slate-800 font-bold">
                                                            {selectedCompletedMeeting.startedAt ? new Date(selectedCompletedMeeting.startedAt).toLocaleString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Ended At</p>
                                                        <p className="text-slate-800 font-bold">
                                                            {selectedCompletedMeeting.endedAt ? new Date(selectedCompletedMeeting.endedAt).toLocaleString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Canvas Link</p>
                                                    <a
                                                        href={selectedCompletedMeeting.shareLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 font-bold hover:underline break-all"
                                                    >
                                                        {selectedCompletedMeeting.shareLink}
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {detailsTab === 'chat' && (
                                            <div className="space-y-3">
                                                {completedMessages.length === 0 ? (
                                                    <p className="text-xs text-slate-400 text-center py-8 font-semibold">No messages sent in this meeting.</p>
                                                ) : (
                                                    completedMessages.map((msg, index) => (
                                                        <div key={msg._id || index} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-black text-slate-700">{msg.senderName}</span>
                                                                <span className="text-[8px] text-slate-400 font-bold">
                                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">{msg.message}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {detailsTab === 'recordings' && (
                                            <div className="space-y-4">
                                                {completedRecordings.length === 0 ? (
                                                    <p className="text-xs text-slate-400 text-center py-8 font-semibold">No screen recordings uploaded for this meeting.</p>
                                                ) : (
                                                    completedRecordings.map((rec) => (
                                                        <div key={rec._id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-3">
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <h5 className="text-xs font-bold text-slate-800">{rec.fileName}</h5>
                                                                    <p className="text-[9px] text-slate-400 mt-0.5">Recorded by {rec.user?.name || 'Participant'} • {rec.duration}s</p>
                                                                </div>
                                                                <a
                                                                    href={rec.recordingUrl?.replace(/\.[^/.]+$/, ".mp4")}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                                >
                                                                    Play / Download
                                                                </a>
                                                            </div>
                                                            <video
                                                                src={rec.recordingUrl?.replace(/\.[^/.]+$/, ".mp4")}
                                                                controls
                                                                className="w-full rounded-xl border border-slate-200 bg-black aspect-video max-h-64"
                                                            />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {detailsTab === 'participants' && (
                                            <div className="space-y-2">
                                                {selectedCompletedMeeting.participants?.length === 0 ? (
                                                    <p className="text-xs text-slate-400 text-center py-8 font-semibold">No participants logged.</p>
                                                ) : (
                                                    selectedCompletedMeeting.participants.map((p, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                                                                {p.user?.name?.[0] || 'U'}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800">{p.user?.name || 'Unknown Participant'}</p>
                                                                <p className="text-[9px] text-slate-400 font-medium">Joined At: {new Date(p.joinedAt).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const MeetingsDashboardView = ({ canvases, openCompletedMeetingDetails }) => {
  const [meetings, setMeetings] = useState([]);
  const [selectedCanvasId, setSelectedCanvasId] = useState(canvases[0]?.canvasId || '');
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get current user ID
  const currentUserObj = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUserObj._id || currentUserObj.id;

  // Invite Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeInviteMeetingId, setActiveInviteMeetingId] = useState('');
  const [users, setUsers] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [inviteLoading, setInviteLoading] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();
    if (canvases.length > 0 && !selectedCanvasId) {
      setSelectedCanvasId(canvases[0].canvasId);
    }
  }, [canvases, selectedCanvasId]);

  const fetchMeetings = async () => {
    try {
      setListLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/meetings/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(res.data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setListLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleStartMeeting = async (meetingId, canvasId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/canvas/${canvasId}?meetingId=${meetingId}`);
    } catch (err) {
      console.error('Failed to start scheduled meeting:', err);
      alert('Failed to start scheduled meeting');
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMeetings();
      alert('Meeting cancelled successfully');
    } catch (err) {
      console.error('Failed to cancel meeting:', err);
      alert('Failed to cancel meeting');
    }
  };

  const openInviteModal = (meetingId) => {
    setActiveInviteMeetingId(meetingId);
    setShowInviteModal(true);
    fetchUsers();
  };

  const handleInviteUser = async (userId) => {
    setInviteLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/meetings/${activeInviteMeetingId}/invite`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Invitation sent successfully!');
    } catch (err) {
      console.error('Failed to invite user:', err);
      alert('Failed to send invitation');
    } finally {
      setInviteLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const activeMeetings = meetings.filter(m => m.status === 'active');
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled');
  const completedMeetings = meetings.filter(m => m.status === 'ended' || m.status === 'cancelled');

  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-wider">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100 mb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'active'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Active & Scheduled ({activeMeetings.length + upcomingMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'completed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Completed ({completedMeetings.length})
        </button>
      </div>

      {activeTab === 'active' ? (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
          {/* Section headers */}
          <div className="space-y-6">
            {/* Active section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase">ACTIVE ({activeMeetings.length})</h4>
              </div>
              {activeMeetings.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-3 border border-dashed border-slate-100 rounded-2xl px-4 bg-slate-50/20">No currently active meetings.</p>
              ) : (
                <div className="space-y-3">
                  {activeMeetings.map(m => (
                    <div key={m.meetingId} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-emerald-100 bg-emerald-50/10 rounded-2xl transition-all hover:shadow-md">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-800">{m.title}</span>
                          <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">STARTING SOON</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(m.startedAt || m.createdAt).toLocaleDateString()} {new Date(m.startedAt || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-indigo-600">ID: {m.meetingId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <button
                          onClick={() => navigate(`/canvas/${m.canvasId}?meetingId=${m.meetingId}`)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1"
                        >
                          <Video size={12} /> Join Now
                        </button>
                        {m.host && currentUserId && (m.host._id || m.host).toString() === currentUserId.toString() && (
                          <>
                            <button
                              onClick={() => openInviteModal(m.meetingId)}
                              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              + Invite
                            </button>
                            <button
                              onClick={() => handleCancelMeeting(m.meetingId)}
                              className="px-4 py-2 border border-slate-200 text-red-500 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              X Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Upcoming section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase">UPCOMING ({upcomingMeetings.length})</h4>
              </div>
              {upcomingMeetings.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-3 border border-dashed border-slate-100 rounded-2xl px-4 bg-slate-50/20">No scheduled meetings.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map(m => (
                    <div key={m.meetingId} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-blue-100 bg-blue-50/5 rounded-2xl transition-all hover:shadow-md">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-800">{m.title}</span>
                          <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">SCHEDULED</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(m.scheduledAt).toLocaleDateString()} {new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-indigo-600">ID: {m.meetingId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 md:mt-0">
                        {m.host && currentUserId && (m.host._id || m.host).toString() === currentUserId.toString() ? (
                          <>
                            <button
                              onClick={() => handleStartMeeting(m.meetingId, m.canvasId)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1"
                            >
                              <Video size={12} /> Start Call
                            </button>
                            <button
                              onClick={() => openInviteModal(m.meetingId)}
                              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              + Invite
                            </button>
                            <button
                              onClick={() => handleCancelMeeting(m.meetingId)}
                              className="px-4 py-2 border border-slate-200 text-red-500 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              X Cancel
                            </button>
                          </>
                        ) : (
                          <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                            Waiting for Host
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase">COMPLETED ({completedMeetings.length})</h4>
            <button onClick={fetchMeetings} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
              Refresh List
            </button>
          </div>
          {completedMeetings.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium py-8 border border-dashed border-slate-100 rounded-2xl px-4 bg-slate-50/20 text-center">No completed meetings yet.</p>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              {completedMeetings.map(m => {
                const durationMins = m.endedAt && m.startedAt
                  ? Math.round((new Date(m.endedAt) - new Date(m.startedAt)) / 60000)
                  : 0;
                const dateStr = new Date(m.startedAt || m.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric'
                });
                return (
                  <div
                    key={m.meetingId}
                    className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-l-4 border-l-slate-200 hover:border-l-indigo-500"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-black text-slate-800 truncate">{m.title}</h4>
                        <span className="shrink-0 text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-3 py-1 rounded">
                          {dateStr}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 font-mono">ID: {m.meetingId}</p>
                    </div>

                    <div className="flex flex-row items-center justify-between sm:justify-end gap-8 min-w-[320px]">
                      <div className="flex gap-6">
                        <p className="text-slate-500 font-bold text-xs">Duration: <span className="text-slate-800 font-black">{durationMins ? `${durationMins} mins` : 'N/A'}</span></p>
                        <p className="text-slate-500 font-bold text-xs">Participants: <span className="text-slate-800 font-black">{m.participants?.length || 0}</span></p>
                      </div>
                      <button
                        onClick={() => openCompletedMeetingDetails(m)}
                        className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                      >
                        Meeting Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History Log */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm mt-8">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Past Meetings & Recordings</h4>
            <MeetingHistory />
          </div>
        </div>
      )}

      {/* INVITE USERS DIALOG */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-[#0c0e17]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#121420] text-white border border-[#23273a] rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold tracking-tight mb-2">Invite Collaborators</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">Send an invite notification to colleagues</p>

            <div className="space-y-4">
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-[#1b1f32] border border-[#2b314d] rounded-2xl py-3 px-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {users
                  .filter(u => 
                    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
                  )
                  .map(user => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-[#1b1f32]/50 border border-[#2b314d] rounded-xl">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{user.name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleInviteUser(user._id)}
                        disabled={inviteLoading[user._id]}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                      >
                        {inviteLoading[user._id] ? 'Inviting...' : 'Invite'}
                      </button>
                    </div>
                  ))}
                {users.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No users available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationsView = ({ notifications, loading, error, fetchNotifications }) => {
  const navigate = useNavigate();

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleAccept = async (id, canvasId, type) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/notifications/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Invitation accepted!');
      if (type === 'meeting_invite') {
        fetchNotifications();
      } else {
        navigate(`/canvas/${canvasId}`);
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      alert('Failed to accept invitation.');
    }
  };

  const handleDecline = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/notifications/${id}/decline`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Invitation declined.');
      fetchNotifications();
    } catch (err) {
      console.error('Error declining invitation:', err);
      alert('Failed to decline invitation.');
    }
  };

  const handleJoinMeeting = async (meetingId, meetingStatus) => {
    if (meetingStatus === 'ended' || meetingStatus === 'cancelled') {
      alert('This meeting has already ended or been cancelled.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meeting = res.data;
      if (meeting.status === 'ended' || meeting.status === 'cancelled') {
        alert('This meeting has already ended or been cancelled.');
        fetchNotifications();
        return;
      }
      navigate(`/canvas/${meeting.canvasId}?meetingId=${meeting.meetingId}`);
    } catch (err) {
      console.error('Failed to join meeting:', err);
      alert('Could not join meeting. It may have been ended or cancelled.');
    }
  };

  const canvasInvites = notifications.filter(n => n.type === 'canvas_invite');
  const meetingReminders = notifications.filter(n => n.type === 'meeting_reminder' || n.type === 'meeting_invite');
  
  const activeReminders = meetingReminders.filter(n => 
    n.meetingStatus === 'active' || n.meetingStatus === 'scheduled' || !n.meetingStatus
  );
  const pastReminders = meetingReminders.filter(n => n.meetingStatus === 'ended' || n.meetingStatus === 'cancelled');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wider">
          {error}
        </div>
      )}

      {/* Meeting Reminders Section (as shown in reference image) */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Meeting reminders</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5">Reminders and direct links to scheduled calls</p>
          </div>
          {meetingReminders.length > 0 && (
            <button
              onClick={async () => {
                const token = localStorage.getItem('token');
                for (const n of meetingReminders) {
                  if (n.status === 'unread') {
                    await axios.put(`${API_BASE_URL}/notifications/${n._id}/read`, {}, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                  }
                }
                fetchNotifications();
              }}
              className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader className="animate-spin mr-2 text-indigo-600" size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Loading reminders...</span>
          </div>
        ) : meetingReminders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
            <Bell size={32} className="mx-auto mb-3 opacity-50 text-slate-300" />
            <p className="text-sm font-bold uppercase tracking-wider">No meeting reminders</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active / Scheduled Calls */}
            {activeReminders.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Active & Scheduled Calls</h4>
                {activeReminders.map((notif) => (
                  <div 
                    key={notif._id} 
                    className={`flex flex-row items-center justify-between gap-6 p-6 border rounded-2xl transition-all duration-200 ${
                      notif.status === 'unread' ? 'border-indigo-100 bg-indigo-50/10 shadow-sm' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-800">
                          {notif.type === 'meeting_invite' ? `Invited: ${notif.meetingTitle}` : `Reminder: ${notif.meetingTitle}`}
                        </h5>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                          {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {notif.type === 'meeting_invite' && notif.status !== 'accepted' && notif.status !== 'declined' ? (
                        <>
                          <button
                            onClick={() => handleAccept(notif._id, null, notif.type)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-100"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(notif._id)}
                            className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200"
                          >
                            Decline
                          </button>
                        </>
                      ) : notif.status === 'declined' || notif.meetingTitle?.toLowerCase().includes('declined') ? (
                        <>
                          {notif.status === 'unread' && (
                            <button
                              onClick={() => handleMarkAsRead(notif._id)}
                              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                              Mark as read
                            </button>
                          )}
                          <span className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100">
                            Declined
                          </span>
                        </>
                      ) : (
                        <>
                          {notif.status === 'unread' && (
                            <button
                              onClick={() => handleMarkAsRead(notif._id)}
                              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => handleJoinMeeting(notif.meetingId, notif.meetingStatus)}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5"
                          >
                            <Video size={14} /> Join Now
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Separator if both active and past exist */}
            {activeReminders.length > 0 && pastReminders.length > 0 && (
              <hr className="border-slate-100" />
            )}

            {/* Completed & Cancelled Calls */}
            {pastReminders.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completed & Cancelled Calls</h4>
                {pastReminders.map((notif) => (
                  <div 
                    key={notif._id} 
                    className="flex flex-row items-center justify-between gap-6 p-6 border border-slate-100 bg-slate-50/50 opacity-70 rounded-2xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-600">
                          {notif.type === 'meeting_invite' ? `Invited: ${notif.meetingTitle}` : `Reminder: ${notif.meetingTitle}`}
                        </h5>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                          {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {notif.status === 'unread' && (
                        <button
                          onClick={() => handleMarkAsRead(notif._id)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          Mark as read
                        </button>
                      )}
                      {notif.status === 'declined' || notif.meetingTitle?.toLowerCase().includes('declined') ? (
                        <span className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100">
                          Declined
                        </span>
                      ) : (
                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                          notif.meetingStatus === 'cancelled' 
                            ? 'bg-red-50 text-red-500 border border-red-100' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {notif.meetingStatus === 'cancelled' ? 'Cancelled' : 'Ended'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workspace Invitations Section */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
        <h3 className="text-base font-black text-slate-800 uppercase tracking-widest mb-6">Pending Workspace Invitations</h3>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader className="animate-spin mr-2 text-indigo-600" size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Loading invitations...</span>
          </div>
        ) : canvasInvites.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
            <Bell size={36} className="mx-auto mb-3 opacity-50 text-slate-300" />
            <p className="text-sm font-bold uppercase tracking-wider">No workspace invitations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {canvasInvites.map((notif) => (
              <div 
                key={notif._id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 border rounded-2xl transition-all duration-200 ${
                  notif.status === 'unread' ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">
                      {notif.sender?.name || 'Collaborator'} ({notif.sender?.email})
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      notif.status === 'unread' ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {notif.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mt-2">
                    Invited you to collaborate on the canvas <span className="font-bold text-slate-700">{notif.canvasName}</span> as <span className="font-bold text-indigo-600">{notif.role}</span>.
                  </p>
                  <p className="text-xs text-slate-400 font-bold tracking-wider mt-2 uppercase">
                    Received {new Date(notif.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {(notif.status === 'unread' || notif.status === 'read') && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleAccept(notif._id, notif.canvasId, notif.type)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-100"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(notif._id)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const HomeView = ({ canvases, handleCreateCanvas }) => {
  const [meetingTitle, setMeetingTitle] = useState('Collab Session');
  const [selectedCanvasId, setSelectedCanvasId] = useState(canvases[0]?.canvasId || '');
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Scheduling States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [meetingType, setMeetingType] = useState('instant'); // 'instant' or 'scheduled'
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (canvases.length > 0 && !selectedCanvasId) {
      setSelectedCanvasId(canvases[0].canvasId);
    }
  }, [canvases, selectedCanvasId]);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !selectedCanvasId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let scheduledAt = null;

      if (meetingType === 'scheduled') {
        if (!meetingDate || !meetingTime) {
          setError('Please provide date and time for scheduled meeting');
          setLoading(false);
          return;
        }
        scheduledAt = new Date(`${meetingDate}T${meetingTime}`);
      }

      const res = await axios.post(`${API_BASE_URL}/meetings`, {
        title: meetingTitle.trim(),
        canvasId: selectedCanvasId,
        scheduledAt
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowCreateModal(false);
      setMeetingTitle('Collab Session');
      setMeetingDate('');
      setMeetingTime('');
      setMeetingType('instant');
      
      if (meetingType === 'instant') {
        navigate(`/canvas/${selectedCanvasId}?meetingId=${res.data.meetingId}`);
      } else {
        alert('Meeting scheduled successfully!');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/meetings/${joinId.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meeting = res.data;
      if (meeting.status !== 'active') {
        setError('This meeting has ended or is not active yet.');
        setLoading(false);
        return;
      }
      navigate(`/canvas/${meeting.canvasId}?meetingId=${meeting.meetingId}`);
    } catch (err) {
      console.error(err);
      setError('Meeting ID not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-wider">
          {error}
        </div>
      )}

      {/* Grid of 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Create Canvas */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
              <Plus size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Create Canvas</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">START A FRESH DESIGN BOARD</p>
            <button
              onClick={handleCreateCanvas}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md shadow-indigo-100"
            >
              CREATE NEW CANVAS
            </button>
          </div>
        </div>

        {/* Card 2: Create Meeting */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
              <Plus size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Create a Meeting</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">START INSTANT VIDEO CALL OR SCHEDULE FOR FUTURE</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md shadow-indigo-100"
            >
              CREATE NEW MEETING
            </button>
          </div>
        </div>

        {/* Card 3: Join Meeting */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
              <ArrowRight size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Join Existing Meeting</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">ENTER A ROOM CODE OR SHARED MEETING ID</p>
            
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="meet-xxxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !joinId.trim()}
                className="w-full h-11 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md"
              >
                JOIN CALL
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CREATE MEETING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0c0e17]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#121420] text-white border border-[#23273a] rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                <Video size={24} />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Create a Meeting</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Choose instant or schedule a meeting</p>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-5">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Meeting Name</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full bg-[#1b1f32] border border-[#2b314d] rounded-2xl py-3 px-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Canvas Workspace</label>
                <select
                  value={selectedCanvasId}
                  onChange={(e) => setSelectedCanvasId(e.target.value)}
                  className="w-full bg-[#1b1f32] border border-[#2b314d] rounded-2xl py-3 px-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {canvases.map(c => (
                    <option key={c.canvasId} value={c.canvasId}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Toggle Buttons */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-[#1b1f32] rounded-xl border border-[#2b314d]">
                <button
                  type="button"
                  onClick={() => setMeetingType('instant')}
                  className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    meetingType === 'instant' ? 'bg-[#2b314d] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Instant Meeting
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingType('scheduled')}
                  className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    meetingType === 'scheduled' ? 'bg-[#2b314d] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Schedule Meeting
                </button>
              </div>

              {/* Scheduling Date/Time inputs */}
              {meetingType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Date</label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full bg-[#1b1f32] border border-[#2b314d] rounded-2xl py-3 px-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Time</label>
                    <input
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="w-full bg-[#1b1f32] border border-[#2b314d] rounded-2xl py-3 px-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || canvases.length === 0}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#1b1f32] disabled:text-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md shadow-indigo-500/10"
              >
                {loading ? 'Processing...' : 'Generate Meeting Details'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
