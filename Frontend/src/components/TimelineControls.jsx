import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Clock, Activity, Layout, Trash2, AlertTriangle, GitBranch, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import ReplayManager from '../Engine/managers/ReplayManager';
import ReplayCanvas from './ReplayCanvas';

const TimelineControls = ({ canvasId, engine, isOpen, onClose }) => {
    const [events, setEvents] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [replayState, setReplayState] = useState({ layers: [], objects: {} });
    const [showRollbackModal, setShowRollbackModal] = useState(false);
    const [isBranching, setIsBranching] = useState(false);
    const [hiddenCollaborators, setHiddenCollaborators] = useState(new Set());
    const replayManagerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && canvasId) {
            const manager = new ReplayManager(
                canvasId,
                (state) => setReplayState(state),
                (index) => setCurrentIndex(index)
            );

            replayManagerRef.current = manager;

            manager.fetchTimeline().then(evs => {
                setEvents(evs);
                setIsLoading(false);
            });
        }

        return () => {
            if (replayManagerRef.current) {
                replayManagerRef.current.pause();
            }
        };
    }, [isOpen, canvasId]);

    useEffect(() => {
        if (!isOpen && replayManagerRef.current) {
            replayManagerRef.current.pause();
            setIsPlaying(false);
        }
    }, [isOpen]);

    const milestones = events.map((e, index) => (e.type === 'milestone' && e.name ? { index, name: e.name } : null)).filter(Boolean);

    // US8: Extract unique collaborators from the current snapshot
    const collaborators = React.useMemo(() => {
        const collabMap = new Map();
        if (replayState.objects) {
            Object.values(replayState.objects).forEach(obj => {
                if (obj.metadata?.creatorId) {
                    collabMap.set(obj.metadata.creatorId, obj.metadata.creatorName || 'Unknown');
                }
            });
        }
        return Array.from(collabMap.entries()).map(([id, name]) => ({ id, name }));
    }, [replayState.objects]);

    const toggleCollaborator = (id) => {
        const newHidden = new Set(hiddenCollaborators);
        if (newHidden.has(id)) {
            newHidden.delete(id);
        } else {
            newHidden.add(id);
        }
        setHiddenCollaborators(newHidden);
    };

    if (!isOpen) return null;

    const handlePlayPause = () => {
        if (isPlaying) {
            replayManagerRef.current.pause();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            replayManagerRef.current.setSpeed(playbackSpeed);
            replayManagerRef.current.play(() => {
                setIsPlaying(false);
            });
        }
    };

    const handleRemoveTag = async (eventId, e) => {
        if (e) e.stopPropagation();

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            await axios.delete(`${API_BASE_URL}/canvas/${canvasId}/tag/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Remove it from local state immediately to avoid full reload if possible
            const updatedEvents = events.filter(ev => ev.id !== eventId || ev.type !== 'milestone');
            setEvents(updatedEvents);

            // Adjust current index if we just deleted the event we were on
            if (currentEvent && currentEvent.id === eventId) {
                // If there's an event before this one, jump to it, otherwise reset
                if (currentIndex > 0) {
                    const newIndex = currentIndex - 1;
                    setCurrentIndex(newIndex);
                    if (replayManagerRef.current) replayManagerRef.current.jumpTo(newIndex);
                } else {
                    handleReset();
                }
            }
        } catch (err) {
            console.error('Failed to remove tag:', err);
            alert('Failed to remove tag.');
        }
    };

    const handleRollbackConfirm = async () => {
        if (!currentEvent) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // CRITICAL: Destroy the local CRDT engine BEFORE sending the rollback request.
            // If we don't do this, y-websocket will auto-reconnect and instantly push our 
            // cached local "future" state back to the server, completely overriding the rollback!
            if (engine && typeof engine.destroy === 'function') {
                console.log('[Rollback] Destroying local CRDT engine to prevent future-state resync...');
                engine.destroy();
            }

            await axios.post(`${API_BASE_URL}/canvas/${canvasId}/rollback`,
                { eventId: currentEvent.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Close everything and force a full reload so the main canvas picks up the rolled-back state
            onClose();
            window.location.reload();
        } catch (err) {
            console.error('Failed to rollback canvas:', err);
            alert('Failed to rollback. You might not have permission.');
            setShowRollbackModal(false);
        }
    };

    const handleRollbackBranch = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setIsBranching(true);
        try {
            // Destroy local engine to be safe
            if (engine && typeof engine.destroy === 'function') {
                console.log('[Rollback] Destroying local CRDT engine before branching...');
                engine.destroy();
            }

            const payload = currentEvent ? { eventId: currentEvent.id } : {};
            const res = await axios.post(`${API_BASE_URL}/canvas/${canvasId}/branch`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onClose();
            // Force a full window location swap to ensure the new canvas engine spins up perfectly clean
            window.location.href = `/canvas/${res.data.canvasId}`;
        } catch (error) {
            console.error('Failed to create branch:', error);
            alert('Failed to branch canvas.');
            setShowRollbackModal(false);
            setIsBranching(false);
        }
    };

    const handleSliderChange = (e) => {
        const index = parseInt(e.target.value);
        setCurrentIndex(index);
        replayManagerRef.current.jumpTo(index);
    };

    const handleReset = () => {
        replayManagerRef.current.reset();
        setCurrentIndex(-1);
        setIsPlaying(false);
    };

    if (!isOpen) return null;

    const currentEvent = events[currentIndex];

    return (
        <div className="fixed inset-0 z-[100] flex flex-row items-stretch justify-center p-4 sm:p-6 gap-6 pointer-events-none overflow-hidden max-h-screen h-screen">
            {/* Backdrop & Click-away */}
            <div
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm pointer-events-auto transition-all animate-in fade-in"
                onClick={onClose}
            />

            {/* Left/Main Side: Canvas + Floating Close Button */}
            <div className="relative z-10 flex-1 h-full min-w-0 flex flex-col pointer-events-auto">
                <div className="relative w-full h-full transform transition-all animate-in zoom-in-95 duration-500 overflow-hidden border-[8px] border-white/40 rounded-[2.5rem] shadow-2xl bg-[#FAFAFC]">
                    {/* Floating Close Button in Top Left of Canvas border context */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 z-50 w-12 h-12 bg-white/95 backdrop-blur-md hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-2xl shadow-xl border border-slate-200/50 flex items-center justify-center transition-all active:scale-90"
                    >
                        <X size={24} strokeWidth={2.5} />
                    </button>

                    <ReplayCanvas
                        state={replayState}
                        isLoading={isLoading}
                        engine={engine}
                        hiddenCollaborators={hiddenCollaborators}
                    />
                </div>
            </div>

            {/* Right Side: Sidebar Panel */}
            <div className="relative z-10 w-80 flex flex-col gap-6 pointer-events-auto shrink-0 transform transition-all animate-in slide-in-from-right-8 h-full">

                {/* Header Info */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-slate-200/50 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                            <Activity size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm">Playback</h3>
                            </div>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                                {isLoading ? 'Fetching...' : `${events.length} operations`}
                            </p>
                        </div>
                    </div>
                    {currentEvent && (
                        <div className="flex flex-col gap-2">
                            <div className="bg-slate-50 py-2.5 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-500 text-center border border-indigo-100/50">
                                {currentEvent.type || 'Update'} • {new Date(currentEvent.timestamp).toLocaleTimeString()}
                            </div>

                            {/* Milestone Tag Panel */}
                            {currentEvent.type === 'milestone' && currentEvent.name && (
                                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200 flex items-center justify-between group/tag animate-in slide-in-from-top-2">
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Milestone Tag</span>
                                        <span className="text-sm font-bold truncate">{currentEvent.name}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleRemoveTag(currentEvent.id, e)}
                                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500 hover:text-white text-indigo-100 flex items-center justify-center transition-all shrink-0 active:scale-95"
                                        title="Remove Tag"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Rollback Button */}
                            <button
                                onClick={() => setShowRollbackModal(true)}
                                className="mt-2 w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                            >
                                <RotateCcw size={14} />
                                Restore to this exact state
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Controls */}
                <div className="flex-1 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-200/50 p-6 flex flex-col items-center gap-8 justify-center min-h-0">

                    <button
                        onClick={handlePlayPause}
                        className={`w-28 h-28 rounded-[2rem] transition-all shadow-2xl active:scale-95 flex items-center justify-center ${isPlaying ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                    >
                        {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-2" />}
                    </button>

                    <button
                        onClick={handleReset}
                        className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90"
                        title="Reset Timeline"
                    >
                        <RotateCcw size={24} />
                    </button>

                    <div className="w-full flex flex-col gap-3 mt-4">
                        <div className="relative group w-full">
                            <input
                                type="range"
                                min="-1"
                                max={events.length > 0 ? events.length - 1 : 0}
                                value={currentIndex}
                                onChange={handleSliderChange}
                                className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:bg-slate-200 transition-colors relative z-10"
                            />
                            {/* Visual Progress Bar overlay */}
                            <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-3 bg-indigo-500/20 rounded-full pointer-events-none z-0"
                                style={{ width: `${events.length > 0 ? ((currentIndex + 1) / events.length) * 100 : 0}%` }}
                            />
                            {/* Milestone Pips */}
                            {milestones.map(m => {
                                const leftPercent = events.length > 1 ? (m.index / (events.length - 1)) * 100 : 0;
                                return (
                                    <div
                                        key={m.index}
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-indigo-500 rounded-full cursor-pointer z-20 hover:scale-[1.75] hover:bg-indigo-50 hover:border-indigo-600 transition-all shadow-md group/pip flex items-center justify-center peer"
                                        style={{ left: `calc(${leftPercent}% - 6px)` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentIndex(m.index);
                                            if (replayManagerRef.current) {
                                                replayManagerRef.current.jumpTo(m.index);
                                            }
                                        }}
                                    >
                                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-2xl opacity-0 scale-90 group-hover/pip:opacity-100 group-hover/pip:scale-100 transition-all pointer-events-none whitespace-nowrap z-50">
                                            {m.name}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Start</span>
                            <span className="text-sm font-black text-indigo-600 tabular-nums bg-indigo-50 px-3 py-1 rounded-xl">
                                {(currentIndex + 1).toString().padStart(2, '0')} <span className="text-indigo-300 font-bold mx-0.5">/</span> {events.length.toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>

                    {/* US8: Collaborator Filters UI */}
                    {collaborators.length > 0 && (
                        <div className="w-full mt-2 flex flex-col gap-3">
                            <div className="flex items-center gap-2 px-1">
                                <Users size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter Contributors</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {collaborators.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleCollaborator(c.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border flex items-center gap-2 active:scale-95 ${!hiddenCollaborators.has(c.id)
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                            : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${!hiddenCollaborators.has(c.id) ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 w-full mt-auto">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Playback Speed</span>
                        <div className="flex items-center justify-between bg-slate-100/50 rounded-2xl p-1.5 border border-slate-200/50 w-full">
                            {[0.5, 1, 2, 5].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => {
                                        setPlaybackSpeed(speed);
                                        if (replayManagerRef.current) {
                                            replayManagerRef.current.setSpeed(speed);
                                        }
                                    }}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${playbackSpeed === speed ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Visual focus hint for the canvas */}
            {isPlaying && (
                <div className="absolute top-8 left-8 text-indigo-500 flex items-center gap-2 animate-in fade-in z-50 pointer-events-none bg-white/80 backdrop-blur px-4 py-2 rounded-2xl shadow-lg border border-indigo-100">
                    <Activity size={16} className="animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">Replaying Events</span>
                </div>
            )}

            {/* Rollback Warning Modal Overlay */}
            {showRollbackModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in pointer-events-auto"
                        onClick={() => setShowRollbackModal(false)}
                    />
                    <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 flex flex-col gap-6 pointer-events-auto">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center self-center shrink-0 mb-2">
                            <AlertTriangle size={32} />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Irreversible Rollback</h2>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed">
                                Rolling back will <strong className="text-red-500">permanently destroy</strong> all timeline events and drawing progress that occurred after this exact moment.
                                <br /><br />
                                We strongly recommend creating a <strong className="text-indigo-600">Branch</strong> instead, which will duplicate this state instantly and keep your current timeline perfectly safe.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 mt-4">
                            <button
                                onClick={handleRollbackBranch}
                                disabled={isBranching}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 disabled:active:scale-100"
                            >
                                {isBranching ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Creating Branch...
                                    </>
                                ) : (
                                    <>
                                        <GitBranch size={16} />
                                        Create Branch Instead (Recommended)
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleRollbackConfirm}
                                className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center shadow-sm active:scale-95"
                            >
                                Yes, Force Rollback
                            </button>
                            <button
                                onClick={() => setShowRollbackModal(false)}
                                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimelineControls;
