import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { chatApi } from '@/api/operations.api';
import { studentApi } from '@/api/student.api';
import { ChatMessageBody } from '@/components/chat/ChatMessageBody';
import { Select } from '@/components/ui/select';
import { useSocket, useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

const CHAT_WIDTH = 'min(460px, calc(100vw - 2rem))';
const CHAT_HEIGHT = 'min(680px, calc(100vh - 2rem))';

export function StudentChatWidget() {
  const location = useLocation();
  const { subscribeChat } = useSocket();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const activeSessionRef = useRef(null);

  const routeServiceId = location.pathname.match(/^\/services\/([^/]+)/)?.[1] ?? '';

  useEffect(() => {
    if (routeServiceId) {
      setSelectedServiceId(routeServiceId);
    }
  }, [routeServiceId]);

  useEffect(() => {
    if (!open) return;
    studentApi
      .listServices()
      .then(({ data }) => setServices(data.data.services ?? []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !selectedServiceId) {
      setMessages([]);
      setSessionId(null);
      return;
    }

    const service = services.find((item) => item.id === selectedServiceId);
    const offeringWithApplication =
      service?.offerings?.find((offering) => offering.application)?.id ??
      service?.offerings?.[0]?.id ??
      '';
    setSelectedOfferingId(offeringWithApplication);

    setLoadingHistory(true);
    chatApi
      .history(selectedServiceId)
      .then(({ data }) => {
        setMessages(data.data.messages ?? []);
        setSessionId(data.data.sessionId ?? null);
      })
      .catch(() => {
        setMessages([]);
        setSessionId(null);
      })
      .finally(() => setLoadingHistory(false));
  }, [open, selectedServiceId, services]);

  useEffect(() => {
    activeSessionRef.current = sessionId;
    if (!sessionId) return undefined;
    return subscribeChat(sessionId);
  }, [sessionId, subscribeChat]);

  useSocketEvent(
    WS_EVENTS.CHAT_STREAM,
    ({ sessionId: eventSessionId, chunk }) => {
      if (eventSessionId && activeSessionRef.current && eventSessionId !== activeSessionRef.current) {
        return;
      }
      setStreamingText((current) => current + chunk);
    },
    [],
  );

  useSocketEvent(
    WS_EVENTS.CHAT_DONE,
    (assistantMessage) => {
      setStreamingText('');
      setMessages((current) => {
        if (current.some((item) => item.id === assistantMessage.id)) return current;
        return [...current, assistantMessage];
      });
      setSending(false);
      if (assistantMessage.sessionId) {
        setSessionId(assistantMessage.sessionId);
      }
    },
    [],
  );

  useSocketEvent(
    WS_EVENTS.CHAT_ERROR,
    ({ message }) => {
      setSending(false);
      setStreamingText('');
      toast.error(message || 'Could not get a reply');
    },
    [],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, sending, open]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const applyAssistantReply = (result, optimisticId) => {
    if (result?.sessionId) {
      setSessionId(result.sessionId);
      activeSessionRef.current = result.sessionId;
    }

    setMessages((current) => {
      let next = current.filter((item) => item.id !== optimisticId);
      const userMessage = result?.userMessage ?? result?.messages?.[0];
      const assistantMessage = result?.assistantMessage ?? result?.reply ?? result?.messages?.[1];

      if (userMessage && !next.some((item) => item.id === userMessage.id)) {
        next = [...next, userMessage];
      }
      if (assistantMessage && !next.some((item) => item.id === assistantMessage.id)) {
        next = [...next, assistantMessage];
      }
      return next;
    });
  };

  const handleSend = async () => {
    const message = input.trim();
    if (!message || sending || !selectedServiceId) return;

    setSending(true);
    setInput('');
    setStreamingText('');

    const optimisticId = `pending-${Date.now()}`;
    setMessages((current) => [...current, { id: optimisticId, role: 'user', content: message }]);

    try {
      const { data } = await chatApi.send(
        selectedServiceId,
        message,
        selectedOfferingId || undefined,
      );
      applyAssistantReply(data.data, optimisticId);
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      toast.error(err.message || 'Could not send your message');
    } finally {
      setSending(false);
      setStreamingText('');
    }
  };

  const selectedService = services.find((item) => item.id === selectedServiceId);

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A6640] text-white shadow-[0_8px_30px_rgba(10,102,64,0.35)] transition-transform hover:scale-105 hover:bg-[#084F31]"
          aria-label="Open help chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#C4E8D4] bg-white shadow-[0_20px_60px_rgba(5,46,28,0.22)] sm:bottom-6 sm:right-6"
          style={{ width: CHAT_WIDTH, height: CHAT_HEIGHT }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E2EEE8] bg-gradient-to-r from-[#F0FAF5] to-white px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A6640] text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-[#052E1C]">Need help?</p>
                <p className="text-xs text-[#4B6358]">Live assistant — documents, steps, visits</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B6358] hover:bg-[#F0FAF5]"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="shrink-0 space-y-3 border-b border-[#E2EEE8] bg-white px-5 py-3.5">
            <Select
              label="Which service?"
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              placeholder="Choose a service"
              options={services.map((service) => ({
                value: service.id,
                label: service.name,
              }))}
            />

            {selectedService?.offerings?.length > 1 ? (
              <Select
                label="Programme option"
                value={selectedOfferingId}
                onChange={setSelectedOfferingId}
                placeholder="Choose a programme"
                size="compact"
                options={selectedService.offerings.map((offering) => ({
                  value: offering.id,
                  label: offering.name,
                }))}
              />
            ) : null}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#F9FCFB] px-5 py-4">
            {!selectedServiceId ? (
              <p className="text-sm leading-relaxed text-[#4B6358]">
                Pick a service above so I can answer with the right documents and steps.
              </p>
            ) : loadingHistory ? (
              <p className="text-sm text-[#4B6358]">Loading conversation...</p>
            ) : messages.length === 0 && !streamingText ? (
              <div className="rounded-xl border border-[#E2EEE8] bg-white px-4 py-3 text-sm leading-relaxed text-[#4B6358]">
                <p className="font-medium text-[#052E1C]">Try asking:</p>
                <p className="mt-2">• What happens after I submit my documents?</p>
                <p>• What documents do I need?</p>
                <p>• How do I book a visit?</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  citations={message.citations}
                  confidence={message.confidence}
                />
              ))
            )}

            {streamingText ? <ChatBubble role="assistant" content={streamingText} /> : null}

            {sending && !streamingText ? (
              <div className="mr-10 max-w-[88%] rounded-2xl rounded-bl-md border border-[#E2EEE8] bg-white px-4 py-3 text-sm text-[#4B6358]">
                <span className="inline-flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#10B981] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#10B981] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#10B981] [animation-delay:300ms]" />
                  </span>
                  Thinking...
                </span>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#E2EEE8] bg-white p-4">
            <div className="flex items-end gap-2.5">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                placeholder={selectedServiceId ? 'Type your question...' : 'Select a service first'}
                disabled={!selectedServiceId || sending}
                className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] px-3.5 py-2.5 text-sm leading-relaxed text-[#052E1C] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0A6640] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/25 disabled:bg-[#F3F4F6]"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                disabled={!selectedServiceId || sending || !input.trim()}
                onClick={handleSend}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A6640] text-white shadow-[0_4px_12px_rgba(10,102,64,0.25)] transition hover:bg-[#084F31] disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-[#9CA3AF]">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ChatBubble({ role, content, citations = [], confidence }) {
  const isUser = role === 'user';
  const confidenceLabel =
    confidence === 'high' ? 'High confidence' : confidence === 'medium' ? 'Medium confidence' : confidence === 'low' ? 'General guidance' : null;
  return (
    <div
      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
        isUser
          ? 'ml-auto rounded-br-md bg-[#0A6640] text-white shadow-[0_2px_8px_rgba(10,102,64,0.2)]'
          : 'mr-auto rounded-bl-md border border-[#E2EEE8] bg-white text-[#052E1C]'
      }`}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      ) : (
        <>
          {confidenceLabel ? (
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
              {confidenceLabel}
            </p>
          ) : null}
          <ChatMessageBody content={content} variant="assistant" />
          {citations?.length > 0 ? (
            <div className="mt-3 border-t border-[#E2EEE8] pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">Sources</p>
              <ul className="mt-1 space-y-1">
                {citations.map((item, index) => (
                  <li key={`${item.source}-${index}`} className="text-[11px] text-[#4B6358]">
                    <span className="font-semibold">{item.source}</span>
                    {item.excerpt ? `: ${item.excerpt}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
