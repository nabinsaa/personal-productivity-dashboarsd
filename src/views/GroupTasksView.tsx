import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Plus,
  CheckSquare,
  FileText,
  Copy,
  Check,
  Clock,
  UserCheck,
  UserX,
  Trash2,
  Calendar,
  AlertCircle,
  Share2,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Activity,
  Link,
  PlusCircle,
  ExternalLink,
  Video,
  Mic,
  Monitor,
  Paperclip,
  Smile,
  Image as ImageIcon,
  X,
  Download,
  PhoneCall,
  Radio,
  Play,
  Pause,
  Maximize2,
  Pencil,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  Highlighter,
  Eye,
  History,
  Edit3,
} from 'lucide-react';
import {
  GroupWorkspace,
  GroupMember,
  GroupTaskItem,
  GroupNoteItem,
  GroupChatMessage,
  GroupActivityItem,
  Priority,
  ChatAttachment,
  TaskAuditLogEntry,
  TaskComment,
  GroupCallSession,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  subscribeWorkspaces,
  createGroupWorkspace,
  joinGroupWorkspaceByCode,
  subscribeGroupMembers,
  acceptGroupMember,
  rejectGroupMember,
  removeGroupMember,
  deleteGroupWorkspace,
  subscribeGroupTasks,
  addGroupTask,
  updateGroupTask,
  deleteGroupTask,
  subscribeGroupNotes,
  addGroupNote,
  deleteGroupNote,
  subscribeGroupChat,
  sendGroupChatMessage,
  toggleGroupChatMessageReaction,
  deleteGroupChatMessage,
  updateGroupChatMessage,
  clearAllGroupChatMessages,
  subscribeGroupActivity,
  logGroupActivity,
  startGroupCallSession,
  subscribeActiveGroupCalls,
  acceptGroupCallSession,
  declineGroupCallSession,
  endGroupCallSession,
} from '../services/dbService';
import { GroupCallModal } from '../components/GroupCallModal';
import { IncomingCallModal } from '../components/IncomingCallModal';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { ImageLightboxModal } from '../components/ImageLightboxModal';
import { FormattedChatMessage } from '../components/FormattedChatMessage';

export const GroupTasksView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();

  // Realtime Workspaces State
  const [workspaces, setWorkspaces] = useState<GroupWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  // Active Workspace Subscriptions
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [tasks, setTasks] = useState<GroupTaskItem[]>([]);
  const [notes, setNotes] = useState<GroupNoteItem[]>([]);
  const [chatMessages, setChatMessages] = useState<GroupChatMessage[]>([]);
  const [activities, setActivities] = useState<GroupActivityItem[]>([]);

  // Sub-tabs inside active workspace view
  const [subTab, setSubTab] = useState<'tasks' | 'chat' | 'activity' | 'members' | 'notes'>('tasks');

  // Modals & Collaboration States
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isJoinWsOpen, setIsJoinWsOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<GroupTaskItem | null>(null);
  const [detailSubtaskInput, setDetailSubtaskInput] = useState('');

  // Task Modal Enhanced States (Audit Log, Comments, Rich Text Description)
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'comments' | 'history'>('details');
  const [isEditingTaskDescInModal, setIsEditingTaskDescInModal] = useState(false);
  const [taskDescEditingText, setTaskDescEditingText] = useState('');
  const [taskCommentInput, setTaskCommentInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Quick Edit State in Task List View
  const [quickEditingTaskId, setQuickEditingTaskId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('Medium');

  // Video/Audio Calling State
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio' | 'screen'>('video');
  const [activeCalls, setActiveCalls] = useState<GroupCallSession[]>([]);
  const [activeCallSession, setActiveCallSession] = useState<GroupCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<GroupCallSession | null>(null);

  // Chat Attachments, Editing & Formatting State
  const [chatAttachment, setChatAttachment] = useState<ChatAttachment | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name?: string } | null>(null);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState<string>('');

  // Form Inputs
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group Chat Input & Container Ref
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Group Task Inputs & Attachments
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskSubtasks, setTaskSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<ChatAttachment[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  // New Group Note Inputs
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'assigned_to_me' | 'assigned_by_me' | 'pending_acceptance'>('all');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Handle URL parameter on mount (e.g. ?joinGroup=GRP92X)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('joinGroup');
    if (code) {
      setJoinCodeInput(code.toUpperCase());
      setIsJoinWsOpen(true);
    }
  }, []);

  // Subscribe to user workspaces (stable dependency on currentUser)
  useEffect(() => {
    // Reset workspace and chat state when user switches or logs out
    setWorkspaces([]);
    setActiveWorkspaceId(null);
    setMembers([]);
    setTasks([]);
    setNotes([]);
    setChatMessages([]);
    setActivities([]);

    if (!currentUser) return;
    const unsub = subscribeWorkspaces(currentUser.uid, (wsList) => {
      setWorkspaces(wsList);
      setActiveWorkspaceId((prev) => {
        if (wsList.length === 0) return null;
        if (!prev || !wsList.some((w) => w.id === prev)) {
          return wsList[0].id;
        }
        return prev;
      });
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // Subscribe to active workspace details (members, tasks, notes, chat, activity, calls)
  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers([]);
      setTasks([]);
      setNotes([]);
      setChatMessages([]);
      setActivities([]);
      setActiveCalls([]);
      setActiveCallSession(null);
      setIncomingCall(null);
      return;
    }

    const unsubMembers = subscribeGroupMembers(activeWorkspaceId, setMembers);
    const unsubTasks = subscribeGroupTasks(activeWorkspaceId, setTasks);
    const unsubNotes = subscribeGroupNotes(activeWorkspaceId, setNotes);
    const unsubChat = subscribeGroupChat(activeWorkspaceId, setChatMessages);
    const unsubActivity = subscribeGroupActivity(activeWorkspaceId, setActivities);

    const unsubCalls = subscribeActiveGroupCalls(activeWorkspaceId, (calls) => {
      setActiveCalls(calls);
      if (!currentUser) return;

      // Find call current user is currently in or initiated
      const myCall = calls.find(
        (c) =>
          (c.participants.includes(currentUser.uid) || c.callerId === currentUser.uid) &&
          c.status !== 'ended'
      );
      if (myCall) {
        setActiveCallSession(myCall);
      } else {
        setActiveCallSession(null);
        setIsCallModalOpen(false);
      }

      // Detect incoming ringing call for this user
      const incoming = calls.find(
        (c) =>
          c.status === 'ringing' &&
          c.callerId !== currentUser.uid &&
          !c.participants.includes(currentUser.uid) &&
          !c.declinedBy?.includes(currentUser.uid)
      );

      setIncomingCall(incoming || null);
    });

    return () => {
      unsubMembers();
      unsubTasks();
      unsubNotes();
      unsubChat();
      unsubActivity();
      unsubCalls();
    };
  }, [activeWorkspaceId, currentUser?.uid]);

  // Auto-scroll chat inside container without affecting main page scroll
  useEffect(() => {
    if (subTab === 'chat' && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, subTab]);

  // Keep selectedTaskDetail in sync with updated tasks state
  useEffect(() => {
    if (selectedTaskDetail) {
      const updated = tasks.find((t) => t.id === selectedTaskDetail.id);
      if (updated) {
        setSelectedTaskDetail(updated);
      }
    }
  }, [tasks]);

  // Helper to log task audit entries
  const logTaskAudit = (
    task: GroupTaskItem,
    action: string,
    userName: string,
    details?: string
  ): Partial<GroupTaskItem> => {
    const newEntry: TaskAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      userName,
      timestamp: new Date().toISOString(),
      details,
    };
    const updatedLog = [...(task.auditLog || []), newEntry];
    return {
      auditLog: updatedLog,
      updatedAt: new Date().toISOString(),
      updatedByName: userName,
    };
  };

  // Helper to append rich text formatting syntax for Task Descriptions
  const applyDescFormattingSyntax = (
    syntax: 'bold' | 'italic' | 'strikethrough' | 'code' | 'list' | 'highlight',
    target: 'create' | 'modal' | 'quick'
  ) => {
    let currentText = '';
    if (target === 'create') currentText = taskDesc;
    else if (target === 'modal') currentText = taskDescEditingText;
    else if (target === 'quick') currentText = quickDesc;

    let symbol = '';
    if (syntax === 'bold') symbol = '**';
    else if (syntax === 'italic') symbol = '*';
    else if (syntax === 'strikethrough') symbol = '~~';
    else if (syntax === 'code') symbol = '`';
    else if (syntax === 'highlight') symbol = '==';
    else if (syntax === 'list') symbol = '- ';

    let updated = '';
    if (syntax === 'list') {
      updated = currentText ? `${currentText}\n- ` : '- ';
    } else {
      updated = currentText ? `${currentText} ${symbol}text${symbol}` : `${symbol}text${symbol}`;
    }

    if (target === 'create') setTaskDesc(updated);
    else if (target === 'modal') setTaskDescEditingText(updated);
    else if (target === 'quick') setQuickDesc(updated);
  };

  // Handle Save Quick Edit Task
  const handleSaveQuickEdit = async (task: GroupTaskItem) => {
    if (!quickTitle.trim()) return;
    const audit = logTaskAudit(
      task,
      'Quick Edited Task Details',
      currentUserName,
      `Title: "${quickTitle.trim()}", Priority: ${quickPriority}`
    );
    await updateGroupTask(task.id, {
      title: quickTitle.trim(),
      description: quickDesc.trim(),
      priority: quickPriority,
      ...audit,
    });

    if (activeWorkspaceId) {
      await logGroupActivity(activeWorkspaceId, {
        type: 'task_create',
        actorName: currentUserName,
        details: `Quick edited task "${quickTitle.trim()}"`,
      });
    }

    setQuickEditingTaskId(null);
  };

  // Handle Add Comment to Task inside TaskModal
  const handleAddComment = async (task: GroupTaskItem) => {
    if (!taskCommentInput.trim() || !currentUser) return;
    const newComment: TaskComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.uid,
      userName: currentUserName,
      userEmail: currentUser.email || '',
      text: taskCommentInput.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedComments = [...(task.comments || []), newComment];
    const audit = logTaskAudit(
      task,
      'Added Discussion Comment',
      currentUserName,
      `Comment: "${taskCommentInput.trim().slice(0, 35)}..."`
    );
    await updateGroupTask(task.id, {
      comments: updatedComments,
      ...audit,
    });
    setTaskCommentInput('');
  };

  // Handle Edit Comment in TaskModal
  const handleSaveEditComment = async (task: GroupTaskItem, commentId: string) => {
    if (!editingCommentText.trim()) return;
    const updatedComments = (task.comments || []).map((c) =>
      c.id === commentId
        ? { ...c, text: editingCommentText.trim(), isEdited: true, editedAt: new Date().toISOString() }
        : c
    );
    await updateGroupTask(task.id, {
      comments: updatedComments,
      updatedAt: new Date().toISOString(),
      updatedByName: currentUserName,
    });
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Handle Delete Comment in TaskModal
  const handleDeleteComment = async (task: GroupTaskItem, commentId: string) => {
    const updatedComments = (task.comments || []).filter((c) => c.id !== commentId);
    await updateGroupTask(task.id, {
      comments: updatedComments,
      updatedAt: new Date().toISOString(),
      updatedByName: currentUserName,
    });
  };

  // Handle Save Description Edit in TaskModal
  const handleSaveDescriptionInModal = async (task: GroupTaskItem) => {
    const audit = logTaskAudit(task, 'Updated Task Description', currentUserName, 'Modified requirements/directives');
    await updateGroupTask(task.id, {
      description: taskDescEditingText.trim(),
      ...audit,
    });
    setIsEditingTaskDescInModal(false);
  };

  // Save edited chat message
  const handleSaveEditChatMessage = async (msgId: string) => {
    if (!editingMsgText.trim()) return;
    try {
      await updateGroupChatMessage(msgId, { text: editingMsgText.trim() });
      setEditingMsgId(null);
      setEditingMsgText('');
    } catch (err) {
      console.error('Failed to edit chat message:', err);
    }
  };

  // Helper to append rich text formatting syntax to chat input or edit input
  const applyFormattingSyntax = (
    syntax: 'bold' | 'italic' | 'strikethrough' | 'code' | 'list' | 'highlight',
    isEdit = false
  ) => {
    const text = isEdit ? editingMsgText : chatInput;
    let symbol = '';
    if (syntax === 'bold') symbol = '**';
    else if (syntax === 'italic') symbol = '*';
    else if (syntax === 'strikethrough') symbol = '~~';
    else if (syntax === 'code') symbol = '`';
    else if (syntax === 'highlight') symbol = '==';
    else if (syntax === 'list') symbol = '- ';

    if (syntax === 'list') {
      const updated = text ? `${text}\n- ` : '- ';
      if (isEdit) setEditingMsgText(updated);
      else setChatInput(updated);
    } else {
      const updated = text ? `${text} ${symbol}text${symbol}` : `${symbol}text${symbol}`;
      if (isEdit) setEditingMsgText(updated);
      else setChatInput(updated);
    }
  };

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const isOwner = activeWs && currentUser && activeWs.ownerId === currentUser.uid;

  const currentMemberRecord = members.find((m) => currentUser && m.userId === currentUser.uid);
  const isAcceptedMember = isOwner || (currentMemberRecord && currentMemberRecord.status === 'accepted');

  const pendingMembers = members.filter((m) => m.status === 'pending');
  const acceptedMembers = members.filter((m) => m.status === 'accepted');

  const currentUserName = userProfile?.displayName || currentUser?.email?.split('@')[0] || 'User';

  // Handle Workspace Creation
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newWsName.trim()) return;

    const wsId = await createGroupWorkspace(
      currentUser.uid,
      currentUser.email || '',
      currentUserName,
      newWsName.trim(),
      newWsDesc.trim()
    );

    await logGroupActivity(wsId, {
      type: 'join',
      actorName: currentUserName,
      details: `Created group space "${newWsName.trim()}"`,
    });

    setNewWsName('');
    setNewWsDesc('');
    setIsCreateWsOpen(false);
    setActiveWorkspaceId(wsId);
  };

  // Handle Join Workspace
  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !joinCodeInput.trim()) return;

    setJoinMsg(null);
    const res = await joinGroupWorkspaceByCode(
      currentUser.uid,
      currentUser.email || '',
      currentUserName,
      joinCodeInput.trim()
    );

    if (res.success) {
      setJoinMsg({ type: 'success', text: res.message });
      if (res.workspaceId) {
        setActiveWorkspaceId(res.workspaceId);
      }
      setTimeout(() => {
        setIsJoinWsOpen(false);
        setJoinCodeInput('');
        setJoinMsg(null);
      }, 1500);
    } else {
      setJoinMsg({ type: 'error', text: res.message });
    }
  };

  // Accept Member Request
  const handleAcceptMember = async (member: GroupMember) => {
    await acceptGroupMember(member.id);
    if (activeWorkspaceId) {
      await logGroupActivity(activeWorkspaceId, {
        type: 'join',
        actorName: member.displayName,
        details: `Joined the group workspace`,
      });
    }
  };

  // Remove Member
  const handleRemoveMember = async (member: GroupMember) => {
    try {
      await removeGroupMember(member.id);
      if (activeWorkspaceId) {
        await logGroupActivity(activeWorkspaceId, {
          type: 'join',
          actorName: currentUserName,
          details: `Removed ${member.displayName || member.userEmail} from active group members`,
        });
      }
    } catch (err) {
      console.error('Failed to remove group member:', err);
    }
  };

  // Copy Code to Clipboard
  const handleCopyCode = () => {
    if (!activeWs) return;
    navigator.clipboard.writeText(activeWs.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy Full Invite Link to Clipboard
  const handleCopyInviteLink = () => {
    if (!activeWs) return;
    const inviteUrl = `${window.location.origin}?joinGroup=${activeWs.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Add Group Task
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setTaskSubtasks([
      ...taskSubtasks,
      { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setTaskSubtasks(taskSubtasks.filter((st) => st.id !== id));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !currentUser || !taskTitle.trim()) return;

    const assignedMember = acceptedMembers.find((m) => m.userId === taskAssigneeId);

    const initialAuditLog: TaskAuditLogEntry[] = [
      {
        id: `audit_init_${Date.now()}`,
        action: 'Task Created',
        userName: currentUserName,
        timestamp: new Date().toISOString(),
        details: assignedMember ? `Created and assigned to ${assignedMember.displayName}` : 'Created task',
      },
    ];

    await addGroupTask(activeWorkspaceId, {
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      assigneeId: taskAssigneeId || undefined,
      assigneeEmail: assignedMember?.userEmail,
      assigneeName: assignedMember?.displayName,
      completed: false,
      subtasks: taskSubtasks,
      attachments: taskAttachments.length > 0 ? taskAttachments : undefined,
      auditLog: initialAuditLog,
      comments: [],
      createdBy: currentUser.uid,
      createdByName: currentUserName,
    });

    await logGroupActivity(activeWorkspaceId, {
      type: 'task_create',
      actorName: currentUserName,
      details: `Added task "${taskTitle.trim()}"${assignedMember ? ` assigned to ${assignedMember.displayName}` : ''}`,
    });

    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('Medium');
    setTaskDueDate('');
    setTaskAssigneeId('');
    setTaskSubtasks([]);
    setTaskAttachments([]);
    setIsCreateTaskOpen(false);
  };

  // Handle Create Group Note
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !currentUser || !noteTitle.trim()) return;

    await addGroupNote(activeWorkspaceId, {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      authorId: currentUser.uid,
      authorName: currentUserName,
    });

    await logGroupActivity(activeWorkspaceId, {
      type: 'note_create',
      actorName: currentUserName,
      details: `Published shared note "${noteTitle.trim()}"`,
    });

    setNoteTitle('');
    setNoteContent('');
    setIsCreateNoteOpen(false);
  };

  // Start Video / Audio / Screen Share Call
  const handleStartCall = async (type: 'video' | 'audio' | 'screen') => {
    setCallType(type);
    setIsCallModalOpen(true);
    if (activeWs && currentUser) {
      try {
        await startGroupCallSession(
          activeWs.id,
          activeWs.name,
          currentUser.uid,
          currentUserName,
          type
        );
        await logGroupActivity(activeWs.id, {
          type: 'message',
          actorName: currentUserName,
          details: `Started a group ${type} call (ringing online members)`,
        });
      } catch (err) {
        console.error('Failed to trigger call ringing session:', err);
      }
    }
  };

  const handleAcceptCall = async (call: GroupCallSession) => {
    if (!currentUser) return;
    try {
      await acceptGroupCallSession(call.id, currentUser.uid);
      setCallType(call.callType);
      setIsCallModalOpen(true);
      setIncomingCall(null);
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  };

  const handleDeclineCall = async (call: GroupCallSession) => {
    if (!currentUser) return;
    try {
      await declineGroupCallSession(call.id, currentUser.uid);
      setIncomingCall(null);
    } catch (err) {
      console.error('Error declining call:', err);
    }
  };

  const handleEndCallSession = async () => {
    if (activeCallSession) {
      try {
        await endGroupCallSession(activeCallSession.id);
      } catch (err) {
        console.error('Error ending call session:', err);
      }
    }
    setActiveCallSession(null);
    setIsCallModalOpen(false);
  };

  // Chat File Upload
  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const isImg = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      setChatAttachment({
        name: file.name,
        url: reader.result as string,
        type: isImg ? 'image' : isAudio ? 'audio' : 'file',
        size: `${(file.size / 1024).toFixed(1)} KB`,
      });
    };
  };

  // Task File Upload
  const handleTaskFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const isImg = file.type.startsWith('image/');
      setTaskAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: reader.result as string,
          type: isImg ? 'image' : 'file',
          size: `${(file.size / 1024).toFixed(1)} KB`,
        },
      ]);
    };
  };

  // Send Group Chat Message
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeWorkspaceId || !currentUser) return;
    if (!chatInput.trim() && !chatAttachment) return;

    const msgText = chatInput.trim();
    const currentAttachment = chatAttachment;

    setChatInput('');
    setChatAttachment(null);

    await sendGroupChatMessage(activeWorkspaceId, {
      senderId: currentUser.uid,
      senderName: currentUserName,
      senderEmail: currentUser.email || '',
      text: msgText || (currentAttachment ? `Shared file: ${currentAttachment.name}` : ''),
      attachment: currentAttachment || undefined,
    });
  };

  const handleSendVoiceNote = async (attachment: ChatAttachment, duration: number) => {
    if (!activeWorkspaceId || !currentUser) return;
    setIsVoiceRecording(false);

    await sendGroupChatMessage(activeWorkspaceId, {
      senderId: currentUser.uid,
      senderName: currentUserName,
      senderEmail: currentUser.email || '',
      text: 'Voice note',
      attachment,
      audioDuration: duration,
    });
  };

  const handleToggleReaction = async (
    msgId: string,
    emoji: string,
    currentReactions?: { [emoji: string]: string[] }
  ) => {
    if (!currentUser) return;
    setActiveReactionPickerMsgId(null);
    await toggleGroupChatMessageReaction(msgId, emoji, currentUser.uid, currentReactions || {});
  };

  // Start chat thread about specific task
  const handleDiscussTaskInChat = (task: GroupTaskItem) => {
    setSubTab('chat');
    setChatInput(`Discussing task "${task.title}": `);
  };

  // Task Actions
  const handleToggleTaskComplete = async (task: GroupTaskItem) => {
    const isNowCompleted = !task.completed;
    const audit = logTaskAudit(task, isNowCompleted ? 'Completed Task' : 'Reopened Task', currentUserName);
    await updateGroupTask(task.id, {
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      ...audit,
    });

    if (activeWorkspaceId) {
      await logGroupActivity(activeWorkspaceId, {
        type: 'task_complete',
        actorName: currentUserName,
        details: isNowCompleted ? `Completed task "${task.title}"` : `Reopened task "${task.title}"`,
      });
    }
  };

  const handleTaskAcceptance = async (task: GroupTaskItem, status: 'accepted' | 'declined') => {
    const audit = logTaskAudit(task, status === 'accepted' ? 'Accepted Assignment' : 'Declined Assignment', currentUserName);
    await updateGroupTask(task.id, { acceptanceStatus: status, ...audit });
    if (activeWorkspaceId) {
      await logGroupActivity(activeWorkspaceId, {
        type: 'task_create',
        actorName: currentUserName,
        details: `${status === 'accepted' ? 'Accepted' : 'Declined'} assignment for "${task.title}"`,
      });
    }
  };

  const handleToggleGroupSubtask = async (task: GroupTaskItem, subtaskId: string) => {
    if (!task.subtasks) return;
    const targetSubtask = task.subtasks.find((s) => s.id === subtaskId);
    const updated = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const audit = logTaskAudit(
      task,
      targetSubtask?.completed ? 'Unchecked Subtask' : 'Completed Subtask',
      currentUserName,
      targetSubtask?.title ? `Subtask: "${targetSubtask.title}"` : undefined
    );
    await updateGroupTask(task.id, { subtasks: updated, ...audit });
  };

  // Task Assignment Metrics
  const tasksAssignedToMe = tasks.filter((t) => currentUser && t.assigneeId === currentUser.uid);
  const pendingTasksAssignedToMe = tasksAssignedToMe.filter((t) => t.acceptanceStatus === 'pending');
  const tasksAssignedByMe = tasks.filter((t) => currentUser && t.createdBy === currentUser.uid && t.assigneeId && t.assigneeId !== currentUser.uid);

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.assigneeName && task.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || task.priority.toLowerCase() === priorityFilter.toLowerCase();
    
    let matchesAssignee = true;
    if (assigneeFilter === 'assigned_to_me') {
      matchesAssignee = !!currentUser && task.assigneeId === currentUser.uid;
    } else if (assigneeFilter === 'assigned_by_me') {
      matchesAssignee = !!currentUser && task.createdBy === currentUser.uid;
    } else if (assigneeFilter === 'pending_acceptance') {
      matchesAssignee = task.acceptanceStatus === 'pending';
    }

    return matchesSearch && matchesPriority && matchesAssignee;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Group Tasks & Collaboration
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Collaborate in group task spaces, invite members with join links, discuss tasks in group chat, and follow real-time activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeWs && isAcceptedMember && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Users</span>
            </button>
          )}

          <button
            onClick={() => setIsJoinWsOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Link className="h-4 w-4 text-indigo-500" />
            <span>Join via Code/Link</span>
          </button>

          <button
            onClick={() => setIsCreateWsOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-600 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Group Space</span>
          </button>
        </div>
      </div>

      {/* Workspace Selector Tabs */}
      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Group Spaces Yet</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Create a shared workspace for your team or project, or join an existing group using an invite link or code.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setIsCreateWsOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              <span>Create Group Space</span>
            </button>
            <button
              onClick={() => setIsJoinWsOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <UserPlus className="h-4 w-4 text-indigo-500" />
              <span>Join via Code</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workspaces Horizontal Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              const isWsOwner = currentUser && ws.ownerId === currentUser.uid;

              return (
                <button
                  key={ws.id}
                  onClick={() => setActiveWorkspaceId(ws.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>{ws.name}</span>
                  {isWsOwner && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold ${
                        isActive
                          ? 'bg-indigo-800/60 text-indigo-100'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      Host
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Workspace Banner & Info */}
          {activeWs && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeWs.name}</h2>
                    {pendingMembers.length > 0 && isOwner && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {pendingMembers.length} Request{pendingMembers.length > 1 ? 's' : ''} Pending
                      </span>
                    )}
                  </div>
                  {activeWs.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeWs.description}</p>
                  )}
                </div>

                {/* Invite Code / Link Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Invite Link</span>
                  </button>

                  <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-2 dark:border-indigo-900/60 dark:bg-indigo-950/40">
                    <div className="min-w-0 px-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Code
                      </p>
                      <p className="font-mono text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                        {activeWs.inviteCode}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors dark:bg-indigo-500 cursor-pointer"
                    >
                      {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub Navigation Bar inside Group Workspace */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSubTab('tasks')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      subTab === 'tasks'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Group To-Do List ({tasks.length})</span>
                  </button>

                  <button
                    onClick={() => setSubTab('chat')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      subTab === 'chat'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Group Chat ({chatMessages.length})</span>
                  </button>

                  <button
                    onClick={() => setSubTab('activity')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      subTab === 'activity'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity Feed ({activities.length})</span>
                  </button>

                  <button
                    onClick={() => setSubTab('members')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      subTab === 'members'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Members ({acceptedMembers.length})</span>
                    {pendingMembers.length > 0 && (
                      <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                        {pendingMembers.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setSubTab('notes')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      subTab === 'notes'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Notes ({notes.length})</span>
                  </button>
                </div>

                {isAcceptedMember && (
                  <div className="flex items-center gap-2">
                    {subTab === 'tasks' && (
                      <button
                        onClick={() => setIsCreateTaskOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Group Task</span>
                      </button>
                    )}
                    {subTab === 'notes' && (
                      <button
                        onClick={() => setIsCreateNoteOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Shared Note</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Approval Warning if user is pending in active Workspace */}
          {currentMemberRecord && currentMemberRecord.status === 'pending' && !isOwner && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Your join request is awaiting host acceptance</p>
                <p className="text-amber-700 dark:text-amber-400">
                  The workspace owner has received your request and will approve your access shortly.
                </p>
              </div>
            </div>
          )}

          {/* SubTab 1: Group To-Do List */}
          {subTab === 'tasks' && (
            <div className="space-y-4">
              {/* Employee Callout Banner for Tasks Assigned by Boss/Manager */}
              {pendingTasksAssignedToMe.length > 0 && (
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 dark:border-indigo-900/60 dark:from-indigo-950/50 dark:to-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                          Tasks Assigned to You by Boss/Manager
                        </span>
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
                          {pendingTasksAssignedToMe.length} pending
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        You have new task assignments awaiting your review and acceptance.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setAssigneeFilter('assigned_to_me')}
                    className="shrink-0 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                  >
                    View My Assigned Tasks
                  </button>
                </div>
              )}

              {/* Filter Pills & Search Bar */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search group tasks or assignees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Priority:</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="all">All Priorities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                {/* Assignee Collaboration Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setAssigneeFilter('all')}
                    className={`rounded-lg px-3 py-1.5 font-bold transition-colors cursor-pointer ${
                      assigneeFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    All Workspace Tasks ({tasks.length})
                  </button>

                  <button
                    onClick={() => setAssigneeFilter('assigned_to_me')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors cursor-pointer ${
                      assigneeFilter === 'assigned_to_me'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span>Assigned to Me</span>
                    {tasksAssignedToMe.length > 0 && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        assigneeFilter === 'assigned_to_me' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {tasksAssignedToMe.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setAssigneeFilter('assigned_by_me')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors cursor-pointer ${
                      assigneeFilter === 'assigned_by_me'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span>Assigned by Me</span>
                    {tasksAssignedByMe.length > 0 && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        assigneeFilter === 'assigned_by_me' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {tasksAssignedByMe.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setAssigneeFilter('pending_acceptance')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors cursor-pointer ${
                      assigneeFilter === 'pending_acceptance'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span>Awaiting Acceptance</span>
                    {tasks.filter((t) => t.acceptanceStatus === 'pending').length > 0 && (
                      <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] text-white">
                        {tasks.filter((t) => t.acceptanceStatus === 'pending').length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                  <CheckSquare className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No group tasks found</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {assigneeFilter === 'assigned_to_me'
                      ? 'No tasks currently assigned to you.'
                      : 'Create a task to assign work to team members!'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTasks.map((task) => {
                    const isAssignee = currentUser && task.assigneeId === currentUser.uid;
                    const isPendingAcceptance = task.acceptanceStatus === 'pending';
                    const isCreatedByBoss = activeWs && task.createdBy === activeWs.ownerId;
                    const isQuickEditing = quickEditingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                          task.completed
                            ? 'border-slate-200 bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900/40 opacity-75'
                            : isAssignee
                            ? 'border-indigo-400 bg-white shadow-xs ring-2 ring-indigo-500/10 dark:border-indigo-600 dark:bg-slate-900'
                            : 'border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800'
                        }`}
                      >
                        {isQuickEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-900/60 pb-2">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <Edit3 className="h-3.5 w-3.5" /> Quick Edit Mode
                              </span>
                              <select
                                value={quickPriority}
                                onChange={(e) => setQuickPriority(e.target.value as Priority)}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Title
                              </label>
                              <input
                                type="text"
                                value={quickTitle}
                                onChange={(e) => setQuickTitle(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Description
                                </label>
                                <div className="flex items-center gap-1 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => applyDescFormattingSyntax('bold', 'quick')}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold"
                                    title="Bold"
                                  >
                                    B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applyDescFormattingSyntax('italic', 'quick')}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 italic"
                                    title="Italic"
                                  >
                                    I
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applyDescFormattingSyntax('strikethrough', 'quick')}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 line-through"
                                    title="Strikethrough"
                                  >
                                    S
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applyDescFormattingSyntax('code', 'quick')}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono"
                                    title="Code"
                                  >
                                    {`</>`}
                                  </button>
                                </div>
                              </div>
                              <textarea
                                rows={2}
                                value={quickDesc}
                                onChange={(e) => setQuickDesc(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setQuickEditingTaskId(null)}
                                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveQuickEdit(task)}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              {/* Boss / Host Creator Badge */}
                              <div className="flex items-center justify-between gap-1 mb-2">
                                {isCreatedByBoss ? (
                                  <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                    <ShieldCheck className="h-3 w-3 text-amber-600" />
                                    Assigned by Boss ({task.createdByName || 'Host'})
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Created by {task.createdByName || 'Member'}
                                  </span>
                                )}

                                {isAssignee && (
                                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    Assigned to You
                                  </span>
                                )}
                              </div>

                              {/* Task Header: Checkbox & Priority */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5">
                                  <button
                                    onClick={() => handleToggleTaskComplete(task)}
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                      task.completed
                                        ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                                        : 'border-slate-300 hover:border-indigo-500 dark:border-slate-700'
                                    }`}
                                  >
                                    {task.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                  </button>
                                  <h4
                                    onClick={() => {
                                      setSelectedTaskDetail(task);
                                      setTaskDescEditingText(task.description || '');
                                    }}
                                    className={`text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                                      task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                                    }`}
                                    title="Click to view full task details"
                                  >
                                    {task.title}
                                  </h4>
                                </div>

                                <span
                                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                    task.priority === 'High'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                      : task.priority === 'Medium'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              </div>

                              {/* Task Description Preview */}
                              {task.description && (
                                <p
                                  onClick={() => {
                                    setSelectedTaskDetail(task);
                                    setTaskDescEditingText(task.description || '');
                                  }}
                                  className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                                  title="Click to view full task details"
                                >
                                  {task.description}
                                </p>
                              )}

                              {/* Subtasks */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                                  </p>
                                  {task.subtasks.map((st) => (
                                    <div key={st.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                      <input
                                        type="checkbox"
                                        checked={st.completed}
                                        onChange={() => handleToggleGroupSubtask(task, st.id)}
                                        className="h-3.5 w-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <span className={st.completed ? 'line-through text-slate-400' : ''}>{st.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Task Attachments */}
                              {task.attachments && task.attachments.length > 0 && (
                                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Paperclip className="h-3 w-3 text-indigo-500" />
                                    Attachments ({task.attachments.length})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {task.attachments.map((att, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                      >
                                        {att.type === 'image' ? (
                                          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                                        ) : (
                                          <FileText className="h-3.5 w-3.5 text-indigo-500" />
                                        )}
                                        <span className="truncate max-w-[120px]">{att.name}</span>
                                        {att.type === 'image' ? (
                                          <button
                                            type="button"
                                            onClick={() => setLightboxImage({ url: att.url, name: att.name })}
                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer"
                                          >
                                            <Maximize2 className="h-3 w-3" />
                                          </button>
                                        ) : (
                                          <a
                                            href={att.url}
                                            download={att.name}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                                          >
                                            <Download className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Task Footer: Assignee & Acceptance Actions */}
                            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {task.assigneeName || task.assigneeEmail || 'Unassigned'}
                                  </span>
                                </div>

                                {task.dueDate && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    <span>{task.dueDate}</span>
                                  </div>
                                )}
                              </div>

                              {/* Task Assignment Acceptance Status / Actions */}
                              {task.assigneeId && (
                                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50 text-xs">
                                  <div className="flex items-center gap-1">
                                    {task.acceptanceStatus === 'accepted' ? (
                                      <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                                      </span>
                                    ) : task.acceptanceStatus === 'declined' ? (
                                      <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                                        <XCircle className="h-3.5 w-3.5" /> Declined
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                                        <Clock className="h-3.5 w-3.5 animate-spin" /> Awaiting Acceptance
                                      </span>
                                    )}
                                  </div>

                                  {/* If current user is assignee & status is pending */}
                                  {isAssignee && isPendingAcceptance && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleTaskAcceptance(task, 'accepted')}
                                        className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 cursor-pointer"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleTaskAcceptance(task, 'declined')}
                                        className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action buttons including Quick Edit */}
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedTaskDetail(task);
                                      setTaskDescEditingText(task.description || '');
                                    }}
                                    className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>Details</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setQuickEditingTaskId(task.id);
                                      setQuickTitle(task.title);
                                      setQuickDesc(task.description || '');
                                      setQuickPriority(task.priority);
                                    }}
                                    className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>Quick Edit</span>
                                  </button>

                                  <button
                                    onClick={() => handleDiscussTaskInChat(task)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer ml-1"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    <span>Chat</span>
                                  </button>
                                </div>

                                {(isOwner || task.createdBy === currentUser?.uid) && (
                                  <button
                                    onClick={() => deleteGroupTask(task.id)}
                                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                    title="Delete Task"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: Group Chat */}
          {subTab === 'chat' && (
            <div className="flex flex-col h-[560px] rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              {/* Chat Header with Quick Call Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Group Workspace Chat
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Real-time discussion with all {acceptedMembers.length} active group members
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartCall('video')}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                    title="Video Call"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Video</span>
                  </button>
                  <button
                    onClick={() => handleStartCall('audio')}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                    title="Voice Call"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    <span>Voice</span>
                  </button>
                  <button
                    onClick={() => handleStartCall('screen')}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                    title="Screen Share"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Screen</span>
                  </button>
                  {chatMessages.length > 0 && activeWorkspaceId && (
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to clear all chat messages in this workspace?')) {
                          await clearAllGroupChatMessages(activeWorkspaceId);
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer ml-1"
                      title="Clear All Chat Messages"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Clear Chat</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages Body */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2 stroke-1" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No chat messages yet</p>
                    <p className="text-[11px] mt-1 text-slate-400">Say hello, share files, or start a voice note with your team!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isSelf = currentUser && msg.senderId === currentUser.uid;
                    const canDelete = isSelf || isOwner;

                    return (
                      <div
                        key={msg.id}
                        className={`group relative flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender info & timestamp */}
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 px-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {isSelf ? 'You' : msg.senderName}
                          </span>
                          <span>•</span>
                          <span>
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Just now'}
                          </span>
                          {msg.isEdited && (
                            <>
                              <span>•</span>
                              <span className="italic font-normal text-slate-400 dark:text-slate-500">(edited)</span>
                            </>
                          )}
                        </div>

                        {/* Message Bubble Container */}
                        <div className="relative max-w-[85%] sm:max-w-[75%]">
                          <div
                            className={`rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-xs ${
                              isSelf
                                ? 'bg-indigo-600 text-white rounded-tr-xs'
                                : 'bg-white border border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 rounded-tl-xs'
                            }`}
                          >
                            {/* Inline Message Edit Form */}
                            {editingMsgId === msg.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1 border-b border-white/20 dark:border-slate-700 pb-1.5 text-[10px]">
                                  <span className="font-bold opacity-90">Edit Message</span>
                                  <div className="ml-auto flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => applyFormattingSyntax('bold', true)}
                                      className="p-1 rounded bg-black/20 hover:bg-black/30 text-white font-bold"
                                      title="Bold (**text**)"
                                    >
                                      B
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => applyFormattingSyntax('italic', true)}
                                      className="p-1 rounded bg-black/20 hover:bg-black/30 text-white italic"
                                      title="Italic (*text*)"
                                    >
                                      I
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => applyFormattingSyntax('strikethrough', true)}
                                      className="p-1 rounded bg-black/20 hover:bg-black/30 text-white line-through"
                                      title="Cross text (~~text~~)"
                                    >
                                      S
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => applyFormattingSyntax('code', true)}
                                      className="p-1 rounded bg-black/20 hover:bg-black/30 text-white font-mono"
                                      title="Inline Code (`code`)"
                                    >
                                      {`</>`}
                                    </button>
                                  </div>
                                </div>

                                <textarea
                                  rows={2}
                                  value={editingMsgText}
                                  onChange={(e) => setEditingMsgText(e.target.value)}
                                  className="w-full rounded-xl bg-black/10 dark:bg-slate-900/80 p-2 text-xs font-medium focus:outline-hidden text-white dark:text-slate-100 border border-white/20 dark:border-slate-700"
                                />

                                <div className="flex items-center justify-end gap-2 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMsgId(null);
                                      setEditingMsgText('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-white/90 font-bold transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditChatMessage(msg.id)}
                                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xs transition-colors cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Text content formatted */}
                                {msg.text && <FormattedChatMessage text={msg.text} />}
                              </>
                            )}

                            {/* Attachment rendering */}
                            {msg.attachment && (
                              <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-700/60">
                                {msg.attachment.type === 'image' ? (
                                  <div className="relative overflow-hidden rounded-xl group/img max-w-sm cursor-pointer border border-black/10">
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name}
                                      className="max-h-48 w-full object-cover transition-transform duration-200 hover:scale-105"
                                      onClick={() =>
                                        setLightboxImage({
                                          url: msg.attachment!.url,
                                          name: msg.attachment!.name,
                                        })
                                      }
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setLightboxImage({
                                            url: msg.attachment!.url,
                                            name: msg.attachment!.name,
                                          })
                                        }
                                        className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                                      >
                                        <Maximize2 className="h-4 w-4" />
                                      </button>
                                      <a
                                        href={msg.attachment.url}
                                        download={msg.attachment.name}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </div>
                                  </div>
                                ) : msg.attachment.type === 'audio' ? (
                                  <div className="flex items-center gap-3 p-2 rounded-xl bg-black/10 dark:bg-black/30 text-xs">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                                      <Radio className="h-4 w-4 animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-[11px] truncate">{msg.attachment.name}</p>
                                      <audio
                                        src={msg.attachment.url}
                                        controls
                                        className="h-7 w-full mt-1 accent-indigo-500 text-xs"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <a
                                    href={msg.attachment.url}
                                    download={msg.attachment.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
                                      isSelf
                                        ? 'bg-indigo-700/60 hover:bg-indigo-700 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                                    }`}
                                  >
                                    <FileText className="h-5 w-5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs truncate">{msg.attachment.name}</p>
                                      {msg.attachment.size && (
                                        <p className="text-[10px] opacity-75">{msg.attachment.size}</p>
                                      )}
                                    </div>
                                    <Download className="h-4 w-4 shrink-0 opacity-80" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Toolbar on Hover */}
                          <div
                            className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                              isSelf ? 'right-2' : 'left-2'
                            }`}
                          >
                            {/* Quick Reactions Trigger */}
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReactionPickerMsgId(
                                  activeReactionPickerMsgId === msg.id ? null : msg.id
                                )
                              }
                              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Add Reaction"
                            >
                              <Smile className="h-3.5 w-3.5" />
                            </button>

                            {/* Edit Message Button for Author */}
                            {isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditingMsgText(msg.text);
                                }}
                                className="p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Edit Message"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Delete Message button */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => deleteGroupChatMessage(msg.id)}
                                className="p-1 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Message"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Reaction Picker Popup */}
                          {activeReactionPickerMsgId === msg.id && (
                            <div
                              className={`absolute bottom-full mb-2 z-20 flex items-center gap-1.5 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 ${
                                isSelf ? 'right-0' : 'left-0'
                              }`}
                            >
                              {['👍', '❤️', '🔥', '🎉', '🚀', '💡', '👏', '😀'].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, emoji, msg.reactions)}
                                  className="text-base hover:scale-125 transition-transform p-1 cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Display Reaction Chips */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div
                              className={`flex flex-wrap gap-1 mt-1.5 ${
                                isSelf ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {Object.entries(msg.reactions).map(([emoji, uids]) => {
                                const userList = (uids as string[]) || [];
                                if (userList.length === 0) return null;
                                const hasReacted = currentUser && userList.includes(currentUser.uid);

                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(msg.id, emoji, msg.reactions)}
                                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border transition-colors cursor-pointer ${
                                      hasReacted
                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-200'
                                        : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{userList.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Bar & Attachment Preview */}
              <div className="border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-2">
                {/* Voice Recorder Overlay if active */}
                {isVoiceRecording ? (
                  <VoiceRecorder
                    onSendVoiceNote={handleSendVoiceNote}
                    onCancel={() => setIsVoiceRecording(false)}
                  />
                ) : (
                  <>
                    {/* Attachment preview pill */}
                    {chatAttachment && (
                      <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 p-2 dark:bg-indigo-950/60 dark:border-indigo-800 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {chatAttachment.type === 'image' ? (
                            <ImageIcon className="h-4 w-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Paperclip className="h-4 w-4 text-indigo-600 shrink-0" />
                          )}
                          <span className="font-semibold text-indigo-900 dark:text-indigo-100 truncate">
                            {chatAttachment.name}
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                            ({chatAttachment.size})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChatAttachment(null)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Quick Formatting Bar */}
                    <div className="flex items-center gap-1 pb-1 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-xs overflow-x-auto">
                      <span className="text-[10px] font-bold text-slate-400 mr-1 shrink-0">Format:</span>
                      <button
                        type="button"
                        onClick={() => applyFormattingSyntax('bold')}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                        title="Bold (**text**)"
                      >
                        <Bold className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormattingSyntax('italic')}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                        title="Italic (*text*)"
                      >
                        <Italic className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormattingSyntax('strikethrough')}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                        title="Cross text / Strikethrough (~~text~~)"
                      >
                        <Strikethrough className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormattingSyntax('code')}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                        title="Inline Code (`code`)"
                      >
                        <Code className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormattingSyntax('highlight')}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                        title="Highlight (==text==)"
                      >
                        <Highlighter className="h-3.5 w-3.5 text-amber-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormattingSyntax('list')}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                        title="Bullet List (- item)"
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <form onSubmit={handleSendChat} className="flex items-center gap-2">
                      {/* File attachment button */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleChatFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Attach File or Image"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>

                      {/* Voice Note Button */}
                      <button
                        type="button"
                        onClick={() => setIsVoiceRecording(true)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Record Voice Note"
                      >
                        <Mic className="h-4 w-4" />
                      </button>

                      <input
                        type="text"
                        placeholder="Type a message or task update..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                      />

                      <button
                        type="submit"
                        disabled={!chatInput.trim() && !chatAttachment}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SubTab 3: Activity Feed */}
          {subTab === 'activity' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Group Workspace Activity Stream
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Real-time log of team interactions</span>
              </div>

              {activities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No activity recorded yet in this workspace.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                  {activities.map((act) => (
                    <div key={act.id} className="relative flex items-start gap-3">
                      <span className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 ring-4 ring-white dark:ring-slate-900">
                        {act.type === 'join' && <UserPlus className="h-3 w-3" />}
                        {act.type === 'task_complete' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                        {act.type === 'task_create' && <PlusCircle className="h-3 w-3 text-indigo-600" />}
                        {act.type === 'message' && <MessageSquare className="h-3 w-3 text-amber-600" />}
                        {act.type === 'note_create' && <FileText className="h-3 w-3 text-purple-600" />}
                      </span>

                      <div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {act.actorName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {act.createdAt
                              ? new Date(act.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Just now'}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                          {act.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 4: Members & Acceptance Requests */}
          {subTab === 'members' && (
            <div className="space-y-6">
              {/* Host/Admin Section for Pending Member Join Requests */}
              {isOwner && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Pending Join Requests ({pendingMembers.length})
                      </h3>
                    </div>
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                      Host Approval Required
                    </span>
                  </div>

                  {pendingMembers.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      No pending join requests right now. Share invite code <strong className="font-mono">{activeWs.inviteCode}</strong> to let others join!
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {pendingMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-3 shadow-xs dark:border-amber-900/80 dark:bg-slate-900"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {m.displayName}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.userEmail}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleAcceptMember(m)}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => rejectGroupMember(m.id)}
                              className="flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Accepted Members Directory */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Active Group Members ({acceptedMembers.length})
                  </h3>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Invite More Members</span>
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {acceptedMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          {m.displayName ? m.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.displayName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.userEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {m.role === 'owner' ? (
                          <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Host
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Member
                          </span>
                        )}

                        {/* Remove Member Button */}
                        {m.role !== 'owner' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMember(m);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900 transition-colors cursor-pointer border border-rose-200/80 dark:border-rose-900/60"
                            title="Remove member from group"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SubTab 5: Shared Notes */}
          {subTab === 'notes' && (
            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                  <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No shared notes or announcements</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Post group notes, meeting minutes, or project updates!</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{note.title}</h4>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                        <span>By {note.authorName}</span>
                        {(isOwner || note.authorId === currentUser?.uid) && (
                          <button
                            onClick={() => deleteGroupNote(note.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Invite Users (Direct Join Link & Code) */}
      {isInviteModalOpen && activeWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Invite Users to "{activeWs.name}"
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Share a unique join link or code with your team
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Unique Share Link Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Unique Join Link
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/60">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}?joinGroup=${activeWs.inviteCode}`}
                  className="flex-1 bg-transparent px-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Invite Code Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Group Invite Code
              </label>
              <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Invite Code
                  </span>
                  <span className="font-mono text-xl font-extrabold text-indigo-900 dark:text-indigo-200">
                    {activeWs.inviteCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedCode ? 'Copied Code' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
              Anyone with this link or code can request access to join this group task workspace.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Workspace */}
      {isCreateWsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Group Task Space</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Space Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marketing Launch, Project Team"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Goal (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="What is this group working on?"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateWsOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Create Group Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Workspace via Code */}
      {isJoinWsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Join Group Task Space</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the unique invite code provided by the group host (e.g., GRP92X).
            </p>

            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invite Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GRP92X"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full font-mono uppercase tracking-widest text-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base font-extrabold text-indigo-600 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-400"
                />
              </div>

              {joinMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    joinMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                  }`}
                >
                  {joinMsg.text}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinWsOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Request Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Group Task */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isOwner ? 'Assign Task to Employee / Team Member' : 'New Group Task'}
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {isOwner
                  ? 'Give tasks clearly to employees with deadlines, requirements, and subtasks.'
                  : 'Create a shared task for team members in this workspace.'}
              </p>
            </div>

            {isOwner && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Boss Assignment Mode:</strong> Assigning a task will flag it for employee acceptance and notify them in workspace activity.
                </span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Prepare Q3 Analytics Presentation..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Requirements & Boss Directives
                </label>
                <textarea
                  rows={2}
                  placeholder="Detail clear instructions, expected outcomes, or guidelines for the employee..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignee (Employee/Member)
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {acceptedMembers.map((m) => {
                      const isMemberOwner = activeWs && m.userId === activeWs.ownerId;
                      return (
                        <option key={m.userId} value={m.userId}>
                          {isMemberOwner ? '👑 [Boss / Owner]' : '👤 [Employee]'} {m.displayName} ({m.userEmail})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Enhanced Group Task Deadline Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Due Date & Target Deadline
                  </label>

                  {taskDueDate && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Target: {taskDueDate}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: '+3 Days', days: 3 },
                    { label: '+1 Week', days: 7 },
                  ].map((preset) => {
                    const d = new Date();
                    d.setDate(d.getDate() + preset.days);
                    const targetStr = d.toISOString().split('T')[0];
                    const isSelected = taskDueDate === targetStr;

                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTaskDueDate(targetStr)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Subtasks checklist */}
              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subtasks Checklist
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a subtask step..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {taskSubtasks.map((st) => (
                  <div key={st.id} className="flex items-center justify-between text-xs py-1">
                    <span>{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Task Attachments Upload */}
              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Task Files & Reference Images
                </label>
                <input
                  type="file"
                  ref={taskFileInputRef}
                  onChange={handleTaskFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <button
                  type="button"
                  onClick={() => taskFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Attach File or Image</span>
                </button>

                {taskAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {taskAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1 text-[11px] text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200"
                      >
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setTaskAttachments(taskAttachments.filter((_, i) => i !== idx))
                          }
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Group Note */}
      {isCreateNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Shared Note</h3>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Title or topic..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write group announcement, ideas, or meeting notes..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateNoteOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Publish Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View & Manage Task Detail with Audit Log & Comments & Rich Text */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        selectedTaskDetail.priority === 'High' || selectedTaskDetail.priority === 'high'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : selectedTaskDetail.priority === 'Medium' || selectedTaskDetail.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {selectedTaskDetail.priority} priority
                    </span>

                    {selectedTaskDetail.completed ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Completed
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        In Progress
                      </span>
                    )}

                    {activeWs && selectedTaskDetail.createdBy === activeWs.ownerId && (
                      <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        <ShieldCheck className="h-3 w-3 text-amber-600" />
                        Assigned by Boss
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedTaskDetail.title}
                  </h3>
                </div>

                <button
                  onClick={() => {
                    setSelectedTaskDetail(null);
                    setIsEditingTaskDescInModal(false);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold">
                <button
                  onClick={() => setActiveModalTab('details')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                    activeModalTab === 'details'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Details & Subtasks</span>
                </button>

                <button
                  onClick={() => setActiveModalTab('comments')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                    activeModalTab === 'comments'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Discussion</span>
                  {selectedTaskDetail.comments && selectedTaskDetail.comments.length > 0 && (
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      activeModalTab === 'comments' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {selectedTaskDetail.comments.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveModalTab('history')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                    activeModalTab === 'history'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Audit Log</span>
                  {selectedTaskDetail.auditLog && selectedTaskDetail.auditLog.length > 0 && (
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      activeModalTab === 'history' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {selectedTaskDetail.auditLog.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab 1: Details & Subtasks */}
            {activeModalTab === 'details' && (
              <div className="space-y-4">
                {/* Assignment & Metadata Card */}
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950 text-xs border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Assigned Employee
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {selectedTaskDetail.assigneeName || 'Unassigned'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Assigned By / Boss
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {selectedTaskDetail.createdByName || 'Workspace Member'}
                    </span>
                  </div>

                  {selectedTaskDetail.dueDate && (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Deadline / Due Date
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {selectedTaskDetail.dueDate} {selectedTaskDetail.dueTime || ''}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Assignment Status
                    </span>
                    <span className="font-bold mt-0.5 block">
                      {selectedTaskDetail.acceptanceStatus === 'accepted' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Accepted & Active</span>
                      ) : selectedTaskDetail.acceptanceStatus === 'declined' ? (
                        <span className="text-rose-600 dark:text-rose-400">Declined by Employee</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Pending Employee Review</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Task Description / Directives (with Rich Text Editor) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Directives & Clear Requirements
                    </h4>
                    {!isEditingTaskDescInModal ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingTaskDescInModal(true);
                          setTaskDescEditingText(selectedTaskDetail.description || '');
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit Description</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => applyDescFormattingSyntax('bold', 'modal')}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDescFormattingSyntax('italic', 'modal')}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 italic hover:bg-slate-200"
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDescFormattingSyntax('strikethrough', 'modal')}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 line-through hover:bg-slate-200"
                          title="Strikethrough"
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDescFormattingSyntax('code', 'modal')}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono hover:bg-slate-200"
                          title="Code"
                        >
                          {`</>`}
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDescFormattingSyntax('list', 'modal')}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                          title="List"
                        >
                          <List className="h-3 w-3 inline" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingTaskDescInModal ? (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        value={taskDescEditingText}
                        onChange={(e) => setTaskDescEditingText(e.target.value)}
                        className="w-full rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white p-3.5 text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingTaskDescInModal(false)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveDescriptionInModal(selectedTaskDetail)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                        >
                          Save Requirements
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      {selectedTaskDetail.description ? (
                        <FormattedChatMessage text={selectedTaskDetail.description} />
                      ) : (
                        <span className="text-slate-400 italic">No detailed instructions provided for this task.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Employee Acceptance Action Bar */}
                {currentUser && selectedTaskDetail.assigneeId === currentUser.uid && selectedTaskDetail.acceptanceStatus === 'pending' && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/40 space-y-2">
                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      This task was assigned to you. Please confirm your acceptance:
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await handleTaskAcceptance(selectedTaskDetail, 'accepted');
                        }}
                        className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" /> Accept Task Directives
                      </button>

                      <button
                        onClick={async () => {
                          await handleTaskAcceptance(selectedTaskDetail, 'declined');
                        }}
                        className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-400 transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Subtasks Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Task Subtasks & Checklist
                    </h4>
                    {selectedTaskDetail.subtasks && selectedTaskDetail.subtasks.length > 0 && (
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedTaskDetail.subtasks.filter((s) => s.completed).length} of {selectedTaskDetail.subtasks.length} done
                      </span>
                    )}
                  </div>

                  {/* Subtask items */}
                  <div className="space-y-1.5 mb-3">
                    {(selectedTaskDetail.subtasks || []).map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-950 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleGroupSubtask(selectedTaskDetail, st.id)}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                            st.completed
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
                          }`}
                        >
                          {st.completed && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>
                        <span
                          className={`flex-1 font-medium ${
                            st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                    ))}

                    {(!selectedTaskDetail.subtasks || selectedTaskDetail.subtasks.length === 0) && (
                      <p className="text-xs text-slate-400 italic py-1">No subtasks created yet.</p>
                    )}
                  </div>

                  {/* Add Subtask Form */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!detailSubtaskInput.trim()) return;
                      const newSub = { id: `st_${Date.now()}`, title: detailSubtaskInput.trim(), completed: false };
                      const updatedSubtasks = [...(selectedTaskDetail.subtasks || []), newSub];
                      const audit = logTaskAudit(selectedTaskDetail, 'Added Subtask', currentUserName, `Subtask: "${detailSubtaskInput.trim()}"`);
                      await updateGroupTask(selectedTaskDetail.id, { subtasks: updatedSubtasks, ...audit });
                      setDetailSubtaskInput('');
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Add a step or subtask checklist item..."
                      value={detailSubtaskInput}
                      onChange={(e) => setDetailSubtaskInput(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Add Step
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Tab 2: Comments & Discussion System */}
            {activeModalTab === 'comments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Task Discussion & Team Comments ({selectedTaskDetail.comments?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-400">Formatting supported: **bold**, ~~cross~~, *italic*</span>
                </div>

                {/* Comments List */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {(selectedTaskDetail.comments || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                      <MessageSquare className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600 mb-1" />
                      <p className="text-xs font-semibold text-slate-500">No discussion comments yet</p>
                      <p className="text-[11px] text-slate-400">Start a thread below to collaborate on this task.</p>
                    </div>
                  ) : (
                    (selectedTaskDetail.comments || []).map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{comment.userName}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {comment.isEdited && (
                              <span className="text-[10px] text-indigo-500 italic">(edited)</span>
                            )}
                          </div>

                          {currentUser && comment.userId === currentUser.uid && editingCommentId !== comment.id && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.text);
                                }}
                                className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                                title="Edit comment"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(selectedTaskDetail, comment.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white p-2 text-xs text-slate-900 dark:bg-slate-900 dark:text-white"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="rounded px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditComment(selectedTaskDetail, comment.id)}
                                className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 cursor-pointer"
                              >
                                Save Comment
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            <FormattedChatMessage text={comment.text} />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* New Comment Input with Rich Text Formatting Toolbar */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Add Comment</span>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setTaskCommentInput((prev) => `${prev} **bold text**`)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskCommentInput((prev) => `${prev} *italic text*`)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 italic hover:bg-slate-200"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskCommentInput((prev) => `${prev} ~~cross text~~`)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 line-through hover:bg-slate-200"
                        title="Strikethrough"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskCommentInput((prev) => `${prev} \`code\``)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono hover:bg-slate-200"
                        title="Code"
                      >
                        {`</>`}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Write a comment or discussion update..."
                    value={taskCommentInput}
                    onChange={(e) => setTaskCommentInput(e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-xs text-slate-900 focus:outline-hidden focus:ring-0 dark:text-white placeholder-slate-400"
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddComment(selectedTaskDetail)}
                      disabled={!taskCommentInput.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Post Comment</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Audit Log & History Timeline */}
            {activeModalTab === 'history' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-indigo-500" />
                      Task Accountability Audit Log
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {selectedTaskDetail.auditLog?.length || 0} Total Events
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tracks who created the task, status modifications, requirements edits, and comment updates for collaborative transparency.
                  </p>
                </div>

                {/* Audit Log Timeline */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {(!selectedTaskDetail.auditLog || selectedTaskDetail.auditLog.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                      <History className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600 mb-1" />
                      <p className="text-xs font-semibold text-slate-500">No audit history recorded yet</p>
                    </div>
                  ) : (
                    [...selectedTaskDetail.auditLog].reverse().map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-3 text-xs"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold">
                          <Activity className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{log.action}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(log.timestamp).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">
                            By <strong className="text-indigo-600 dark:text-indigo-400">{log.userName}</strong>
                          </p>
                          {log.details && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-md mt-1 font-mono">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                onClick={() => {
                  const t = selectedTaskDetail;
                  setSelectedTaskDetail(null);
                  handleDiscussTaskInChat(t);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Discuss Task in Group Chat</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await handleToggleTaskComplete(selectedTaskDetail);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer ${
                    selectedTaskDetail.completed ? 'bg-slate-600 hover:bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {selectedTaskDetail.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                </button>

                <button
                  onClick={() => {
                    setSelectedTaskDetail(null);
                    setIsEditingTaskDescInModal(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Ringing Call Alert Modal */}
      <IncomingCallModal
        call={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />

      {/* Video / Audio / Screen Share Call Modal */}
      {activeWs && (
        <GroupCallModal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          workspace={activeWs}
          workspaceName={activeWs.name}
          initialCallType={callType}
          members={acceptedMembers}
          currentUserId={currentUser?.uid}
          currentUserName={currentUserName}
          activeCallSession={activeCallSession}
          onEndCallSession={handleEndCallSession}
        />
      )}

      {/* Image Attachment Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage.url}
          imageName={lightboxImage.name}
        />
      )}
    </div>
  );
};
