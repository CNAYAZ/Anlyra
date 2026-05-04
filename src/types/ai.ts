export type ChatMessageDTO = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export type ConversationListItemDTO = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

export type ConversationDetailDTO = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageDTO[];
};

export type SendMessageResponse = {
  conversation: ConversationDetailDTO;
  creditsRemaining: number;
};

export type InsightDTO = {
  id: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  summary: string;
  content: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type GenerateInsightsResponse = {
  insights: InsightDTO[];
  creditsRemaining: number;
};
