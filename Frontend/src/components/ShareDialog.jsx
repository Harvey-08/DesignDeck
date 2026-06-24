import React, { useState } from 'react';
import { X, UserPlus, Mail, User, Trash2, Loader2, ShieldCheck, Crown, Share2, Copy, Check } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const ShareDialog = ({ isOpen, onClose, canvasId, owner, members, onUpdate }) => {
    const [identifier, setIdentifier] = useState('');
    const [role, setRole] = useState('editor');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copied, setCopied] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isOwner = owner?._id === currentUser._id || owner === currentUser._id;

    const shareUrl = window.location.href;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddMember = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await axios.post(`${API_BASE_URL}/canvas/${canvasId}/invite`,
                { email: identifier, role },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess(`Invite sent to ${identifier}!`);
            setIdentifier('');
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Remove this collaborator?')) return;
        setLoading(true);
        try {
            await axios.delete(`${API_BASE_URL}/canvas/${canvasId}/members/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Collaborator removed');
            if (onUpdate) onUpdate();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove member');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMemberRole = async (userId, newRole) => {
        setLoading(true);
        try {
            await axios.put(`${API_BASE_URL}/canvas/${canvasId}/members/${userId}/role`,
                { role: newRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Role updated successfully');
            if (onUpdate) onUpdate();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update role');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-full right-0 mt-4 w-96 bg-white rounded-3xl shadow-[0_25px_70px_rgba(79,70,229,0.2)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 duration-300 z-[100] origin-top-right">
            {/* Arrow */}
            <div className="absolute top-0 right-10 w-4 h-4 bg-indigo-50/50 rotate-45 -translate-y-2 border-l border-t border-slate-100" />

            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-white relative z-10">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Share Room
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-0.5">Collaboration Settings</p>
                </div>
            </div>

            <div className="p-6 space-y-5 relative z-10">
                {/* Share Link */}
                <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Room Link</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-[11px] font-bold text-slate-500 truncate"
                            />
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className={`rounded-xl px-4 py-2.5 transition-all flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${copied ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Invite Section */}
                {isOwner ? (
                    <form onSubmit={handleAddMember} className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Invite Collaborator</label>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="email"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="User Email"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-xl px-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                >
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                                Send Invite
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-700">
                        <ShieldCheck size={18} className="shrink-0" />
                        <p className="text-[11px] font-medium leading-relaxed">Only the room owner can manage collaborators.</p>
                    </div>
                )}

                {error && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest bg-red-50 p-2.5 rounded-xl border border-red-100 text-center">{error}</p>}
                {success && <p className="text-green-500 text-[9px] font-black uppercase tracking-widest bg-green-50 p-2.5 rounded-xl border border-green-100 text-center">{success}</p>}

                {/* Members List */}
                <div className="space-y-3.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Active Editors</label>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {/* Owner */}
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-600">
                                    <Crown size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800 tracking-tight">{owner?.name || currentUser.name || 'Owner'}</p>
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Admin Owner</p>
                                </div>
                            </div>
                        </div>

                        {/* Members */}
                        {members?.map(member => (
                            <div key={member.user._id || member.user} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-slate-200 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-400">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 tracking-tight">{member.user.name || 'Member'}</p>
                                        {isOwner ? (
                                            <select
                                                value={member.role || 'editor'}
                                                onChange={(e) => handleUpdateMemberRole(member.user._id || member.user, e.target.value)}
                                                className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-500 focus:ring-0 outline-none cursor-pointer p-0 -mt-0.5"
                                            >
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        ) : (
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{member.role || 'Editor'}</p>
                                        )}
                                    </div>
                                </div>
                                {isOwner && (
                                    <button
                                        onClick={() => handleRemoveMember(member.user._id || member.user)}
                                        className="w-9 h-9 rounded-lg text-slate-300 hover:text-red-500 hover:bg-white hover:shadow-sm transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareDialog;
