export interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  note_id: string | null;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  peerId: string;
  peerName: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}

// Agrupa mensajes por interlocutor. Asume `list` ordenada por created_at descendente,
// así el primer mensaje visto por peer es el más reciente (lastMessage/lastAt).
export function groupConversations(
  list: MessageRow[],
  userId: string,
  nameById: Map<string, string>,
  defaultPeerName: string
): Conversation[] {
  const grouped = new Map<string, Conversation>();
  for (const m of list) {
    const peerId = m.sender_id === userId ? m.recipient_id : m.sender_id;
    const isUnreadForMe = m.recipient_id === userId && !m.read;
    const existing = grouped.get(peerId);
    if (!existing) {
      grouped.set(peerId, {
        peerId,
        peerName: nameById.get(peerId) ?? defaultPeerName,
        lastMessage: m.content,
        lastAt: m.created_at,
        unreadCount: isUnreadForMe ? 1 : 0,
      });
    } else if (isUnreadForMe) {
      existing.unreadCount += 1;
    }
  }
  return Array.from(grouped.values());
}
