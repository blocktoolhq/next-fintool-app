import { StateDelta, applyOperation } from "@/utils/state";
import { Stream } from "@/utils/streaming";
import { z } from "zod";

export interface AssistantMessageMetadata {
  gpt_history: { [key: string]: string; };
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

type AssistantMessage = {
  mode: 'chat';
  content: string;
  gpt_history: { [key: string]: string };
  thinking_steps?: { title: string, content: string | null; search_content: { query: string, status: string }[] | null; status: string; }[];
}

function isAssistantMessage(m: any): m is AssistantMessage {
  return z.object({
    mode: z.literal('chat'),
    content: z.string(),
    thinking_steps: z.array(z.object({
      title: z.string(),
      content: z.string().nullable(),
      search_content: z.array(z.object({
        query: z.string(),
        status: z.string(),
      })).nullable(),
      status: z.string(),
    })).optional(),
    gpt_history: z.record(z.string()),
  }).safeParse(m).success;
}

async function callApi({
  body,
  headers,
  abortController,
  onUpdate,
}: {
  body: string,
  headers?: HeadersInit;
  abortController: () => AbortController;
  onUpdate: (state: Partial<Record<string, any>>) => void;
}): Promise<Record<string, any>> {
  let state: Record<string, any> = {};
  let receivedDone = false;

  const makeRequest = async (): Promise<Record<string, any>> => {
    const response = await fetch('/api/chat', {
      body,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: abortController().signal,
    });

    if (!response.ok) {
      const errStr = await response.text()
      throw new Error(
        errStr || 'Failed to fetch the chat response.',
      );
    }

    receivedDone = false;
    const stream = Stream.fromSSEResponse(response, abortController());
    for await (const chunk of stream) {
      if (chunk.type === 'state_delta') {
        const delta: StateDelta = chunk.data;
        state = applyOperation(state, delta, []);
        onUpdate(state);
      } else if (chunk.type === 'error') {
        if (typeof chunk.data === 'object' && 'status' in chunk.data && 'message' in chunk.data) {
          if (chunk.data.status === 'Completed') {
            receivedDone = true;
          } else if (chunk.data.status !== 'Cancelled') {
            throw new Error(chunk.data.message);
          }
        } else {
          abortController().abort();
          throw new Error(chunk.data);
        }
      }
    }

    return state;
  };

  return makeRequest();
}

export async function callGeneralChatApi({
  request,
  headers,
  abortController,
  onUpdate,
}: {
  request: GeneralChatRequest,
  headers?: HeadersInit;
  abortController: () => AbortController;
  onUpdate: (state: Partial<AssistantMessage>) => void;
}): Promise<AssistantMessage> {
  const state = await callApi({
    body: JSON.stringify({
      request,
      endpoint: 'v1/chat',
    }),
    headers,
    abortController,
    onUpdate,
  });

  if (
    isAssistantMessage(state)
  ) {
    return state;
  } else {
    console.error("Invalid assistant message:", state);
    throw new Error('Invalid assistant message');
  }
}