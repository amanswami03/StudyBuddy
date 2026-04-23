import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, FileText, Video, Settings, Send, Paperclip, Smile, Download, Upload, ThumbsUp, MessageSquare, Clock, X, Search, MoreVertical, Phone, Info, Trash2, Crown, Shield } from 'lucide-react';
import { getGroupMessages, postGroupMessage, getGroup, getGroupMembers, removeGroupMember, makeGroupAdmin, removeGroupAdmin, leaveGroup, updateGroup, canViewGroupContent, getGroupSessions, joinGroupSession, voteForSessionTime, getGroupResources, uploadGroupResource, deleteGroupResource, getGroupJoinRequests, approveJoinRequest, rejectJoinRequest, joinGroup } from './utils/api';
import ScheduleSessionModal from './components/ScheduleSessionModal';
import DeleteGroupModal from './components/DeleteGroupModal';
import UserProfileModal from './components/UserProfileModal';

// Get API base URL for file access
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function GroupDetail() {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMemberOptions, setShowMemberOptions] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [canViewContent, setCanViewContent] = useState(false);
  const [userRole, setUserRole] = useState('member');
  const [isMember, setIsMember] = useState(false);
  const messagesEndRef = useRef(null);

  const [chatMessages, setChatMessages] = useState([]);
  const processedMessageIdsRef = useRef(new Set()); // Track message IDs we've already processed
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [sharedLinks, setSharedLinks] = useState([]);
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);
  const resourceFileInputRef = useRef(null);

  const [groupSettings, setGroupSettings] = useState({
    name: '',
    description: '',
    isPublic: true,
    allowContentViewWithoutJoin: false,
    requireAdminApproval: false
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);

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

  // Helper function to extract URLs from text
  const extractUrlsFromText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  };

  // Helper function to extract all links from messages
  const extractLinksFromMessages = (messages) => {
    const linksMap = new Map();
    messages.forEach(msg => {
      const urls = extractUrlsFromText(msg.content);
      urls.forEach(url => {
        if (!linksMap.has(url)) {
          linksMap.set(url, {
            url,
            sentBy: msg.senderName,
            sentAt: msg.createdAt,
          });
        }
      });
    });
    return Array.from(linksMap.values()).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
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

          // Update settings form
          setGroupSettings({
            name: gg.name || '',
            description: gg.description || '',
            isPublic: gg.is_public !== false,
            allowContentViewWithoutJoin: gg.allow_content_view_without_join || false
          });
        } catch (e) {
          console.warn('failed to load group details', e);
        }

        // Check if user can view content
        try {
          const viewAccess = await canViewGroupContent(groupIdParam);
          if (!isMounted) return;
          setCanViewContent(viewAccess.can_view || false);
        } catch (e) {
          console.warn('failed to check content access', e);
        }

        // Fetch group members
        try {
          setLoadingMembers(true);
          const membersList = await getGroupMembers(groupIdParam);
          if (!isMounted) return;
          setMembers(membersList || []);

          // Check if current user is a member and/or admin
          const currentUserId = localStorage.getItem('sb_user_id');
          const currentUser = membersList?.find(m => m.user_id === parseInt(currentUserId));
          if (currentUser) {
            setUserRole(currentUser.role);
            setIsMember(true);
          } else {
            setIsMember(false);
          }

          // Fetch join requests if user is admin (only admins can view them)
          if (currentUser && currentUser.role === 'admin') {
            try {
              const requests = await getGroupJoinRequests(groupIdParam);
              if (!isMounted) return;
              setJoinRequests(requests || []);
            } catch (e) {
              console.warn('failed to load join requests', e);
              // It's ok if this fails - endpoint might not support it yet
            }
          }
        } catch (e) {
          console.warn('failed to load members', e);
          setIsMember(false);
        } finally {
          setLoadingMembers(false);
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
        // Extract links from messages
        const links = extractLinksFromMessages(normalized);
        setSharedLinks(links);
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

          // Check if we've already processed this message (by ID or clientTempId)
          const msgKey = m.id || m.clientTempId;
          if (msgKey && processedMessageIdsRef.current.has(msgKey)) {
            console.log('Message already processed, skipping:', msgKey);
            return;
          }

          // If this is a message with an ID (already persisted), check if we already have it
          if (m.id) {
            if (processedMessageIdsRef.current.has(m.id)) {
              return; // Already processed
            }
            
            setChatMessages(prev => {
              // Check if we already have this message by ID
              const alreadyExists = prev.some(msg => msg.id === m.id);
              if (alreadyExists) {
                processedMessageIdsRef.current.add(m.id);
                return prev;
              }
              
              // Check if we have it by clientTempId (optimistic message)
              const hasOptimisticMatch = prev.some(msg => msg.clientTempId === m.clientTempId);
              if (hasOptimisticMatch) {
                // Replace optimistic with server version
                processedMessageIdsRef.current.add(m.id);
                if (m.clientTempId) processedMessageIdsRef.current.add(m.clientTempId);
                return prev.map(msg =>
                  msg.clientTempId === m.clientTempId ? { ...m } : msg
                );
              }
              
              // New message from someone else, add it
              processedMessageIdsRef.current.add(m.id);
              return [...prev, m];
            });
            return;
          }

          // For messages without ID (shouldn't happen but fallback)
          addMessageIfNotExists(m);
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
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

  // Update shared links when messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      const links = extractLinksFromMessages(chatMessages);
      setSharedLinks(links);
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!isMember) {
      alert('You must join the group to send messages!');
      return;
    }
    
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
      console.log('📤 Sending message:', { groupID: groupIdParam, content: messageContent, clientTempId });
      
      // PRIMARY: Always save to DB via HTTP (guaranteed persistence)
      const response = await postGroupMessage(groupIdParam, messageContent, clientTempId);
      
      console.log('✅ Message response from server:', response);
      
      if (!response || !response.id) {
        throw new Error('Invalid response from server: missing message ID');
      }

      // Track this message as processed so WebSocket doesn't duplicate it
      processedMessageIdsRef.current.add(response.id);
      processedMessageIdsRef.current.add(clientTempId);
      
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
      
      console.log('💾 Message persisted to database');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      // Mark as failed but keep message visible for user to retry
      setChatMessages(prev =>
        prev.map(m =>
          m.clientTempId === clientTempId
            ? { ...m, isFailed: true, failureMessage: error.message }
            : m
        )
      );
      alert('Failed to send message: ' + error.message);
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

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeGroupMember(groupIdParam, memberId);
      setMembers(members.filter(m => m.user_id !== memberId));
      setShowMemberOptions(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member: ' + error.message);
    }
  };

  const handleMakeAdmin = async (memberId) => {
    try {
      await makeGroupAdmin(groupIdParam, memberId);
      setMembers(members.map(m => m.user_id === memberId ? { ...m, role: 'admin' } : m));
      setShowMemberOptions(null);
    } catch (error) {
      console.error('Failed to make admin:', error);
      alert('Failed to make admin: ' + error.message);
    }
  };

  const handleRemoveAdmin = async (memberId) => {
    try {
      await removeGroupAdmin(groupIdParam, memberId);
      setMembers(members.map(m => m.user_id === memberId ? { ...m, role: 'member' } : m));
      setShowMemberOptions(null);
    } catch (error) {
      console.error('Failed to remove admin:', error);
      alert('Failed to remove admin: ' + error.message);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await leaveGroup(groupIdParam);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to leave group:', error);
      alert('Failed to leave group: ' + error.message);
    }
  };

  const handleUpdateGroupSettings = async () => {
    setSettingsLoading(true);
    try {
      await updateGroup(groupIdParam, {
        name: groupSettings.name,
        description: groupSettings.description,
        is_public: groupSettings.isPublic,
        allow_content_view_without_join: groupSettings.allowContentViewWithoutJoin,
        require_admin_approval: groupSettings.requireAdminApproval
      });
      setShowSettingsModal(false);
      alert('Group settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings: ' + error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Handle approving a join request
  const handleApproveJoinRequest = async (requestId) => {
    try {
      await approveJoinRequest(groupIdParam, requestId);
      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
      alert('Join request approved!');
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve: ' + error.message);
    }
  };

  // Handle rejecting a join request
  const handleRejectJoinRequest = async (requestId) => {
    const reason = prompt('Enter reason for rejection (optional):');
    try {
      await rejectJoinRequest(groupIdParam, requestId, reason || '');
      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
      alert('Join request rejected!');
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject: ' + error.message);
    }
  };

  // Handle joining a group
  const handleJoinGroup = async () => {
    try {
      const result = await joinGroup(groupIdParam);
      if (result.status === 'pending') {
        alert('Join request sent! Waiting for admin approval.');
      } else {
        alert('Successfully joined the group!');
        // Reload the page to refresh group membership
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to join group:', error);
      alert('Failed to join group: ' + error.message);
    }
  };

  // Fetch group sessions
  useEffect(() => {
    if (!groupIdParam) return;
    
    const fetchSessions = async () => {
      try {
        setLoadingSessions(true);
        const data = await getGroupSessions(groupIdParam);
        setSessions(data.sessions || []);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [groupIdParam]);

  // Fetch group resources
  useEffect(() => {
    if (!groupIdParam) return;
    
    const fetchResources = async () => {
      try {
        setLoadingResources(true);
        const data = await getGroupResources(groupIdParam);
        setResources(data || []);
      } catch (error) {
        console.error('Failed to fetch resources:', error);
        setResources([]);
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, [groupIdParam]);

  const handleSearchMessages = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = chatMessages.filter(msg =>
      (msg.content && msg.content.toLowerCase().includes(lowerQuery)) ||
      (msg.sender && msg.sender.toLowerCase().includes(lowerQuery))
    );
    setSearchResults(results);
  };

  const handleSelectSearchResult = (messageId) => {
    // Find the message element and scroll to it
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight effect
      messageElement.style.backgroundColor = '#fef3c7';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
    // Close search modal
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ─── Derived values ────────────────────────────────────────────
  const isAdmin = userRole === 'admin';
  const currentUserID = parseInt(localStorage.getItem('sb_user_id') || '0', 10);

  // Color for the group accent strip
  const STRIP = '#1d4ed8';

  const tabDef = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'resources', label: 'Resources', icon: FileText },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--page-bg, #fef8ec)' }}>

      {/* ── Top nav ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-amber-100 shadow-sm flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button onClick={handleBack}
                className="p-2 hover:bg-amber-50 rounded-xl transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <button onClick={() => setShowGroupInfo(!showGroupInfo)}
                className="flex items-center gap-2.5 hover:bg-amber-50 rounded-xl px-2 py-1.5 transition-colors min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: STRIP + '18', color: STRIP }}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <h1 className="text-sm font-extrabold text-slate-800 truncate leading-tight">{group.name}</h1>
                  <p className="text-xs text-slate-400 leading-tight">{group.members} members</p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setShowSearchModal(!showSearchModal)}
                className="p-2 hover:bg-amber-50 rounded-xl transition-colors">
                <Search className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={() => setShowGroupInfo(!showGroupInfo)}
                className="p-2 hover:bg-amber-50 rounded-xl transition-colors">
                <Info className="w-4 h-4 text-slate-500" />
              </button>
              {isAdmin && (
                <button onClick={() => setShowSettingsModal(true)}
                  className="p-2 hover:bg-amber-50 rounded-xl transition-colors">
                  <Settings className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabDef.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`pb-3 border-b-2 px-1 flex items-center gap-1.5 text-sm font-semibold transition-all ${
                  activeTab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${showGroupInfo ? 'mr-80' : ''}`}>

          {/* ── CHAT TAB ─────────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--page-bg-alt, #f9f3e3)' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-3xl mx-auto space-y-3">
                  {/* Date badge */}
                  <div className="flex justify-center">
                    <span className="text-xs font-semibold text-slate-400 bg-white px-3 py-1 rounded-full border border-amber-100 shadow-sm">Today</span>
                  </div>

                  {chatMessages.map(msg => {
                    const senderName = (msg.senderName && msg.senderName.trim()) || 'Unknown';
                    const isMe = typeof msg.senderID === 'number' && msg.senderID === currentUserID;
                    const avatar = (senderName || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
                    const timeStr = formatTimeIST(msg.createdAt);

                    let content = msg.content || msg.message || '';
                    let fileMeta = null;
                    try {
                      const parsed = JSON.parse(content);
                      if (parsed && parsed.type === 'file') {
                        if (parsed.url && !parsed.url.startsWith('http')) parsed.url = `${API_BASE}${parsed.url}`;
                        fileMeta = parsed;
                      }
                    } catch (e) {}

                    return (
                      <div key={msg.id ?? msg.clientTempId ?? Math.random()} id={`message-${msg.id}`}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[72%] ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && (
                            <button
                              onClick={() => { if (msg.senderID) { setSelectedUserId(msg.senderID); setShowUserProfileModal(true); } }}
                              className="w-8 h-8 rounded-full flex-shrink-0 mt-1 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                              style={{ background: `hsl(${(msg.senderID || 0) * 37 % 360},60%,50%)` }}>
                              {avatar}
                            </button>
                          )}
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && (
                              <button onClick={() => { if (msg.senderID) { setSelectedUserId(msg.senderID); setShowUserProfileModal(true); } }}
                                className="text-xs font-semibold text-slate-600 hover:text-blue-600 mb-1 px-1 transition-colors">
                                {senderName}
                              </button>
                            )}
                            <div className={`rounded-2xl px-3.5 py-2 shadow-sm ${
                              isMe
                                ? 'rounded-br-sm text-white'
                                : 'bg-white rounded-bl-sm text-slate-800 border border-amber-100'
                            } ${msg.isFailed ? 'opacity-60' : ''}`}
                              style={isMe ? { background: `linear-gradient(135deg, ${STRIP} 0%, #0284c7 100%)` } : {}}>
                              {fileMeta ? (
                                fileMeta.mime?.startsWith('image') ? (
                                  <img src={fileMeta.url} alt={fileMeta.filename} className="max-w-xs rounded-xl" />
                                ) : fileMeta.mime?.startsWith('video') ? (
                                  <video controls src={fileMeta.url} className="max-w-xs rounded-xl" />
                                ) : fileMeta.mime?.startsWith('audio') ? (
                                  <audio controls src={fileMeta.url} className="max-w-xs" />
                                ) : (
                                  <div className={`p-2.5 rounded-xl ${isMe ? 'bg-white/20' : 'bg-amber-50'}`}>
                                    <div className="flex items-center gap-2.5 mb-2">
                                      <span className="text-2xl">
                                        {fileMeta.mime === 'application/pdf' ? '📄' : fileMeta.mime?.includes('word') ? '📝' : fileMeta.mime?.includes('sheet') ? '📊' : fileMeta.mime?.includes('presentation') ? '📑' : '📎'}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold truncate ${isMe ? 'text-white' : 'text-slate-800'}`}>{fileMeta.filename}</p>
                                        <p className={`text-xs ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                          {fileMeta.size ? (fileMeta.size / (1024*1024)).toFixed(2) + ' MB' : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <a href={fileMeta.url} download={fileMeta.filename}
                                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${isMe ? 'bg-white text-blue-700 hover:bg-blue-50' : 'bg-blue-700 text-white hover:bg-blue-800'}`}>
                                      <Download className="w-3 h-3" /> Download
                                    </a>
                                  </div>
                                )
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 mt-1 px-1">{timeStr}{msg.isFailed && ' · Failed'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="bg-white border-t border-amber-100 px-4 py-3 flex-shrink-0">
                {!isMember && (
                  <div className="max-w-3xl mx-auto mb-3 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm font-medium text-amber-800">Join this group to send messages</p>
                    <button onClick={handleJoinGroup}
                      className="ml-4 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
                      Join Group
                    </button>
                  </div>
                )}
                <div className="max-w-3xl mx-auto flex items-end gap-2">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-amber-50 rounded-xl transition-colors mb-0.5 flex-shrink-0">
                    <Paperclip className="w-5 h-5 text-slate-400" />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp3,.mp4,.wav,.mov,.jpg,.jpeg,.png,.gif,.zip,.rar"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const tempId = `c_${Date.now()}_${Math.floor(Math.random()*10000)}`;
                        const optimistic = { id: tempId, clientTempId: tempId, senderID: currentUserID, senderName: localStorage.getItem('sb_username') || 'You', content: JSON.stringify({ type: 'file', filename: f.name, url: URL.createObjectURL(f), mime: f.type, size: f.size }), createdAt: new Date().toISOString(), isOptimistic: true };
                        setChatMessages(prev => [...prev, optimistic]);
                        const formData = new FormData();
                        formData.append('file', f);
                        formData.append('clientTempId', tempId);
                        const response = await fetch(`${API_BASE}/api/groups/${groupIdParam}/messages/upload`, { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${localStorage.getItem('sb_token')}` } });
                        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
                        const result = await response.json();
                        setChatMessages(prev => prev.map(m => m.clientTempId === tempId ? { id: result.id, senderID: result.sender_id, senderName: result.sender_name, content: result.content, createdAt: result.created_at, clientTempId: tempId } : m));
                      } catch (err) { console.error('Upload error:', err); }
                    }} />
                  <textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={isMember ? 'Type a message… (Enter to send)' : 'Join group to chat'}
                    disabled={!isMember}
                    rows={1}
                    className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-amber-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-800 placeholder-slate-400 bg-white transition-all disabled:opacity-60"
                    style={{ minHeight: '42px', maxHeight: '120px' }} />
                  <button onClick={handleSendMessage} disabled={!isMember || !message.trim()}
                    className="p-2.5 rounded-2xl transition-all mb-0.5 flex-shrink-0 disabled:opacity-40"
                    style={{ background: STRIP, color: 'white' }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SESSIONS TAB ───────────────────────────────────────── */}
          {activeTab === 'sessions' && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Study Sessions</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Upcoming and past sessions for this group</p>
                  </div>
                  {(isAdmin || isMember) && (
                    <button onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">
                      <Calendar className="w-4 h-4" /> Schedule Session
                    </button>
                  )}
                </div>
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-sm text-slate-500">Loading sessions…</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border border-amber-100 bg-white">
                    <Calendar className="w-10 h-10 text-amber-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-600">No sessions yet</p>
                    <p className="text-sm text-slate-400 mt-1">Schedule a study session to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map(session => {
                      const sessionDate = session.scheduled_time ? new Date(session.scheduled_time) : null;
                      return (
                        <div key={session.id} className="bg-white rounded-2xl border border-amber-100 p-5 shadow-paper"
                          style={{ borderLeftWidth: '4px', borderLeftColor: STRIP }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-extrabold text-slate-800">{session.title}</h3>
                              {session.description && <p className="text-sm text-slate-500 mt-0.5">{session.description}</p>}
                            </div>
                            <span className={`subject-tab flex-shrink-0 ${session.voting_enabled ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                              {session.voting_enabled ? 'Voting' : 'Scheduled'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
                            {sessionDate && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                {sessionDate.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                              </span>
                            )}
                            {sessionDate && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                {sessionDate.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                              </span>
                            )}
                            {session.duration_minutes && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                {session.duration_minutes} min
                              </span>
                            )}
                            {session.attendee_count !== undefined && (
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                {session.attendee_count} attending
                              </span>
                            )}
                          </div>
                          {session.voting_enabled && session.voting_options && session.voting_options.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <p className="text-xs font-semibold text-slate-600">Vote for a time:</p>
                              {session.voting_options.map((opt, idx) => {
                                const optDate = new Date(opt.scheduled_time || opt);
                                return (
                                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-amber-100 bg-amber-50">
                                    <span className="text-sm text-slate-700">{optDate.toLocaleDateString()} {optDate.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-xs font-bold text-slate-500">{opt.vote_count || 0} votes</span>
                                      <button onClick={async () => { try { await voteForSessionTime(groupIdParam, session.id, opt.id); setSessions(s => s.map(x => x.id===session.id ? {...x, voting_options: x.voting_options.map((o,i)=>i===idx?{...o,vote_count:(o.vote_count||0)+1}:o)} : x)); } catch(e){alert('Vote failed: '+e.message);} }}
                                        className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
                                        Vote
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {isMember && (
                            <button onClick={async () => { try { await joinGroupSession(groupIdParam, session.id); alert('Joined session!'); setSessions(s => s.map(x => x.id===session.id ? {...x, attendee_count:(x.attendee_count||0)+1} : x)); } catch(e){alert('Failed to join: '+e.message);} }}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                              + Join Session
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── RESOURCES TAB ─────────────────────────────────────── */}
          {activeTab === 'resources' && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Study Resources</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Notes, slides, and files shared in this group</p>
                  </div>
                  {isMember && (
                    <button onClick={() => resourceFileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                  )}
                  <input ref={resourceFileInputRef} type="file" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const formData = new FormData();
                        formData.append('file', f);
                        formData.append('title', f.name);
                        await uploadGroupResource(groupIdParam, formData);
                        const data = await getGroupResources(groupIdParam);
                        setResources(data || []);
                      } catch(err){ alert('Upload failed: '+err.message); }
                    }} />
                </div>
                {loadingResources ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-sm text-slate-500">Loading resources…</span>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border border-amber-100 bg-white">
                    <FileText className="w-10 h-10 text-amber-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-600">No resources yet</p>
                    <p className="text-sm text-slate-400 mt-1">Upload notes, slides, or other study materials</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resources.map(r => {
                      const fileUrl = r.file_url && !r.file_url.startsWith('http') ? `${API_BASE}${r.file_url}` : r.file_url;
                      const ext = (r.file_url || '').split('.').pop()?.toLowerCase();
                      const icon = ext === 'pdf' ? '📄' : ['doc','docx'].includes(ext) ? '📝' : ['xls','xlsx'].includes(ext) ? '📊' : ['ppt','pptx'].includes(ext) ? '📑' : ['jpg','jpeg','png','gif'].includes(ext) ? '🖼️' : '📎';
                      return (
                        <div key={r.id} className="bg-white rounded-2xl border border-amber-100 p-4 shadow-paper"
                          style={{ borderLeftWidth: '3px', borderLeftColor: STRIP }}>
                          <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-slate-800 truncate">{r.title || r.file_url?.split('/').pop()}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {r.uploader_name && `by ${r.uploader_name} · `}
                                {r.created_at && new Date(r.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            {fileUrl && (
                              <a href={fileUrl} download
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                <Download className="w-3.5 h-3.5" /> Download
                              </a>
                            )}
                            {isAdmin && (
                              <button onClick={async () => { if (window.confirm('Delete this resource?')) { try { await deleteGroupResource(groupIdParam, r.id); setResources(prev => prev.filter(x => x.id !== r.id)); } catch(e){alert('Delete failed: '+e.message);} } }}
                                className="ml-auto text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── GROUP INFO PANEL ────────────────────────────────────── */}
        {showGroupInfo && (
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-amber-100 shadow-paper-lg z-40 overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-amber-100">
              <h3 className="font-extrabold text-sm text-slate-800">Group Info</h3>
              <button onClick={() => setShowGroupInfo(false)} className="p-1.5 rounded-xl hover:bg-amber-50 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Group summary */}
            <div className="p-4 border-b border-amber-100">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: STRIP + '18', color: STRIP }}>
                <Users className="w-7 h-7" />
              </div>
              <h2 className="font-extrabold text-base text-slate-800">{group.name}</h2>
              {group.description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{group.description}</p>}
              {group.createdDate && (
                <p className="text-xs text-slate-400 mt-2">Created {new Date(group.createdDate).toLocaleDateString('en-US', { month:'long', year:'numeric' })}</p>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-b border-amber-100 space-y-2">
              {isMember && (
                <button onClick={handleLeaveGroup}
                  className="w-full text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Leave Group
                </button>
              )}
              {isAdmin && (
                <>
                  <button onClick={() => setShowSettingsModal(true)}
                    className="w-full text-sm font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-amber-50 transition-colors">
                    <Settings className="w-4 h-4" /> Group Settings
                  </button>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="w-full text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete Group
                  </button>
                  {joinRequests.length > 0 && (
                    <button onClick={() => setShowJoinRequests(!showJoinRequests)}
                      className="w-full text-sm font-semibold text-amber-700 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
                      <Users className="w-4 h-4" /> {joinRequests.length} Join Request{joinRequests.length !== 1 ? 's' : ''}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Join requests */}
            {showJoinRequests && joinRequests.length > 0 && (
              <div className="p-4 border-b border-amber-100">
                <h4 className="text-xs font-extrabold text-slate-700 mb-3 uppercase tracking-wider">Pending Requests</h4>
                <div className="space-y-2">
                  {joinRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-sm font-medium text-slate-700">{req.username || req.user_id}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleApproveJoinRequest(req.id)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50">✓</button>
                        <button onClick={() => handleRejectJoinRequest(req.id)} className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50">✗</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className="p-4 flex-1">
              <h4 className="text-xs font-extrabold text-slate-700 mb-3 uppercase tracking-wider">
                Members ({members.length})
              </h4>
              {loadingMembers ? (
                <p className="text-xs text-slate-400">Loading…</p>
              ) : (
                <div className="space-y-1.5">
                  {members.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: `hsl(${(m.user_id || 0) * 37 % 360},60%,50%)` }}>
                          {(m.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <button onClick={() => { setSelectedUserId(m.user_id); setShowUserProfileModal(true); }}
                            className="text-xs font-semibold text-slate-700 hover:text-blue-600 truncate block transition-colors">
                            {m.username}
                          </button>
                          {m.role === 'admin' && (
                            <span className="subject-tab bg-purple-100 text-purple-700 text-xs">Admin</span>
                          )}
                        </div>
                      </div>
                      {isAdmin && m.user_id !== currentUserID && (
                        <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setShowMemberOptions(showMemberOptions === m.user_id ? null : m.user_id)}
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {showMemberOptions === m.user_id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-paper-md border border-amber-100 py-1 z-50">
                              {m.role !== 'admin'
                                ? <button onClick={() => handleMakeAdmin(m.user_id)} className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-amber-50 flex items-center gap-2"><Crown className="w-3.5 h-3.5 text-purple-500" />Make Admin</button>
                                : <button onClick={() => handleRemoveAdmin(m.user_id)} className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-amber-50 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-slate-400" />Remove Admin</button>
                              }
                              <button onClick={() => handleRemoveMember(m.user_id)} className="w-full px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />Remove</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────── */}

      {/* Search modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-2xl shadow-paper-lg w-full max-w-lg border border-amber-100">
            <div className="flex items-center gap-3 p-4 border-b border-amber-100">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input type="text" value={searchQuery} onChange={e => handleSearchMessages(e.target.value)}
                placeholder="Search messages…" autoFocus
                className="flex-1 text-sm outline-none text-slate-800 placeholder-slate-400" />
              <button onClick={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]); }}
                className="p-1 rounded-xl hover:bg-amber-50 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {searchResults.length > 0 ? searchResults.map(r => (
                <div key={r.id} onClick={() => handleSelectSearchResult(r.id)}
                  className="px-4 py-3 cursor-pointer hover:bg-amber-50 border-b border-amber-50 last:border-0">
                  <p className="text-xs font-bold text-slate-600 mb-0.5">{r.senderName}</p>
                  <p className="text-sm text-slate-700 truncate">{r.content}</p>
                </div>
              )) : searchQuery ? (
                <p className="p-4 text-center text-sm text-slate-400">No results found</p>
              ) : (
                <p className="p-4 text-center text-sm text-slate-400">Type to search messages</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-paper-lg w-full max-w-md border border-amber-100">
            <div className="flex items-center justify-between p-5 border-b border-amber-100">
              <h2 className="text-lg font-extrabold text-slate-800">Group Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="p-1.5 rounded-xl hover:bg-amber-50 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Group Name', key: 'name', type: 'input' },
                { label: 'Description', key: 'description', type: 'textarea' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                  {type === 'textarea' ? (
                    <textarea value={groupSettings[key]} onChange={e => setGroupSettings({...groupSettings, [key]: e.target.value})} rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-amber-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none" />
                  ) : (
                    <input type="text" value={groupSettings[key]} onChange={e => setGroupSettings({...groupSettings, [key]: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-amber-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                  )}
                </div>
              ))}
              {[
                { key: 'isPublic', label: 'Public group' },
                { key: 'allowContentViewWithoutJoin', label: 'Allow non-members to view content' },
                { key: 'requireAdminApproval', label: 'Require admin approval for new members' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={groupSettings[key]} onChange={e => setGroupSettings({...groupSettings, [key]: e.target.checked})}
                    className="w-4 h-4 rounded border-amber-200 text-blue-600" />
                  <span className="text-sm text-slate-600">{label}</span>
                </label>
              ))}
              <div className="flex gap-3 pt-2 border-t border-amber-100">
                <button onClick={() => setShowSettingsModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleUpdateGroupSettings} disabled={settingsLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50">
                  {settingsLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule session modal */}
      {showScheduleModal && (
        <ScheduleSessionModal groupId={groupIdParam} onClose={() => setShowScheduleModal(false)}
          onSessionCreated={async () => {
            try { const data = await getGroupSessions(groupIdParam); setSessions(data.sessions || []); } catch(e){}
          }} />
      )}

      {/* Delete group modal */}
      {showDeleteModal && (
        <DeleteGroupModal groupId={groupIdParam} groupName={group.name}
          onClose={() => setShowDeleteModal(false)}
          onGroupDeleted={() => navigate('/dashboard')} />
      )}

      {/* User profile modal */}
      {showUserProfileModal && (
        <UserProfileModal userId={selectedUserId} isOpen={showUserProfileModal}
          onClose={() => { setShowUserProfileModal(false); setSelectedUserId(null); }} />
      )}
    </div>
  );
}
