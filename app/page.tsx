'use client';

import { useChat } from "@/hooks/use-chat";
import { useState, useRef, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { isAssistantMessage } from "@/utils/message";
import { StrongOrCitationBubble } from "@/components/strong-or-citation-bubble";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Send, StopCircle, ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";

// Collapsible thinking component
const ThinkingSteps = ({ thinking, isLatest, isComplete }: { 
  thinking: string; 
  isLatest?: boolean; 
  isComplete?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [thinkingDuration, setThinkingDuration] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const steps = thinking.split('\n').filter(Boolean);
  const latestStep = steps[steps.length - 1]?.trim() || 'Thinking...';
  
  // Track thinking duration
  useEffect(() => {
    if (thinking && !startTime) {
      setStartTime(Date.now());
    }
    if (isComplete && startTime && !thinkingDuration) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      setThinkingDuration(duration);
    }
  }, [thinking, isComplete, startTime, thinkingDuration]);
  
  // Auto-expand latest message for 3 seconds
  useEffect(() => {
    if (isLatest && thinking && !isComplete) {
      setIsExpanded(true);
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLatest, thinking, isComplete]);
  
  if (!thinking) return null;

  // Show duration for completed messages
  if (isComplete && thinkingDuration) {
    return (
      <div className="mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full text-left"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
          <span className="text-lg">🧠</span>
          <span className="text-base">
            Thought for {thinkingDuration} second{thinkingDuration !== 1 ? 's' : ''}
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
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
        <span className="text-lg">🧠</span>
        <span className="truncate">{latestStep}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 ml-5 space-y-1">
          {steps.map((step, i) => (
            <div
              key={`${step}-${i}`}
              className="text-xs text-gray-400 animate-[fadeSlideIn_0.3s_ease-out] opacity-0"
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
    </div>
  );
};

// Move ChatInputComponent outside to prevent recreation on every render
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
  <div className="flex flex-col gap-4 rounded-lg border bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] border-black/10 focus-within:border-gray-400 py-2 px-3 max-w-2xl w-full">
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
        style={{
          resize: 'none',
          overflow: 'hidden',
        }}
      />
    </div>
    <div className="flex justify-between items-center">
      <div className="flex gap-2 items-center">
        {/* Placeholder for future buttons */}
      </div>
      <div className="flex gap-2 items-center">
        {isLoading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={stop}
            className="text-gray-400 hover:text-gray-600"
          >
            <StopCircle className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:text-gray-300"
            onClick={handleSubmit}
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  </div>
);

export default function Chat() {
  const conversationId = 'conversation-123';
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    error,
    isLoading,
    append,
    messages,
    stop,
  } = useChat({
    id: conversationId,
    initialMessages: [],
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await append({
      id: nanoid(),
      role: 'user',
      content: input,
      metadata: {}
    });

    setInput('');
  }, [input, isLoading, append]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // Auto-resize textarea with better focus handling
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && document.activeElement === textarea) {
      // Only resize if the textarea is currently focused
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      
      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start, end);
      });
    } else if (textarea) {
      // If not focused, just resize without selection handling
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [input]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Fintool"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xl font-semibold text-gray-900">Fintool</span>
        </div>
      </div>

      {/* Single consistent layout */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6">
        {/* Messages area - grows to fill available space */}
        <div className={`flex-1 flex flex-col ${messages.length === 0 ? 'justify-center' : 'justify-end py-16'}`}>
          {messages.length > 0 && (
            <div className="flex-1 overflow-hidden mb-8">
              <ScrollArea className="h-full">
                <div className="space-y-6 py-4">
                  {messages.map(m => (
                    <div key={m.id}>
                      {m.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="bg-blue-50 rounded-lg p-4 max-w-2xl">
                            <p className="text-gray-900">{m.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-start">
                          <div className="max-w-2xl">
                            {isAssistantMessage(m) && m.thinking && (
                              <ThinkingSteps 
                                thinking={m.thinking} 
                                isLatest={m.id === messages[messages.length - 1].id} 
                                isComplete={!isLoading || m.id !== messages[messages.length - 1].id} 
                              />
                            )}
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  strong({ children, ...props }) {
                                    return (
                                      <StrongOrCitationBubble {...props}>
                                        {children}
                                      </StrongOrCitationBubble>
                                    );
                                  },
                                }}
                              >
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="text-lg">🧠</span>
                          <span>Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex justify-start">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl">
                        <p className="text-red-700 text-sm">An error occurred. Please try again.</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Input always at the bottom of its container */}
          <div className="flex justify-center">
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
    </div>
  );
}
