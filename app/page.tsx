'use client';

import { useChat } from "@/hooks/use-chat";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { nanoid } from "nanoid";
import { isAssistantMessage } from "@/utils/message";
import { StrongOrCitationBubble } from "@/components/strong-or-citation-bubble";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Send, StopCircle, ChevronDown, ChevronRight, Brain, Activity, Code, ChevronLeft } from "lucide-react";
import Image from "next/image";
import remarkGfm from "remark-gfm";
import Link from "next/link";

// Types and constants
interface StreamEvent {
  id: string;
  timestamp: number;
  type: 'request' | 'response_chunk' | 'error';
  data: any;
}

// Utility functions
const createStreamEvent = (type: StreamEvent['type'], data: any): StreamEvent => ({
  id: nanoid(),
  timestamp: Date.now(),
  type,
  data
});

const isLatestMessage = (messageId: string, messages: any[]) => 
  messageId === messages[messages.length - 1]?.id;

const isMessageComplete = (message: any, isLoading: boolean) => 
  !!message.metadata?.session_data || (!isLoading || !isLatestMessage(message.id, []));

// Shared styles
const styles = {
  thinkingAnimation: {
    backgroundImage: 'linear-gradient(to right, #9CA3AF 0%, #9CA3AF 40%, #111827 50%, #9CA3AF 60%, #9CA3AF 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    backgroundSize: '200% 100%',
    animation: 'slide 3s linear infinite',
  } as React.CSSProperties
};

// Collapsible thinking component
const ThinkingSteps = ({ thinking, isLatest, isComplete, hasContent }: { 
  thinking: string; 
  isLatest?: boolean; 
  isComplete?: boolean;
  hasContent?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const steps = thinking.split('\n').filter(Boolean);
  
  // Auto-expand latest message and collapse when content appears
  useEffect(() => {
    if (isLatest && thinking && !isComplete) {
      setIsExpanded(true);
      
      if (hasContent) {
        const timer = setTimeout(() => setIsExpanded(false), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isLatest, thinking, isComplete, hasContent]);
  
  if (!thinking) return null;

  const displayText = (isComplete || hasContent) ? 'Analysis complete' : 'Thinking..';
  const shouldAnimate = isLatest && !isComplete && !hasContent;

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full text-left"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <Brain className="w-5 h-5" />
        <span 
          className={`text-base ${shouldAnimate ? 'text-transparent' : ''}`}
          style={shouldAnimate ? styles.thinkingAnimation : {}}
        >
          {displayText}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 ml-5 space-y-1">
          {steps.map((step, i) => (
            <div
              key={`${step}-${i}`}
              className="text-sm text-gray-400 animate-[fadeSlideIn_0.3s_ease-out] opacity-0"
              style={{ 
                animationDelay: `${i * 0.05}s`,
                animationFillMode: 'forwards'
              }}
            >
              {step.trim()}
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        @keyframes slide {
          0% { background-position: 120% 50%; }
          100% { background-position: -20% 50%; }
        }
      `}</style>
    </div>
  );
};

// Action button component for chat input
const ActionButton = ({ isLoading, onStop, onSubmit, hasInput }: {
  isLoading: boolean;
  onStop: () => void;
  onSubmit: (e: React.FormEvent) => void;
  hasInput: boolean;
}) => {
  if (isLoading) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="default"
        onClick={onStop}
        className="text-gray-400 hover:text-gray-600 h-12 w-12 p-0"
      >
        <StopCircle className="w-10 h-10" />
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      disabled={!hasInput}
      variant="ghost"
      size="default"
      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:text-gray-300 h-12 w-12 p-0"
      onClick={onSubmit}
    >
      <Send className="w-10 h-10" />
    </Button>
  );
};

// Chat input component
const ChatInputComponent = ({ 
  input, 
  textareaRef, 
  handleInputChange, 
  handleKeyDown, 
  handleSubmit, 
  isLoading, 
  stop 
}: {
  input: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  stop: () => void;
}) => (
  <div className="flex flex-col gap-4 rounded-lg border bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] border-black/10 focus-within:border-gray-400 py-2 px-3 max-w-3xl w-full">
    <div className="w-full">
      <textarea
        ref={textareaRef}
        className="w-full resize-none border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0 focus:outline-none min-h-[24px] placeholder:text-sm md:placeholder:text-base"
        rows={1}
        placeholder="Ask anything..."
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        style={{ resize: 'none', overflow: 'hidden' }}
      />
    </div>
    <div className="flex justify-between items-center">
      <div className="flex gap-2 items-center">
        {/* Placeholder for future buttons */}
      </div>
      <div className="flex gap-2 items-center">
        <ActionButton 
          isLoading={isLoading}
          onStop={stop}
          onSubmit={handleSubmit}
          hasInput={input.trim().length > 0}
        />
      </div>
    </div>
  </div>
);

// User message component
const UserMessage = ({ content }: { content: string }) => (
  <div className="flex justify-end">
    <div className="bg-blue-50 rounded-lg p-4 max-w-3xl">
      <p className="text-gray-900">{content}</p>
    </div>
  </div>
);

// Assistant message component
const AssistantMessage = ({ 
  message, 
  isLatest, 
  isLoading 
}: { 
  message: any; 
  isLatest: boolean; 
  isLoading: boolean; 
}) => {
  const isComplete = isMessageComplete(message, isLoading) || !isLatest;
  const hasContent = !!message.content && message.content.trim().length > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-3xl w-full">
        {isAssistantMessage(message) && message.thinking && (
          <ThinkingSteps 
            thinking={message.thinking} 
            isLatest={isLatest} 
            isComplete={isComplete}
            hasContent={hasContent}
          />
        )}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              strong({ children, ...props }) {
                return <StrongOrCitationBubble {...props}>{children}</StrongOrCitationBubble>;
              },
              p: ({ children }) => <div className="mb-3">{children}</div>,
              ul: ({ children }) => <ul className="mb-3 pl-6">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 pl-6">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              h1: ({ children }) => <h1 className="text-xl font-bold mb-3">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
              table: ({ children }) => (
                <div className="overflow-x-auto mb-3">
                  <table className="min-w-full border border-gray-300">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children }) => (
                <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-bold text-left">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-2 py-1">{children}</td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// JSON Panel Component
const JsonPanel = ({ 
  showJsonPanel, 
  setShowJsonPanel, 
  streamEvents 
}: {
  showJsonPanel: boolean;
  setShowJsonPanel: (show: boolean) => void;
  streamEvents: StreamEvent[];
}) => {
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll JSON events
  useEffect(() => {
    if (showJsonPanel) {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamEvents, showJsonPanel]);

  return (
    <div className={`fixed right-0 top-0 h-full bg-gray-50 border-l border-gray-200 transition-all duration-300 ${
      showJsonPanel ? 'w-[32rem] translate-x-0' : 'w-0 translate-x-full'
    } overflow-hidden`}>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="font-medium">JSON Events</span>
              <span className="text-xs text-gray-500">({streamEvents.length})</span>
            </div>
            <Button 
              onClick={() => setShowJsonPanel(false)} 
              variant="ghost" 
              size="sm"
              className="p-1"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {streamEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Code className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No events yet. Send a message to see JSON.</p>
              </div>
            ) : (
              streamEvents.map((event) => (
                <div key={event.id} className="border rounded-lg bg-white">
                  <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 uppercase">
                      {event.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="overflow-x-auto overflow-y-auto max-h-80">
                      <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono whitespace-pre-wrap break-all">
{JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={eventsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Chat() {
  // Generate a unique conversation ID once when component mounts
  const conversationId = useMemo(() => nanoid(), []);
  
  const [input, setInput] = useState('');
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addStreamEvent = useCallback((type: StreamEvent['type'], data: any) => {
    setStreamEvents(prev => [...prev, createStreamEvent(type, data)]);
  }, []);

  const {
    error,
    isLoading,
    append,
    messages,
    setMessages,
    stop,
  } = useChat({
    id: conversationId,
    initialMessages: [],
    onStreamEvent: addStreamEvent,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    setInput('');

    await append({
      id: nanoid(),
      role: 'user',
      content: userInput,
      metadata: {}
    });

    // Scroll to bottom after submitting
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [input, isLoading, append]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const isActive = document.activeElement === textarea;
      let start = 0, end = 0;
      
      if (isActive) {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      }
      
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      
      if (isActive) {
        requestAnimationFrame(() => {
          textarea.setSelectionRange(start, end);
        });
      }
    }
  }, [input]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Fintool"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-xl font-semibold text-gray-900">Fintool API Demo</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setShowJsonPanel(!showJsonPanel)} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              {showJsonPanel ? 'Hide' : 'Show'} JSON
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Messages Container */}
        <div className={`flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 pb-28 transition-all duration-300 ${showJsonPanel ? 'mr-[32rem]' : ''}`}>
          <div className={`flex-1 flex flex-col ${messages.length === 0 ? 'justify-center' : 'justify-start py-8'}`}>
            {messages.length > 0 && (
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-6 py-4">
                    {messages.map(m => (
                      <div key={m.id}>
                        {m.role === 'user' ? (
                          <UserMessage content={m.content} />
                        ) : (
                          <AssistantMessage 
                            message={m}
                            isLatest={isLatestMessage(m.id, messages)}
                            isLoading={isLoading}
                          />
                        )}
                      </div>
                    ))}

                    {error && (
                      <div className="flex justify-start">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-3xl">
                          <p className="text-red-700 text-sm">An error occurred. Please try again.</p>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        {/* JSON Panel */}
        <JsonPanel 
          showJsonPanel={showJsonPanel}
          setShowJsonPanel={setShowJsonPanel}
          streamEvents={streamEvents}
        />
      </div>

      {/* Sticky Chat Input */}
      <div className={`fixed bottom-0 left-0 bg-white px-6 py-4 transition-all duration-300 ${
        showJsonPanel ? 'right-[32rem]' : 'right-0'
      }`}>
        <div className="max-w-4xl mx-auto w-full flex justify-center">
          <ChatInputComponent 
            input={input}
            textareaRef={textareaRef}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
          />
        </div>
      </div>
    </div>
  );
}
