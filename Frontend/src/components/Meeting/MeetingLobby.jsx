import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { Video, Mic, MicOff, VideoOff, ArrowRight, Camera, AlertTriangle, Loader } from 'lucide-react';

export default function MeetingLobby({ canvasId, onJoin, initialMeetingId }) {
  const [title, setTitle] = useState('Canvas Call');
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [previewStream, setPreviewStream] = useState(null);
  const [lobbyError, setLobbyError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [detectedMeeting, setDetectedMeeting] = useState(null);
  const [checkingActive, setCheckingActive] = useState(false);

  const previewVideoRef = useRef(null);
  const isSettingUpRef = useRef(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    setupDevices();
    checkActiveMeeting();
    return () => {
      stopPreview();
    };
  }, [canvasId]);

  useEffect(() => {
    if (selectedVideo || selectedAudio) {
      startPreview();
    }
  }, [selectedVideo, selectedAudio]);

  useEffect(() => {
    // Automatically query devices and refresh preview when site permissions change (so the user doesn't have to manually reload)
    if (navigator.permissions && navigator.permissions.query) {
      const watchPermissions = async () => {
        try {
          const camPermission = await navigator.permissions.query({ name: 'camera' });
          const micPermission = await navigator.permissions.query({ name: 'microphone' });

          const handlePermissionChange = () => {
            console.log('[Permissions] Permission state changed. Refreshing devices programmatically...');
            setupDevices();
          };

          camPermission.onchange = handlePermissionChange;
          micPermission.onchange = handlePermissionChange;
        } catch (e) {
          console.warn('Permissions API query not fully supported for camera/microphone', e);
        }
      };
      watchPermissions();
    }
  }, []);

  const toggleAudioState = () => {
    const newVal = !audioEnabled;
    setAudioEnabled(newVal);
    if (previewStream) {
      previewStream.getAudioTracks().forEach(track => {
        track.enabled = newVal;
      });
    }
  };

  const toggleVideoState = () => {
    const newVal = !videoEnabled;
    setVideoEnabled(newVal);
    if (!newVal) {
      stopPreview();
    } else {
      startPreview(true);
    }
  };

  const setupDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setLobbyError('Media devices API not supported or secure context (HTTPS) is required.');
        return;
      }

      isSettingUpRef.current = true;
      let tempStream;
      try {
        // 1. Try requesting both camera and microphone to trigger the permission prompt
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (firstErr) {
        console.warn('Could not get both video and audio. Trying separately...', firstErr);
        if (firstErr.name === 'NotAllowedError' || firstErr.message?.includes('Permission denied')) {
          throw firstErr; // Explicit user denial
        }
        
        // Try audio only (e.g. if camera is missing)
        try {
          tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (audioErr) {
          // Try video only (e.g. if mic is missing)
          try {
            tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (videoErr) {
            throw new Error('No camera or microphone devices found or accessible.');
          }
        }
      }

      // 2. Enumerate devices now that permissions are granted and labels/IDs are populated
      const grantedDevices = await navigator.mediaDevices.enumerateDevices();
      const videoList = grantedDevices.filter(d => d.kind === 'videoinput');
      const audioList = grantedDevices.filter(d => d.kind === 'audioinput');

      setVideoDevices(videoList);
      setAudioDevices(audioList);

      // Directly reuse the initial stream for preview to avoid redundant camera stop/start cycles
      setPreviewStream(tempStream);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = tempStream;
      }

      if (videoList.length > 0) setSelectedVideo(videoList[0].deviceId);
      if (audioList.length > 0) setSelectedAudio(audioList[0].deviceId);

    } catch (err) {
      console.error('Error setting up media devices:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setLobbyError('Camera/Microphone blocked. Please click the Lock icon (🔒) in the address bar, toggle Camera/Microphone to "Allow", and then refresh.');
      } else {
        setLobbyError(err.message || 'Please ensure camera & microphone permissions are granted.');
      }
    } finally {
      // Delay releasing the setting-up flag to allow state updates to settle
      setTimeout(() => {
        isSettingUpRef.current = false;
      }, 200);
    }
  };

  const checkActiveMeeting = async () => {
    if (initialMeetingId) return; // Already targeted
    setCheckingActive(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/meetings/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Find an active meeting for the current canvas
      const active = res.data.find(m => m.canvasId === canvasId && m.status === 'active');
      if (active) {
        setDetectedMeeting(active);
      }
    } catch (err) {
      console.error('Error checking active meeting:', err);
    } finally {
      setCheckingActive(false);
    }
  };

  const startPreview = async (overrideVideoEnabled = videoEnabled) => {
    if (isSettingUpRef.current) {
      console.log('Skipping startPreview execution during initial setupDevices');
      return;
    }
    stopPreview();

    // If user has camera turned off, do not request it!
    if (!overrideVideoEnabled) {
      // Still request audio if enabled
      if (audioEnabled && audioDevices.length > 0) {
        try {
          const constraints = {
            video: false,
            audio: selectedAudio ? { deviceId: selectedAudio } : true
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setPreviewStream(stream);
        } catch (err) {
          console.error('Error starting audio preview:', err);
        }
      }
      return;
    }

    try {
      const hasVideoDevice = videoDevices.length > 0;
      const hasAudioDevice = audioDevices.length > 0;

      if (!hasVideoDevice && !hasAudioDevice) return;

      const constraints = {
        video: hasVideoDevice ? (selectedVideo ? { deviceId: selectedVideo } : true) : false,
        audio: hasAudioDevice && audioEnabled ? (selectedAudio ? { deviceId: selectedAudio } : true) : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPreviewStream(stream);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting video preview:', err);
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
  };

  const handleAction = async () => {
    setLoading(true);
    setLobbyError(null);

    try {
      const token = localStorage.getItem('token');
      const targetMeetingId = initialMeetingId || detectedMeeting?.meetingId;

      if (targetMeetingId) {
        // Joining existing meeting link or detected active meeting
        const res = await axios.get(`${API_BASE_URL}/meetings/${targetMeetingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const meeting = res.data;
        if (meeting.status !== 'active') {
          setLobbyError('This meeting has already ended.');
          setLoading(false);
          return;
        }
        stopPreview();
        onJoin({
          meetingId: meeting.meetingId,
          title: meeting.title,
          hostId: meeting.host?._id || meeting.host,
          videoDeviceId: selectedVideo,
          audioDeviceId: selectedAudio,
          initialVideoOff: !videoEnabled,
          initialMuted: !audioEnabled
        });
      } else {
        // Starting a new meeting for current canvas
        const res = await axios.post(
          `${API_BASE_URL}/meetings`,
          { title: title.trim() || 'Canvas Call', canvasId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const meeting = res.data;
        stopPreview();
        onJoin({
          meetingId: meeting.meetingId,
          title: meeting.title,
          hostId: meeting.host,
          videoDeviceId: selectedVideo,
          audioDeviceId: selectedAudio,
          initialVideoOff: !videoEnabled,
          initialMuted: !audioEnabled
        });
      }
    } catch (err) {
      console.error('Lobby action error:', err);
      setLobbyError(initialMeetingId || detectedMeeting ? 'Meeting not found.' : 'Failed to start call.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col p-2 bg-white">
      <div className="mb-4">
        <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">
          {initialMeetingId || detectedMeeting ? 'Join Canvas Call' : 'Start Video Call'}
        </h3>
        <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5 uppercase">
          {detectedMeeting 
            ? `Active call "${detectedMeeting.title}" detected` 
            : 'Configure devices before entering'}
        </p>
      </div>

      {lobbyError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[9px] font-bold uppercase flex items-center gap-1.5 animate-in slide-in-from-top duration-200">
          <AlertTriangle size={12} />
          <span>{lobbyError}</span>
        </div>
      )}

      {/* Device Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-inner flex flex-col items-center">
        <div className="relative w-full aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden shadow-sm">
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!previewStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 px-4 text-center">
              {!videoEnabled ? (
                <>
                  <VideoOff size={24} className="mb-1.5 text-slate-400" />
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Camera is off</span>
                </>
              ) : (
                <>
                  <Camera size={24} className="mb-1.5" />
                  <span className="text-[9px] uppercase font-bold tracking-widest">
                    {lobbyError ? 'Camera Blocked or Offline' : 'Loading preview...'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Audio and Video On/Off Toggles Overlay */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800 z-10">
            <button
              type="button"
              onClick={toggleAudioState}
              className={`p-2 rounded-full transition-all active:scale-90 ${audioEnabled ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {audioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
            </button>
            <button
              type="button"
              onClick={toggleVideoState}
              className={`p-2 rounded-full transition-all active:scale-90 ${videoEnabled ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              title={videoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {videoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
            </button>
          </div>
        </div>

        {/* Media Selectors */}
        <div className="w-full mt-3 space-y-2 text-white">
          <div className="flex items-center gap-2">
            <Video size={14} className="text-slate-400" />
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              disabled={videoDevices.length === 0}
              className="flex-1 bg-slate-800 border border-slate-700/50 text-white rounded-lg py-1.5 px-2 text-[10px] outline-none disabled:opacity-50"
            >
              {videoDevices.length > 0 ? (
                videoDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.substring(0, 5)}`}</option>
                ))
              ) : (
                <option value="">Camera Blocked / Not Found</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Mic size={14} className="text-slate-400" />
            <select
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
              disabled={audioDevices.length === 0}
              className="flex-1 bg-slate-800 border border-slate-700/50 text-white rounded-lg py-1.5 px-2 text-[10px] outline-none disabled:opacity-50"
            >
              {audioDevices.length > 0 ? (
                audioDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.substring(0, 5)}`}</option>
                ))
              ) : (
                <option value="">Microphone Blocked / Not Found</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Action triggers */}
      <div className="mt-4 space-y-3">
        {!initialMeetingId && !detectedMeeting && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Call Title"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        )}
        <button
          onClick={handleAction}
          disabled={loading || checkingActive}
          className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-100"
        >
          {loading || checkingActive ? <Loader className="animate-spin" size={12} /> : <ArrowRight size={12} />}
          <span>
            {checkingActive 
              ? 'Checking active calls...' 
              : (initialMeetingId || detectedMeeting ? 'Join Call' : 'Start Call')}
          </span>
        </button>
      </div>
    </div>
  );
}
