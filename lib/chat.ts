export type AgentEvent =
    | { type: "tool_call"; turn: number; tool_use_id: string; name: string; input: Record<string, unknown> }
    | { type: "tool_result"; turn: number; tool_use_id: string; name: string; result: string; is_error: boolean }
    | { type: "final_answer"; text: string }
    | { type: "refusal"; category: string | null; explanation: string | null }
    | { type: "max_turns_exceeded"; text: string }
    | { type: "error"; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Hand-rolled SSE parsing over a plain fetch stream, not EventSource --
// EventSource can't send a POST body, and the whole point of this event
// format is carrying structured tool_call/tool_result events, not plain
// text tokens.
export async function streamChat(
    message: string,
    onEvent: (event: AgentEvent) => void,
    signal?: AbortSignal
): Promise<void> {
    const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal,
    });

    if (!res.ok || !res.body) {
        throw new Error(`Chat request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Chunk boundaries from the stream don't align with SSE event
        // boundaries (\n\n) -- buffer across reads and only parse
        // complete events.
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice("data:".length).trim();
            if (!json) continue;
            onEvent(JSON.parse(json) as AgentEvent);
        }
    }
}

export const TOOL_LABELS: Record<string, string> = {
    search_knowledge: "查詢政策知識庫",
    search_tours: "搜尋行程",
    get_tour_detail: "查詢行程詳情",
};
