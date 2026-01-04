import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, FileText, Video, Settings, Send, Paperclip, Smile, Download, Upload, ThumbsUp, MessageSquare, Clock, X, Search, MoreVertical, Phone, Info, Trash2, Crown, Shield } from 'lucide-react';
import { getGroupMessages, postGroupMessage, getGroup, getGroupMembers, removeGroupMember, makeGroupAdmin, removeGroupAdmin, leaveGroup, updateGroup, canViewGroupContent, getGroupSessions, joinGroupSession, voteForSessionTime, getGroupResources, uploadGroupResource, deleteGroupResource, getGroupJoinRequests, approveJoinRequest, rejectJoinRequest, joinGroup } from './utils/api';
import ScheduleSessionModal from './components/ScheduleSessionModal';
import DeleteGroupModal from './components/DeleteGroupModal';

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
      // PRIMARY: Always save to DB via HTTP (guaranteed persistence)
      const response = await postGroupMessage(groupIdParam, messageContent, clientTempId);
      
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
              <button 
                onClick={() => setShowSearchModal(!showSearchModal)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
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
                      <div key={msg.id ?? `${msg.clientTempId ?? Math.random()}`} id={`message-${msg.id}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                {!isMember && (
                  <div className="max-w-4xl mx-auto mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-amber-800 text-sm font-medium">
                        You must join this group to send messages.
                      </p>
                      <button
                        onClick={handleJoinGroup}
                        className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:shadow-lg transition-shadow"
                      >
                        Join Group
                      </button>
                    </div>
                  </div>
                )}
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
                        placeholder={isMember ? "Type a message..." : "Join the group to send messages"}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!isMember}
                        rows="1"
                        className={`w-full px-4 py-3 pr-12 rounded-2xl border ${!isMember ? 'border-gray-200 bg-gray-50' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 ${!isMember ? 'cursor-not-allowed opacity-60' : ''}`}
                        style={{ minHeight: '44px' }}
                      />
                      <button className="absolute right-3 bottom-3 hover:bg-gray-100 rounded-full p-1 transition-colors" disabled={!isMember}>
                        <Smile className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || !isMember}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-1"
                      title={!isMember ? "Join the group to send messages" : "Send message"}
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
                  <button 
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-shadow"
                  >
                    Schedule New Session
                  </button>
                </div>

                {loadingSessions ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading sessions...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No scheduled sessions yet. Create one to get started!</p>
                  </div>
                ) : (
                  sessions.map(session => {
                    const sessionDate = new Date(session.scheduled_time);
                    const dateStr = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
                    const timeStr = sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={session.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {dateStr}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {timeStr}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                {session.attendee_count} attending
                              </span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            session.status === 'confirmed' 
                              ? 'bg-green-100 text-green-700' 
                              : session.status === 'voting'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {session.status === 'confirmed' ? 'Confirmed' : session.status === 'voting' ? 'Voting Open' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </span>
                        </div>

                        {session.description && (
                          <p className="text-sm text-gray-600 mb-4">{session.description}</p>
                        )}

                        <p className="text-sm text-gray-600 mb-4">Hosted by {session.created_by_name}</p>

                        {session.voting_enabled && session.voting_options && session.voting_options.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-3">Vote for your preferred time:</p>
                            {session.voting_options.map((option) => {
                              const isUserVote = option.user_voted === true;
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => {
                                    voteForSessionTime(session.id, option.id)
                                      .then(() => {
                                        alert(isUserVote ? 'Vote removed' : 'Vote recorded successfully');
                                        // Refresh sessions to show updated votes
                                        getGroupSessions(groupIdParam).then(data => setSessions(data.sessions || []));
                                      })
                                      .catch(err => alert('Failed to vote: ' + err.message));
                                  }}
                                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                    isUserVote 
                                      ? 'border-blue-500 bg-blue-50' 
                                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                  }`}
                                >
                                  <span className="text-sm font-medium text-gray-900">
                                    {new Date(option.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 font-medium">{option.votes} votes</span>
                                    <ThumbsUp className={`w-4 h-4 ${isUserVote ? 'text-blue-500 fill-blue-500' : 'text-gray-400'}`} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                          <button 
                            onClick={() => {
                              const status = session.status === 'confirmed' ? 'attending' : 'interested';
                              joinGroupSession(session.id, status)
                                .then(() => {
                                  alert(`Successfully joined session as ${status}`);
                                  // Refresh sessions
                                  getGroupSessions(groupIdParam).then(data => setSessions(data.sessions || []));
                                })
                                .catch(err => alert('Failed to join: ' + err.message));
                            }}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-xl font-medium hover:shadow-lg transition-shadow"
                          >
                            {session.status === 'confirmed' ? 'Join Session' : 'Add to Calendar'}
                          </button>
                          <button className="px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex h-full">
                {/* Left Panel - Shared Links */}
                <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 sticky top-0 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">Shared Links</h3>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    {sharedLinks.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600 text-sm">No links shared yet</p>
                      </div>
                    ) : (
                      sharedLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start gap-2">
                            <div className="text-xl flex-shrink-0 pt-0.5">🔗</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-blue-600 group-hover:text-blue-700 truncate">
                                {new URL(link.url).hostname}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{link.url}</p>
                              <p className="text-xs text-gray-400 mt-1">by {link.sentBy}</p>
                            </div>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Panel - Uploaded Files */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Uploaded Files</h2>
                      <button 
                        onClick={() => resourceFileInputRef.current && resourceFileInputRef.current.click()}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
                      >
                        <Upload className="w-5 h-5" />
                        Upload File
                      </button>
                      <input 
                        ref={resourceFileInputRef} 
                        type="file" 
                        style={{ display: 'none' }} 
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                        onChange={async (e) => {
                          const f = e.target.files && e.target.files[0];
                          if (!f) return;
                          try {
                            await uploadGroupResource(groupIdParam, f);
                            alert('File uploaded successfully');
                            // Refresh resources
                            const data = await getGroupResources(groupIdParam);
                            setResources(data || []);
                          } catch (err) {
                            console.error('upload failed', err);
                            alert(`Failed to upload file: ${err.message}`);
                          }
                          // Reset file input
                          if (resourceFileInputRef.current) {
                            resourceFileInputRef.current.value = '';
                          }
                        }} 
                      />
                    </div>

                    {loadingResources ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">Loading resources...</p>
                      </div>
                    ) : resources.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No files uploaded yet. Upload one to get started!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {resources.map(resource => {
                          const fileSize = resource.file_size ? (resource.file_size / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown';
                          const uploadedDate = new Date(resource.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                          return (
                            <div key={resource.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-gray-900 text-sm truncate">{resource.filename}</h3>
                                    <p className="text-xs text-gray-500">{fileSize}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    if (window.confirm('Delete this resource?')) {
                                      deleteGroupResource(resource.id)
                                        .then(() => {
                                          setResources(resources.filter(r => r.id !== resource.id));
                                        })
                                        .catch(err => alert('Failed to delete: ' + err.message));
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                              <div className="text-xs text-gray-600 mb-4 space-y-1">
                                <p>Uploaded by <span className="font-medium">{resource.uploaded_by_name || 'Unknown'}</span></p>
                                <p className="text-gray-400">{uploadedDate}</p>
                              </div>
                              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <span className="text-xs text-gray-500">{resource.download_count} downloads</span>
                                <a
                                  href={resource.file_path}
                                  download={resource.filename}
                                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
              <div className="grid grid-cols-1 gap-3">
                <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Schedule</span>
                </button>
              </div>
            </div>

            {/* Join Requests Section - Admin only */}
            {userRole === 'admin' && joinRequests.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">
                    <Users className="w-4 h-4 inline mr-2 text-blue-600" />
                    Pending Join Requests ({joinRequests.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {joinRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                          {request.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{request.username}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => handleApproveJoinRequest(request.id)}
                          className="px-2 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectJoinRequest(request.id)}
                          className="px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">{members.length} Members</h4>
              </div>
              {loadingMembers ? (
                <div className="text-center text-gray-500 text-sm">Loading members...</div>
              ) : (
                <div className="space-y-1">
                  {members.map(member => (
                    <div
                      key={member.user_id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors relative"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">{member.username?.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{member.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      </div>
                      {member.role === 'admin' && (
                        <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      {userRole === 'admin' && member.role !== 'admin' && (
                        <div className="relative">
                          <button
                            onClick={() => setShowMemberOptions(showMemberOptions === member.user_id ? null : member.user_id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {showMemberOptions === member.user_id && (
                            <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[150px]">
                              <button
                                onClick={() => handleMakeAdmin(member.user_id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 text-gray-700"
                              >
                                <Shield className="w-4 h-4" />
                                Make Admin
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group Settings */}
            <div className="p-6 border-t border-gray-200">
              {userRole === 'admin' && (
                <button
                  onClick={async () => {
                    // Load current group data
                    try {
                      const currentGroup = await getGroup(groupIdParam);
                      setGroupSettings({
                        name: currentGroup.name || '',
                        description: currentGroup.description || '',
                        isPublic: currentGroup.is_public !== false,
                        allowContentViewWithoutJoin: currentGroup.allow_content_view_without_join || false,
                        requireAdminApproval: currentGroup.require_admin_approval || false
                      });
                    } catch (e) {
                      console.error('Failed to load group:', e);
                    }
                    setShowSettingsModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Group Settings</span>
                </button>
              )}
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    setShowGroupInfo(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-left mt-2"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Delete Group</span>
                </button>
              )}
              <button
                onClick={handleLeaveGroup}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-left mt-2"
              >
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

      {/* Group Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Group Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateGroupSettings();
              }}
              className="p-6 space-y-4"
            >
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupSettings.name}
                  onChange={(e) => setGroupSettings({ ...groupSettings, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={groupSettings.description}
                  onChange={(e) => setGroupSettings({ ...groupSettings, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Public */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={groupSettings.isPublic}
                  onChange={(e) => setGroupSettings({ ...groupSettings, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Make this group public
                </label>
              </div>

              {/* Allow content view without join */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allowContentView"
                  checked={groupSettings.allowContentViewWithoutJoin}
                  onChange={(e) => setGroupSettings({ ...groupSettings, allowContentViewWithoutJoin: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="allowContentView" className="text-sm text-gray-700">
                  Allow non-members to view content
                </label>
              </div>

              {/* Require admin approval */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="requireAdminApproval"
                  checked={groupSettings.requireAdminApproval}
                  onChange={(e) => setGroupSettings({ ...groupSettings, requireAdminApproval: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="requireAdminApproval" className="text-sm text-gray-700">
                  Admin approval required for new members to join
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
                >
                  {settingsLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <ScheduleSessionModal 
          groupId={groupIdParam}
          onClose={() => setShowScheduleModal(false)}
          onSessionCreated={(newSession) => {
            setSessions(prev => [newSession, ...prev]);
            setShowScheduleModal(false);
            alert('Session created successfully!');
          }}
        />
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-96">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Search Messages</h2>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search messages by text or sender name..."
                value={searchQuery}
                onChange={(e) => handleSearchMessages(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 180px)' }}>
              {searchResults.length > 0 ? (
                <div className="p-6 space-y-4">
                  {searchResults.map((msg) => (
                    <div 
                      key={msg.id} 
                      onClick={() => handleSelectSearchResult(msg.id)}
                      className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-gray-900">{msg.sender}</p>
                        <p className="text-xs text-gray-500">{formatTimeIST(msg.timestamp)}</p>
                      </div>
                      <p className="text-gray-700 text-sm break-words">
                        {msg.content ? msg.content : (msg.file_name ? `📎 ${msg.file_name}` : 'Media message')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No messages found matching your search.</p>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <p>Start typing to search messages...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {showDeleteModal && (
        <DeleteGroupModal
          groupId={groupIdParam}
          groupName={currentGroup?.name || 'Group'}
          onClose={() => setShowDeleteModal(false)}
          onGroupDeleted={() => {
            // Redirect to groups page after deletion
            navigate('/groups');
          }}
        />
      )}
    </div>
  );
}
