export interface IUserMessage {
  id: string;
  role: 'user';
  content: string;
  metadata: {};
}

export function isUserMessage(m: any): m is IUserMessage {
  return m?.role === 'user';
}

export interface IAssistantMessage {
  id: string;
  content: string;
  role: 'assistant';
  thinking?: string;
  metadata: {
    session_data?: string;
  };
}

export function isAssistantMessage(m: any): m is IAssistantMessage {
  return (m?.role === 'assistant') &&
    (typeof m?.content === 'string') &&
    (m?.metadata);
}

export type ChatMessage = IUserMessage | IAssistantMessage;
