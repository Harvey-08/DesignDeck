import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    ArrowRight, 
    MousePointer2, 
    Zap, 
    Layout, 
    Save, 
    LogOut, 
    Users, 
    Type,
    CheckCircle2
} from 'lucide-react';

const LandingPage = () => {
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        window.location.reload();
    };

    const handleGuestJoin = () => {
        const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.clear();
        localStorage.setItem('isGuest', 'true');
        localStorage.setItem('user', JSON.stringify({ name: `Guest_${Math.floor(Math.random() * 8999) + 1000}` }));
        
        // Go directly to a canvas to prove it works
        window.location.assign(`/canvas/${guestId}`);
    };

    return (
        <div className="w-full bg-[#FAFAFC] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
            {/* Minimal Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center rotate-3 shadow-md shadow-indigo-100">
                            <div className="w-3 h-3 bg-white/40 rounded-sm -rotate-3" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-800">Design Deck</span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        {token || localStorage.getItem('isGuest') ? (
                            <>
                                <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2">
                                    <LogOut size={14} />
                                    Logout
                                </button>
                                <Link 
                                    to="/dashboard" 
                                    className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                                >
                                    Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <button onClick={handleGuestJoin} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">
                                    Continue as Guest
                                </button>
                                <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                                    Sign In
                                </Link>
                                <Link 
                                    to="/login" 
                                    className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                                >
                                    Start Here
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* 1. Hero Section */}
            <section className="relative pt-40 pb-24 px-6 overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1]">
                        Collaborate. Draw. Design — <br/>
                        <span className="text-indigo-600">Together in Real Time.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                        A shared canvas for teams and students to work together instantly, from anywhere.
                    </p>
                    <Link 
                        to="/login" 
                        className="inline-flex items-center gap-3 bg-indigo-600 text-white px-12 py-6 rounded-2xl text-lg font-black tracking-wide hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1 group"
                    >
                        Start Here
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                    </Link>
                </div>
                
                {/* Background soft accents */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-50 blur-[100px] rounded-full opacity-60" />
                    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-50 blur-[100px] rounded-full opacity-60" />
                </div>
            </section>

            {/* 2. What Design Deck Does */}
            <section className="py-24 bg-white border-y border-slate-100 px-6">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                    <div className="flex items-center gap-5">
                        <div className="shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <p className="text-xl font-bold text-slate-700 leading-tight">Real-time collaboration on a shared canvas</p>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Layout size={24} />
                        </div>
                        <p className="text-xl font-bold text-slate-700 leading-tight">Simple drawing, shapes, and text tools</p>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Zap size={24} />
                        </div>
                        <p className="text-xl font-bold text-slate-700 leading-tight">Instantly join or create sessions</p>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Save size={24} />
                        </div>
                        <p className="text-xl font-bold text-slate-700 leading-tight">Your work is saved automatically</p>
                    </div>
                </div>
            </section>

            {/* 3. How It Works (Simple Flow) */}
            <section className="py-24 px-6 bg-[#FAFAFC]">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-black text-slate-900 mb-16 text-center">How It Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="text-center group">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-6 shadow-xl group-hover:bg-indigo-600 transition-colors">1</div>
                            <h3 className="text-xl font-bold mb-2">Sign in to Design Deck</h3>
                            <p className="text-slate-400 font-medium">Access your personal hub instantly.</p>
                        </div>
                        <div className="text-center group">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-6 shadow-xl group-hover:bg-indigo-600 transition-colors">2</div>
                            <h3 className="text-xl font-bold mb-2">Start or join a session</h3>
                            <p className="text-slate-400 font-medium">Create a new canvas or invite others.</p>
                        </div>
                        <div className="text-center group">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-6 shadow-xl group-hover:bg-indigo-600 transition-colors">3</div>
                            <h3 className="text-xl font-bold mb-2">Collaborate live with others</h3>
                            <p className="text-slate-400 font-medium">Sync ideas and designs in real-time.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Visual Section (Canvas Preview) */}
            <section className="px-6 py-24 bg-white border-t border-slate-100">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-slate-50 rounded-[3rem] p-4 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="bg-white rounded-[2.2rem] aspect-[16/9] flex items-center justify-center relative overflow-hidden shadow-inner">
                            {/* Visual Illustration Elements */}
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-50 border-2 border-indigo-100 rounded-3xl rotate-12 flex items-center justify-center text-indigo-300">
                                <Layout size={48} />
                            </div>
                            <div className="absolute bottom-1/3 right-1/4 w-48 h-24 bg-purple-50 border-2 border-purple-100 rounded-full -rotate-6" />
                            <div className="absolute top-1/3 right-1/3 w-24 h-24 border-2 border-amber-100 rounded-2xl rotate-45" />
                            
                            {/* Simulated Multi-user Cursors */}
                            <div className="absolute top-1/2 left-1/2 flex flex-col items-center animate-bounce shadow-2xl" style={{ animationDuration: '4s' }}>
                                <MousePointer2 className="text-indigo-600 fill-indigo-600" size={28} />
                                <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full mt-1 tracking-wider uppercase">Team Member</div>
                            </div>
                            
                            <div className="absolute bottom-1/4 left-1/3 flex flex-col items-center opacity-80 scale-90">
                                <MousePointer2 className="text-purple-500 fill-purple-500" size={28} />
                                <div className="bg-purple-500 text-white text-[10px] font-black px-3 py-1 rounded-full mt-1 tracking-wider uppercase">Mia</div>
                            </div>

                            <div className="absolute top-1/4 right-1/4 flex flex-col items-center opacity-60 scale-75">
                                <MousePointer2 className="text-amber-500 fill-amber-500" size={28} />
                                <div className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full mt-1 tracking-wider uppercase">Alex</div>
                            </div>

                            {/* Decorative Grid */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Final CTA Section */}
            <section className="py-32 px-6">
                <div className="max-w-4xl mx-auto bg-slate-900 rounded-[3rem] p-16 text-center text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full" />

                    <h2 className="text-4xl md:text-5xl font-black mb-6 relative z-10">Start collaborating in seconds.</h2>
                    <p className="text-slate-400 font-medium mb-12 text-lg relative z-10">Free for teams and students. No credit card required.</p>
                    <Link 
                        to="/login" 
                        className="inline-flex items-center gap-3 bg-white text-slate-900 px-12 py-6 rounded-2xl text-lg font-black tracking-wide hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1 group relative z-10"
                    >
                        Start Here
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                    </Link>
                </div>
            </section>

            {/* Minimal Footer */}
            <footer className="py-16 border-t border-slate-100 text-center bg-white">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center rotate-3">
                        <div className="w-2 h-2 bg-white/40 rounded-sm" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-slate-800">Design Deck</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                    Software Engineering Project • 2026
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
