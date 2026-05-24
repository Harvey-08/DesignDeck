import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, Layout, Clock, User, ArrowRight, Trash2, LogOut, Search,
    Grid, List, Settings, Users, Star, Filter, SortAsc, SortDesc
} from 'lucide-react';
import { API_BASE_URL } from '../config';

const Dashboard = () => {
    const [canvases, setCanvases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('updatedAt'); // updatedAt, name
    const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
    const [filterBy, setFilterBy] = useState('all'); // all, favorites

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchCanvases();
    }, []);

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

    const handleDeleteCanvas = async (e, canvasId) => {
        e.stopPropagation();
        if (!window.confirm('Delete this workspace?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/canvas/${canvasId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCanvases(canvases.filter(c => c.canvasId !== canvasId));
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

    const filteredAndSortedCanvases = canvases
        .filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            
            let matchesFilter = false;
            if (filterBy === 'all') {
                matchesFilter = true;
            } else if (filterBy === 'favorites') {
                matchesFilter = c.isFavorite;
            } else if (filterBy === 'shared') {
                const ownerId = c.owner?._id || c.owner;
                const currentUserId = user._id || user.id;
                matchesFilter = ownerId && ownerId !== currentUserId;
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
                        onClick={() => setFilterBy('all')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'all' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Layout size={20} />
                        <span className="hidden lg:block">All Canvases</span>
                    </button>
                    <button
                        onClick={() => setFilterBy('favorites')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'favorites' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Star size={20} />
                        <span className="hidden lg:block">Favorites</span>
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-all"
                    >
                        <User size={20} />
                        <span className="hidden lg:block">Profile Settings</span>
                    </button>
                    <button
                        onClick={() => setFilterBy('shared')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filterBy === 'shared' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Users size={20} />
                        <span className="hidden lg:block">Shared With Me</span>
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
                <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-7xl mx-auto">
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

                        {loading ? (
                            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-64 bg-white animate-pulse rounded-[2rem] border border-slate-100" />
                                ))}
                            </div>
                        ) : filteredAndSortedCanvases.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
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
                                                onClick={(e) => toggleFavorite(e, canvas.canvasId)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${canvas.isFavorite ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Star size={16} fill={canvas.isFavorite ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteCanvas(e, canvas.canvasId)}
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
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
