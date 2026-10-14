import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquareHeart,
  Mic,
  Square,
  Send,
  ShieldCheck,
  AlertTriangle,
  Award,
  Volume2,
  Play,
  Pause,
  UserCheck,
  Sparkles,
  PhoneCall,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

export const PeerChatPage: React.FC = () => {
  const {
    userRole,
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    sendMessage,
    triggerCrisisEscalation
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);

  const voiceTimerRef = useRef<number | null>(null);

  const activeConv = conversations.find(c => c.id === activeConversationId) || conversations[0];
  const activeMessages = messages[activeConversationId] || [];

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessage(activeConversationId, inputMessage.trim(), false);
    setInputMessage('');
  };

  const handleStartVoiceNote = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    voiceTimerRef.current = window.setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleSendVoiceNote = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    const duration = Math.max(recordingSeconds, 4);
    sendMessage(activeConversationId, 'Voice Note message sent.', true, duration);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Anonymous Student Peer Support Chat
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> AI Safety Moderation Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Safe, confidential space with verified Senior Class Mental Health Ambassadors. No real names or video shared.
          </p>
        </div>

        {/* Crisis Escalation Button */}
        <button
          onClick={() => triggerCrisisEscalation(activeConversationId)}
          className="px-4 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-2xl shadow-lg shadow-rose-600/25 transition flex items-center gap-2"
        >
          <PhoneCall className="w-4 h-4 animate-pulse" />
          <span>I Need Immediate Help</span>
        </button>
      </div>

      {/* Main Chat Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px]">
        {/* Left Sidebar (4 cols): Active Conversations & Peer Mentor Badge */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Peer Ambassador Badge Card */}
          <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 border border-teal-100 dark:border-slate-700 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Mental Health Ambassador
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Class 12 Senior Peer Mentor Network • 14 Conversations Moderated
              </p>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 overflow-y-auto space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
              Active Anonymous Chats
            </h3>

            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`w-full p-3.5 rounded-2xl text-left border transition ${
                  activeConversationId === conv.id
                    ? 'bg-blue-50/70 dark:bg-slate-800 border-brand-blue ring-2 ring-brand-blue/30'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white">
                  <span>{conv.studentAnonymousId}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{conv.lastTimestamp}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-normal">
                  {conv.lastMessage}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Area (8 cols): Active Chat Window */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-blue/10 text-brand-blue font-mono font-bold flex items-center justify-center text-xs">
                #
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {activeConv.studentAnonymousId}
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  ● End-to-End Encrypted & Anonymous
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                AI Moderation System: 0 Violations
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {activeMessages.map(msg => {
              const isMe = msg.senderRole === (userRole === 'peer-mentor' ? 'peer-mentor' : 'student');
              const isSystem = msg.senderRole === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs text-center space-y-1 my-4">
                    <p className="font-bold">{msg.text}</p>
                    <span className="text-[10px] text-rose-500 font-mono">{msg.timestamp}</span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <span className="text-[10px] text-slate-400 px-1 font-mono">{msg.senderName} • {msg.timestamp}</span>
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-brand-blue text-white rounded-tr-xs shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.isVoice ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPlayingMsgId(playingMsgId === msg.id ? null : msg.id)}
                          className={`p-2 rounded-full ${isMe ? 'bg-white/20 text-white' : 'bg-brand-blue text-white'}`}
                        >
                          {playingMsgId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="h-1.5 w-32 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full ${isMe ? 'bg-white' : 'bg-brand-blue'} w-2/3`} />
                          </div>
                          <span className="text-[10px] opacity-80 font-mono block">
                            Voice Note 0:{msg.audioDurationSec || 15}s
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            {isRecordingVoice ? (
              <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900">
                <div className="flex items-center gap-3 text-rose-600 font-mono text-xs font-bold">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  Recording Voice Note: 0:0{recordingSeconds}s
                </div>
                <button
                  onClick={handleSendVoiceNote}
                  className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-rose-700 transition"
                >
                  Release to Send
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendText} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartVoiceNote}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Hold or Click to Record Voice Message"
                >
                  <Mic className="w-5 h-5 text-brand-blue" />
                </button>

                <input
                  type="text"
                  placeholder="Type an encouragement or supportive response..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="p-2.5 bg-brand-blue hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl shadow-xs transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
