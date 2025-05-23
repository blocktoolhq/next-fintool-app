import { BaseMessage, GeneralChatRequest, StreamingChatResponse } from "@/utils/chat-api";
import { ChatMessage, IAssistantMessage, IUserMessage, isAssistantMessage, isUserMessage } from "@/utils/message";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { callGeneralChatApi } from "@/utils/chat-api";

// Utility functions to reduce redundancy
function transformChatMessageToBaseMessage(message: ChatMessage): BaseMessage {
  if (isUserMessage(message)) {
    return {
      content: message.content,
      role: message.role,
    };
  } else if (isAssistantMessage(message)) {
    return {
      content: message.content,
      role: 'assistant',
      metadata: {
        session_data: message.metadata.session_data || '',
      }
    };
  } else {
    throw new Error(`Unknown message type: ${JSON.stringify(message)}`);
  }
}

function transformStreamingResponseToAssistantMessage(id: string, response: StreamingChatResponse): IAssistantMessage {
  return {
    id,
    role: 'assistant',
    content: response.content || '',
    thinking: response.thinking || '',
    metadata: {
      session_data: response.metadata?.session_data || '',
    }
  };
}

function createEmptyAssistantMessage(id: string): IAssistantMessage {
  return {
    id,
    role: "assistant",
    content: '',
    thinking: '',
    metadata: {
      session_data: '',
    }
  };
}

function trimMessagesToLastExchanges(messages: BaseMessage[], keepLastNMessages: number): BaseMessage[] {
  return messages.slice(-(2 * keepLastNMessages + 1));
}

function createRequestBody(requestMessages: BaseMessage[]) {
  return {
    request: {
      messages: requestMessages,
      stream: true,
    },
    endpoint: 'v2/chat',
  };
}

function isAbortError(error: any): boolean {
  return error?.name === 'AbortError';
}

type UseChatOptions = {
  id: string;               // conversation_id
  initialMessages?: ChatMessage[];
  onStreamEvent?: (type: 'request' | 'response_chunk' | 'error', data: any) => void;
};

type UseChatHelpers = {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  error: undefined | Error;
  append: (userMessage: IUserMessage, keepLastNMessages?: number, useCaching?: boolean) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
};

export function useChat({ id, initialMessages, onStreamEvent }: UseChatOptions): UseChatHelpers {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<undefined | Error>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep messages ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Clean up error when conversation changes
  useEffect(() => {
    setError(undefined);
  }, [id]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const append = useCallback(async (userMessage: IUserMessage, keepLastNMessages = 3, useCaching = false) => {
    const previousMessages = messagesRef.current;
    const withUserMessage = [...previousMessages, userMessage];
    const roundId = nanoid();

    // Set user message immediately
    setMessages(withUserMessage);
    setLoading(true);
    setError(undefined);

    try {
      // Transform messages for API request
      const requestMessages = trimMessagesToLastExchanges(
        withUserMessage.map(transformChatMessageToBaseMessage),
        keepLastNMessages
      );

      // Log the request for debugging
      const actualRequestBody = createRequestBody(requestMessages);
      onStreamEvent?.('request', {
        url: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: actualRequestBody
      });

      // Create abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Call API with streaming
      const state = await callGeneralChatApi({
        request: {
          messages: requestMessages,
          stream: true,
        },
        headers: {},
        abortController: () => abortControllerRef.current!,
        onUpdate: (newState: Partial<StreamingChatResponse>) => {
          const updatedMessage = transformStreamingResponseToAssistantMessage(roundId, {
            thinking: newState.thinking || '',
            content: newState.content || '',
            metadata: newState.metadata,
          });
          setMessages([...withUserMessage, updatedMessage]);
        },
        onRawSSE: (rawLines: string) => {
          onStreamEvent?.('response_chunk', rawLines);
        },
        onComplete: () => {
          setLoading(false);
        },
      });

      // Set final message state
      const finalMessage = transformStreamingResponseToAssistantMessage(roundId, state);
      setMessages([...withUserMessage, finalMessage]);

    } catch (err) {
      if (isAbortError(err)) {
        abortControllerRef.current = null;
      } else {
        console.error('Error in chat:', err);
        onStreamEvent?.('error', err);
        setError(err as Error);
      }
      setLoading(false);
    }
  }, [id, onStreamEvent]);

  return {
    messages,
    setMessages,
    error,
    append,
    stop,
    isLoading,
  };
}