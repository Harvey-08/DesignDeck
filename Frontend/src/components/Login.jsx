import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, ArrowRight, Loader2, ChevronLeft, Sparkles, Palette, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const justRegistered = location.state?.registered;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE_URL}/auth/login`, formData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data));

            const redirectUrl = localStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                localStorage.removeItem('redirectAfterLogin');
                navigate(redirectUrl);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            if (!err.response) {
                setError('Could not connect to the server. Please check if the backend is running.');
            } else {
                setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans overflow-hidden">
            {/* Left Side: Form */}
            <div className="w-full md:w-[45%] lg:w-[40%] p-8 md:p-16 flex flex-col justify-center relative bg-[#FAFAFC]">
                <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest group">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <div className="max-w-sm mx-auto w-full">
                    <div className="mb-10 text-center md:text-left">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 rotate-3 mx-auto md:mx-0">
                            <div className="w-4 h-4 bg-white/40 rounded-sm -rotate-3" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome Back</h1>
                        <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {justRegistered && (
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-bold border border-emerald-100 animate-in fade-in zoom-in">
                                Account created successfully! Please sign in.
                            </div>
                        )}
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in zoom-in">
                                {error}
                            </div>
                        )}

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
                            className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl py-4 font-black tracking-widest uppercase text-xs shadow-xl shadow-slate-100 hover:shadow-indigo-100 flex items-center justify-center gap-2 group transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    Sign In
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
                                </>
                            )}
                        </button>

                        <div className="relative flex items-center gap-4 my-8">
                            <div className="flex-1 h-px bg-slate-100" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OR</span>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
                                localStorage.clear();
                                localStorage.setItem('isGuest', 'true');
                                localStorage.setItem('user', JSON.stringify({ name: `Guest_${Math.floor(Math.random() * 8999) + 1000}` }));
                                window.location.assign(`/canvas/${guestId}`);
                            }}
                            className="w-full bg-white border-2 border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-slate-600 rounded-2xl py-4 font-black tracking-widest uppercase text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Continue as Guest
                        </button>
                    </form>

                    <div className="mt-10 text-center text-sm font-medium text-slate-400">
                        Don't have an account? <Link to="/register" className="text-indigo-600 font-bold hover:underline underline-offset-4">Sign up for free</Link>
                    </div>
                </div>
            </div>

            {/* Right Side: Visual Section */}
            <div className="hidden md:flex flex-1 bg-indigo-600 relative overflow-hidden p-16 flex-col justify-between">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-white/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-purple-500/20 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center rotate-3 border border-white/30">
                            <div className="w-4 h-4 bg-white/80 rounded-sm -rotate-3" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white uppercase">Design Deck</span>
                    </div>

                    <div className="space-y-8 max-w-lg">
                        <div className="flex gap-6">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shrink-0">
                                <Sparkles size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Create without limits</h3>
                                <p className="text-indigo-100 text-sm leading-relaxed">Experience a fluid, infinite canvas that stays in sync across your entire team.</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shrink-0">
                                <Palette size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Beautiful by default</h3>
                                <p className="text-indigo-100 text-sm leading-relaxed">Tools designed for clarity and speed, letting you focus on the ideas, not the UI.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] max-w-sm">
                        <p className="text-white font-medium italic mb-4">"Design Deck has completely transformed how our student team brainstorms. Real-time sync is flawlessly smooth."</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-400 rounded-full border-2 border-white/50" />
                            <div>
                                <p className="text-white font-black text-xs uppercase tracking-widest">Rahul Sharma</p>
                                <p className="text-indigo-200 text-[10px] font-bold">IIT Delhi Student</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;