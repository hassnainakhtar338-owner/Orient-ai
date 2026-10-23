import { blink } from '@/lib/blink';
import type { OrientChatMessagesRow, OrientChatsRow } from '@/lib/db-types';

export type OrientChat = Pick<OrientChatsRow, 'id' | 'title' | 'mode' | 'updatedAt'>;
export type StoredMessage = Pick<OrientChatMessagesRow, 'id' | 'role' | 'content' | 'imageUrl' | 'generatedUrl' | 'fileName' | 'createdAt'>;

const chats = blink.db.table<OrientChatsRow>('orient_chats');
const chatMessages = blink.db.table<OrientChatMessagesRow>('orient_chat_messages');

export async function listChats(userId: string): Promise<OrientChat[]> {
  return chats.list({ where: { userId }, orderBy: { updatedAt: 'desc' }, limit: 100 });
}

export async function createChat(userId: string, title: string, mode: 'chat' | 'image'): Promise<OrientChat> {
  const now = new Date().toISOString();
  const row = await chats.create({ userId, title: title.slice(0, 72) || 'New conversation', mode, createdAt: now, updatedAt: now });
  return { id: row.id, title: row.title, mode: row.mode, updatedAt: row.updatedAt };
}

export async function loadChatMessages(userId: string, chatId: string): Promise<StoredMessage[]> {
  return chatMessages.list({ where: { userId, chatId }, orderBy: { createdAt: 'asc' }, limit: 500 });
}

export async function saveChatMessage(userId: string, chatId: string, message: Omit<StoredMessage, 'id' | 'createdAt'>, mode: 'chat' | 'image'): Promise<void> {
  const now = new Date().toISOString();
  await chatMessages.create({ userId, chatId, role: message.role, content: message.content, imageUrl: message.imageUrl, generatedUrl: message.generatedUrl, fileName: message.fileName, createdAt: now });
  await chats.update(chatId, { updatedAt: now, mode });
}
