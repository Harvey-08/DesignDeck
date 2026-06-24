import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { Video, Download, Clock, User, Calendar, ChevronDown, ChevronUp, Loader } from 'lucide-react';

export default function MeetingHistory() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeetingId, setExpandedMeetingId] = useState(null);
  const [recordings, setRecordings] = useState({});
  const [fetchingExtra, setFetchingExtra] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/meetings/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(res.data);
    } catch (err) {
      console.error('Error fetching meeting history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (meetingId) => {
    if (expandedMeetingId === meetingId) {
      setExpandedMeetingId(null);
      return;
    }

    setExpandedMeetingId(meetingId);
    setFetchingExtra(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch recordings
      const recordingsRes = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/recordings`, { headers });
      setRecordings(prev => ({ ...prev, [meetingId]: recordingsRes.data }));
    } catch (err) {
      console.error('Error fetching meeting recordings:', err);
      setRecordings(prev => ({ ...prev, [meetingId]: [] }));
    } finally {
      setFetchingExtra(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs > 0 ? `${hrs}h` : null,
      mins > 0 ? `${mins}m` : null,
      secs > 0 || (!hrs && !mins) ? `${secs}s` : null
    ].filter(Boolean).join(' ');
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader className="animate-spin mr-2" size={18} />
        <span>Loading meeting logs...</span>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <Video size={36} className="mx-auto mb-2 opacity-50" />
        <p className="text-xs font-bold uppercase tracking-wider">No meetings recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
      {meetings.map((meeting) => {
        const isExpanded = expandedMeetingId === meeting.meetingId;
        const meetingRecs = recordings[meeting.meetingId] || [];

        return (
          <div
            key={meeting.meetingId}
            className="border border-slate-100 bg-white hover:border-indigo-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
          >
            {/* Header / Basic Info */}
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  {meeting.title}
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {formatDate(meeting.startedAt)}
                  </span>
                  {meeting.endedAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Duration: {formatDuration(Math.round((new Date(meeting.endedAt) - new Date(meeting.startedAt)) / 1000))}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <User size={12} /> Host: {meeting.host?.name || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  meeting.status === 'active'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {meeting.status}
                </span>

                <button
                  onClick={() => handleExpand(meeting.meetingId)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title={isExpanded ? "Collapse Details" : "View Recordings"}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {/* Expanded section */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                {fetchingExtra ? (
                  <div className="flex items-center justify-center py-4 text-xs font-semibold text-slate-400">
                    <Loader className="animate-spin mr-2" size={14} />
                    <span>Fetching details...</span>
                  </div>
                ) : (
                  <>
                    {/* Participants List */}
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Participants</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {meeting.participants?.map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/55 px-2.5 py-1 rounded-lg"
                          >
                            {p.user?.name || 'Unknown User'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Video Recordings */}
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Video Recordings</h5>
                      {meetingRecs.length > 0 ? (
                        <div className="space-y-4">
                          {meetingRecs.map((rec) => (
                            <div key={rec._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-inner flex flex-col items-center">
                              <video className="w-full max-w-md rounded-xl border border-slate-800 bg-black aspect-video shadow-md" controls>
                                <source src={rec.recordingUrl} type="video/webm" />
                                Your browser does not support WebM video playback.
                              </video>
                              
                              <div className="w-full max-w-md flex items-center justify-between mt-3 text-white">
                                <div className="text-left">
                                  <p className="text-xs font-bold truncate max-w-[200px]">{rec.fileName}</p>
                                  <p className="text-[9px] font-semibold text-slate-400">Duration: {formatDuration(rec.duration)}</p>
                                </div>
                                <a
                                  href={rec.recordingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={rec.fileName}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-md"
                                >
                                  <Download size={12} /> Download
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No video recordings found for this session.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
