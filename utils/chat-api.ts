import { z } from "zod";

export interface AssistantMessageMetadata {
  session_data: string;
}

export interface BaseMessage {
  role: string;
  content: string;
  metadata?: AssistantMessageMetadata;
}

export interface GeneralChatRequest {
  messages: Array<BaseMessage>;
  stream?: boolean;
}

// FinTool API Response Types
export interface FinToolMessage {
  role: 'assistant';
  thinking?: string;
  content: string;
  metadata?: {
    session_data: string;
  };
}

export interface FinToolAPIResponse {
  id: string;
  createdAt: string;
  type: 'message';
  message: FinToolMessage;
}

// SSE Event format
interface SSEEvent {
  event: string;
  data: string;
}

export interface StreamingChatResponse {
  thinking: string;
  content: string;
  metadata?: {
    session_data: string;
  };
}

function parseSSEEvent(line: string): SSEEvent | null {
  const eventMatch = line.match(/^event:\s*(.+)$/);
  const dataMatch = line.match(/^data:\s*(.+)$/);
  
  if (eventMatch) {
    return { event: eventMatch[1], data: '' };
  }
  if (dataMatch) {
    return { event: 'data', data: dataMatch[1] };
  }
  return null;
}

function parseFinToolAPIResponse(data: string): FinToolAPIResponse | null {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse FinTool API response:', e);
    return null;
  }
}

export async function callGeneralChatApi({
  request,
  headers = {},
  abortController,
  onUpdate,
  onComplete,
}: {
  request: GeneralChatRequest;
  headers?: HeadersInit;
  abortController: () => AbortController;
  onUpdate: (state: Partial<StreamingChatResponse>) => void;
  onComplete?: () => void;
}): Promise<StreamingChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      request,
      endpoint: 'v2/chat',
    }),
    signal: abortController().signal,
  });

  if (!response.ok) {
    const errStr = await response.text();
    throw new Error(errStr || 'Failed to fetch the chat response.');
  }

  if (request.stream !== false) {
    // Handle streaming response
    return await handleStreamingResponse(response, abortController, onUpdate, onComplete);
  } else {
    // Handle non-streaming response
    const data = await response.json();
    const parsedResponse = parseFinToolAPIResponse(JSON.stringify(data));
    if (!parsedResponse) {
      throw new Error('Invalid API response format');
    }
    
    const result: StreamingChatResponse = {
      thinking: parsedResponse.message.thinking || '',
      content: parsedResponse.message.content,
      metadata: parsedResponse.message.metadata,
    };
    
    onUpdate(result);
    onComplete?.();
    return result;
  }
}

async function handleStreamingResponse(
  response: Response,
  abortController: () => AbortController,
  onUpdate: (state: Partial<StreamingChatResponse>) => void,
  onComplete?: () => void
): Promise<StreamingChatResponse> {
  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let buffer = '';
  let currentState: StreamingChatResponse = {
    thinking: '',
    content: '',
  };
  let isComplete = false;

  try {
    while (!isComplete) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      let currentEvent = '';
      let currentData = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') {
          // Empty line signals end of event
          if (currentEvent === 'message' && currentData) {
            const parsedResponse = parseFinToolAPIResponse(currentData);
            if (parsedResponse) {
              currentState = {
                thinking: parsedResponse.message.thinking || currentState.thinking,
                content: parsedResponse.message.content || currentState.content,
                metadata: parsedResponse.message.metadata || currentState.metadata,
              };
              onUpdate(currentState);
              
              // Check if we received session_data - this indicates message completion
              if (parsedResponse.message.metadata?.session_data) {
                isComplete = true;
                onComplete?.();
                break;
              }
            }
          }
          currentEvent = '';
          currentData = '';
          continue;
        }
        
        const sseEvent = parseSSEEvent(trimmedLine);
        if (sseEvent) {
          if (sseEvent.event !== 'data') {
            currentEvent = sseEvent.event;
          } else {
            currentData = sseEvent.data;
          }
        }
      }
    }
    
    return currentState;
  } finally {
    reader.releaseLock();
  }
}