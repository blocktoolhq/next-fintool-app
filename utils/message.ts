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
  metadata: {
    gptHistory: { [key: string]: string };
    thinking_steps: { title: string, content: string }[];
  }
}

export function isAssistantMessage(m: any): m is IAssistantMessage {
  return (m?.role === 'assistant') &&
    (m?.metadata?.gptHistory) &&
    (m?.metadata?.thinking_steps);
}


export type ChatMessage = IUserMessage | IAssistantMessage;
