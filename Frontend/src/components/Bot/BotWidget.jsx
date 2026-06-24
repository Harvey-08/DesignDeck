import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import './BotWidget.css';

const QUICK_PROMPTS = [
  "Draw a red circle at 200, 200",
  "Align selected notes in a grid",
  "Color selected shapes blue",
  "How do I tag a timeline milestone?"
];

export default function BotWidget({ canvasEngineRef, style, isDark = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hello! I am your DesignDeck AI Co-Pilot. I can help answer questions or draw/modify objects directly on your canvas. Try asking me to draw shapes or align elements!" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query || !query.trim()) return;

    if (!textToSend) setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setLoading(true);

    // Get current Canvas engine state for context awareness
    const engine = canvasEngineRef?.current;
    let canvasState = {
      elements: {},
      selectedObjectIds: [],
      activeTool: 'select',
      brushOptions: {}
    };

    if (engine) {
      canvasState = {
        elements: engine.sceneManager?.objects || {},
        selectedObjectIds: engine.state?.selectedObjectIds || [],
        activeTool: engine.state?.activeTool || 'select',
        brushOptions: engine.state?.brushOptions || {}
      };
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : 'Bearer null'
        },
        body: JSON.stringify({ message: query, canvasState })
      });

      if (!response.ok) {
        throw new Error('API server returned an error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let accumulatedText = '';

      // Append temporary bot message block
      setMessages(prev => [...prev, { sender: 'bot', text: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        
        // SSE formatted chunks: data: {...}\n\n
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              done = true;
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.token) {
                accumulatedText += data.token;
                // Update final chunk stream text
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].text = accumulatedText;
                  return updated;
                });
              }
            } catch (e) {
              // Ignore parser errors from split chunks
            }
          }
        }
      }

      // Resiliently check if LLM outputted action sequences in any common format
      let actionsJson = null;
      const actionsMatch = accumulatedText.match(/<actions>([\s\S]*?)<\/actions>/);
      if (actionsMatch && actionsMatch[1]) {
        actionsJson = actionsMatch[1].trim();
      } else {
        // Fallback 1: Match standard markdown code blocks (e.g. ```json ... ``` or ``` ... ```)
        const codeBlockMatch = accumulatedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          actionsJson = codeBlockMatch[1].trim();
        } else {
          // Fallback 2: Search for any JSON array block matching [{"type": ...}]
          const arrayMatch = accumulatedText.match(/(\[\s*\{[\s\S]*\}\s*\])/);
          if (arrayMatch && arrayMatch[1]) {
            actionsJson = arrayMatch[1].trim();
          }
        }
      }

      if (actionsJson) {
        try {
          const actions = JSON.parse(actionsJson);
          console.log('[BotWidget] Resiliently parsed action toolcalls:', actions);
          if (engine && Array.isArray(actions)) {
            engine.executeAIActions(actions);
          }
        } catch (e) {
          console.error('[BotWidget] Failed to parse actions JSON:', e);
        }
      }

    } catch (error) {
      console.error('[BotWidget] Error sending message:', error);
      setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I encountered an issue connecting to my model backend. Please check if your API key is configured." }]);
    } finally {
      setLoading(false);
    }
  };

  // Filters out technical action tags, markdown JSON blocks, and raw JSON arrays from display
  const getCleanText = (text) => {
    let clean = text.replace(/<actions>[\s\S]*?<\/actions>/g, '');
    clean = clean.replace(/```(?:json)?\s*\[[\s\S]*?\]\s*```/g, '');
    clean = clean.replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '');
    return clean.trim();
  };

  return (
    <div 
      className="bot-widget-container" 
      style={style} 
      data-theme={isDark ? 'dark' : undefined}
    >
      {/* Expand/Collapse Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bot-fab shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
          title="Open AI Co-Pilot"
        >
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
          <span className="bot-fab-text">AI Co-Pilot</span>
        </button>
      )}

      {/* Main Expandable Panel */}
      {isOpen && (
        <div className="bot-chat-panel animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="bot-header">
            <div className="flex items-center gap-2">
              <div className="bot-header-avatar">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="bot-title">AI Co-Pilot</span>
                <span className="bot-subtitle">Online & Ready</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="bot-close-btn hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="bot-messages-area">
            {messages.map((msg, index) => (
              <div key={index} className={`bot-bubble-wrapper ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                {msg.sender === 'bot' && (
                  <div className="bot-bubble-avatar">
                    <Bot className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
                <div className="bot-bubble">
                  {getCleanText(msg.text) || (loading && index === messages.length - 1 ? (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions */}
          {messages.length === 1 && (
            <div className="bot-suggestions">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Suggested prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSendMessage(p)}
                    className="bot-suggestion-chip hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="bot-input-area"
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Draw a green circle..."
              disabled={loading}
              className="bot-input-field focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="bot-send-btn bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
