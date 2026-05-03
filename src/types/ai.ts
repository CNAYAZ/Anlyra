import type { InsightPriority, InsightStatus, InsightType, MessageRole } from '@prisma/client';

export type ChatMessageDTO = {
  id: string;
  role: MessageRole;
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
  type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
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
