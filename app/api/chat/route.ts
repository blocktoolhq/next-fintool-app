import { doRequest } from "@/utils/fintool-api";

export const maxDuration = 300;
export const runtime = "edge";

async function createChatStream(headers: Record<string, string>, endpoint: string, body: any, controller: AbortController): Promise<ReadableStream<any>> {
  const response = await doRequest({
    body: JSON.stringify(body),
    method: 'POST',
    path: endpoint,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  });

  if (!response.ok) {
    const errStr = await response.text();
    throw new Error(errStr || 'Failed to fetch the chat response.');
  }

  // For streaming responses, pass through the SSE stream directly
  if (body.stream !== false && response.body) {
    return response.body;
  }

  // For non-streaming responses, convert to stream
  const data = await response.json();
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    start(controller) {
      const jsonData = JSON.stringify(data);
      controller.enqueue(encoder.encode(jsonData));
      controller.close();
    }
  });
}

export async function POST(req: Request): Promise<Response> {
  const { request, endpoint } = await req.json();

  // Prepare payload for the backend - pass through the exact format expected by FinTool API
  const backendPayload = {
    messages: request.messages,
    stream: request.stream !== false, // Default to true for streaming
  };

  const headersObject: Record<string, string> = {};

  // Get conversation headers from the request
  const requestHeaders = new Headers(req.headers);
  for (const key of ['X-Conversation-ID', 'X-Round-ID']) {
    const value = requestHeaders.get(key);
    if (value) {
      headersObject[key] = value;
    }
  }

  const controller = new AbortController();

  // Handle request abort
  req.signal.addEventListener('abort', () => {
    controller.abort();
  });

  try {
    const stream = await createChatStream(headersObject, endpoint, backendPayload, controller);
    
    // Return appropriate headers for SSE
    return new Response(stream, {
      headers: {
        'Content-Type': backendPayload.stream ? 'text/plain; charset=utf-8' : 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...(backendPayload.stream && {
          'Transfer-Encoding': 'chunked'
        })
      }
    });
  } catch (e) {
    console.error(e);
    return new Response('Failed to fetch the chat response.', { status: 500 });
  }
}
