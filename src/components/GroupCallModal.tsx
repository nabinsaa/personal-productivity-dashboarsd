import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Users,
  MessageSquare,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
  UserPlus,
  ShieldAlert,
  Radio,
  ExternalLink,
  Code2,
  Layout,
  FileText,
  Send,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { GroupWorkspace, GroupMember, GroupCallSession } from '../types';
import { requestMediaStreamSafely, checkMediaPermissions } from '../services/mediaPermissionsService';
import { ringToneService } from '../services/ringToneService';
import { sendGroupCallSignal, subscribeGroupCallSignals, updateGroupCallScreenSharer } from '../services/dbService';

interface GroupCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace?: GroupWorkspace;
  workspaceName?: string;
  members: GroupMember[];
  currentUserId?: string;
  currentUserName?: string;
  initialCallType?: 'video' | 'audio' | 'screen';
  callType?: 'video' | 'audio' | 'screen';
  activeCallSession?: GroupCallSession | null;
  onEndCallSession?: () => void;
}

interface InCallMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

const RemoteUserVideoCard: React.FC<{
  member: GroupMember;
  remoteStream?: MediaStream;
  isSpeakerMuted: boolean;
}> = ({ member, remoteStream, isSpeakerMuted }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((err) => {
        console.log('Remote video auto-play catch:', err);
      });
    }
  }, [remoteStream]);

  const memberName = member.displayName || member.userEmail?.split('@')[0] || 'Participant';
  const hasVideoTracks =
    remoteStream &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center group shadow-md min-h-[220px]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSpeakerMuted}
        className={`w-full h-full object-cover ${hasVideoTracks ? 'block' : 'hidden'}`}
      />

      {!hasVideoTracks && (
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-indigo-500/20">
            {memberName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-200 text-sm">{memberName}</p>
            <p className="text-xs text-slate-400 font-mono">
              {remoteStream ? 'Audio Connected' : 'Connecting Stream...'}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 flex items-center space-x-2 backdrop-blur-sm border border-slate-800 z-10">
        <span>{memberName}</span>
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </div>
  );
};

const RemoteScreenVideoPlayer: React.FC<{
  remoteStream?: MediaStream;
  screenSharerName?: string | null;
}> = ({ remoteStream, screenSharerName }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((err) => console.log('Remote screen play err:', err));
    }
  }, [remoteStream, isMaximized]);

  const toggleMaximized = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isMaximized) {
      setIsMaximized(true);
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      setIsMaximized(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    const handleFsChange = () => {
      if (!document.fullscreenElement && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [isMaximized]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden group transition-all ${
        isMaximized
          ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none bg-slate-950 p-4'
          : ''
      }`}
    >
      {remoteStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          <p className="text-xs">Connecting to {screenSharerName || 'User'}'s live screen share stream...</p>
        </div>
      )}

      {/* Screen Share Overlay Controls */}
      <div className="absolute top-3 left-3 bg-slate-950/80 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 backdrop-blur-md flex items-center space-x-2 z-10">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Live Screen Share: {screenSharerName || 'Workspace Member'}</span>
      </div>

      <div className="absolute top-3 right-3 opacity-90 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={toggleMaximized}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 rounded-lg text-xs font-bold flex items-center space-x-1.5 backdrop-blur-md shadow-xl transition-all hover:scale-105"
        >
          {isMaximized ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
          <span>{isMaximized ? 'Exit Full Screen' : 'Full Screen View'}</span>
        </button>
      </div>
    </div>
  );
};

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
  isOpen,
  onClose,
  workspace,
  workspaceName,
  members = [],
  currentUserId = '',
  currentUserName = 'User',
  initialCallType = 'video',
  activeCallSession,
  onEndCallSession,
}) => {
  const [callMode, setCallMode] = useState<'video' | 'audio'>(
    initialCallType === 'audio' ? 'audio' : 'video'
  );
  const [isVideoOn, setIsVideoOn] = useState(initialCallType !== 'audio');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(initialCallType === 'screen');
  const [isInteractiveDemoScreen, setIsInteractiveDemoScreen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'screen' | 'chat'>(
    initialCallType === 'screen' ? 'screen' : 'grid'
  );
  const [callDuration, setCallDuration] = useState(0);
  const [simulatedMembers, setSimulatedMembers] = useState<GroupMember[]>([]);

  // WebRTC Multi-User Connection States
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // Ringback tone management for caller while ringing
  useEffect(() => {
    if (!isOpen) {
      ringToneService.stopRingSound();
      return;
    }

    if (activeCallSession && activeCallSession.status === 'ringing' && activeCallSession.callerId === currentUserId) {
      ringToneService.playOutgoingRingback();
    } else {
      ringToneService.stopRingSound();
    }

    return () => {
      ringToneService.stopRingSound();
    };
  }, [isOpen, activeCallSession, currentUserId]);

  // Interactive Screen Demo State
  const [demoScreenTab, setDemoScreenTab] = useState<'tasks' | 'code' | 'notes'>('tasks');
  const [chatMessages, setChatMessages] = useState<InCallMessage[]>([
    {
      id: '1',
      sender: 'System',
      text: 'Call started. All participants connected securely.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: false,
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Local media stream refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Sync state on open or callType change
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      stopAllStreams();
      return;
    }

    setCallMode(initialCallType === 'audio' ? 'audio' : 'video');
    setIsVideoOn(initialCallType !== 'audio');
    setIsMicOn(true);

    if (initialCallType === 'screen') {
      setIsScreenSharing(true);
      setActiveTab('screen');
      startScreenShare();
    } else {
      setIsScreenSharing(false);
      setActiveTab('grid');
    }
  }, [isOpen, initialCallType]);

  // Call duration timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Auto switch to screen tab when a participant starts screen sharing
  useEffect(() => {
    if (activeCallSession?.screenSharerUserId) {
      setActiveTab('screen');
    }
  }, [activeCallSession?.screenSharerUserId]);

  // Handle active participants simulation
  useEffect(() => {
    if (!isOpen) return;
    const acceptedMembers = members.filter(
      (m) => m.status === 'accepted' || m.userId === currentUserId
    );
    setSimulatedMembers(acceptedMembers);
  }, [isOpen, members, currentUserId]);

  const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Auto close modal if call session ends
  useEffect(() => {
    if (isOpen && activeCallSession && activeCallSession.status === 'ended') {
      ringToneService.stopRingSound();
      stopAllStreams();
      if (onEndCallSession) {
        onEndCallSession();
      }
      onClose();
    }
  }, [isOpen, activeCallSession?.status]);

  // Request & attach Media Stream (Camera & Microphone)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initMedia() {
      setPermissionError(null);
      const wantVideo = isVideoOn || callMode === 'video';
      const wantAudio = isMicOn;

      const mediaResult = await requestMediaStreamSafely({
        video: wantVideo,
        audio: wantAudio,
      });

      if (!isMounted) return;

      if (mediaResult.stream) {
        mediaStreamRef.current = mediaResult.stream;
        if (localVideoRef.current && mediaResult.hasVideo) {
          localVideoRef.current.srcObject = mediaResult.stream;
        }

        // Attach tracks to existing peer connections
        peerConnectionsRef.current.forEach((pc) => {
          mediaResult.stream!.getTracks().forEach((track) => {
            const senders = pc.getSenders();
            const existingSender = senders.find((s) => s.track?.kind === track.kind);
            if (existingSender) {
              existingSender.replaceTrack(track);
            } else {
              pc.addTrack(track, mediaResult.stream!);
            }
          });
        });
      }

      if (mediaResult.error) {
        setPermissionError(mediaResult.error);
      }
    }

    initMedia();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isVideoOn, callMode]);

  const handleAddIceCandidate = async (senderId: string, candidateInit: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(senderId);
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    } else {
      const queue = iceCandidateQueueRef.current.get(senderId) || [];
      queue.push(candidateInit);
      iceCandidateQueueRef.current.set(senderId, queue);
    }
  };

  const processQueuedIceCandidates = async (senderId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateQueueRef.current.get(senderId) || [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.error('Error adding queued candidate:', e);
      }
    }
    iceCandidateQueueRef.current.set(senderId, []);
  };

  // WebRTC Peer Connection Factory
  const createPeerConnection = async (peerUserId: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current.has(peerUserId)) {
      return peerConnectionsRef.current.get(peerUserId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
      ],
    });

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStreamRef.current!);
      });
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, screenStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && activeCallSession?.id) {
        sendGroupCallSignal(activeCallSession.id, {
          senderId: currentUserId,
          receiverId: peerUserId,
          type: 'candidate',
          candidate: JSON.stringify(event.candidate),
        });
      }
    };

    pc.ontrack = (event) => {
      let incomingStream = event.streams[0];
      if (!incomingStream) {
        incomingStream = new MediaStream([event.track]);
      }
      setRemoteStreams((prev) => {
        const existingStream = prev[peerUserId];
        if (existingStream) {
          if (!existingStream.getTracks().some((t) => t.id === event.track.id)) {
            existingStream.addTrack(event.track);
          }
          return { ...prev, [peerUserId]: new MediaStream(existingStream.getTracks()) };
        }
        return { ...prev, [peerUserId]: incomingStream };
      });
    };

    peerConnectionsRef.current.set(peerUserId, pc);

    if (isInitiator && activeCallSession?.id) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await sendGroupCallSignal(activeCallSession.id, {
          senderId: currentUserId,
          receiverId: peerUserId,
          type: 'offer',
          sdp: JSON.stringify(offer),
        });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    }

    return pc;
  };

  // Subscribe to WebRTC signaling for incoming offers, answers, and candidates
  useEffect(() => {
    if (!isOpen || !activeCallSession?.id || !currentUserId) return;

    const callId = activeCallSession.id;

    const unsubSignals = subscribeGroupCallSignals(callId, currentUserId, async (signal) => {
      if (signal.senderId === currentUserId) return;
      const senderId = signal.senderId;

      try {
        if (signal.type === 'offer') {
          let pc = peerConnectionsRef.current.get(senderId);
          if (!pc) {
            pc = await createPeerConnection(senderId, false);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.sdp)));
          await processQueuedIceCandidates(senderId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendGroupCallSignal(callId, {
            senderId: currentUserId,
            receiverId: senderId,
            type: 'answer',
            sdp: JSON.stringify(answer),
          });
        } else if (signal.type === 'answer') {
          const pc = peerConnectionsRef.current.get(senderId);
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.sdp)));
            await processQueuedIceCandidates(senderId, pc);
          }
        } else if (signal.type === 'candidate') {
          if (signal.candidate) {
            await handleAddIceCandidate(senderId, JSON.parse(signal.candidate));
          }
        }
      } catch (err) {
        console.error('WebRTC signal processing error:', err);
      }
    });

    return () => {
      unsubSignals();
    };
  }, [isOpen, activeCallSession?.id, currentUserId]);

  // Connect to other participants in the call session
  useEffect(() => {
    if (!isOpen || !activeCallSession?.id || !currentUserId) return;

    const otherParticipants = (activeCallSession.participants || []).filter((id) => id !== currentUserId);

    otherParticipants.forEach((peerId) => {
      // Initiator rule: smaller userId initiates connection
      if (currentUserId < peerId && !peerConnectionsRef.current.has(peerId)) {
        createPeerConnection(peerId, true);
      }
    });
  }, [isOpen, activeCallSession?.participants, currentUserId]);

  // Screen Sharing Logic
  const startScreenShare = async () => {
    setPermissionError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        setIsInteractiveDemoScreen(false);
        setActiveTab('screen');

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream;
        }

        if (activeCallSession?.id) {
          updateGroupCallScreenSharer(activeCallSession.id, currentUserId, currentUserName);
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          peerConnectionsRef.current.forEach((pc) => {
            const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(screenTrack);
            } else {
              pc.addTrack(screenTrack, screenStream);
            }
          });
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };
        return;
      }
    } catch (err: any) {
      console.warn('Native display capture restricted or canceled:', err);
    }

    // Fallback if native display media is disallowed
    setIsScreenSharing(true);
    setIsInteractiveDemoScreen(true);
    setActiveTab('screen');
    if (activeCallSession?.id) {
      updateGroupCallScreenSharer(activeCallSession.id, currentUserId, currentUserName);
    }
    setPermissionError(
      'Embedded preview frame restricts native screen capture. Interactive workspace screen stream active (or open app in a new tab).'
    );
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setIsInteractiveDemoScreen(false);

    if (activeCallSession?.id) {
      updateGroupCallScreenSharer(activeCallSession.id, null, null);
    }

    const cameraTrack = mediaStreamRef.current?.getVideoTracks()[0];
    peerConnectionsRef.current.forEach((pc) => {
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack);
      }
    });

    if (activeTab === 'screen') setActiveTab('grid');
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const stopAllStreams = () => {
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    setRemoteStreams({});

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
  };

  const handleToggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !isVideoOn;
      });
    }
    setIsVideoOn(!isVideoOn);
  };

  const handleToggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !isMicOn;
      });
    }
    setIsMicOn(!isMicOn);
  };

  const handleLeaveCall = () => {
    ringToneService.stopRingSound();
    stopAllStreams();
    if (onEndCallSession) {
      onEndCallSession();
    }
    onClose();
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (modalContainerRef.current?.requestFullscreen) {
        modalContainerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [isFullscreen]);

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage: InCallMessage = {
      id: Date.now().toString(),
      sender: currentUserName,
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput('');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        ref={modalContainerRef}
        className={`relative w-full flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100 transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-[9999] max-w-none h-screen w-screen rounded-none border-none p-2 bg-slate-950'
            : 'max-w-6xl h-[92vh] rounded-2xl p-0'
        }`}
      >
        {/* Top Call Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Radio className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
              <span>
                {activeCallSession?.status === 'ringing'
                  ? 'RINGING ONLINE MEMBERS...'
                  : `LIVE CALL • ${workspace?.name || workspaceName || 'Group Workspace'}`}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
              {formatDuration(callDuration)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveTab('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'grid'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Gallery Grid</span>
              </button>
              <button
                onClick={() => {
                  if (!isScreenSharing) startScreenShare();
                  setActiveTab('screen');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'screen'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Screen Share</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'chat'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>In-Call Chat</span>
              </button>
            </div>

            <button
              onClick={handleOpenNewTab}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 border border-slate-700/60"
              title="Open app in a full browser tab for unrestricted screen share and camera permissions"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Permission / Restriction Banner */}
        {permissionError && (
          <div className="px-6 py-2.5 bg-amber-950/80 border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>{permissionError}</span>
            </div>
            <button
              onClick={handleOpenNewTab}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-md font-semibold text-[11px] flex items-center space-x-1 shrink-0 ml-2"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open in New Tab</span>
            </button>
          </div>
        )}

        {/* Main Stage Area */}
        <div className="flex-1 relative overflow-hidden bg-slate-950 p-4">
          {/* SCREEN SHARE TAB */}
          {activeTab === 'screen' && (
            <div className="h-full w-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
              {/* Screen Header Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {activeCallSession?.screenSharerUserId
                      ? activeCallSession.screenSharerUserId === currentUserId
                        ? 'You are sharing your screen live'
                        : `${activeCallSession.screenSharerName || 'Participant'} is sharing screen`
                      : isInteractiveDemoScreen
                      ? 'Interactive Workspace Presenter Stream'
                      : 'Live Screen Presentation'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={startScreenShare}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
                    title="Retry native desktop capture"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Try Native Share</span>
                  </button>
                  <button
                    onClick={handleOpenNewTab}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center space-x-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Open in New Tab ↗</span>
                  </button>
                </div>
              </div>

              {/* Screen Body */}
              <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center p-2">
                {activeCallSession?.screenSharerUserId && activeCallSession.screenSharerUserId !== currentUserId ? (
                  <RemoteScreenVideoPlayer
                    remoteStream={remoteStreams[activeCallSession.screenSharerUserId]}
                    screenSharerName={activeCallSession.screenSharerName}
                  />
                ) : !isInteractiveDemoScreen ? (
                  <div
                    className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden group"
                  >
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <div className="absolute top-3 right-3 opacity-90 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={toggleFullscreen}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 rounded-lg text-xs font-bold flex items-center space-x-1.5 backdrop-blur-md shadow-xl transition-all hover:scale-105"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                          <Maximize2 className="h-3.5 w-3.5" />
                        )}
                        <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Interactive Workspace Presentation Screen Demo */
                  <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 flex flex-col overflow-hidden text-slate-200">
                    <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setDemoScreenTab('tasks')}
                          className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                            demoScreenTab === 'tasks'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Layout className="h-3.5 w-3.5" />
                          <span>Task Board</span>
                        </button>
                        <button
                          onClick={() => setDemoScreenTab('code')}
                          className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                            demoScreenTab === 'code'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          <span>Code Architecture</span>
                        </button>
                        <button
                          onClick={() => setDemoScreenTab('notes')}
                          className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                            demoScreenTab === 'notes'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Meeting Notes</span>
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-emerald-400 font-mono">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>PRESENTING LIVE</span>
                      </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto bg-slate-950/60">
                      {demoScreenTab === 'tasks' && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-slate-200">Active Group Tasks Dashboard</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                              <span className="text-[10px] uppercase font-bold text-indigo-400">In Progress</span>
                              <p className="text-xs font-semibold text-slate-200">Implement WebRTC audio/video call stream sync</p>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                                <span>Assignee: Workspace Lead</span>
                                <span className="text-indigo-400">High Priority</span>
                              </div>
                            </div>
                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                              <span className="text-[10px] uppercase font-bold text-emerald-400">Completed</span>
                              <p className="text-xs font-semibold text-slate-200">Firestore database setup & security rules deployment</p>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                                <span>Assignee: Workspace Member</span>
                                <span className="text-emerald-400">Done</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {demoScreenTab === 'code' && (
                        <div className="space-y-3 font-mono text-xs">
                          <div className="text-slate-400">// Server & WebRTC Media Stream Handler</div>
                          <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-indigo-300 overflow-x-auto">
                            {`async function initializeCallStream() {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  console.log("Connected to workspace peer call:", mediaStream.id);
}`}
                          </pre>
                        </div>
                      )}

                      {demoScreenTab === 'notes' && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-slate-200">Shared Call Agenda & Notes</h3>
                          <ul className="list-disc list-inside text-xs text-slate-300 space-y-2">
                            <li>Review audio/video and screen share performance.</li>
                            <li>Confirm group task sync and CSV export features.</li>
                            <li>Finalize deployment build checklist.</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* IN-CALL CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="h-full w-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">In-Call Live Chat & Notes</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">{chatMessages.length} Messages</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold">{msg.sender}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-md px-3.5 py-2 rounded-2xl text-xs ${
                        msg.isSelf
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChatMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message to participants..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* GRID VIEW TAB */}
          {activeTab === 'grid' && (
            <div className="h-full w-full flex flex-col space-y-3">
              {(activeCallSession?.screenSharerUserId || isScreenSharing) && (
                <div
                  onClick={() => setActiveTab('screen')}
                  className="px-4 py-2.5 bg-indigo-950/80 border border-indigo-500/40 hover:bg-indigo-900/90 rounded-xl text-indigo-200 text-xs font-semibold flex items-center justify-between cursor-pointer transition-all shadow-md group shrink-0"
                >
                  <div className="flex items-center space-x-2">
                    <Monitor className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span>
                      {activeCallSession?.screenSharerUserId === currentUserId || isScreenSharing
                        ? 'Your screen share is currently active.'
                        : `${activeCallSession?.screenSharerName || 'A participant'} is sharing their screen.`}{' '}
                      Click to expand & view in full screen!
                    </span>
                  </div>
                  <div className="px-2.5 py-1 bg-indigo-600 group-hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1">
                    <Maximize2 className="h-3 w-3" />
                    <span>View Full Screen</span>
                  </div>
                </div>
              )}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr overflow-y-auto pr-1">
              {/* Local User Card */}
              <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center group shadow-md min-h-[220px]">
                {isVideoOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-indigo-500/20">
                      {currentUserName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{currentUserName} (You)</p>
                      <p className="text-xs text-slate-500">Camera Muted</p>
                    </div>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 flex items-center space-x-2 backdrop-blur-sm border border-slate-800">
                  <span>{currentUserName} (You)</span>
                  {!isMicOn ? (
                    <MicOff className="h-3.5 w-3.5 text-rose-400" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Remote Workspace Participants */}
              {simulatedMembers
                .filter((m) => m.userId !== currentUserId)
                .map((member) => (
                  <RemoteUserVideoCard
                    key={member.id}
                    member={member}
                    remoteStream={remoteStreams[member.userId]}
                    isSpeakerMuted={isSpeakerMuted}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Dock */}
        <div className="px-6 py-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`p-3 rounded-xl transition-all ${
                isSpeakerMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isSpeakerMuted ? 'Unmute Speaker Output' : 'Mute Speaker Output'}
            >
              {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {/* Core Call Action Bar */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleMic}
              className={`p-4 rounded-2xl transition-all shadow-md ${
                !isMicOn
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            <button
              onClick={handleToggleVideo}
              className={`p-4 rounded-2xl transition-all shadow-md ${
                !isVideoOn
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-2xl transition-all shadow-md ${
                isScreenSharing
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
            >
              {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </button>

            <button
              onClick={handleLeaveCall}
              className="p-4 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 font-semibold flex items-center space-x-2 px-6"
            >
              <PhoneOff className="h-5 w-5" />
              <span>Leave Call</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center space-x-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>{simulatedMembers.length} Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
