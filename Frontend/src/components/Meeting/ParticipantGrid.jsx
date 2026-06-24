import React from 'react';
import { MicOff, Monitor, User } from 'lucide-react';

export default function ParticipantGrid({
  localStream,
  localScreenStream,
  peers,
  isMuted,
  isVideoOff,
  localUser
}) {
  // Combine all active feeds
  const activeFeeds = [];

  // 1. Add local webcam feed if video is on or we want placeholder
  activeFeeds.push({
    id: 'local-video',
    name: `${localUser?.name || 'You'} (You)`,
    stream: localStream,
    isLocal: true,
    isAudioMuted: isMuted,
    isVideoDisabled: isVideoOff,
    isScreen: false
  });

  // 2. Add local screen share feed if active
  if (localScreenStream) {
    activeFeeds.push({
      id: 'local-screen',
      name: `${localUser?.name || 'You'} (Screen)`,
      stream: localScreenStream,
      isLocal: true,
      isAudioMuted: true, // Screen share audio is muted locally
      isVideoDisabled: false,
      isScreen: true
    });
  }

  // 3. Add remote peer feeds
  peers.forEach(peer => {
    // Add remote video if available
    activeFeeds.push({
      id: peer.socketId,
      name: peer.user?.name || 'Participant',
      stream: peer.stream,
      isLocal: false,
      isAudioMuted: peer.isAudioMuted,
      isVideoDisabled: peer.isVideoDisabled,
      isScreen: peer.isScreenShare
    });
  });

  // Determine grid columns dynamically based on feed count
  const getGridClass = (count) => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  return (
    <div className="flex-1 bg-slate-950 p-4 overflow-hidden flex items-center justify-center">
      <div className={`grid ${getGridClass(activeFeeds.length)} gap-4 w-full h-full max-w-5xl max-h-[500px] auto-rows-fr`}>
        {activeFeeds.map((feed) => {
          const videoRef = (el) => {
            if (el && feed.stream) {
              if (el.srcObject !== feed.stream) {
                el.srcObject = feed.stream;
              }
              el.play().catch(err => {
                console.warn('[ParticipantGrid] Play interrupted or prevented:', err);
              });
            }
          };

          return (
            <div
              key={feed.id}
              className="relative rounded-2xl bg-slate-900 border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-lg group aspect-video"
            >
              {/* Video Element */}
              {!feed.isVideoDisabled && feed.stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={feed.isLocal} // MUST mute local feeds to prevent audio feedback
                  className={`w-full h-full object-cover ${feed.isLocal && !feed.isScreen ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                // Avatar Placeholder when video is off
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shadow-md">
                    <User size={28} className="text-slate-300" />
                  </div>
                  <span className="text-[9px] uppercase font-black tracking-widest mt-3 text-slate-500">Camera Off</span>
                </div>
              )}

              {/* Status Indicators overlay */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700/30 text-white text-[9px] font-black uppercase tracking-wider max-w-[80%]">
                {feed.isScreen && <Monitor size={10} className="text-indigo-400" />}
                <span className="truncate">{feed.name}</span>
              </div>

              {/* Mute Overlay Indicator */}
              {feed.isAudioMuted && (
                <div className="absolute top-3 right-3 bg-red-600/90 backdrop-blur-md p-2 rounded-xl border border-red-500/20 text-white shadow-md">
                  <MicOff size={12} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
