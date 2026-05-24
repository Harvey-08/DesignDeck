import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, LogIn, LogOut, X } from 'lucide-react';

export default function NotificationSystem() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (event) => {
            const { type, payload } = event.detail;
            handleCollabEvent(type, payload);
        };

        window.addEventListener('collab:event', handler);
        return () => window.removeEventListener('collab:event', handler);
    }, []);

    const handleCollabEvent = (type, payload) => {
        const prefs = JSON.parse(localStorage.getItem('notifPrefs') || '{"sound":true,"visual":true}');

        let message = '';
        let icon = null;
        let color = 'bg-slate-800';

        if (type === 'USER_JOINED') {
            message = `${payload.name || payload.username || 'A user'} joined the session.`;
            icon = <LogIn size={16} className="text-green-400" />;
        } else if (type === 'USER_LEFT') {
            message = `${payload.name || 'A user'} left.`;
            icon = <LogOut size={16} className="text-slate-400" />;
            color = 'bg-slate-700';
        } else if (type === 'OBJECT_LOCKED') {
            message = `${payload.username || 'Someone'} is editing this object!`;
            icon = <AlertTriangle size={16} className="text-amber-400" />;
            color = 'bg-slate-800';
        } else if (type === 'SESSION_WARNING') {
            message = `Session closing in ${payload.remaining} seconds. Please save!`;
            icon = <AlertTriangle size={16} className="text-red-400" />;
            color = 'bg-red-900 border border-red-500';
        } else {
            return; // Ignore other types
        }

        if (prefs.visual) {
            addToast(message, icon, color);
        }

        if (prefs.sound) {
            // play simple ding
            try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => null);
            } catch (e) { }
        }
    };

    const addToast = (message, icon, color) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        setToasts((prev) => [...prev, { id, message, icon, color }]);
        setTimeout(() => {
            removeToast(id);
        }, 4500);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl font-medium text-[11px] text-white tracking-wide pointer-events-auto transition-all animate-in slide-in-from-right-2 fade-in ${toast.color} min-w-[200px] border border-white/10`}
                >
                    {toast.icon}
                    <span>{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="ml-auto hover:text-red-400 transition-colors">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
