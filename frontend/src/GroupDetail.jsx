import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, FileText, Video, Settings, Send, Paperclip, Smile, Download, Upload, ThumbsUp, MessageSquare, Clock, X, Search, MoreVertical, Phone, Info } from 'lucide-react';
import { getGroupMessages, postGroupMessage, getGroup } from './utils/api';

// Get API base URL for file access
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function GroupDetail() {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const messagesEndRef = useRef(null);

  const [chatMessages, setChatMessages] = useState([]);
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);

  const params = useParams();
  const groupIdParam = params.id ? parseInt(params.id, 10) : null;

  const [group, setGroup] = useState({
    id: null,
    name: 'Loading...',
    description: '',
    members: 0,
    color: 'from-blue-500 to-cyan-500',
    createdDate: '',
  });

  const navigate = useNavigate();

  // Helper function to convert any timestamp to IST time string
  const formatTimeIST = (timestamp) => {
    if (!timestamp) return '';
    try {
      // Ensure we're parsing the timestamp correctly
      // If it's a string in ISO format, new Date() will parse it correctly
      const date = new Date(timestamp);
      
      // If date is invalid, return empty string
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '';
    }
  };

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-scroll to bottom when page loads/group changes
  useEffect(() => {
    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    return () => clearTimeout(timer);
  }, [groupIdParam]);

  // Helper: dedupe by server id or clientTempId
  const addMessageIfNotExists = (incoming) => {
    setChatMessages(prev => {
      // If incoming has id (server persisted id), check by id
      const matchById = incoming.id && prev.some(m => m.id === incoming.id);
      if (matchById) return prev;

      // If incoming has clientTempId, try to replace optimistic or avoid duplicate
      if (incoming.clientTempId) {
        const hasOptimistic = prev.some(m => m.clientTempId === incoming.clientTempId || (m.isOptimistic && m.clientTempId === incoming.clientTempId));
        if (hasOptimistic) {
          return prev.map(m => m.clientTempId === incoming.clientTempId ? { ...incoming } : m);
        }
      }

      // As a safety: avoid exact duplicate messages by content + createdAt
      const duplicateByContentAndTime = prev.some(m => m.content === incoming.content && m.createdAt === incoming.createdAt);
      if (duplicateByContentAndTime) return prev;

      return [...prev, incoming];
    });
  };

  // Load initial messages when component mounts or group changes
  useEffect(() => {
    if (!groupIdParam) return;

    let isMounted = true;

    const load = async () => {
      try {
        // Fetch group details
        try {
          const res = await getGroup(groupIdParam);
          const gg = res.group || res;
          const membersCount = res.members_count || res.members_count === 0 ? res.members_count : (res.group && res.group.members_count) || 0;
          if (!isMounted) return;
          setGroup({
            id: gg.id,
            name: gg.name || `Group ${gg.id}`,
            description: gg.description || '',
            members: membersCount || 0,
            color: gg.color || 'from-blue-500 to-cyan-500',
            createdDate: gg.created_at || '',
          });
        } catch (e) {
          console.warn('failed to load group details', e);
        }

        // Fetch initial messages from API
        const msgs = await getGroupMessages(groupIdParam) || [];
        // Normalize messages for frontend display and dedupe
        const normalized = [];
        const seenIds = new Set();
        for (const m of msgs) {
          const obj = {
            id: m.id,
            senderID: m.sender_id || m.senderID || 0,
            senderName: m.sender_name || m.sender || (m.senderName || ""),
            content: m.content || m.message || "",
            createdAt: m.created_at || m.createdAt || null,
          };
          // dedupe by id
          if (obj.id && seenIds.has(obj.id)) continue;
          if (obj.id) seenIds.add(obj.id);
          normalized.push(obj);
        }
        if (!isMounted) return;
        setChatMessages(normalized);
      } catch (err) {
        console.error('failed to load messages', err);
      }
    };

    load();
  }, [groupIdParam]);

  // Open WebSocket connection - SEPARATE useEffect to avoid re-creating listeners
  useEffect(() => {
    if (!groupIdParam) return;

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    
    try {
      const apiUrl = new URL(API_BASE);
      const wsProto = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = localStorage.getItem('sb_token') || '';
      const wsUrl = `${wsProto}//${apiUrl.host}/ws/${groupIdParam}?token=${token}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      // ✅ FIXED: Define message handler INSIDE this effect so it captures the latest state
      const handleMessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          const currentUserID = parseInt(localStorage.getItem('sb_user_id') || '0', 10);

          console.log('WebSocket message received:', data); // DEBUG

          const m = {
            id: data.id || null,
            clientTempId: data.clientTempId || data.client_temp_id || null,
            senderID: data.sender_id || data.senderID || 0,
            senderName: data.sender_name || data.senderName || data.sender || 'Unknown',
            content: data.content || data.message || '',
            createdAt: data.created_at || data.createdAt || new Date().toISOString(),
          };

          console.log('Parsed message:', m); // DEBUG

          // If this is a message from the current user (server echo), attempt to replace optimistic
          if (m.clientTempId) {
            addMessageIfNotExists(m);
            return;
          }

          // If the server included a proper senderID equal to current user, attempt to replace based on content match
          if (m.senderID === currentUserID && currentUserID > 0) {
            // Try to replace optimistic (safe replacement: match by content + optimistic flag)
            setChatMessages(prev => {
              const hasOptimisticMatch = prev.some(msg => msg.isOptimistic && msg.content === m.content);
              if (hasOptimisticMatch) {
                return prev.map(msg =>
                  msg.isOptimistic && msg.content === m.content
                    ? { ...m } // replace optimistic with server message
                    : msg
                );
              }
              // If we don't find optimistic match, add only if not duplicate
              const already = prev.some(msg => msg.id === m.id || (msg.content === m.content && msg.createdAt === m.createdAt));
              if (already) return prev;
              return [...prev, m];
            });
            return;
          }

          // For other users' messages, add safely using dedupe helper
          addMessageIfNotExists(m);
        } catch (e) {
          console.error('invalid ws message', e);
        }
      };

      socket.addEventListener('open', () => {
        console.log('ws connected');
      });

      socket.addEventListener('message', handleMessage);

      socket.addEventListener('close', () => {
        console.log('ws closed');
      });

      // ✅ Cleanup on unmount or group change - IMPORTANT to prevent memory leaks
      return () => {
        if (wsRef.current) {
          try {
            wsRef.current.removeEventListener('message', handleMessage);
          } catch (err) {
            // older browsers might throw; ignore
          }
          try {
            wsRef.current.close();
          } catch (err) {
            // ignore
          }
          wsRef.current = null;
        }
      };
    } catch (e) {
      console.error('ws connection failed', e);
    }
  }, [groupIdParam]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const messageContent = message.trim();
    setMessage('');

    // Create a clientTempId
    const clientTempId = `c_${Date.now()}_${Math.floor(Math.random()*10000)}`;

    // optimistic UI with a temp marker
    const currentUserID = parseInt(localStorage.getItem('sb_user_id') || '0', 10);
    const optimistic = {
      id: clientTempId,
      clientTempId,
      senderID: currentUserID,
      senderName: localStorage.getItem('sb_username') || 'You',
      content: messageContent,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setChatMessages(prev => [...prev, optimistic]);

    try {
      // PRIMARY: Always save to DB via HTTP (guaranteed persistence)
      const response = await postGroupMessage(groupIdParam, messageContent, clientTempId);
      
      // Replace optimistic with real server response
      setChatMessages(prev =>
        prev.map(m =>
          m.clientTempId === clientTempId
            ? {
                id: response.id,
                senderID: response.sender_id,
                senderName: response.sender_name,
                content: response.content,
                createdAt: response.created_at,
                clientTempId: clientTempId,
                isOptimistic: false,
              }
            : m
        )
      );

      // SECONDARY: Also broadcast via WebSocket for real-time (if available)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          content: messageContent,
          clientTempId,
        }));
      }
    } catch (error) {
      console.error('failed to send message', error);
      // Mark as failed but keep message visible for user to retry
      setChatMessages(prev =>
        prev.map(m =>
          m.clientTempId === clientTempId
            ? { ...m, isFailed: true, failureMessage: error.message }
            : m
        )
      );
    }
  };

  const handleKeyDown = (e) => {
    // Use onKeyDown to reliably intercept Enter (prevents double invocation)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVote = (sessionId, optionIndex) => {
    setSessions(sessions.map(session => {
      if (session.id === sessionId && session.votingOptions) {
        const newOptions = session.votingOptions.map((opt, idx) => {
          if (idx === optionIndex) {
            return { ...opt, votes: opt.votes + 1, voted: true };
          }
          return opt;
        });
        return { ...session, votingOptions: newOptions };
      }
      return session;
    }));
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Sessions & resources are unchanged sample data
  const members = [
    { id: 1, name: 'John Doe', avatar: 'JD', role: 'Admin', online: true },
    { id: 2, name: 'Sarah Smith', avatar: 'SS', role: 'Member', online: true },
    { id: 3, name: 'Mike Johnson', avatar: 'MJ', role: 'Member', online: false },
    { id: 4, name: 'Emily Davis', avatar: 'ED', role: 'Member', online: true },
    { id: 5, name: 'Alex Brown', avatar: 'AB', role: 'Member', online: false },
    { id: 6, name: 'Lisa Wilson', avatar: 'LW', role: 'Member', online: true },
    { id: 7, name: 'Tom Anderson', avatar: 'TA', role: 'Member', online: false },
    { id: 8, name: 'Kate Martinez', avatar: 'KM', role: 'Member', online: true }
  ];

  const upcomingSessions = [
    {
      id: 1,
      title: 'Tree Traversal Deep Dive',
      date: 'Today, Nov 9',
      time: '3:00 PM - 5:00 PM',
      attendees: 8,
      status: 'confirmed',
      host: 'John Doe'
    },
    {
      id: 2,
      title: 'Graph Algorithms Practice',
      date: 'Thu, Nov 14',
      time: '4:00 PM - 6:00 PM',
      attendees: 6,
      status: 'voting',
      host: 'Sarah Smith',
      votingOptions: [
        { time: '4:00 PM - 6:00 PM', votes: 6, voted: false },
        { time: '5:00 PM - 7:00 PM', votes: 3, voted: false },
        { time: '6:00 PM - 8:00 PM', votes: 2, voted: false }
      ]
    }
  ];

  const [sessions, setSessions] = useState(upcomingSessions);

  const resources = [
    {
      id: 1,
      name: 'Binary Tree Notes.pdf',
      type: 'PDF',
      size: '2.4 MB',
      uploadedBy: 'Sarah Smith',
      uploadedAt: '2 days ago',
      downloads: 8
    },
    {
      id: 2,
      name: 'LeetCode Problem Set.xlsx',
      type: 'Excel',
      size: '856 KB',
      uploadedBy: 'John Doe',
      uploadedAt: '5 days ago',
      downloads: 12
    },
    {
      id: 3,
      name: 'Algorithm Cheat Sheet.png',
      type: 'Image',
      size: '1.2 MB',
      uploadedBy: 'Mike Johnson',
      uploadedAt: '1 week ago',
      downloads: 15
    },
    {
      id: 4,
      name: 'Study Guide - Week 3.docx',
      type: 'Word',
      size: '456 KB',
      uploadedBy: 'Emily Davis',
      uploadedAt: '1 week ago',
      downloads: 10
    }
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header - FIXED, NOT SCROLLABLE */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 flex-1">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={() => setShowGroupInfo(!showGroupInfo)}
                className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg p-2 transition-colors flex-1"
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${group.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-base font-bold text-gray-900">{group.name}</h1>
                  <p className="text-xs text-gray-500">{group.members} members</p>
                </div>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Phone className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Video className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowGroupInfo(!showGroupInfo)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Info className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium text-sm">Chat</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'sessions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-sm">Sessions</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'resources'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span className="font-medium text-sm">Resources</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - SCROLLABLE AREA */}
      <div className="flex-1 overflow-hidden flex">
        {/* Chat/Content Area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${showGroupInfo ? 'mr-96' : 'mr-0'} overflow-hidden`}>
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col bg-white bg-opacity-50 overflow-hidden">
              {/* Messages Area - scrollable only */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* Date Divider */}
                  <div className="flex items-center justify-center">
                    <div className="bg-white rounded-full px-4 py-1 shadow-sm">
                      <span className="text-xs text-gray-500 font-medium">Today</span>
                    </div>
                  </div>

                  {chatMessages.map(msg => {
                    const currentUserID = parseInt(localStorage.getItem('sb_user_id') || '0', 10);
                    const senderName = (msg.senderName && msg.senderName.trim()) || (msg.sender && msg.sender.trim()) || 'Unknown';
                    // isMe strictly checks senderID equality
                    const isMe = typeof msg.senderID === 'number' && msg.senderID === currentUserID;
                    const avatar = (senderName || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
                    // content may be JSON for files
                    let content = msg.content || msg.message || '';
                    let fileMeta = null;
                    try {
                      const parsed = JSON.parse(content);
                      if (parsed && parsed.type === 'file') {
                        // Ensure URL is absolute - convert /uploads/... to API_BASE + /uploads/...
                        if (parsed.url && !parsed.url.startsWith('http')) {
                          parsed.url = `${API_BASE}${parsed.url}`;
                        }
                        fileMeta = parsed;
                      }
                    } catch (e) {
                      // not JSON - plain text
                    }
                    // Use helper function to convert all timestamps to IST consistently
                    const timeStr = formatTimeIST(msg.createdAt);

                    return (
                      <div key={msg.id ?? `${msg.clientTempId ?? Math.random()}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isMe && (
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">{avatar}</span>
                              </div>
                            </div>
                          )}
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && (
                              <span className="text-xs font-medium text-gray-700 mb-1 px-3">{senderName}</span>
                            )}
                            <div className={`rounded-2xl px-4 py-2 shadow-sm ${
                              isMe
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-sm'
                                : 'bg-white text-gray-900 rounded-bl-sm'
                            }`}>
                              {fileMeta ? (
                                fileMeta.mime && fileMeta.mime.startsWith('image') ? (
                                  <img src={fileMeta.url} alt={fileMeta.filename} className="max-w-xs rounded" />
                                ) : fileMeta.mime && fileMeta.mime.startsWith('video') ? (
                                  <video controls src={fileMeta.url} className="max-w-xs rounded" />
                                ) : fileMeta.mime && fileMeta.mime.startsWith('audio') ? (
                                  <audio controls src={fileMeta.url} className="max-w-xs" />
                                ) : (
                                  <div className={`p-3 rounded-lg ${isMe ? 'bg-white bg-opacity-20' : 'bg-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                      <div className="text-3xl">
                                        {fileMeta.mime === 'application/pdf' && '📄'}
                                        {fileMeta.mime && fileMeta.mime.includes('word') && '📝'}
                                        {fileMeta.mime && fileMeta.mime.includes('document') && '📝'}
                                        {fileMeta.mime && (fileMeta.mime.includes('sheet') || fileMeta.mime.includes('excel')) && '📊'}
                                        {fileMeta.mime && (fileMeta.mime.includes('presentation') || fileMeta.mime.includes('powerpoint')) && '📑'}
                                        {fileMeta.mime === 'text/plain' && '📃'}
                                        {fileMeta.mime && (fileMeta.mime.includes('zip') || fileMeta.mime.includes('rar') || fileMeta.mime.includes('compressed')) && '📦'}
                                        {!fileMeta.mime || (!fileMeta.mime.includes('word') && !fileMeta.mime.includes('pdf') && !fileMeta.mime.includes('sheet') && !fileMeta.mime.includes('presentation') && fileMeta.mime !== 'text/plain' && !fileMeta.mime.includes('zip')) && '📎'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-gray-900'}`}>{fileMeta.filename}</p>
                                        <p className={`text-xs ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                                          {fileMeta.size ? (fileMeta.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown size'}
                                        </p>
                                      </div>
                                    </div>
                                    <a 
                                      href={fileMeta.url} 
                                      download={fileMeta.filename}
                                      className={`mt-2 inline-block text-sm font-medium px-3 py-1 rounded transition-colors ${
                                        isMe 
                                          ? 'bg-white text-blue-600 hover:bg-blue-50' 
                                          : 'bg-blue-600 text-white hover:bg-blue-700'
                                      }`}
                                    >
                                      Download
                                    </a>
                                  </div>
                                )
                              ) : (
                                <p className="text-sm leading-relaxed">{content}</p>
                              )}
                            </div>
                            <span className={`text-xs text-gray-400 mt-1 px-3`}>{timeStr}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area - NOT scrolling, stays at bottom */}
              <div className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-end gap-2">
                    <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-1">
                      <Paperclip className="w-5 h-5 text-gray-600" />
                    </button>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      style={{ display: 'none' }} 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp3,.mp4,.wav,.mov,.jpg,.jpeg,.png,.gif,.zip,.rar" 
                      onChange={async (e) => {
                        const f = e.target.files && e.target.files[0];
                        if (!f) return;
                        try {
                          // optimistic local message
                          const currentUserID = parseInt(localStorage.getItem('sb_user_id') || '0', 10);
                          const tempId = `c_${Date.now()}_${Math.floor(Math.random()*10000)}`;
                          
                          // Get file icon based on mime type
                          const getFileIcon = (mime) => {
                            if (mime.startsWith('image')) return '🖼️';
                            if (mime.startsWith('video')) return '🎬';
                            if (mime.startsWith('audio')) return '🎵';
                            if (mime === 'application/pdf') return '📄';
                            if (mime.includes('word') || mime.includes('document')) return '📝';
                            if (mime.includes('sheet') || mime.includes('excel')) return '📊';
                            if (mime.includes('presentation') || mime.includes('powerpoint')) return '📑';
                            if (mime === 'text/plain') return '📃';
                            if (mime.includes('zip') || mime.includes('rar')) return '📦';
                            return '📎';
                          };
                          
                          const optimistic = {
                            id: tempId,
                            clientTempId: tempId,
                            senderID: currentUserID,
                            senderName: localStorage.getItem('sb_username') || 'You',
                            content: JSON.stringify({ 
                              type: 'file', 
                              filename: f.name, 
                              url: URL.createObjectURL(f), 
                              mime: f.type,
                              size: f.size
                            }),
                            createdAt: new Date().toISOString(),
                            isOptimistic: true,
                          };
                          setChatMessages(prev => [...prev, optimistic]);
                          
                          // Upload file
                          const formData = new FormData();
                          formData.append('file', f);
                          formData.append('clientTempId', tempId); // Send clientTempId for deduplication
                          
                          const token = localStorage.getItem('sb_token');
                          const response = await fetch(`http://localhost:8080/api/groups/${groupIdParam}/messages/upload`, {
                            method: 'POST',
                            body: formData,
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            }
                          });
                          
                          if (!response.ok) {
                            throw new Error(`Upload failed: ${response.status}`);
                          }
                          
                          const result = await response.json();
                          console.log('File uploaded:', result);
                          
                          // Replace optimistic message with real server message
                          if (result.id && result.clientTempId === tempId) {
                            setChatMessages(prev =>
                              prev.map(m =>
                                m.clientTempId === tempId
                                  ? {
                                      id: result.id,
                                      senderID: result.sender_id,
                                      senderName: result.sender_name,
                                      content: result.content,
                                      createdAt: result.created_at,
                                      clientTempId: tempId,
                                      isOptimistic: false,
                                    }
                                  : m
                              )
                            );
                          }
                        } catch (err) {
                          console.error('upload failed', err);
                          alert(`Failed to upload file: ${err.message}`);
                          // Remove optimistic message on failure
                          setChatMessages(prev => prev.filter(m => m.clientTempId !== tempId));
                        }
                        // Reset file input
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }} 
                    />
                    <div className="flex-1 relative">
                      <textarea
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows="1"
                        className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32"
                        style={{ minHeight: '44px' }}
                      />
                      <button className="absolute right-3 bottom-3 hover:bg-gray-100 rounded-full p-1 transition-colors">
                        <Smile className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-1"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Study Sessions</h2>
                  <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-shadow">
                    Schedule New Session
                  </button>
                </div>

                {sessions.map(session => (
                  <div key={session.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {session.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {session.time}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            {session.attendees} attending
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        session.status === 'confirmed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {session.status === 'confirmed' ? 'Confirmed' : 'Voting Open'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">Hosted by {session.host}</p>

                    {session.status === 'voting' && session.votingOptions && (
                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Vote for your preferred time:</p>
                        {session.votingOptions.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleVote(session.id, idx)}
                            disabled={option.voted}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                              option.voted 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-900">{option.time}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 font-medium">{option.votes} votes</span>
                              <ThumbsUp className={`w-4 h-4 ${option.voted ? 'text-blue-600 fill-blue-600' : 'text-gray-400'}`} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-xl font-medium hover:shadow-lg transition-shadow">
                        {session.status === 'confirmed' ? 'Join Session' : 'Add to Calendar'}
                      </button>
                      <button className="px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Shared Resources</h2>
                  <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload File
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map(resource => (
                    <div key={resource.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">{resource.name}</h3>
                            <p className="text-xs text-gray-500">{resource.size}</p>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 mb-4 space-y-1">
                        <p>Uploaded by <span className="font-medium">{resource.uploadedBy}</span></p>
                        <p className="text-gray-400">{resource.uploadedAt}</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-500">{resource.downloads} downloads</span>
                        <button className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Group Info Sidebar */}
        <div className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          showGroupInfo ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Group Info</h3>
              <button
                onClick={() => setShowGroupInfo(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Group Profile */}
            <div className="text-center">
              <div className={`w-20 h-20 bg-gradient-to-br ${group.color} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{group.name}</h2>
              <p className="text-sm text-gray-600 mb-2">{group.description}</p>
              <p className="text-xs text-gray-500">Group • {group.members} members</p>
              <p className="text-xs text-gray-400">Created {group.createdDate}</p>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Quick Actions */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
              <div className="grid grid-cols-3 gap-3">
                <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-2">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Call</span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mb-2">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Video</span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Schedule</span>
                </button>
              </div>
            </div>

            {/* Members List */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">{members.length} Members</h4>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Add member
                </button>
              </div>
              <div className="space-y-1">
                {members.map(member => (
                  <button
                    key={member.id}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">{member.avatar}</span>
                      </div>
                      {member.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    {member.role === 'Admin' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex-shrink-0">
                        Admin
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Group Settings */}
            <div className="p-6 border-t border-gray-200">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Group Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-left mt-2">
                <X className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-600">Leave Group</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overlay when sidebar is open */}
        {showGroupInfo && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setShowGroupInfo(false)}
          />
        )}
      </div>
    </div>
  );
}
