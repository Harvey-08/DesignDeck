import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, Filter, Loader } from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL, BACKEND_URL } from '../config';

const ChatPanel = ({ canvasId, engine, currentUser, isOpen, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [selectedObjectId, setSelectedObjectId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filterSignal, setFilterSignal] = useState(0);

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    // Track mute filter changes
    useEffect(() => {
        const handleFilterChange = (e) => {
            if (e.detail?.key === 'collaboratorFiltersChanged') {
                setFilterSignal(prev => prev + 1);
            }
        };
        window.addEventListener('engineStateChange', handleFilterChange);
        return () => window.removeEventListener('engineStateChange', handleFilterChange);
    }, []);

    // Initialize socket connection & fetch historical messages
    useEffect(() => {
        if (!canvasId) return;

        // Fetch existing comments from Mongo REST API
        const fetchComments = async () => {
            setLoading(true);
            try {
                // Convert API URL assuming standard port convention if not explicitly using same origin 
                // Wait, API_BASE_URL usually works directly.
                const resp = await axios.get(`${API_BASE_URL}/comments/${canvasId}`);
                if (resp.data) {
                    setMessages(resp.data);
                }
            } catch (error) {
                console.error("Failed to fetch comments", error);
            } finally {
                setLoading(false);
            }
        };

        fetchComments();

        // Connect specifically to our backend's centralized origin
        const socket = io(BACKEND_URL);
        socketRef.current = socket;

        socket.emit('join_session', canvasId);

        socket.on('object_comment_added', (newComment) => {
            if (newComment.sessionId === canvasId) {
                setMessages(prev => {
                    // Prevent duplicates if already added locally or fast sync
                    if (prev.some(m => m._id === newComment._id)) return prev;
                    return [...prev, newComment];
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [canvasId]);

    // Handle Engine Selection tracking
    useEffect(() => {
        // Listen for the correct engine event for selection changes
        const handleSelectionChange = (e) => {
            const { key, value } = e.detail;
            if (key === 'selection') {
                console.log("[ChatPanel] Engine selection event received. New selected object:", value);
                setSelectedObjectId(value);
            }
        };

        window.addEventListener('engineStateChange', handleSelectionChange);

        // Also try to get initial selection from engine if already available
        if (engine && typeof engine.getSelectedObjectId === 'function') {
            const currentSelected = engine.getSelectedObjectId();
            console.log("[ChatPanel] Component mounted/engine updated. Current selected object:", currentSelected);
            if (currentSelected !== selectedObjectId) {
                setSelectedObjectId(currentSelected);
            }
        }

        // Add an interval to forcefully sync selection as a fallback
        const syncInterval = setInterval(() => {
            if (engine && typeof engine.getSelectedObjectId === 'function') {
                const currentSelected = engine.getSelectedObjectId();
                if (currentSelected !== selectedObjectId) {
                    console.log("[ChatPanel] Forced sync of selected object from interval:", currentSelected);
                    setSelectedObjectId((prev) => currentSelected !== prev ? currentSelected : prev);
                }
            }
        }, 500);

        return () => {
            window.removeEventListener('engineStateChange', handleSelectionChange);
            clearInterval(syncInterval);
        };
    }, [engine, selectedObjectId]);

    // Sync comment counts to the engine for rendering badges on canvas
    useEffect(() => {
        if (!engine || typeof engine.setCommentCounts !== 'function') return;
        const counts = {};
        messages.forEach(m => {
            if (m.objectId) {
                counts[m.objectId] = (counts[m.objectId] || 0) + 1;
            }
        });
        engine.setCommentCounts(counts);
    }, [messages, engine]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages, isOpen, selectedObjectId]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !socketRef.current || !selectedObjectId) return;

        const payload = {
            sessionId: canvasId,
            objectId: selectedObjectId,
            message: inputValue,
            user: {
                name: currentUser?.name || currentUser?.username || 'Anonymous',
                color: currentUser?.color || '#94A3B8'
            }
        };

        // Emit through socket
        socketRef.current.emit('add_object_comment', payload);

        // Optimistic UI update could go here, but since broadcast is near instant we can just let socket.on handle it to get actual `_id`.

        setInputValue('');
    };

    if (!isOpen) return null;

    // Filter out messages from muted users (User Story 7)
    const activeMessages = messages.filter(m => !engine || !engine.isUserMuted(m.user?.name));

    const displayMessages = selectedObjectId
        ? activeMessages.filter(m => m.objectId === selectedObjectId)
        : [];

    return (
        <div className="absolute top-24 right-6 w-80 h-[500px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 flex flex-col overflow-hidden z-[60] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-gradient-to-r from-indigo-50/50 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_4px_10px_rgba(79,70,229,0.3)]">
                            <MessageSquare size={16} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight">Object Chat</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{displayMessages.length} messages</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"
                    >
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>

                {/* Object required banner */}
                {!selectedObjectId ? (
                    <div className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[9px] font-bold uppercase text-amber-600 flex items-center gap-1.5">
                        <Filter size={12} /> Select an object on the canvas to discuss
                    </div>
                ) : (
                    <div className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-[9px] font-bold uppercase text-indigo-700 flex items-center gap-1.5">
                        <Filter size={12} /> Chat is locked to selected object
                    </div>
                )}
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400"><Loader className="animate-spin" size={20} /></div>
                ) : selectedObjectId === null ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <MessageSquare size={32} className="mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">
                            Click any shape or drawing to view its comments.
                        </p>
                    </div>
                ) : displayMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <MessageSquare size={32} className="mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">
                            No comments on this specific object yet.
                        </p>
                    </div>
                ) : (
                    displayMessages.map((msg, idx) => {
                        const isMe = msg.user?.name === (currentUser?.name || currentUser?.username || 'Anonymous');
                        return (
                            <div key={msg._id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1 animate-in fade-in slide-in-from-bottom-2`}>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
                                    {!isMe && msg.user?.color && (
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: msg.user.color }}></div>
                                    )}
                                    {isMe ? 'You' : msg.user?.name} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-xs font-medium leading-relaxed shadow-sm ${isMe
                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                                    }`}>
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white">
                <div className="relative flex items-center">
                    <input
                        disabled={!selectedObjectId}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={selectedObjectId ? "Comment on selected object..." : "Select an object to comment"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || !selectedObjectId}
                        className="absolute right-2 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-100 text-white rounded-lg flex items-center justify-center transition-all active:scale-95"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatPanel;
