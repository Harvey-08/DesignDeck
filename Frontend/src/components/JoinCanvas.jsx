import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Loader2 } from 'lucide-react';

const JoinCanvas = () => {
    const { canvasId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState('');

    useEffect(() => {
        const joinCanvas = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');

            if (!token) {
                navigate(`/canvas/${canvasId}`);
                return;
            }

            try {
                const authToken = localStorage.getItem('token');

                // If not logged in, redirect to register with returnURL
                if (!authToken) {
                    localStorage.setItem('redirectAfterLogin', `/join/${canvasId}?token=${token}`);
                    navigate('/login');
                    return;
                }

                await axios.post(`${API_BASE_URL}/canvas/${canvasId}/join-via-link`,
                    { token },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );

                // Success, navigate to canvas
                navigate(`/canvas/${canvasId}`);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to join canvas. Link might be invalid or expired.');
            }
        };

        joinCanvas();
    }, [canvasId, location, navigate]);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-slate-100">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Join Failed</h2>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                        {error}
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Joining Workspace...</h2>
            <p className="text-sm font-medium text-slate-500 mt-2">Authenticating secure link</p>
        </div>
    );
};

export default JoinCanvas;
