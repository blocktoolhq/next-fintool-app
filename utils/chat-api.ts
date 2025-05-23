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

// Utility functions to reduce redundancy
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

// Centralized error handling
function handleAPIError(response: Response): Promise<never> {
  return response.text().then(errStr => {
    throw new Error(errStr || 'Failed to fetch the chat response.');
  });
}

// Centralized response processing
function processAPIResponse(parsedResponse: FinToolAPIResponse): StreamingChatResponse {
  return {
    thinking: parsedResponse.message.thinking || '',
    content: parsedResponse.message.content,
    metadata: parsedResponse.message.metadata,
  };
}

// Centralized fetch configuration
function createFetchConfig(request: GeneralChatRequest, headers: HeadersInit, signal: AbortSignal) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      request,
      endpoint: 'v2/chat',
    }),
    signal,
  };
}

export async function callGeneralChatApi({
  request,
  headers = {},
  abortController,
  onUpdate,
  onComplete,
  onRawUpdate,
  onRawSSE,
}: {
  request: GeneralChatRequest;
  headers?: HeadersInit;
  abortController: () => AbortController;
  onUpdate: (state: Partial<StreamingChatResponse>) => void;
  onComplete?: () => void;
  onRawUpdate?: (rawData: string) => void;
  onRawSSE?: (rawLines: string) => void;
}): Promise<StreamingChatResponse> {
  const controller = abortController();
  const response = await fetch('/api/chat', createFetchConfig(request, headers, controller.signal));

  if (!response.ok) {
    return handleAPIError(response);
  }

  if (request.stream !== false) {
    return await handleStreamingResponse(response, abortController, onUpdate, onComplete, onRawUpdate, onRawSSE);
  } else {
    const data = await response.json();
    const parsedResponse = parseFinToolAPIResponse(JSON.stringify(data));
    if (!parsedResponse) {
      throw new Error('Invalid API response format');
    }
    
    const result = processAPIResponse(parsedResponse);
    onUpdate(result);
    onComplete?.();
    return result;
  }
}

async function handleStreamingResponse(
  response: Response,
  abortController: () => AbortController,
  onUpdate: (state: Partial<StreamingChatResponse>) => void,
  onComplete?: () => void,
  onRawUpdate?: (rawData: string) => void,
  onRawSSE?: (rawLines: string) => void
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

  const processEvent = (currentData: string, sseLines: string[]) => {
    onRawSSE?.(sseLines.join('\n'));
    onRawUpdate?.(currentData);
    
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
        return true;
      }
    }
    return false;
  };

  try {
    while (!isComplete) {
      const { done, value } = await reader.read();
      
      if (done) {
        isComplete = true;
        onComplete?.();
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      let currentEvent = '';
      let currentData = '';
      let sseLines: string[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') {
          // Empty line signals end of event
          if (currentEvent === 'message' && currentData) {
            if (processEvent(currentData, sseLines)) {
              break;
            }
          }
          currentEvent = '';
          currentData = '';
          sseLines = [];
          continue;
        }
        
        // Collect raw SSE lines
        sseLines.push(trimmedLine);
        
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