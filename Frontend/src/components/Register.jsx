import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, ArrowRight, Loader2, ChevronLeft, ShieldCheck, Users, Globe } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post(`${API_BASE_URL}/auth/register`, formData);
            // Clear any guest session so the user can reach the login page
            localStorage.removeItem('isGuest');
            // Redirect to login page so the user signs in with their new credentials
            navigate('/login', { state: { registered: true } });
        } catch (err) {
            if (!err.response) {
                setError('Could not connect to the server. Please check if the backend is running.');
            } else {
                setError(err.response?.data?.message || 'Registration failed. Try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans overflow-hidden">
            {/* Left Side: Visual Section */}
            <div className="hidden md:flex flex-1 bg-slate-900 relative overflow-hidden p-16 flex-col justify-between">
                {/* Abstract Background Decoration */}
                <div className="absolute top-0 left-0 w-[80%] h-[80%] bg-indigo-500/20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[60%] h-[60%] bg-purple-500/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-3">
                            <div className="w-4 h-4 bg-white/40 rounded-sm -rotate-3" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white uppercase">Design Deck</span>
                    </div>

                    <div className="space-y-12">
                        <div className="flex gap-6 group">
                            <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <Users size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Collaborative Power</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Join thousands of creators working together in real-time. Share ideas, sketches, and prototypes instantly.</p>
                            </div>
                        </div>
                        <div className="flex gap-6 group">
                            <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Built for Students</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Simple, secure, and perfect for college group projects. Your work is saved automatically to the cloud.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                    <div className="flex items-center gap-2">
                        <Globe size={14} />
                        <span>Live Sync</span>
                    </div>
                    <div className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span>Version 1.1.0</span>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full md:w-[45%] lg:w-[40%] p-8 md:p-16 flex flex-col justify-center relative bg-[#FAFAFC]">
                <Link to="/" className="absolute top-8 right-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest group">
                    Back to Home
                    <ChevronLeft size={16} className="group-hover:translate-x-1 transition-transform rotate-180" />
                </Link>

                <div className="max-w-sm mx-auto w-full">
                    <div className="mb-10 text-center md:text-left">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Create Account</h1>
                        <p className="text-slate-500 font-medium">Get started with your collaborative canvas.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    autoComplete="off"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-slate-700 font-bold placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    autoComplete="off"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-slate-700 font-bold placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-slate-700 font-bold placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl py-4 font-black tracking-widest uppercase text-xs shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    Join Design Deck
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center text-sm font-medium text-slate-400">
                        Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline underline-offset-4">Login here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;