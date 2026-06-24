import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { Send, X, MessageSquare, Loader } from 'lucide-react';

export default function ChatPanel({ meetingId, socket, currentUser, isOpen, onClose, isDisabled, isHost, isDark }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!meetingId || !isOpen) return;

    fetchMessages();

    if (socket) {
      socket.on('chat-message', handleIncomingMessage);
    }

    return () => {
      if (socket) {
        socket.off('chat-message', handleIncomingMessage);
      }
    };
  }, [meetingId, isOpen, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch meeting messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIncomingMessage = (newMsg) => {
    if (newMsg.meetingId === meetingId) {
      setMessages(prev => {
        // Prevent duplicate appending
        if (prev.some(m => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    const payload = {
      roomId: meetingId,
      senderId: currentUser?._id,
      senderName: currentUser?.name || 'Anonymous',
      message: inputValue.trim()
    };

    socket.emit('chat-message', payload);
    setInputValue('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div className={`w-full border-l flex flex-col h-full z-40 animate-in slide-in-from-right duration-300 ${
      isDark ? 'border-slate-800 bg-[#0a0a0c] text-slate-300' : 'border-slate-200 bg-white'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
      }`}>
        <div className="flex items-center gap-2">
          <MessageSquare className={`${isDark ? 'text-indigo-400' : 'text-indigo-600'} w-4 h-4`} />
          <h4 className={`text-xs font-black tracking-tight uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>Meeting Chat</h4>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Message list */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar ${
        isDark ? 'bg-slate-950/20' : 'bg-slate-50/20'
      }`}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Loader className="animate-spin mr-2" size={16} />
            <span className="text-xs">Loading chat logs...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <MessageSquare size={24} className="mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">
              No messages. Send a message to start chatting!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender === currentUser?._id;
            return (
              <div key={msg._id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-0.5`}>
                <span className="text-[8px] font-bold text-slate-400 px-1">
                  {isMe ? 'You' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed shadow-sm ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : isDark
                      ? 'bg-slate-900 border border-slate-800/80 text-slate-200 rounded-tl-none'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                }`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className={`p-3 border-t ${
        isDark ? 'border-slate-805/80 bg-[#0a0a0c]' : 'border-slate-100 bg-white'
      }`}>
        <div className="relative flex items-center">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isDisabled && !isHost}
            placeholder={isDisabled && !isHost ? "Chat disabled by host" : "Type a message..."}
            className={`w-full border rounded-xl py-2.5 pl-4 pr-10 text-xs font-semibold focus:ring-2 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400'
            }`}
          />
          <button
            type="submit"
            disabled={(isDisabled && !isHost) || !inputValue.trim()}
            className="absolute right-2 w-7.5 h-7.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg flex items-center justify-center transition-all active:scale-95"
            style={{ width: '28px', height: '28px' }}
          >
            <Send size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}
