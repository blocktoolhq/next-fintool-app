'use client';

import { useChat } from "@/hooks/use-chat";
import { useState } from "react";
import { nanoid } from "nanoid";
import { isAssistantMessage } from "@/utils/message";
import { StrongOrCitationBubble } from "@/components/strong-or-citation-bubble";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const conversationId = 'conversation-123';
  const [input, setInput] = useState('');
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

  // Find the last assistant message to display thinking steps
  const lastAssistantMessage = messages.length > 0
    ? messages[messages.length - 1]
    : null;

  const showThinkingSteps = isLoading && lastAssistantMessage && isAssistantMessage(lastAssistantMessage);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await append({
      id: nanoid(),
      role: 'user',
      content: input,
      metadata: {}
    });

    setInput('');
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(m => (
        <div key={m.id} className="whitespace-pre-wrap mb-4">
          {m.role === 'user' ? (
            <>
              <div className="font-medium">User:</div>
              <div className="mb-4">{m.content}</div>
            </>
          ) : (
            <>
              <div className="font-medium">AI:</div>
              {isAssistantMessage(m) && m.metadata.thinking_steps.length > 0 && (
                <div className="space-y-2 my-2 bg-gray-50 p-3 rounded-md">
                  <div className="font-medium text-sm text-gray-700">Thinking steps:</div>
                  {m.metadata.thinking_steps.map((step, index) => (
                    <div key={index} className="pl-3 border-l-2 border-gray-300">
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-sm text-gray-600">{step.content}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap">
                <ReactMarkdown
                  components={{
                    strong({ children, ...props }) {
                      return (
                        <StrongOrCitationBubble
                          {...props}
                        >
                          {children}
                        </StrongOrCitationBubble>
                      );
                    },
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="mt-4 text-gray-500">
          <div>Loading...</div>
          <button
            type="button"
            className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
            onClick={stop}
          >
            Stop
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <div className="text-red-500">An error occurred.</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
