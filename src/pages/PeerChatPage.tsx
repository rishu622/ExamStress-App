import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquareHeart, Send, ShieldCheck, PhoneCall, Plus, ArrowLeft, Flag, XCircle, Loader2, UserSearch, MessagesSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { formatTime, timeAgo } from '../lib/format';
import type { ChatMessage, Conversation } from '../types';
import { Card, EmptyState, ErrorBox, Modal, Spinner, dangerButton, inputClass, primaryButton, secondaryButton } from '../components/common/ui';

const STATUS_STYLES: Record<Conversation['status'], string> = {
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  escalated: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  closed: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export const PeerChatPage: React.FC = () => {
  const { user, notify, publicSettings, setActivePage, setSelectedStudentId } = useApp();
  const isStudent = user?.role === 'student';
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed'>('active');
  const [startOpen, setStartOpen] = useState(false);
  const [startTopic, setStartTopic] = useState('');
  const [startMessage, setStartMessage] = useState('');
  const [startBusy, setStartBusy] = useState(false);
  const [dialog, setDialog] = useState<null | 'crisis' | 'escalate' | 'close'>(null);
  const [dialogText, setDialogText] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [crisisDone, setCrisisDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await api.get<Conversation[]>('/api/chat/conversations'));
      setListError('');
    } catch (err) {
      setListError(errorMessage(err));
    }
  }, []);

  const loadMessages = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setLoadingMessages(true);
    try {
      const data = await api.get<{ messages: ChatMessage[] }>(`/api/chat/conversations/${id}/messages`);
      setMessages(data.messages);
    } catch (err) {
      if (!quiet) notify(errorMessage(err), 'error');
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, [notify]);

  useEffect(() => {
    loadConversations();
    const interval = window.setInterval(loadConversations, 10000);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    lastCountRef.current = 0;
    loadMessages(activeId);
    const interval = window.setInterval(() => loadMessages(activeId, true), 4000);
    return () => window.clearInterval(interval);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const active = conversations?.find(c => c.id === activeId) ?? null;
  const visible = (conversations ?? []).filter(c => (statusFilter === 'active' ? c.status !== 'closed' : c.status === 'closed'));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/chat/conversations/${activeId}/messages`, { body: draft.trim() });
      setDraft('');
      await Promise.all([loadMessages(activeId, true), loadConversations()]);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startMessage.trim()) return;
    setStartBusy(true);
    try {
      const conv = await api.post<Conversation>('/api/chat/conversations', { message: startMessage.trim(), topic: startTopic.trim() || null });
      setStartOpen(false);
      setStartMessage('');
      setStartTopic('');
      await loadConversations();
      setStatusFilter('active');
      setActiveId(conv.id);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setStartBusy(false);
    }
  };

  const runDialog = async () => {
    if (!activeId || !dialog) return;
    setDialogBusy(true);
    try {
      if (dialog === 'crisis') {
        await api.post(`/api/chat/conversations/${activeId}/crisis`);
        setCrisisDone(true);
      } else if (dialog === 'escalate') {
        await api.post(`/api/chat/conversations/${activeId}/escalate`, { reason: dialogText });
        notify('A counselor has been alerted.');
        setDialog(null);
      } else {
        await api.post(`/api/chat/conversations/${activeId}/close`);
        notify('Conversation closed.');
        setDialog(null);
      }
      await Promise.all([loadMessages(activeId, true), loadConversations()]);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setDialogBusy(false);
    }
  };

  const openDialog = (d: typeof dialog) => {
    setDialog(d);
    setDialogText('');
    setCrisisDone(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      <Card className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Peer support chat</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Anonymous
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isStudent
              ? 'Chat with a trained student peer mentor. They only see a random nickname, never your name. Counselors can view chats to keep everyone safe.'
              : user.role === 'peer-mentor'
                ? 'Students appear under random nicknames. If you are worried about someone, use "Ask a counselor" straight away.'
                : 'All peer conversations. Escalated chats need a counselor to review them.'}
          </p>
        </div>
        {isStudent && (
          <button onClick={() => setStartOpen(true)} className={primaryButton}>
            <Plus className="w-4 h-4" /> New conversation
          </button>
        )}
      </Card>

      {listError && <ErrorBox message={listError} onRetry={loadConversations} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:h-[640px]">
        <Card className={`lg:col-span-4 p-3 sm:p-4 flex flex-col min-h-0 ${activeId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex gap-1.5 mb-3">
            {(['active', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${statusFilter === f ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
            {!conversations ? (
              <Spinner />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title={statusFilter === 'closed' ? 'No closed conversations' : isStudent ? 'No conversations yet' : 'No active conversations'}
                text={isStudent && statusFilter === 'active' ? 'Start one whenever you want to talk something through.' : undefined}
                action={isStudent && statusFilter === 'active' ? <button onClick={() => setStartOpen(true)} className={`${primaryButton} mt-2`}><Plus className="w-4 h-4" /> Start</button> : undefined}
              />
            ) : (
              visible.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full p-3 rounded-2xl text-left border transition ${
                    activeId === conv.id
                      ? 'bg-blue-50/70 dark:bg-slate-800 border-brand-blue ring-2 ring-brand-blue/30'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{isStudent ? conv.topic ?? 'Conversation' : conv.alias}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full capitalize shrink-0 ${STATUS_STYLES[conv.status]}`}>{conv.status}</span>
                  </div>
                  {!isStudent && conv.topic && <p className="text-[11px] text-slate-500 truncate">{conv.topic}</p>}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">{conv.last_message ?? '—'}</p>
                  <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>{conv.student_anon_id ? `Student ${conv.student_anon_id}` : ''}</span>
                    <span>{timeAgo(conv.updated_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className={`lg:col-span-8 flex flex-col overflow-hidden min-h-[70vh] lg:min-h-0 ${activeId ? 'flex' : 'hidden lg:flex'}`}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={MessageSquareHeart} title="Select a conversation" text={isStudent ? 'Or start a new one to talk to a peer mentor.' : undefined} />
            </div>
          ) : (
            <>
              <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setActiveId(null)} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back to conversations">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white truncate">{isStudent ? active.topic ?? 'Conversation with a peer mentor' : active.alias}</h2>
                    <span className="text-[11px] text-slate-500">{isStudent ? `You appear as "${active.alias}"` : active.topic ?? 'No topic'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {user.role === 'counselor' && active.student_id && (
                    <button
                      onClick={() => { setSelectedStudentId(active.student_id); setActivePage('dashboard'); }}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-blue"
                    >
                      <UserSearch className="w-3.5 h-3.5" /> {active.student_anon_id}
                    </button>
                  )}
                  {isStudent && active.status !== 'closed' && (
                    <button onClick={() => openDialog('crisis')} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                      <PhoneCall className="w-3.5 h-3.5" /> <span className="hidden sm:inline">I need help now</span><span className="sm:hidden">Help</span>
                    </button>
                  )}
                  {user.role === 'peer-mentor' && active.status === 'open' && (
                    <button onClick={() => openDialog('escalate')} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600">
                      <Flag className="w-3.5 h-3.5" /> Ask a counselor
                    </button>
                  )}
                  {(user.role === 'counselor' ? active.status !== 'closed' : active.status === 'open') && (
                    <button onClick={() => openDialog('close')} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" title="Close conversation" aria-label="Close conversation">
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
                {loadingMessages && messages.length === 0 ? (
                  <Spinner />
                ) : (
                  messages.map(msg =>
                    msg.sender_role === 'system' ? (
                      <div key={msg.id} className="mx-auto max-w-lg p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100 text-xs text-center">
                        {msg.body}
                      </div>
                    ) : (
                      <div key={msg.id} className={`flex flex-col ${msg.is_mine ? 'items-end' : 'items-start'} gap-0.5`}>
                        <span className="text-[10px] text-slate-400 px-1">{msg.sender_label} · {formatTime(msg.created_at)}</span>
                        <div
                          className={`max-w-[85%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            msg.is_mine
                              ? 'bg-brand-blue text-white rounded-tr-sm'
                              : msg.sender_role === 'counselor'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-900 rounded-tl-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                          } ${msg.flagged ? 'ring-2 ring-rose-400' : ''}`}
                        >
                          {msg.body}
                        </div>
                        {msg.flagged && <span className="text-[10px] font-bold text-rose-600 px-1">Flagged for counselor review</span>}
                      </div>
                    ),
                  )
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {active.status === 'closed' ? (
                  <p className="text-xs text-center text-slate-500">This conversation is closed.{isStudent && ' Start a new one any time.'}</p>
                ) : (
                  <form onSubmit={send} className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send(e);
                        }
                      }}
                      rows={1}
                      maxLength={1500}
                      placeholder={isStudent ? 'Type a message…' : 'Write a supportive reply…'}
                      aria-label="Message"
                      className={`${inputClass} resize-none max-h-32`}
                    />
                    <button type="submit" disabled={!draft.trim() || sending} className={`${primaryButton} px-3`} aria-label="Send">
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal open={startOpen} onClose={() => setStartOpen(false)} title="Talk to a peer mentor">
        <form onSubmit={startConversation} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You'll get a random nickname. Please don't share your name, phone number or social media. They'll be removed automatically to protect you.
          </p>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Topic <span className="font-normal text-slate-400">(optional)</span>
            <input value={startTopic} onChange={e => setStartTopic(e.target.value)} maxLength={80} placeholder="e.g. Exam pressure" className={`${inputClass} mt-1`} />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            What would you like to talk about?
            <textarea value={startMessage} onChange={e => setStartMessage(e.target.value)} rows={4} maxLength={1500} required className={`${inputClass} mt-1`} />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={startBusy || !startMessage.trim()} className={primaryButton}>
              {startBusy && <Loader2 className="w-4 h-4 animate-spin" />} Start conversation
            </button>
            <button type="button" onClick={() => setStartOpen(false)} className={secondaryButton}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog === 'crisis' ? 'Get help now' : dialog === 'escalate' ? 'Ask a counselor to step in' : 'Close conversation'}>
        {dialog === 'crisis' && crisisDone ? (
          <div className="space-y-3 text-sm">
            <p className="font-bold text-emerald-700 dark:text-emerald-400">Your school counselor has been alerted and can see this conversation.</p>
            <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold">If you might be in danger right now: {publicSettings?.helpline_text}</p>
            <button onClick={() => setDialog(null)} className={secondaryButton}>Back to chat</button>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {dialog === 'crisis' && (
              <>
                <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold">In immediate danger? {publicSettings?.helpline_text}</p>
                <p className="text-slate-600 dark:text-slate-300">This alerts a school counselor. They will be able to see who you are so they can reach you.</p>
              </>
            )}
            {dialog === 'escalate' && (
              <label className="block text-slate-700 dark:text-slate-200 font-semibold">
                What worries you? (only counselors see this)
                <textarea value={dialogText} onChange={e => setDialogText(e.target.value)} rows={3} className={`${inputClass} mt-1`} autoFocus />
              </label>
            )}
            {dialog === 'close' && <p className="text-slate-600 dark:text-slate-300">Close this conversation? Nobody can send new messages afterwards.</p>}
            <div className="flex gap-2">
              <button onClick={runDialog} disabled={dialogBusy || (dialog === 'escalate' && !dialogText.trim())} className={dialog === 'close' ? primaryButton : dangerButton}>
                {dialogBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                {dialog === 'crisis' ? 'Alert my counselor' : dialog === 'escalate' ? 'Alert counselor' : 'Close conversation'}
              </button>
              <button onClick={() => setDialog(null)} className={secondaryButton}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
