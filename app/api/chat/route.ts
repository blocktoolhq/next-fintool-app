import { Stream } from "openai/streaming";
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

  const stream = Stream.fromSSEResponse(response, controller);
  return stream.toReadableStream();
}

export async function POST(req: Request): Promise<Response> {
  const { request, endpoint } = await req.json();

  // Prepare payload for the backend
  const { use_sharepoint, ...restOfRequest } = request;
  const backendPayload = {
    ...restOfRequest,
    ...(use_sharepoint !== undefined && { use_kendra: use_sharepoint }),
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
    return new Response(stream);
  } catch (e) {
    console.error(e);
    return new Response('Failed to fetch the chat response.', { status: 500 });
  }
}
