import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, Mic, Monitor, Volume2 } from 'lucide-react';
import { GroupCallSession } from '../types';
import { ringToneService } from '../services/ringToneService';

interface IncomingCallModalProps {
  call: GroupCallSession | null;
  onAccept: (call: GroupCallSession) => void;
  onDecline: (call: GroupCallSession) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    if (call) {
      ringToneService.playIncomingRing();
    } else {
      ringToneService.stopRingSound();
    }

    return () => {
      ringToneService.stopRingSound();
    };
  }, [call]);

  if (!call) return null;

  const CallTypeIcon = call.callType === 'video' ? Video : call.callType === 'audio' ? Mic : Monitor;
  const callTypeLabel =
    call.callType === 'video' ? 'Video Call' : call.callType === 'audio' ? 'Voice Call' : 'Screen Share';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-indigo-500/30 bg-slate-900 p-6 text-center text-white shadow-2xl overflow-hidden space-y-6">
        {/* Glowing Animated Ambient Ring background */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />

        {/* Call Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
          <CallTypeIcon className="h-3.5 w-3.5 animate-bounce text-indigo-400" />
          <span>INCOMING {callTypeLabel.toUpperCase()}</span>
        </div>

        {/* Caller Avatar with Ring Wave */}
        <div className="relative mx-auto my-4 flex h-24 w-24 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500/30 opacity-75" />
          <span className="absolute inline-flex h-[120%] w-[120%] animate-pulse rounded-full bg-indigo-600/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 text-2xl font-black text-white shadow-xl border-2 border-indigo-400">
            {call.callerName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        {/* Caller Name & Workspace */}
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">{call.callerName}</h3>
          <p className="text-xs font-medium text-slate-300">
            is calling you in <span className="font-bold text-indigo-400">{call.workspaceName || 'Workspace'}</span>
          </p>
          <div className="pt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-400 animate-pulse">
            <Volume2 className="h-3.5 w-3.5" />
            <span>Ringing...</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Decline Button */}
          <button
            onClick={() => {
              ringToneService.stopRingSound();
              onDecline(call);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-rose-900/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={() => {
              ringToneService.stopRingSound();
              onAccept(call);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all cursor-pointer hover:scale-105 active:scale-95 animate-pulse"
          >
            <Phone className="h-4 w-4" />
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
