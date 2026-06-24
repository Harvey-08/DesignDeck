import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, BACKEND_URL } from '../../config';
import ChatPanel from './ChatPanel';
import Canvas from '../Canvas';
import Toolbar from '../Toolbar';
import SidebarPanel from '../Sidebar/SidebarPanel';
import TimelineControls from '../TimelineControls';
import ShareDialog from '../ShareDialog';
import CollaboratorList from '../CollaboratorList';
import BotWidget from '../Bot/BotWidget';
import {
  Loader, AlertCircle, Shield, Mic, MicOff, Video, VideoOff,
  Monitor, Square, Disc, Settings, LogOut, Share2, Users,
  Pencil, PencilOff, Check, X, ShieldAlert, Wifi, Clock, Tag, Download, Upload
} from 'lucide-react';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const createSilentAudioTrack = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const dst = ctx.createMediaStreamDestination();
    const track = dst.stream.getAudioTracks()[0];
    if (!track) throw new Error('No audio track available from destination');
    const originalStop = track.stop;
    track.stop = function () {
      originalStop.call(track);
      ctx.close().catch(() => {});
    };
    return track;
  } catch (e) {
    console.warn('Failed to create silent audio track:', e);
    const canvas = document.createElement('canvas');
    const stream = canvas.captureStream(0);
    return stream.getAudioTracks()[0] || null;
  }
};

const createDummyVideoTrack = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const stream = canvas.captureStream(10);
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error('No video track available from canvas stream');
    return track;
  } catch (e) {
    console.warn('Failed to create dummy video track:', e);
    return null;
  }
};

export default function MeetingRoom({
  meetingId,
  title,
  hostId,
  videoDeviceId,
  audioDeviceId,
  initialVideoOff,
  initialMuted,
  onLeaveWorkspace,
  // Drawing Canvas Props
  canvasId,
  canvasEngineRef,
  activeTool,
  setActiveTool,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  fontFamily,
  setFontFamily,
  eraserStrength,
  setEraserStrength,
  fillEnabled,
  setFillOn,
  gridOpacity,
  setGridOpacity,
  canvasMetadata,
  fetchCanvasMetadata,
  userRole,
  currentUser,
  clearCanvas,
  handleAction,
  handleImportAction,
  isPropertiesOpen,
  setIsPropertiesOpen,
  layers,
  activeLayerId,
  layerActions,
  isTimelineOpen,
  setIsTimelineOpen,
  isAuthorshipMode,
  onAuthorshipToggle
}) {
  const [localStream, setLocalStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('members');
  const [isUploading, setIsUploading] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Invite Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);

  // Share, Import, Export Menu States
  const [shareOpen, setShareOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const shareRef = useRef(null);
  const exportRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
      if (importRef.current && !importRef.current.contains(e.target)) {
        setImportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShareOpen(false);
        setExportMenuOpen(false);
        setImportMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Timer State
  const [meetingDuration, setMeetingDuration] = useState(0);

  const [hostControls, setHostControls] = useState({
    unmuteAll: true,
    enableVideo: true,
    disableChat: false,
    enableCollaboration: true,
    allowRecording: true
  });
  const [showHostControls, setShowHostControls] = useState(false);
  const hostControlsRef = useRef(hostControls);

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const peerConnections = useRef({}); // Mapping of peerSocketId -> RTCPeerConnection
  const peerUsers = useRef({}); // Mapping of peerSocketId -> user details
  const dummyVideoTrackRef = useRef(null);
  const dummyAudioTrackRef = useRef(null);

  // Recording Refs
  const mediaRecorderRef = useRef(null);
  const recordingStartTime = useRef(0);
  const recordedChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recordingAudioCtxRef = useRef(null);
  const recordingMicStreamRef = useRef(null);

  const isHost = (currentUser?._id || currentUser?.id) === hostId;
  const effectiveUserRole = (!isHost && !hostControls.enableCollaboration) ? 'viewer' : userRole;
  const sharingPeer = peers.find(p => p.isSharingScreen && p.stream && p.stream.getVideoTracks().length > 0);

  useEffect(() => {
    hostControlsRef.current = hostControls;
  }, [hostControls]);

  // Duration Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleHostControlUpdated = (data) => {
    const { key, value } = data;
    console.log(`[HostControl] Updated - Key: ${key}, Value: ${value}`);

    setHostControls(prev => ({ ...prev, [key]: value }));

    if (key === 'unmuteAll' && value === false) {
      if (currentUser?._id !== hostId) {
        setIsMuted(true);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
        if (socketRef.current) {
          socketRef.current.emit('peer-toggle-audio', { roomId: meetingId, isMuted: true });
        }
      }
    }

    if (key === 'enableVideo' && value === false) {
      if (currentUser?._id !== hostId) {
        setIsVideoOff(true);
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => {
            track.enabled = false;
          });
        }
        if (socketRef.current) {
          socketRef.current.emit('peer-toggle-video', { roomId: meetingId, isVideoOff: true });
        }
      }
    }
  };

  const toggleHostControl = (key) => {
    const newValue = !hostControls[key];
    setHostControls(prev => ({ ...prev, [key]: newValue }));
    if (socketRef.current) {
      socketRef.current.emit('host-control-change', {
        roomId: meetingId,
        key,
        value: newValue
      });
    }
  };

  useEffect(() => {
    let isCancelled = false;
    let createdStream = null;
    let createdSocket = null;

    const initCall = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (!isCancelled) {
            setRoomError('WebRTC media is not supported or secure context is required.');
            setLoading(false);
          }
          return;
        }

        let devices = [];
        try {
          devices = await navigator.mediaDevices.enumerateDevices();
        } catch (e) {
          console.warn('Enumerate devices failed in initCall, using default assumptions', e);
        }

        const hasVideo = devices.some(d => d.kind === 'videoinput');
        const hasAudio = devices.some(d => d.kind === 'audioinput');

        const constraints = {};

        // Request physical camera ONLY if not starting camera-off
        if (hasVideo && videoDeviceId !== 'none' && !initialVideoOff) {
          constraints.video = videoDeviceId ? { deviceId: videoDeviceId } : true;
        } else {
          constraints.video = false;
        }

        // Request physical microphone ONLY if not starting muted
        if (hasAudio && audioDeviceId !== 'none' && !initialMuted) {
          constraints.audio = audioDeviceId ? { deviceId: audioDeviceId } : true;
        } else {
          constraints.audio = false;
        }

        let stream;
        if (constraints.video || constraints.audio) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (mediaErr) {
            console.warn('Failed to get media with requested constraints, trying fallback...', mediaErr);
            try {
              // Try fallback with camera/mic only if they weren't explicitly disabled
              const fallbackConstraints = {
                video: hasVideo && videoDeviceId !== 'none' && !initialVideoOff,
                audio: hasAudio && audioDeviceId !== 'none' && !initialMuted
              };
              if (fallbackConstraints.video || fallbackConstraints.audio) {
                stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
              } else {
                stream = new MediaStream();
              }
            } catch (mediaErr2) {
              console.warn('Failed fallback media, using empty stream', mediaErr2);
              stream = new MediaStream();
            }
          }
        } else {
          stream = new MediaStream();
        }

        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        createdStream = stream;

        // Populate virtual/dummy tracks as placeholders if initial state is off/muted
        const finalIsVideoOff = !!(initialVideoOff || !hasVideo || videoDeviceId === 'none');
        if (finalIsVideoOff) {
          const dummyVideoTrack = createDummyVideoTrack();
          if (dummyVideoTrack) {
            stream.addTrack(dummyVideoTrack);
            dummyVideoTrackRef.current = dummyVideoTrack;
            dummyVideoTrack.enabled = false;
          }
          setIsVideoOff(true);
        } else {
          setIsVideoOff(false);
        }

        const finalIsMuted = !!(initialMuted || !hasAudio || audioDeviceId === 'none');
        if (finalIsMuted) {
          const dummyAudioTrack = createSilentAudioTrack();
          if (dummyAudioTrack) {
            stream.addTrack(dummyAudioTrack);
            dummyAudioTrackRef.current = dummyAudioTrack;
            dummyAudioTrack.enabled = false;
          }
          setIsMuted(true);
        } else {
          setIsMuted(false);
        }

        setLocalStream(stream);
        localStreamRef.current = stream;

        const socket = io(BACKEND_URL);
        createdSocket = socket;
        socketRef.current = socket;

        const handleConnect = () => {
          socket.emit('join-room', {
            roomId: meetingId,
            userId: currentUser._id || currentUser.id,
            name: currentUser.name || 'Anonymous',
            isAudioMuted: finalIsMuted,
            isVideoDisabled: finalIsVideoOff,
            isSharingScreen: false
          });
        };

        if (socket.connected) {
          handleConnect();
        } else {
          socket.on('connect', handleConnect);
        }

        socket.on('meeting-users', handleMeetingUsers);
        socket.on('user-joined', handleUserJoined);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('user-left', handleUserLeft);
        socket.on('peer-toggle-audio', handlePeerToggleAudio);
        socket.on('peer-toggle-video', handlePeerToggleVideo);
        socket.on('peer-toggle-screen', handlePeerToggleScreen);
        socket.on('host-control-updated', handleHostControlUpdated);
        socket.on('meeting-ended', () => {
          alert('The host has ended the meeting.');
          cleanupCall();
          onLeaveWorkspace();
        });

        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize local stream:', err);
        if (!isCancelled) {
          setRoomError('Could not gain camera/microphone access. Meeting closed.');
          setLoading(false);
        }
      }
    };

    initCall();

    return () => {
      isCancelled = true;
      if (createdStream) {
        createdStream.getTracks().forEach(t => t.stop());
      }
      if (createdSocket) {
        createdSocket.emit('leave-room', { roomId: meetingId });
        createdSocket.disconnect();
      }
      cleanupCall();
    };
  }, []);

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (dummyVideoTrackRef.current) {
      dummyVideoTrackRef.current.stop();
      dummyVideoTrackRef.current = null;
    }
    if (dummyAudioTrackRef.current) {
      dummyAudioTrackRef.current.stop();
      dummyAudioTrackRef.current = null;
    }
    Object.keys(peerConnections.current).forEach(peerSocketId => {
      peerConnections.current[peerSocketId].close();
    });
    peerConnections.current = {};
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId: meetingId });
      socketRef.current.disconnect();
    }

    // Stop recording resources
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (recordingMicStreamRef.current) {
      recordingMicStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (recordingAudioCtxRef.current) {
      recordingAudioCtxRef.current.close().catch(() => { });
    }
  };

  const cleanupPeerResources = (socketId) => {
    if (peerConnections.current[socketId]) {
      try {
        peerConnections.current[socketId].close();
      } catch (err) {
        console.warn(`Error closing peer connection for ${socketId}:`, err);
      }
      delete peerConnections.current[socketId];
    }
    if (peerUsers.current[socketId]) {
      delete peerUsers.current[socketId];
    }
  };

  const handleMeetingUsers = (activePeers) => {
    const localUserId = currentUser?._id || currentUser?.id;

    // Filter out our own details
    const otherPeers = activePeers.filter(p => p.user?.userId !== localUserId);

    // Deduplicate by userId, keeping the latest one
    const uniquePeersMap = {};
    otherPeers.forEach(peer => {
      const uId = peer.user?.userId;
      if (uId) {
        const existing = uniquePeersMap[uId];
        if (existing) {
          console.log(`[MeetingRoom] Found duplicate peer user ${peer.user?.name} in activePeers list. Cleaning up old socket ${existing.socketId}`);
          cleanupPeerResources(existing.socketId);
        }
        uniquePeersMap[uId] = peer;
      }
    });

    const uniquePeers = Object.values(uniquePeersMap);
    const uniqueSocketIds = uniquePeers.map(p => p.socketId);

    // Clean up any stale connections that are NOT in the unique list of sockets (purely outside React updater)
    Object.keys(peerConnections.current).forEach(sid => {
      if (!uniqueSocketIds.includes(sid)) {
        console.log(`[MeetingRoom] Cleaning up stale peer connection ${sid} not present in activePeers list`);
        cleanupPeerResources(sid);
      }
    });

    // Update state atomically
    setPeers(prev => {
      const filteredPrev = prev.filter(p => uniqueSocketIds.includes(p.socketId));

      // Add new ones
      const newPeers = uniquePeers
        .filter(up => !filteredPrev.some(fp => fp.socketId === up.socketId))
        .map(up => ({
          socketId: up.socketId,
          user: up.user,
          stream: null,
          isAudioMuted: !!up.user?.isAudioMuted,
          isVideoDisabled: !!up.user?.isVideoDisabled,
          isSharingScreen: !!up.user?.isSharingScreen
        }));

      return [...filteredPrev, ...newPeers];
    });

    // Setup refs and peer connections
    uniquePeers.forEach(peer => {
      peerUsers.current[peer.socketId] = peer.user;
      createPeerConnection(peer.socketId, peer.user, true);
    });
  };

  const handleUserJoined = (data) => {
    const localUserId = currentUser?._id || currentUser?.id;
    if (data.user?.userId === localUserId) return;

    // Find any duplicate socket IDs for this userId
    const duplicateSocketIds = Object.keys(peerUsers.current).filter(
      sid => peerUsers.current[sid]?.userId === data.user?.userId && sid !== data.socketId
    );

    // Clean up stale duplicate socket connections
    duplicateSocketIds.forEach(sid => {
      console.log(`[MeetingRoom] User ${data.user?.name} joined with new socket ${data.socketId}. Cleaning up stale socket ${sid}`);
      cleanupPeerResources(sid);
    });

    peerUsers.current[data.socketId] = data.user;

    // Update state atomically: filter out duplicate sockets and append the new one
    setPeers(prev => {
      const filtered = prev.filter(p => !duplicateSocketIds.includes(p.socketId) && p.socketId !== data.socketId);
      return [
        ...filtered,
        {
          socketId: data.socketId,
          user: data.user,
          stream: null,
          isAudioMuted: !!data.user?.isAudioMuted,
          isVideoDisabled: !!data.user?.isVideoDisabled,
          isSharingScreen: !!data.user?.isSharingScreen
        }
      ];
    });

    createPeerConnection(data.socketId, data.user, false);

    if (isHost && socketRef.current) {
      Object.entries(hostControlsRef.current).forEach(([key, value]) => {
        socketRef.current.emit('host-control-change', {
          roomId: meetingId,
          key,
          value
        });
      });
    }
  };

  const createPeerConnection = async (peerSocketId, peerUser, isOfferer) => {
    if (peerConnections.current[peerSocketId]) return;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pc.iceQueue = [];
    peerConnections.current[peerSocketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          target: peerSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      setPeers(prev => {
        const existingPeer = prev.find(p => p.socketId === peerSocketId);
        let stream;
        if (existingPeer && existingPeer.stream) {
          stream = existingPeer.stream;
          const hasTrack = stream.getTracks().some(t => t.id === event.track.id);
          if (!hasTrack) {
            stream.addTrack(event.track);
          }
          stream = new MediaStream(stream.getTracks());
        } else {
          stream = event.streams[0] || new MediaStream([event.track]);
        }

        const exists = prev.some(p => p.socketId === peerSocketId);
        if (exists) {
          return prev.map(p => p.socketId === peerSocketId ? { ...p, stream } : p);
        }
        return [
          ...prev,
          {
            socketId: peerSocketId,
            user: peerUser,
            stream,
            isAudioMuted: false,
            isVideoDisabled: false
          }
        ];
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state change for ${peerSocketId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Do NOT remove the peer from peers state here to keep them visible under Members.
        // They will be removed correctly when they emit 'user-left' or disconnect from the socket.
      }
    };

    if (isOfferer) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('offer', {
          target: peerSocketId,
          offer
        });
      } catch (err) {
        console.error('Failed to create WebRTC offer:', err);
      }
    }
  };

  const handleOffer = async (data) => {
    const { sender, offer } = data;
    const peerUser = peerUsers.current[sender] || { name: 'Remote Participant' };

    let pc = peerConnections.current[sender];
    if (!pc) {
      await createPeerConnection(sender, peerUser, false);
      pc = peerConnections.current[sender];
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('answer', {
        target: sender,
        answer
      });

      if (pc.iceQueue && pc.iceQueue.length > 0) {
        for (const cand of pc.iceQueue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.error('Error adding queued ICE candidate from offer:', e);
          }
        }
        pc.iceQueue = [];
      }
    } catch (err) {
      console.error('Error handling WebRTC offer:', err);
    }
  };

  const handleAnswer = async (data) => {
    const { sender, answer } = data;
    const pc = peerConnections.current[sender];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        if (pc.iceQueue && pc.iceQueue.length > 0) {
          for (const cand of pc.iceQueue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.error('Error adding queued ICE candidate from answer:', e);
            }
          }
          pc.iceQueue = [];
        }
      } catch (err) {
        console.error('Error setting remote description from answer:', err);
      }
    }
  };

  const handleIceCandidate = async (data) => {
    const { sender, candidate } = data;
    const pc = peerConnections.current[sender];
    if (pc) {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          if (!pc.iceQueue) pc.iceQueue = [];
          pc.iceQueue.push(candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  };

  const handleUserLeft = (data) => {
    const { socketId } = data;
    cleanupPeer(socketId);
  };

  const cleanupPeer = (socketId) => {
    cleanupPeerResources(socketId);
    setPeers(prev => prev.filter(p => p.socketId !== socketId));
  };

  const handlePeerToggleAudio = (data) => {
    const { senderSocketId, isMuted } = data;
    setPeers(prev => prev.map(p => p.socketId === senderSocketId ? { ...p, isAudioMuted: isMuted } : p));
  };

  const handlePeerToggleVideo = (data) => {
    const { senderSocketId, isVideoOff } = data;
    setPeers(prev => prev.map(p => p.socketId === senderSocketId ? { ...p, isVideoDisabled: isVideoOff } : p));
  };

  const handlePeerToggleScreen = (data) => {
    const { senderSocketId, isSharingScreen } = data;
    setPeers(prev => prev.map(p => p.socketId === senderSocketId ? { ...p, isSharingScreen } : p));
  };

  // --- MEDIA CONTROLS ---

  const handleToggleMute = async () => {
    if (!isHost && !hostControls.unmuteAll && isMuted) {
      alert("Unmuting is disabled by the host.");
      return;
    }
    const newVal = !isMuted;
    setIsMuted(newVal);

    if (newVal) {
      // Muting (audio OFF): stop real mic track and replace with silent track
      if (localStreamRef.current) {
        const oldTracks = localStreamRef.current.getAudioTracks();
        oldTracks.forEach(track => {
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }
      
      const dummyTrack = createSilentAudioTrack();
      dummyAudioTrackRef.current = dummyTrack;
      if (dummyTrack && localStreamRef.current) {
        localStreamRef.current.addTrack(dummyTrack);
        dummyTrack.enabled = false;
      }

      // Replace track on all peer connections
      Object.keys(peerConnections.current).forEach(peerSocketId => {
        const pc = peerConnections.current[peerSocketId];
        const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (audioSender && dummyTrack) {
          audioSender.replaceTrack(dummyTrack);
        }
      });
    } else {
      // Unmuting (audio ON): get real mic track and replace silent track
      try {
        const constraints = {
          audio: audioDeviceId && audioDeviceId !== 'none' ? { deviceId: audioDeviceId } : true
        };
        const tempStream = await navigator.mediaDevices.getUserMedia(constraints);
        const realTrack = tempStream.getAudioTracks()[0];
        
        if (realTrack) {
          // Stop and remove old dummy track
          if (localStreamRef.current) {
            const oldTracks = localStreamRef.current.getAudioTracks();
            oldTracks.forEach(track => {
              track.stop();
              localStreamRef.current.removeTrack(track);
            });
            localStreamRef.current.addTrack(realTrack);
          }
          
          if (dummyAudioTrackRef.current) {
            dummyAudioTrackRef.current.stop();
            dummyAudioTrackRef.current = null;
          }

          // Replace track on all peer connections
          Object.keys(peerConnections.current).forEach(peerSocketId => {
            const pc = peerConnections.current[peerSocketId];
            const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
            if (audioSender) {
              audioSender.replaceTrack(realTrack);
            }
          });
        }
      } catch (err) {
        console.error('Failed to turn microphone on:', err);
        setIsMuted(true); // revert state
      }
    }

    if (socketRef.current) {
      socketRef.current.emit('peer-toggle-audio', {
        roomId: meetingId,
        isMuted: newVal
      });
    }
  };

  const handleToggleVideo = async () => {
    if (!isHost && !hostControls.enableVideo && isVideoOff) {
      alert("Camera activation is disabled by the host.");
      return;
    }
    const newVal = !isVideoOff;
    setIsVideoOff(newVal);

    if (newVal) {
      // Turning video OFF: stop real track and replace with dummy track
      if (localStreamRef.current) {
        const oldTracks = localStreamRef.current.getVideoTracks();
        oldTracks.forEach(track => {
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }
      
      const dummyTrack = createDummyVideoTrack();
      dummyVideoTrackRef.current = dummyTrack;
      if (dummyTrack && localStreamRef.current) {
        localStreamRef.current.addTrack(dummyTrack);
        dummyTrack.enabled = false;
      }

      // Replace track on all peer connections
      Object.keys(peerConnections.current).forEach(peerSocketId => {
        const pc = peerConnections.current[peerSocketId];
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender && dummyTrack) {
          videoSender.replaceTrack(dummyTrack);
        }
      });
    } else {
      // Turning video ON: get real camera track and replace dummy track
      try {
        const constraints = {
          video: videoDeviceId && videoDeviceId !== 'none' ? { deviceId: videoDeviceId } : true
        };
        const tempStream = await navigator.mediaDevices.getUserMedia(constraints);
        const realTrack = tempStream.getVideoTracks()[0];
        
        if (realTrack) {
          // Stop and remove old dummy track
          if (localStreamRef.current) {
            const oldTracks = localStreamRef.current.getVideoTracks();
            oldTracks.forEach(track => {
              track.stop();
              localStreamRef.current.removeTrack(track);
            });
            localStreamRef.current.addTrack(realTrack);
          }
          
          if (dummyVideoTrackRef.current) {
            dummyVideoTrackRef.current.stop();
            dummyVideoTrackRef.current = null;
          }

          // Replace track on all peer connections
          Object.keys(peerConnections.current).forEach(peerSocketId => {
            const pc = peerConnections.current[peerSocketId];
            const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(realTrack);
            }
          });
        }
      } catch (err) {
        console.error('Failed to turn camera on:', err);
        setIsVideoOff(true); // revert state
      }
    }

    if (socketRef.current) {
      socketRef.current.emit('peer-toggle-video', {
        roomId: meetingId,
        isVideoOff: newVal
      });
    }
  };

  const handleToggleScreenShare = async () => {
    if (!isSharingScreen) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setLocalScreenStream(screen);
        localScreenStreamRef.current = screen;
        setIsSharingScreen(true);

        const screenTrack = screen.getVideoTracks()[0];

        Object.keys(peerConnections.current).forEach(async peerSocketId => {
          const pc = peerConnections.current[peerSocketId];
          const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, screen);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current.emit('offer', {
                target: peerSocketId,
                offer
              });
            } catch (err) {
              console.error('Failed to create offer during screen renegotiation:', err);
            }
          }
        });

        // Notify other clients about screen sharing
        if (socketRef.current) {
          socketRef.current.emit('peer-toggle-screen', {
            roomId: meetingId,
            isSharingScreen: true
          });
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };
      } catch (err) {
        console.error('Failed to share screen:', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
      setLocalScreenStream(null);
      localScreenStreamRef.current = null;
    }
    setIsSharingScreen(false);

    // Notify other clients that screen sharing stopped
    if (socketRef.current) {
      socketRef.current.emit('peer-toggle-screen', {
        roomId: meetingId,
        isSharingScreen: false
      });
    }

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    Object.keys(peerConnections.current).forEach(async peerSocketId => {
      const pc = peerConnections.current[peerSocketId];
      const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        if (cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        } else {
          pc.removeTrack(videoSender);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('offer', {
              target: peerSocketId,
              offer
            });
          } catch (err) {
            console.error('Failed to create offer during track removal:', err);
          }
        }
      }
    });
  };

  // --- COMPOSITE STREAM RECORDING IMPLEMENTATION ---

  const handleToggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = async () => {
    if (!hostControls.allowRecording && !isHost) {
      alert('Recording is not permitted by the host.');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', frameRate: { ideal: 30 } },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
        monitorTypeSurfaces: 'exclude'
      });

      let recordingMicStream = null;
      try {
        recordingMicStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      } catch (micErr) {
        console.warn('Could not retrieve mic audio for recording, proceeding without local mic:', micErr);
      }

      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      recordingAudioCtxRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      let hasAnyAudioSource = false;

      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length > 0) {
        const displayAudioSource = audioCtx.createMediaStreamSource(new MediaStream(displayAudioTracks));
        displayAudioSource.connect(destination);
        hasAnyAudioSource = true;
      }

      if (recordingMicStream && recordingMicStream.getAudioTracks().length > 0) {
        const micSource = audioCtx.createMediaStreamSource(recordingMicStream);
        micSource.connect(destination);
        hasAnyAudioSource = true;
      }

      if (peers && peers.length > 0) {
        peers.forEach(peer => {
          if (peer.stream) {
            try {
              const remoteTracks = peer.stream.getAudioTracks().filter(t => t.readyState === 'live');
              if (remoteTracks.length > 0) {
                const remoteSource = audioCtx.createMediaStreamSource(new MediaStream(remoteTracks));
                remoteSource.connect(destination);
                hasAnyAudioSource = true;
              }
            } catch (e) {
              console.warn(`Could not add remote audio track for peer: ${peer.socketId}`, e);
            }
          }
        });
      }

      const combinedTracks = [...displayStream.getVideoTracks()];
      if (hasAnyAudioSource) {
        combinedTracks.push(...destination.stream.getAudioTracks());
      }
      const combinedStream = new MediaStream(combinedTracks);

      recordingStreamRef.current = displayStream;
      recordingMicStreamRef.current = recordingMicStream;
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(t => t.stop());
          recordingStreamRef.current = null;
        }
        if (recordingMicStreamRef.current) {
          recordingMicStreamRef.current.getTracks().forEach(t => t.stop());
          recordingMicStreamRef.current = null;
        }
        if (recordingAudioCtxRef.current) {
          recordingAudioCtxRef.current.close().catch(() => { });
          recordingAudioCtxRef.current = null;
        }

        setIsRecording(false);

        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          recordedChunksRef.current = [];
          const duration = Math.round((Date.now() - recordingStartTime.current) / 1000);
          uploadRecording(blob, duration);
        }
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      recordingStartTime.current = Date.now();
      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log('[Recording] MediaRecorder started successfully.');
    } catch (err) {
      console.error('[Recording] Failed to start MediaRecorder:', err);
      alert('Could not start screen/canvas recording. Please check screen capture permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadRecording = async (blob, duration) => {
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('video', blob, `meet-recording-${meetingId}-${Date.now()}.webm`);
      formData.append('duration', duration);

      const res = await axios.post(
        `${API_BASE_URL}/meetings/${meetingId}/recordings`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('[Recording] Uploaded to Cloudinary successfully:', res.data);
      alert(`Meeting recording saved successfully! (Duration: ${duration}s)`);
    } catch (err) {
      console.error('[Recording] Upload failed:', err);
      alert('Failed to upload video recording.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- EXIT & LEAVE HANDLERS ---

  const handleLeave = async () => {
    const confirmation = window.confirm(
      isHost
        ? 'Are you sure you want to leave? This will end the meeting for everyone.'
        : 'Are you sure you want to leave the meeting?'
    );

    if (confirmation) {
      if (isHost) {
        setLoading(true);
        try {
          const token = localStorage.getItem('token');
          await axios.post(
            `${API_BASE_URL}/meetings/${meetingId}/end`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          console.error('Error ending meeting:', err);
        }
      }
      cleanupCall();
      onLeaveWorkspace();
    }
  };

  // --- INVITATION API HANDLER ---

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    setInviteLoading(true);
    setInviteStatus(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/meetings/${meetingId}/invite`,
        { usernameOrEmail: inviteInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteStatus({ type: 'success', message: 'Invitation sent successfully!' });
      setInviteInput('');
    } catch (err) {
      console.error('Error sending invite:', err);
      const errMsg = err.response?.data?.message || 'Failed to send invitation.';
      setInviteStatus({ type: 'error', message: errMsg });
    } finally {
      setInviteLoading(false);
    }
  };

  // --- DRAWING PRIVILEGE TOGGLE ---

  const handleToggleDrawingPermission = async (targetUserId, currentRole) => {
    if (!isHost) return;
    try {
      const nextRole = currentRole === 'viewer' ? 'editor' : 'viewer';
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/canvas/${canvasId}/members/${targetUserId}/role`,
        { role: nextRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (fetchCanvasMetadata) {
        fetchCanvasMetadata();
      }
    } catch (err) {
      console.error('Error toggling drawing permission:', err);
      alert('Failed to update participant drawing role.');
    }
  };

  // --- SUB-RENDER METHODS ---

  const renderScreenShareOverlay = () => {
    if (!sharingPeer) return null;

    const videoRef = (el) => {
      if (el && sharingPeer.stream) {
        if (el.srcObject !== sharingPeer.stream) {
          el.srcObject = sharingPeer.stream;
        }
        el.play().catch(err => { });
      }
    };

    return (
      <div className="absolute inset-4 z-40 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-[2rem] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">
                {sharingPeer.user?.name || 'Participant'}'s Screen
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">
                Viewing Screen Presentation
              </span>
            </div>
          </div>

          <span className="bg-indigo-600/15 text-indigo-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-500/20 animate-pulse">
            Live Presenting
          </span>
        </div>

        {/* Video Area */}
        <div className="flex-grow flex items-center justify-center bg-slate-950 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  };

  const renderInviteModal = () => {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200 text-slate-300">
          <button
            onClick={() => { setShowInviteModal(false); setInviteStatus(null); setInviteInput(''); }}
            className="absolute top-6 right-6 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
          >
            Close
          </button>

          <h3 className="text-lg font-bold text-white mb-2">Invite Collaborator</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Type the username or email address of the user you want to invite to this collaborative meeting session.
          </p>

          <form onSubmit={handleSendInvite} className="flex flex-col gap-3">
            <input
              type="text"
              required
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Username or email address..."
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 w-full outline-none focus:border-indigo-500 transition-all"
            />

            {inviteStatus && (
              <div className={`p-3 rounded-xl border text-xs font-semibold ${inviteStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                {inviteStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={inviteLoading || !inviteInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 mt-1"
            >
              {inviteLoading ? (
                <>
                  <Loader className="animate-spin" size={14} />
                  Sending Invitation...
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderParticipantCard = (participant, isLocal) => {
    const isAudioMuted = isLocal ? isMuted : participant.isAudioMuted;
    const cameraDisabled = isLocal ? isVideoOff : participant.isVideoDisabled;
    const sharingScreen = isLocal ? isSharingScreen : participant.isSharingScreen;
    const stream = isLocal ? (isSharingScreen ? localScreenStream : localStream) : participant.stream;
    const name = isLocal ? `${currentUser.name || 'You'} (You)` : participant.user?.name || 'Participant';
    const userIdVal = isLocal ? currentUser._id : participant.user?.userId || participant.user?._id || participant.user;
    const isParticipantHost = userIdVal === hostId;

    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const memberObj = canvasMetadata?.members?.find(m => {
      const mId = m.user?._id || m.user;
      return mId && mId.toString() === userIdVal?.toString();
    });
    const participantRole = isParticipantHost ? 'owner' : (memberObj?.role || 'editor');
    const isDrawingEnabled = participantRole === 'owner' || participantRole === 'editor';

    const videoRef = (el) => {
      if (el && stream) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.play().catch(err => { });
      }
    };

    return (
      <div key={isLocal ? 'local' : participant.socketId} className="relative bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 shadow-lg">
        {isParticipantHost && (
          <span className="absolute top-4 left-4 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
            Host
          </span>
        )}

        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center relative shadow-inner">
            {(!cameraDisabled || sharingScreen) && stream && stream.getVideoTracks().length > 0 ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <span className="text-xl font-black text-slate-400 tracking-wider">
                {initials}
              </span>
            )}
          </div>
        </div>

        <div className="text-center flex flex-col gap-1">
          <span className="text-sm font-bold text-white tracking-tight truncate px-2">{name}</span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {isParticipantHost ? 'Hosting' : isDrawingEnabled ? 'Editor' : 'Viewer'}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 mt-1">
          <div className={`p-2 rounded-xl border ${isAudioMuted ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-slate-800 border-slate-700/50 text-slate-400'}`}>
            {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </div>

          <div className={`p-2 rounded-xl border ${cameraDisabled ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-slate-800 border-slate-700/50 text-slate-400'}`}>
            {cameraDisabled ? <VideoOff size={14} /> : <Video size={14} />}
          </div>

          {!isParticipantHost && (
            <button
              onClick={() => handleToggleDrawingPermission(userIdVal, participantRole)}
              disabled={!isHost}
              className={`p-2 rounded-xl border transition-all ${isDrawingEnabled
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 hover:bg-amber-500/30'
                : 'bg-slate-800 border-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-400'
                } ${!isHost && 'opacity-50 cursor-not-allowed'}`}
              title={isHost ? `Toggle drawing permission` : 'Only host can toggle permissions'}
            >
              {isDrawingEnabled ? <Pencil size={14} /> : <PencilOff size={14} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- CORE VIEWS ---

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300">
        <Loader className="animate-spin text-indigo-500 mb-2" size={28} />
        <span className="text-xs uppercase font-bold tracking-widest">Entering Call Workspace...</span>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-red-500">
        <AlertCircle size={36} className="mb-2" />
        <span className="text-xs uppercase font-bold tracking-widest text-center">{roomError}</span>
        <button
          onClick={onLeaveWorkspace}
          className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  const activeParticipants = [
    { name: currentUser.name || 'You', isLocal: true },
    ...peers.map(p => ({ name: p.user?.name || 'Participant', isLocal: false }))
  ];

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#0a0a0c] text-slate-300 font-sans relative select-none">
      {isUploading && (
        <div className="absolute inset-0 bg-slate-950/80 z-[100] flex flex-col items-center justify-center text-white">
          <Loader className="animate-spin text-indigo-500 mb-3" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest">Uploading Video....</span>
        </div>
      )}

      {/* Top Bar (Height: 64px) */}
      <div className="h-16 shrink-0 bg-slate-950 border-b border-slate-900/60 flex items-center justify-between px-6 z-50">
        {/* Left Section: Logo & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Shield className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-black uppercase tracking-wider text-white">DesignDeck</span>
          </div>
        </div>

        {/* Middle Section: Legacy Canvas Drawing Features */}
        <div className="flex items-center gap-3">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Clear Canvas
          </button>

          <button
            onClick={() => handleAction('tag')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/40 hover:bg-indigo-950/60 rounded-full border border-indigo-500/30 transition-all active:scale-95"
            title="Tag Current State"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tag</span>
          </button>

          <button
            onClick={() => {
              if (onAuthorshipToggle) onAuthorshipToggle();
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isAuthorshipMode ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-900'}`}
            title="Highlight Authorship (Who DREW what?)"
          >
            <div className={`w-4 h-4 rounded-full border-2 ${isAuthorshipMode ? 'border-white' : 'border-current'} flex items-center justify-center`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
            </div>
          </button>

          <button
            onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isTimelineOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-900'}`}
            title="Timeline Replay"
          >
            <Clock className="w-4 h-4" />
          </button>

          <div className="relative flex items-center gap-2" ref={shareRef}>
            <button
              onClick={() => setShareOpen(!shareOpen)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share canvas</span>
            </button>
            <ShareDialog
              isOpen={shareOpen}
              onClose={() => setShareOpen(false)}
              canvasId={canvasId}
              owner={canvasMetadata?.owner}
              members={canvasMetadata?.members}
              onUpdate={fetchCanvasMetadata}
            />
          </div>

          <div className="relative flex items-center gap-2" ref={exportRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 transition-all active:scale-90 ${exportMenuOpen ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/30' : ''}`}
              title="Download Canvas"
            >
              <Download className="w-4 h-4" />
            </button>
            {exportMenuOpen && (
              <div className="absolute top-12 right-0 w-40 bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="p-1">
                  <button
                    onClick={() => { handleAction('export-png'); setExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors font-semibold"
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={() => { handleAction('export-jpeg'); setExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors font-semibold"
                  >
                    Download JPEG
                  </button>
                  <div className="h-px bg-slate-800 my-1 mx-2" />
                  <button
                    onClick={() => { handleAction('export-json'); setExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors font-semibold flex items-center justify-between"
                  >
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-2" ref={importRef}>
            <button
              onClick={() => setImportMenuOpen(!importMenuOpen)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 transition-all active:scale-90 ${importMenuOpen ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/30' : ''}`}
              title="Upload to Canvas"
            >
              <Upload className="w-4 h-4" />
            </button>
            {importMenuOpen && (
              <div className="absolute top-12 right-0 w-40 bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="p-1">
                  <button
                    onClick={() => { handleImportAction('png'); setImportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors font-semibold"
                  >
                    Import PNG
                  </button>
                  <button
                    onClick={() => { handleImportAction('jpeg'); setImportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors font-semibold"
                  >
                    Import JPEG
                  </button>
                  <div className="h-px bg-slate-800 my-1 mx-2" />
                  <button
                    onClick={() => { handleImportAction('json'); setImportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors font-semibold flex items-center justify-between"
                  >
                    <span>Import JSON</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center ml-2">
            <CollaboratorList engine={canvasEngineRef.current} />
          </div>
        </div>

        {/* Right Section: Collaborator status, participants, invite button */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Collaborating Now
          </div>

          <div className="flex items-center -space-x-2">
            {activeParticipants.slice(0, 3).map((p, idx) => {
              const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-full border border-slate-950 bg-slate-800 text-[10px] font-black text-slate-300 flex items-center justify-center shadow-md cursor-help"
                  title={p.name}
                >
                  {initials}
                </div>
              );
            })}
            {activeParticipants.length > 3 && (
              <div className="w-8 h-8 rounded-full border border-slate-950 bg-slate-955 text-[10px] font-black text-slate-400 flex items-center justify-center shadow-md">
                +{activeParticipants.length - 3}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-2xl text-[10px] font-bold">
            <Users size={12} className="text-slate-400" />
            <span>{activeParticipants.length}</span>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-2xl text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Share2 size={12} />
            Invite
          </button>
        </div>
      </div>

      {/* Main Area: Toolbar + Canvas + Sidebars */}
      <div className="flex-1 flex overflow-hidden relative bg-[#0c0c0e]">
        {/* Left Toolbar */}
        <div className="absolute top-0 bottom-0 left-0 z-40 flex items-center">
          <div className="px-4 py-8 flex items-center bg-slate-950/20 backdrop-blur-sm border-r border-slate-900/20 h-full">
            <Toolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onAction={handleAction}
              onPreviewAction={handleAction}
              userRole={effectiveUserRole}
            />
          </div>
        </div>

        {/* Central Canvas (flex-1) */}
        <main className="flex-1 relative flex items-center justify-center h-full pl-24">
          <div className="w-full h-full overflow-hidden relative">
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
              userRole={effectiveUserRole}
              currentUser={currentUser}
            />
            {renderScreenShareOverlay()}
          </div>
        </main>

        {/* Sidebars Side-by-Side Flex Container */}
        <div className="flex shrink-0 h-full">
          {/* Properties/Layers Sidebar */}
          <div
            className="transition-all duration-300 ease-in-out overflow-hidden border-l border-slate-900/60 bg-[#0a0a0c]/60 backdrop-blur-md h-full flex"
            style={{ width: isPropertiesOpen ? '320px' : '0px' }}
          >
            <div className="w-[320px] h-full p-6 pl-6 flex-shrink-0">
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

          {/* Members/Chat Sidebar */}
          <div
            className="transition-all duration-300 ease-in-out overflow-hidden border-l border-slate-900/60 bg-slate-955 h-full flex"
            style={{ width: isSidebarOpen ? '320px' : '0px' }}
          >
            <div className="w-80 h-full p-5 flex flex-col overflow-hidden flex-shrink-0">
              <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800/80 w-full mb-5">
                <button
                  onClick={() => setActiveSidebarTab('members')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeSidebarTab === 'members' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Members
                </button>
                <button
                  onClick={() => setActiveSidebarTab('chat')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeSidebarTab === 'chat' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 scrollbar-thin">
                {activeSidebarTab === 'members' ? (
                  <>
                    {renderParticipantCard(null, true)}
                    {peers.map(peer => renderParticipantCard(peer, false))}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden -mx-5 -mb-5 h-full">
                    <ChatPanel
                      meetingId={meetingId}
                      socket={socketRef.current}
                      currentUser={currentUser}
                      isOpen={true}
                      onClose={null}
                      isDisabled={hostControls.disableChat}
                      isHost={isHost}
                      isDark={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Properties Toggle Button wrapper */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 pointer-events-none"
          style={{
            right: `${(isPropertiesOpen ? 320 : 0) + (isSidebarOpen ? 320 : 0)}px`,
            transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <button
            onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
            className="pointer-events-auto w-8 h-24 bg-slate-900 border border-slate-800 border-r-0 rounded-l-2xl flex flex-col items-center justify-center gap-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-xl"
            title="Toggle Properties Panel"
          >
            <div className={`w-1 h-1 rounded-full transition-all ${isPropertiesOpen ? 'bg-indigo-600' : 'bg-slate-500'}`} />
            <div className={`w-1 h-1 rounded-full transition-all ${isPropertiesOpen ? 'bg-indigo-600' : 'bg-slate-500'}`} />
            <div className={`w-1 h-1 rounded-full transition-all ${isPropertiesOpen ? 'bg-indigo-600' : 'bg-slate-500'}`} />
          </button>
        </div>

        {/* Members/Chat Toggle Button wrapper */}
        <div
          className="absolute top-[60%] -translate-y-1/2 z-50 flex flex-col gap-2 pointer-events-none"
          style={{
            right: `${isSidebarOpen ? 320 : 0}px`,
            transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="pointer-events-auto w-8 h-24 bg-slate-900 border border-slate-800 border-r-0 rounded-l-2xl flex flex-col items-center justify-center gap-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-xl"
            title="Toggle Members & Chat"
          >
            <span className="text-[10px] font-black">{isSidebarOpen ? '❯' : '❮'}</span>
          </button>
        </div>
      </div>

      {/* Bottom control bar (Height: 64px) */}
      <div className="h-16 shrink-0 bg-slate-950 border-t border-slate-900/60 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Duration</span>
            <span className="text-xs font-black text-white font-mono">{formatDuration(meetingDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleMute}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${isMuted
              ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
              : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            onClick={handleToggleVideo}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${isVideoOff
              ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
              : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
          </button>

          <button
            onClick={handleToggleScreenShare}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${isSharingScreen
              ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
              : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            title={isSharingScreen ? 'Stop screen sharing' : 'Share screen'}
          >
            <Monitor size={16} />
          </button>

          {(isHost || hostControls.allowRecording) && (
            <button
              onClick={handleToggleRecording}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${isRecording
                ? 'bg-red-600 border-red-500 text-white hover:bg-red-750 animate-pulse'
                : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              title={isRecording ? 'Stop screen recording' : 'Start screen recording'}
            >
              {isRecording ? <Square size={16} className="fill-white" /> : <Disc size={16} />}
            </button>
          )}

          {isHost && (
            <div className="relative">
              <button
                onClick={() => setShowHostControls(!showHostControls)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${showHostControls
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                title="Host Controls"
              >
                <Settings size={16} />
              </button>

              {showHostControls && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-200">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Host Settings</p>
                    <div className="h-px bg-slate-800 my-2" />
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { label: 'Unmute All', key: 'unmuteAll' },
                      { label: 'Enable All Video', key: 'enableVideo' },
                      { label: 'Disable Chat', key: 'disableChat' },
                      { label: 'Enable Collaboration', key: 'enableCollaboration' },
                      { label: 'Allow Recording', key: 'allowRecording' }
                    ].map(({ label, key }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{label}</span>
                        <button
                          onClick={() => toggleHostControl(key)}
                          className={`w-10 h-6 rounded-full p-1 transition-all ${hostControls[key] ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${hostControls[key] ? 'translate-x-4' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 border border-red-500/20 hover:border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-5 py-2 rounded-2xl text-xs transition-all active:scale-95"
          >
            <LogOut size={12} />
            {isHost ? 'End Meeting' : 'Leave Meeting'}
          </button>
        </div>
      </div>

      <BotWidget
        canvasEngineRef={canvasEngineRef}
        isDark={true}
        style={{
          right: `${(isPropertiesOpen ? 320 : 0) + (isSidebarOpen ? 320 : 0) + 16}px`,
          bottom: '76px'
        }}
      />

      {showInviteModal && renderInviteModal()}

      {isTimelineOpen && (
        <TimelineControls
          canvasId={canvasId}
          engine={canvasEngineRef.current}
          isOpen={isTimelineOpen}
          onClose={() => setIsTimelineOpen(false)}
        />
      )}
    </div>
  );
}
