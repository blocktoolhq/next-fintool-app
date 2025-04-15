import { BaseMessage, GeneralChatRequest } from "@/utils/chat-api";
import { ChatMessage, IAssistantMessage, IUserMessage, isAssistantMessage, isUserMessage } from "@/utils/message";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { callGeneralChatApi } from "@/utils/chat-api";

function asMessage(id: string, m: Record<string, any>): IAssistantMessage {
  return {
    id,
    role: 'assistant',
    content: m?.content || '',
    metadata: {
      gptHistory: m?.gpt_history || {},
      thinking_steps: m?.thinking_steps || [],
    }
  }
}

type UseChatOptions = {
  id: string;               // conversation_id
  initialMessages?: ChatMessage[];
};

type UseChatHelpers = {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  error: undefined | Error;
  append: (userMessage: IUserMessage, keepLastNMessages?: number, useCaching?: boolean) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
};

export function useChat({ id, initialMessages }: UseChatOptions): UseChatHelpers {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<undefined | Error>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const append = useCallback(async (userMessage: IUserMessage, keepLastNMessages = 3, useCaching = false) => {

    const previousMessages = messagesRef.current;
    const withUserMessage = [...previousMessages, userMessage];

    // Set only the user message initially
    setMessages(withUserMessage);

    setLoading(true);
    setError(undefined);
    const roundId = nanoid();

    try {
      // Create basic message structure
      let requestMessages: BaseMessage[] = withUserMessage
        .map(m => {
          if (isUserMessage(m)) {
            return {
              content: m.content,
              role: m.role,
            };
          } else if (isAssistantMessage(m)) {
            return {
              content: m.content,
              role: 'assistant',
              metadata: {
                gpt_history: m.metadata.gptHistory,
              }
            };
          } else {
            console.log("Unknown message type: ", m);
            throw new Error(`Unknown message type: ${m}`);
          }
        });

      // Keep only the last N message exchanges
      requestMessages = requestMessages.slice(-(2 * keepLastNMessages + 1));

      const chatRequest: GeneralChatRequest = {
        messages: requestMessages,
        stream: true,
      };

      let assistantMessage: IAssistantMessage = {
        id: roundId,
        role: "assistant",
        content: '',
        metadata: {
          gptHistory: {},
          thinking_steps: [],
        }
      };

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const state = await callGeneralChatApi({
        request: chatRequest,
        headers: {
          'X-Conversation-ID': id,
          'X-Round-ID': roundId,
        },
        abortController: () => abortControllerRef.current!,
        onUpdate: (newState: Record<string, any>) => {
          const _newMessage = asMessage(roundId, newState);
          setMessages([
            ...withUserMessage,
            _newMessage,
          ]);
        },
      });

      assistantMessage = asMessage(roundId, state) as IAssistantMessage;

      const newMessages = [...withUserMessage, assistantMessage];
      setMessages(newMessages);

    } catch (err) {
      if ((err as any).name === 'AbortError') {
        abortControllerRef.current = null;
      } else {
        console.error('Error in chat:', err);
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setError(undefined);
  }, [id]);

  return {
    messages,
    setMessages,
    error,
    append,
    stop,
    isLoading,
  };
}