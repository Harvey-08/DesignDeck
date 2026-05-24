import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    User, Mail, Lock, Shield, ChevronLeft,
    CheckCircle2, AlertCircle, Loader2, LogOut, Edit2, Save
} from 'lucide-react';
import { API_BASE_URL } from '../config';

const Profile = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isGuest = localStorage.getItem('isGuest') === 'true';

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user.name || '');
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    if (isGuest) {
        return (
            <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center p-6">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-lg text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-8 shadow-inner">
                        <Shield size={40} />
                    </div>
                    <h2 className="text-3xl font-black mb-4">Guest Mode</h2>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg">
                        You are currently exploring Design Deck as a guest. Profiles and password settings are only available for registered users.
                    </p>
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => {
                                localStorage.removeItem('isGuest');
                                navigate('/register');
                            }}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                        >
                            Create Account
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('isGuest');
                                navigate('/login');
                            }}
                            className="text-indigo-500 font-bold hover:text-indigo-700 transition-colors py-2"
                        >
                            Sign In Instead
                        </button>
                        <Link to="/dashboard" className="text-slate-400 font-bold hover:text-slate-600 transition-colors py-2">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleUpdateName = async () => {
        if (!newName.trim() || newName === user.name) {
            setIsEditingName(false);
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const res = await axios.put(`${API_BASE_URL}/auth/update-profile`,
                { name: newName },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local storage
            const updatedUser = { ...user, name: res.data.name };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setStatus({ type: 'success', message: 'Profile updated successfully!' });
            setIsEditingName(false);
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update name' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            setStatus({ type: 'error', message: 'New passwords do not match' });
            return;
        }

        setStatus({ type: '', message: '' });
        setLoading(true);

        try {
            await axios.put(`${API_BASE_URL}/auth/update-password`, {
                currentPassword: passwords.current,
                newPassword: passwords.new
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ type: 'success', message: 'Password updated successfully!' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAFC] text-slate-800 font-sans p-6 lg:p-12">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-sm uppercase tracking-widest mb-12 group"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Sidebar / Info */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black mb-6 shadow-2xl shadow-indigo-100 border-4 border-white">
                                {user.name?.[0].toUpperCase()}
                            </div>

                            {isEditingName ? (
                                <div className="flex flex-col gap-2 w-full mb-4">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full text-center bg-slate-50 border-2 border-indigo-100 rounded-xl py-2 px-4 font-bold outline-none focus:border-indigo-500 transition-all"
                                        placeholder="Enter Your Name"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleUpdateName}
                                            className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <Save size={14} /> Save Name
                                        </button>
                                        <button
                                            onClick={() => { setIsEditingName(false); setNewName(user.name); }}
                                            className="flex-1 bg-slate-100 text-slate-400 py-2 rounded-xl text-xs font-black uppercase tracking-widest"
                                        >
                                            Cancel Edit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center mb-8 group">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-black">{user.name}</h2>
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{user.email}</p>
                                </div>
                            )}

                            <button
                                onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                                className="w-full flex items-center justify-center gap-3 py-4 text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>

                        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100">
                            <Shield className="mb-4 opacity-50" size={32} />
                            <h3 className="text-lg font-black mb-2">Account Security</h3>
                            <p className="text-indigo-100 text-sm font-medium leading-relaxed">
                                Keep your creative workspaces safe. Use a unique password that you don't use elsewhere.
                            </p>
                        </div>
                    </div>

                    {/* Main Settings */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-inner">
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black">Security Settings</h2>
                                    <p className="text-slate-400 font-medium">Update your password</p>
                                </div>
                            </div>

                            {status.message && (
                                <div className={`p-5 rounded-2xl mb-8 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                    <span className="font-bold text-sm">{status.message}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpdatePassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Current Password</label>
                                    <input
                                        type="password"
                                        name="current"
                                        required
                                        value={passwords.current}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        placeholder="Enter Current Password"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                                        <input
                                            type="password"
                                            name="new"
                                            required
                                            minLength={6}
                                            value={passwords.new}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                            placeholder="Enter New Password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            name="confirm"
                                            required
                                            value={passwords.confirm}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                            placeholder="Confirm New Password"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Update Password'}
                                </button>
                            </form>
                        </div>

                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-inner">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black">Account Information</h2>
                                    <p className="text-slate-400 font-medium">Public details</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-6 bg-slate-50 rounded-2xl flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</span>
                                    <span className="font-bold text-slate-700">{user.name}</span>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-2xl flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</span>
                                    <span className="font-bold text-slate-700">{user.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;