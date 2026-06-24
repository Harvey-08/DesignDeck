import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff, Disc, Square, Settings } from 'lucide-react';

export default function MeetingControls({
  isMuted,
  onToggleMute,
  isVideoOff,
  onToggleVideo,
  isSharingScreen,
  onToggleScreenShare,
  isRecording,
  onToggleRecording,
  isChatOpen,
  onToggleChat,
  onLeave,
  isHost,
  showHostControls,
  onToggleHostControls,
  isRecordingAllowed
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4 bg-slate-900 border-t border-slate-800 shrink-0">
      {/* Host Controls (Settings) */}
      {isHost && (
        <button
          onClick={onToggleHostControls}
          className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
            showHostControls
              ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Host Controls"
        >
          <Settings size={16} />
        </button>
      )}

      {/* Audio Mute/Unmute */}
      <button
        onClick={onToggleMute}
        className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
          isMuted
            ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
            : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
      >
        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Video On/Off */}
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
          isVideoOff
            ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
            : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
      >
        {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
      </button>

      {/* Screen Share */}
      <button
        onClick={onToggleScreenShare}
        className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
          isSharingScreen
            ? 'bg-indigo-500 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        title={isSharingScreen ? "Stop Sharing Screen" : "Share Screen"}
      >
        <Monitor size={16} />
      </button>

      {/* Start / Stop Local Recording */}
      {(isHost || isRecordingAllowed) && (
        <button
          onClick={onToggleRecording}
          className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
            isRecording
              ? 'bg-red-600 border-red-700 text-white animate-pulse shadow-lg shadow-red-500/20'
              : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title={isRecording ? "Stop Recording Meeting" : "Record Local Stream & Audio"}
        >
          {isRecording ? <Square size={16} /> : <Disc size={16} />}
        </button>
      )}

      <div className="w-[1px] h-6 bg-slate-800 mx-1" />

      {/* Toggle Chat Panel */}
      <button
        onClick={onToggleChat}
        className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
          isChatOpen
            ? 'bg-indigo-500 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        title="Toggle Meeting Chat"
      >
        <MessageSquare size={16} />
      </button>

      {/* Leave Meeting (Hang Up) */}
      <button
        onClick={onLeave}
        className="p-3 rounded-2xl bg-red-600 border border-red-700 text-white hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-red-500/20"
        title="Leave Meeting"
      >
        <PhoneOff size={16} />
      </button>
    </div>
  );
}
