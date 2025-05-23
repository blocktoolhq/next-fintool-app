'use client';

import { useChat } from "@/hooks/use-chat";
import { useState, useRef, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { isAssistantMessage } from "@/utils/message";
import { StrongOrCitationBubble } from "@/components/strong-or-citation-bubble";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Send, StopCircle, ChevronDown, ChevronRight, Brain } from "lucide-react";
import Image from "next/image";
import remarkGfm from "remark-gfm";

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
      
      // Only collapse when content starts showing up
      if (hasContent) {
        const timer = setTimeout(() => {
          setIsExpanded(false);
        }, 1000); // Brief delay to let user see content starting
        return () => clearTimeout(timer);
      }
    }
  }, [isLatest, thinking, isComplete, hasContent]);
  
  if (!thinking) return null;

  // Determine the display text based on state
  const displayText = (isComplete || hasContent) ? 'Analysis complete' : 'Thinking..';

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
        <Brain className="w-5 h-5" />
        <span className="text-base">
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
            size="default"
            onClick={stop}
            className="text-gray-400 hover:text-gray-600 h-12 w-12 p-0"
          >
            <StopCircle className="w-10 h-10" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            variant="ghost"
            size="default"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:text-gray-300 h-12 w-12 p-0"
            onClick={handleSubmit}
          >
            <Send className="w-10 h-10" />
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

      {/* Messages Container - takes remaining space above sticky chatbar */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 pb-28">
        <div className={`flex-1 flex flex-col ${messages.length === 0 ? 'justify-center' : 'justify-start py-8'}`}>
          {messages.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 py-4">
                  {messages.map(m => (
                    <div key={m.id}>
                      {m.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="bg-blue-50 rounded-lg p-4 max-w-3xl">
                            <p className="text-gray-900">{m.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-start">
                          <div className="max-w-3xl w-full">
                            {isAssistantMessage(m) && m.thinking && (
                              <ThinkingSteps 
                                thinking={m.thinking} 
                                isLatest={m.id === messages[messages.length - 1].id} 
                                isComplete={!!m.metadata.session_data || (!isLoading || m.id !== messages[messages.length - 1].id)}
                                hasContent={!!m.content && m.content.trim().length > 0}
                              />
                            )}
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  strong({ children, ...props }) {
                                    return (
                                      <StrongOrCitationBubble {...props}>
                                        {children}
                                      </StrongOrCitationBubble>
                                    );
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
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
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
                  
                  {/* Scroll target */}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Chat Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-6 py-4">
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
