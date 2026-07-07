import { describe, it, expect } from "vitest";
import { groupConversations, type MessageRow } from "./conversations";

const userId = "me";
const defaultName = "Jugador";

const row = (overrides: Partial<MessageRow>): MessageRow => ({
  id: "id",
  sender_id: "me",
  recipient_id: "peer-1",
  note_id: null,
  content: "hola",
  read: true,
  created_at: "2026-07-01T00:00:00Z",
  ...overrides,
});

describe("groupConversations", () => {
  it("devuelve un array vacío si no hay mensajes", () => {
    expect(groupConversations([], userId, new Map(), defaultName)).toEqual([]);
  });

  it("agrupa mensajes por el otro participante (peer), no por el usuario actual", () => {
    const list = [
      row({ id: "1", sender_id: "me", recipient_id: "peer-1" }),
      row({ id: "2", sender_id: "peer-1", recipient_id: "me" }),
    ];
    const result = groupConversations(list, userId, new Map(), defaultName);
    expect(result).toHaveLength(1);
    expect(result[0].peerId).toBe("peer-1");
  });

  it("usa el primer mensaje de la lista (más reciente si viene ordenada desc) como lastMessage/lastAt", () => {
    const list = [
      row({ id: "1", sender_id: "peer-1", recipient_id: "me", content: "el más nuevo", created_at: "2026-07-02T00:00:00Z" }),
      row({ id: "2", sender_id: "me", recipient_id: "peer-1", content: "el más viejo", created_at: "2026-07-01T00:00:00Z" }),
    ];
    const result = groupConversations(list, userId, new Map(), defaultName);
    expect(result[0].lastMessage).toBe("el más nuevo");
    expect(result[0].lastAt).toBe("2026-07-02T00:00:00Z");
  });

  it("cuenta como no leído solo lo que el usuario actual recibió y no leyó", () => {
    const list = [
      row({ id: "1", sender_id: "peer-1", recipient_id: "me", read: false }),
      row({ id: "2", sender_id: "peer-1", recipient_id: "me", read: false }),
      row({ id: "3", sender_id: "me", recipient_id: "peer-1", read: false }), // enviado por mí, no cuenta
    ];
    const result = groupConversations(list, userId, new Map(), defaultName);
    expect(result[0].unreadCount).toBe(2);
  });

  it("usa el nombre del mapa nameById si existe, si no el nombre por defecto", () => {
    const list = [row({ sender_id: "peer-1", recipient_id: "me" })];
    const withName = groupConversations(list, userId, new Map([["peer-1", "Ana"]]), defaultName);
    expect(withName[0].peerName).toBe("Ana");

    const withoutName = groupConversations(list, userId, new Map(), defaultName);
    expect(withoutName[0].peerName).toBe(defaultName);
  });

  it("separa correctamente varias conversaciones distintas", () => {
    const list = [
      row({ id: "1", sender_id: "peer-1", recipient_id: "me" }),
      row({ id: "2", sender_id: "peer-2", recipient_id: "me" }),
    ];
    const result = groupConversations(list, userId, new Map(), defaultName);
    expect(result.map(c => c.peerId).sort()).toEqual(["peer-1", "peer-2"]);
  });
});
