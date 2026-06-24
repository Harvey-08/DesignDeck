import { useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import Footer from './components/Footer';
import TimelineControls from './components/TimelineControls';
import Canvas from './components/Canvas';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import LandingPage from './components/LandingPage';
import Profile from './components/Profile';
import ChatPanel from './components/ChatPanel';
import JoinCanvas from './components/JoinCanvas';
import NotificationSystem from './components/NotificationSystem';
import BotWidget from './components/Bot/BotWidget';
import MeetingLobby from './components/Meeting/MeetingLobby';
import MeetingRoom from './components/Meeting/MeetingRoom';

import { ThemeProvider } from './context/ThemeProvider';
import { useTheme } from './context/ThemeContext';
import { useLayers } from './hooks/useLayers';
import SidebarPanel from './components/Sidebar/SidebarPanel';

import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, BACKEND_URL } from './config';

// Simple Auth Guard
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const isGuest = localStorage.getItem('isGuest') === 'true';
  if (!token && !isGuest) return <Navigate to="/login" replace />;
  return children;
};

// Public Route Guard
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  // Only redirect if there is a real authenticated user token.
  // Guests (isGuest=true but no token) should still be able to access login/register.
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function CanvasWorkspace({ canvasEngineRef }) {
  const { canvasId } = useParams();
  const navigate = useNavigate();
  const { t, theme, toggleTheme } = useTheme();

  const [activeTool, setActiveTool] = useState('draw');
  const [brushColor, setBrushColor] = useState('#8b5cf6');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [eraserStrength, setEraserStrength] = useState(100);
  const [gridOpacity, setGridOpacity] = useState(30);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false); // Default closed
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false); // Default closed
  const [fillEnabled, setFillOn] = useState(false);
  const [canvasMetadata, setCanvasMetadata] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthorshipMode, setIsAuthorshipMode] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`meeting_open_${canvasId}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [activeMeeting, setActiveMeeting] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`active_meeting_${canvasId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [meetingCollaborationDisabled, setMeetingCollaborationDisabled] = useState(false);
  
  const [searchParams] = useSearchParams();
  const meetingIdParam = searchParams.get('meetingId');

  useEffect(() => {
    if (canvasId) {
      sessionStorage.setItem(`meeting_open_${canvasId}`, isMeetingOpen ? 'true' : 'false');
    }
  }, [isMeetingOpen, canvasId]);

  useEffect(() => {
    if (canvasId) {
      if (activeMeeting) {
        sessionStorage.setItem(`active_meeting_${canvasId}`, JSON.stringify(activeMeeting));
      } else {
        sessionStorage.removeItem(`active_meeting_${canvasId}`);
      }
    }
  }, [activeMeeting, canvasId]);

  const [meetingPosition, setMeetingPosition] = useState({ x: window.innerWidth - 504, y: 80 });
  const dragStartRef = useRef(null);

  useEffect(() => {
    setMeetingPosition({
      x: window.innerWidth - 504,
      y: 80
    });
  }, []);

  const handleMeetingDragStart = (e) => {
    if (e.button !== 0) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: meetingPosition.x,
      posY: meetingPosition.y
    };

    const handlePointerMove = (moveEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      
      let newX = dragStartRef.current.posX + dx;
      let newY = dragStartRef.current.posY + dy;

      const minX = 10;
      const maxX = window.innerWidth - (isMeetingOpen ? 500 : 80);
      const minY = 10;
      const maxY = window.innerHeight - (isMeetingOpen ? 400 : 80);

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setMeetingPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    if (meetingIdParam) {
      setIsMeetingOpen(true);
    }
  }, [meetingIdParam]);

  // Layer State
  const [activeLayerId, setActiveLayerId] = useState(null);
  const { layers, ...layerMethods } =
    useLayers(canvasEngineRef.current, activeLayerId, setActiveLayerId);

  const layerActions = { setActiveLayerId, ...layerMethods };

  useEffect(() => {
    fetchCanvasMetadata();
    fetchRelatedBranches();
  }, [canvasId]);

  useEffect(() => {
    if (!canvasId) return;

    console.log(`[Socket] Connecting to session for canvasId: ${canvasId}`);
    const socket = io(BACKEND_URL);

    socket.emit('join_session', canvasId);

    socket.on('member_role_updated', (data) => {
      console.log(`[Socket] member_role_updated received in CanvasWorkspace:`, data);
      fetchCanvasMetadata();
    });

    return () => {
      console.log(`[Socket] Disconnecting from session: ${canvasId}`);
      socket.disconnect();
    };
  }, [canvasId]);


  const fetchCanvasMetadata = async () => {
    const token = localStorage.getItem('token');
    const isGuestCanvas = canvasId.startsWith('guest-');
    if (!token && !isGuestCanvas) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/canvas/${canvasId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer null' }
      });
      setCanvasMetadata(res.data);
    } catch (err) {
      console.error('Error fetching canvas metadata:', err);
    }
  };

  const fetchRelatedBranches = async () => {
    const token = localStorage.getItem('token');
    const isGuestCanvas = canvasId.startsWith('guest-');
    if (!token && !isGuestCanvas) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/canvas/${canvasId}/branches`, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer null' }
      });
      setBranches(res.data);
    } catch (err) {
      console.error('Error fetching related branches:', err);
    }
  };

  const handleBranch = async () => {
    const token = localStorage.getItem('token');
    const isGuestCanvas = canvasId.startsWith('guest-');
    if (!token && !isGuestCanvas) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/canvas/${canvasId}/branch`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer null' }
      });
      navigate(`/canvas/${res.data.canvasId}`);
    } catch (err) {
      console.error('Error branching canvas:', err);
      alert('Failed to create branch');
    }
  };

  // Compute User Role
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const getRole = () => {
    if (canvasId.startsWith('guest-')) return 'owner';
    if (!canvasMetadata) return 'viewer';
    const isOwner = canvasMetadata.owner?._id === currentUser._id || canvasMetadata.owner === currentUser._id;
    if (isOwner) return 'owner';
    
    if (isMeetingOpen) {
      if (meetingCollaborationDisabled) return 'viewer';
      const member = canvasMetadata.members?.find(m => {
        const mId = m.user?._id || m.user;
        return mId && mId.toString() === currentUser._id?.toString();
      });
      if (member) return member.role || 'editor';
      return 'editor';
    }

    const member = canvasMetadata.members?.find(m => {
      const mId = m.user?._id || m.user;
      return mId && mId.toString() === currentUser._id?.toString();
    });
    return member?.role || 'viewer';
  };
  const userRole = getRole();

  useEffect(() => {
    if (canvasEngineRef.current) {
      canvasEngineRef.current.setUserRole(userRole);
    }
  }, [userRole]);

  const handleNameChange = async (newName) => {
    const token = localStorage.getItem('token');
    if (!token && !canvasId.startsWith('guest-')) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/canvas/${canvasId}/name`,
        { name: newName },
        { headers: { Authorization: token ? `Bearer ${token}` : 'Bearer null' } }
      );
      setCanvasMetadata(res.data);
      fetchRelatedBranches();
    } catch (err) {
      console.error('Error updating canvas name:', err);
    }
  };

  const handleAuthorshipToggle = () => {
    const newVal = !isAuthorshipMode;
    setIsAuthorshipMode(newVal);
    if (canvasEngineRef.current) {
      canvasEngineRef.current.setAuthorshipMode(newVal);
    }
  };

  const handleDeleteBranch = async (targetCanvasId) => {
    const token = localStorage.getItem('token');
    if (!token && !targetCanvasId.startsWith('guest-')) return;
    try {
      await axios.delete(`${API_BASE_URL}/canvas/${targetCanvasId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer null' }
      });
      if (targetCanvasId === canvasId) {
        // Find the Master branch to switch back to
        const master = branches.find(b => b.isMaster);
        if (master && master.canvasId !== targetCanvasId) {
          navigate(`/canvas/${master.canvasId}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        fetchRelatedBranches();
      }
    } catch (err) {
      console.error('Error deleting branch:', err);
    }
  };

  const onLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const clearCanvas = () => {
    if (canvasEngineRef.current) canvasEngineRef.current.clearAll();
  };

  const handleTagState = async () => {
    const tagName = window.prompt("Enter a name for this timeline marker (e.g. 'Finished sketching base'):");
    if (!tagName || !tagName.trim()) return;

    const token = localStorage.getItem('token');
    const isGuestCanvas = canvasId.startsWith('guest-');
    if (!token && !isGuestCanvas) return;

    try {
      await axios.post(`${API_BASE_URL}/canvas/${canvasId}/tag`,
        { name: tagName.trim() },
        { headers: { Authorization: token ? `Bearer ${token}` : 'Bearer null' } }
      );
      // Let the user know it worked visually (since prompt halts the UI, a simple alert or just silent success is fine, let's keep it silent if success)
    } catch (err) {
      console.error('Error tagging timeline:', err);
      alert('Failed to tag timeline state');
    }
  };
  const handleImportAction = (format) => {
    if (!canvasEngineRef.current) return;
    const input = document.createElement('input');
    input.type = 'file';
    if (format === 'json') {
      input.accept = '.json';
    } else if (format === 'png') {
      input.accept = 'image/png';
    } else if (format === 'jpeg') {
      input.accept = 'image/jpeg, image/jpg';
    }
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      if (format === 'json') {
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            canvasEngineRef.current.importFromJson(data);
          } catch (err) {
            console.error('Invalid JSON', err);
            alert('Invalid JSON file format.');
          }
        };
        reader.readAsText(file);
      } else {
        reader.onload = (event) => {
          canvasEngineRef.current.importFromImage(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleAction = (actionId) => {
    if (!canvasEngineRef.current) return;
    switch (actionId) {
      case 'undo':
        canvasEngineRef.current.undo();
        break;
      case 'redo':
        canvasEngineRef.current.redo();
        break;
      case 'clear':
        clearCanvas();
        break;
      case 'export-png':
        canvasEngineRef.current.exportToImage('png');
        break;
      case 'export-jpeg':
        canvasEngineRef.current.exportToImage('jpeg');
        break;
      case 'export-json':
        canvasEngineRef.current.exportToJson();
        break;
      case 'tag':
        handleTagState();
        break;
      case 'toggle-focus':
        canvasEngineRef.current.toggleDistractionFreeMode();
        // Force a re-render of Toolbar UI block using a dummy state if we want visual feedback (optional)
        break;
      case 'dashboard':
        navigate('/');
        break;
      default:
        break;
    }
  };

  /**
   * Prompts the user to choose between PNG and JSON export formats.
   * Triggered by both the TopBar Download button and the Toolbar Export tool.
   * OK  → exports the canvas as a PNG image (canvas.png)
   * Cancel → exports the full project as a JSON file (canvas-project.json)
   */
  const handleExport = () => {
    if (!canvasEngineRef.current) return;
    const wantsPNG = window.confirm(
      'Export canvas\n\n• Click OK to download as PNG image\n• Click Cancel to download as JSON project file'
    );
    if (wantsPNG) {
      canvasEngineRef.current.exportPNG();
    } else {
      canvasEngineRef.current.exportProjectJSON();
    }
  };

  const handlePreviewAction = (actionId, enabled) => {
    if (!canvasEngineRef.current) return;
    if (actionId === 'undo') canvasEngineRef.current.setUndoPreview(enabled);
    else if (actionId === 'redo') canvasEngineRef.current.setRedoPreview(enabled);
  };

  useEffect(() => {
    const handleStateChange = (e) => {
      const { key, value } = e.detail;
      if (key === 'brushOptions') {
        if (value.color) setBrushColor(value.color);
        if (value.width) setBrushSize(value.width);
        if (value.opacity) setBrushOpacity(Math.round(value.opacity * 100));
      }
      if (key === 'tool') setActiveTool(value);
      if (key === 'selection') {
        setActiveLayerId(value);
        if (value && canvasEngineRef.current) {
          const obj = canvasEngineRef.current.getObject(value);
          if (obj && obj.style) {
            if (obj.style.color) setBrushColor(obj.style.color);
            if (obj.style.width) setBrushSize(obj.style.width);
            if (obj.style.opacity !== undefined) setBrushOpacity(Math.round(obj.style.opacity * 100));
            if (obj.style.fontFamily) setFontFamily(obj.style.fontFamily);
            if (obj.style.fillColor) setFillOn(obj.style.fillColor !== 'transparent');
          }
        }
      }
    };
    window.addEventListener('engineStateChange', handleStateChange);
    return () => window.removeEventListener('engineStateChange', handleStateChange);
  }, [branches]);

  if (activeMeeting) {
    return (
      <MeetingRoom
        meetingId={activeMeeting.meetingId}
        title={activeMeeting.title}
        hostId={activeMeeting.hostId}
        videoDeviceId={activeMeeting.videoDeviceId}
        audioDeviceId={activeMeeting.audioDeviceId}
        initialVideoOff={activeMeeting.initialVideoOff}
        initialMuted={activeMeeting.initialMuted}
        onLeaveWorkspace={() => {
          setActiveMeeting(null);
          setIsMeetingOpen(false);
          const isGuest = localStorage.getItem('isGuest') === 'true';
          if (isGuest) {
            navigate('/');
          } else {
            navigate('/dashboard');
          }
        }}
        canvasId={canvasId}
        canvasEngineRef={canvasEngineRef}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        brushOpacity={brushOpacity}
        setBrushOpacity={setBrushOpacity}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        eraserStrength={eraserStrength}
        setEraserStrength={setEraserStrength}
        fillEnabled={fillEnabled}
        setFillOn={setFillOn}
        gridOpacity={gridOpacity}
        setGridOpacity={setGridOpacity}
        canvasMetadata={canvasMetadata}
        fetchCanvasMetadata={fetchCanvasMetadata}
        userRole={userRole}
        currentUser={currentUser}
        clearCanvas={clearCanvas}
        handleAction={handleAction}
        handleImportAction={handleImportAction}
        isPropertiesOpen={isPropertiesOpen}
        setIsPropertiesOpen={setIsPropertiesOpen}
        layers={layers}
        activeLayerId={activeLayerId}
        layerActions={layerActions}
        isTimelineOpen={isTimelineOpen}
        setIsTimelineOpen={setIsTimelineOpen}
        isAuthorshipMode={isAuthorshipMode}
        onAuthorshipToggle={handleAuthorshipToggle}
      />
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden font-sans transition-colors duration-300" style={{ background: t.workspaceBg }}>

      {/* TopBar (64px specified) */}
      <div className="h-16 shrink-0 relative z-50 transition-colors" style={{ background: t.topbarBg, borderBottom: `1px solid ${t.topbarBorder}` }}>
        <TopBar
          canvas={{ canvasId, owner: canvasMetadata?.owner, members: canvasMetadata?.members, refetch: fetchCanvasMetadata }}
          canvasName={canvasMetadata?.name}
          onNameChange={handleNameChange}
          onClear={() => handleAction('clear')}
          onDashboard={() => navigate('/dashboard')}
          onLogout={onLogout}
          userRole={userRole}
          onExport={(format) => handleAction(`export-${format}`)}
          onImport={handleImportAction}
          onTag={() => handleAction('tag')}
          branches={branches}
          onBranch={handleBranch}
          onBranchDelete={handleDeleteBranch}
          isTimelineOpen={isTimelineOpen}
          setIsTimelineOpen={setIsTimelineOpen}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isMeetingOpen={isMeetingOpen}
          setIsMeetingOpen={setIsMeetingOpen}
          isAuthorshipMode={isAuthorshipMode}
          onAuthorshipToggle={handleAuthorshipToggle}
          engine={canvasEngineRef.current}
        />
      </div>

      <ChatPanel
        canvasId={canvasId}
        engine={canvasEngineRef.current}
        currentUser={currentUser}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <TimelineControls
        canvasId={canvasId}
        engine={canvasEngineRef.current}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
      />

      <div className="flex-1 flex overflow-hidden relative">

        {/* WebRTC meeting is now rendered as a floating draggable/minimizable widget, and setup lobby is inside Lobby Modal */}

        {/* Toolbar (left, 64px specified) */}
        <div className={`absolute top-0 bottom-0 left-0 z-40 flex items-center transition-all duration-500 ease-spring ${isToolbarOpen ? 'translate-x-0' : 'translate-x-[-100px]'}`}>
          <div className="px-4 py-8 flex items-center">
            <Toolbar activeTool={activeTool} onToolChange={setActiveTool} onAction={handleAction} onPreviewAction={handlePreviewAction} userRole={userRole} />
          </div>

          {/* Left Toggle Handle */}
          <button
            onClick={() => setIsToolbarOpen(!isToolbarOpen)}
            className="w-8 h-24 bg-white/80 backdrop-blur-xl border border-slate-200 border-l-0 rounded-r-2xl flex flex-col items-center justify-center gap-1 hover:bg-white transition-all shadow-[10px_0_20px_rgba(0,0,0,0.05)] group"
          >
            <div className={`w-1 h-1 rounded-full transition-all ${isToolbarOpen ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-indigo-400'}`} />
            <div className={`w-1 h-1 rounded-full transition-all ${isToolbarOpen ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-indigo-400'}`} />
            <div className={`w-1 h-1 rounded-full transition-all ${isToolbarOpen ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-indigo-400'}`} />
          </button>
        </div>

        <main className="flex-1 relative flex items-center justify-center">
          {/* Central Canvas */}
          <div className="w-full h-full overflow-hidden" style={{ background: t.workspaceBg }}>
            <Canvas
              canvasId={canvasId}
              canvasEngineRef={canvasEngineRef}
              activeTool={activeTool}
              brushColor={brushColor}
              brushSize={brushSize}
              brushOpacity={brushOpacity}
              fontFamily={fontFamily}
              eraserStrength={eraserStrength}
              fillEnabled={fillEnabled}
              gridOpacity={gridOpacity}
              userRole={userRole}
              currentUser={currentUser}
            />
          </div>

          <div className={`absolute top-0 bottom-0 right-0 z-[100] flex items-center transition-all duration-500 ease-spring ${isPropertiesOpen ? 'translate-x-0' : 'translate-x-[320px]'}`}>
            {/* Toggle Handle */}
            <button
              onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
              className="w-8 h-24 bg-white/80 backdrop-blur-xl border border-slate-200 border-r-0 rounded-l-2xl flex flex-col items-center justify-center gap-1 hover:bg-white transition-all shadow-[-10px_0_20px_rgba(0,0,0,0.05)] group"
            >
              <div className={`w-1 h-1 rounded-full transition-all ${isPropertiesOpen ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-indigo-400'}`} />
              <div className={`w-1 h-1 rounded-full transition-all ${isPropertiesOpen ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-indigo-400'}`} />
              <div className={`w-1 h-1 rounded-full transition-all ${isPropertiesOpen ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-indigo-400'}`} />
            </button>

            <div className="w-[320px] h-full p-6 pl-0">
              <SidebarPanel
                engine={canvasEngineRef.current}
                layers={layers}
                activeLayerId={activeLayerId}
                actions={layerActions}
                propertiesProps={{
                  brushColor,
                  strokeWidth: brushSize,
                  strokeOpacity: brushOpacity,
                  gridOpacity,
                  fontFamily,
                  onFontFamilyChange: setFontFamily,
                  onBrushColorChange: setBrushColor,
                  onStrokeWidthChange: setBrushSize,
                  onStrokeOpacityChange: setBrushOpacity,
                  onGridOpacityChange: setGridOpacity,
                  fillEnabled,
                  onFillToggle: () => setFillOn(!fillEnabled),
                  activeTool,
                  eraserStrength,
                  onEraserStrengthChange: setEraserStrength
                }}
              />
            </div>
          </div>
        </main>
        <BotWidget 
          canvasEngineRef={canvasEngineRef} 
          isDark={theme === 'dark'}
          style={{ 
            right: isPropertiesOpen ? '336px' : '16px' 
          }} 
        />
      </div>

      {/* Lobby Modal Overlay */}
      {isMeetingOpen && !activeMeeting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsMeetingOpen(false)}
              className="absolute top-6 right-6 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 z-50"
            >
              Close
            </button>
            <MeetingLobby
              canvasId={canvasId}
              initialMeetingId={meetingIdParam}
              onJoin={(meetingConfig) => {
                setActiveMeeting(meetingConfig);
                setIsMeetingOpen(true); // Ensure call is expanded when started/joined
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Call Widget */}
      {activeMeeting && (
        <div
          style={{
            position: 'fixed',
            left: `${meetingPosition.x}px`,
            top: `${meetingPosition.y}px`,
            zIndex: 90
          }}
          className={`bg-slate-950 text-white shadow-2xl border border-slate-800 flex flex-col transition-all duration-300 ${
            !isMeetingOpen 
              ? 'w-14 h-14 rounded-full cursor-pointer hover:scale-105 items-center justify-center' 
              : 'w-[480px] h-[380px] rounded-[2rem] overflow-hidden'
          }`}
        >
          {!isMeetingOpen ? (
            <div 
              onPointerDown={handleMeetingDragStart}
              onClick={() => setIsMeetingOpen(true)}
              className="relative w-full h-full flex items-center justify-center"
              title="Call in progress. Click to expand."
            >
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md">
                <Video size={18} />
              </div>
            </div>
          ) : (
            <MeetingRoom
              meetingId={activeMeeting.meetingId}
              title={activeMeeting.title}
              hostId={activeMeeting.hostId}
              videoDeviceId={activeMeeting.videoDeviceId}
              audioDeviceId={activeMeeting.audioDeviceId}
              initialVideoOff={activeMeeting.initialVideoOff}
              initialMuted={activeMeeting.initialMuted}
              onLeaveWorkspace={() => {
                setActiveMeeting(null);
                setIsMeetingOpen(false);
              }}
              onDragStart={handleMeetingDragStart}
              onMinimize={() => setIsMeetingOpen(false)}
              onCollaborationChange={(disabled) => setMeetingCollaborationDisabled(disabled)}
            />
          )}
        </div>
      )}

      {/* BottomBar (40px specified) */}
      <footer className="h-10 shrink-0 border-t flex items-center justify-between px-8 text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
        style={{ background: t.bottomBg, borderTop: `1px solid ${t.topbarBorder}`, color: t.bottomText }}>
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <span>Canvas ID</span>
            <span style={{ color: t.badgeText }} className="font-mono">{canvasId}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Tool</span>
            <span style={{ color: t.badgeText }}>{activeTool}</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
            <span>Live Sync Active</span>
          </div>
          <div className="w-px h-3" style={{ background: t.topbarBorder }} />
          <span>Version 1.2.0</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const canvasEngineRef = useRef(null);
  return (
    <Router>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/canvas/:canvasId" element={<ProtectedRoute><CanvasWorkspace canvasEngineRef={canvasEngineRef} /></ProtectedRoute>} />
          <Route path="/join/:canvasId" element={<JoinCanvas />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NotificationSystem />
      </ThemeProvider>
    </Router>
  );
}
