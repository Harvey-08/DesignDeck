import React, { useEffect, useState, useRef } from 'react';
import { EyeOff, Eye, VolumeX, Volume2 } from 'lucide-react';

const CollaboratorBadge = ({ user, engine, isMe }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPointerHidden, setIsPointerHidden] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!engine) return;
        
        const updateState = () => {
            setIsPointerHidden(engine.isPointerHidden(user.id));
            setIsMuted(engine.isUserMuted(user.name));
        };
        
        updateState();
        
        const handleFilterChange = (e) => {
            if (e.detail?.key === 'collaboratorFiltersChanged') {
                updateState();
            }
        };
        
        window.addEventListener('engineStateChange', handleFilterChange);
        return () => window.removeEventListener('engineStateChange', handleFilterChange);
    }, [engine, user]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const togglePointer = () => {
        if (engine) engine.togglePointerVisibility(user.id);
    };

    const toggleMute = () => {
        if (engine) engine.toggleUserMute(user.name);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => !isMe && setIsOpen(!isOpen)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white uppercase transition-transform ${isOpen ? 'scale-110 z-10 border-indigo-500' : 'border-white hover:scale-110'}`}
                style={{ backgroundColor: user.color || '#F59E0B' }}
                title={user.name + (isMe ? ' (You)' : '')}
            >
                {user.name ? user.name.slice(0, 1) : '?'}
            </button>

            {isOpen && !isMe && (
                <div className="absolute top-10 right-0 w-48 bg-white border border-slate-100 shadow-xl rounded-xl p-2 z-[100] animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                    </div>
                    
                    <button 
                        onClick={togglePointer}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            {isPointerHidden ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-emerald-500" />}
                            {isPointerHidden ? 'Show Pointer' : 'Hide Pointer'}
                        </span>
                    </button>
                    
                    <button 
                        onClick={toggleMute}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-emerald-500" />}
                            {isMuted ? 'Unmute Chat' : 'Mute Chat'}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};

const CollaboratorList = ({ engine }) => {
    const [users, setUsers] = useState([]);
    const [localId, setLocalId] = useState(null);

    useEffect(() => {
        if (!engine || !engine.awareness) return;

        setLocalId(engine.doc.clientID);

        const refreshUsers = () => {
            const allStates = Array.from(engine.awareness.getStates().entries());
            const uniqueUsers = [];
            const seenIds = new Set();
            
            allStates.forEach(([clientId, state]) => {
                if (state.user && !seenIds.has(state.user.id)) {
                    // Add isLocal flag so we can identify ourselves
                    uniqueUsers.push({ ...state.user, isLocal: clientId === engine.doc.clientID });
                    seenIds.add(state.user.id);
                }
            });
            setUsers(uniqueUsers);
        };

        refreshUsers();
        engine.awareness.on('change', refreshUsers);

        return () => {
            engine.awareness.off('change', refreshUsers);
        };
    }, [engine]);

    if (users.length <= 1) return null; // Only me

    // Put local user last or first. Let's sort to keep avatars stable.
    const sortedUsers = [...users].sort((a, b) => a.id.localeCompare(b.id));

    return (
        <div className="flex items-center justify-end px-4 h-full pointer-events-auto">
            <div className="flex -space-x-2 relative z-50">
                {sortedUsers.map((user, i) => (
                    <div key={user.id || i} className="relative z-0 hover:z-50 focus-within:z-50">
                       <CollaboratorBadge user={user} engine={engine} isMe={user.isLocal} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CollaboratorList;
