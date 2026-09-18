"use client";

import { Loader2, Send } from "lucide-react";
import { useRef, useState } from "react";

import { Markdown } from "@/components/chat/markdown";
import { ToolStepTimeline } from "@/components/chat/tool-step-timeline";
import type { ConversationTurn } from "@/components/chat/tool-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { streamChat, type AgentEvent } from "@/lib/chat";

const SUGGESTIONS = [
    "找適合長輩、預算兩萬內的行程,第一個那團的詳細行程是什麼?",
    "退訂政策是什麼?另外我想知道去峇里島要辦簽證嗎?",
    "我想找峇里島的蜜月行程,另外峇里島簽證要辦嗎?",
];

// Pure: returns a new array, never mutates `prev` or any turn inside it.
function updateLastAssistantTurn(prev: ConversationTurn[], event: AgentEvent): ConversationTurn[] {
    const lastIdx = prev.length - 1;
    const last = prev[lastIdx];
    if (!last || last.role !== "assistant") return prev;

    let updated: ConversationTurn;
    switch (event.type) {
        case "tool_call":
            updated = {
                ...last,
                steps: [
                    ...(last.steps ?? []),
                    {
                        turn: event.turn,
                        toolUseId: event.tool_use_id,
                        name: event.name,
                        input: event.input,
                        status: "running",
                    },
                ],
            };
            break;
        case "tool_result":
            updated = {
                ...last,
                steps: (last.steps ?? []).map((s) =>
                    s.toolUseId === event.tool_use_id
                        ? { ...s, status: event.is_error ? "error" : "done", result: event.result }
                        : s
                ),
            };
            break;
        case "final_answer":
            updated = { ...last, text: event.text, pending: false };
            break;
        case "refusal":
            updated = { ...last, text: `很抱歉,這個問題我無法回答。${event.explanation ?? ""}`, pending: false };
            break;
        case "max_turns_exceeded":
            updated = { ...last, text: event.text, pending: false };
            break;
        case "error":
            updated = { ...last, text: `發生錯誤:${event.message}`, pending: false };
            break;
    }

    const next = [...prev];
    next[lastIdx] = updated;
    return next;
}

export default function Home() {
    const [turns, setTurns] = useState<ConversationTurn[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        });
    };

    async function send(message: string) {
        if (!message.trim() || isStreaming) return;

        setTurns((prev) => [
            ...prev,
            { role: "user", text: message },
            { role: "assistant", steps: [], pending: true },
        ]);
        setInput("");
        setIsStreaming(true);
        scrollToBottom();

        try {
            await streamChat(message, (event) => {
                // Must be a pure function of prev -- React (Strict Mode, in
                // dev) double-invokes state updaters to catch impure ones.
                // An earlier version mutated `last` in place, which meant
                // the throwaway first invocation's mutation was still
                // visible to the second, real invocation -- every step got
                // appended twice. Always derive a new object instead.
                setTurns((prev) => updateLastAssistantTurn(prev, event));
                scrollToBottom();
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setTurns((prev) => updateLastAssistantTurn(prev, { type: "error", message }));
        } finally {
            setIsStreaming(false);
        }
    }

    return (
        <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4">
            <header className="flex flex-col gap-1 border-b py-4">
                <h1 className="text-lg font-semibold">Agentic RAG 旅遊助理</h1>
                <p className="text-sm text-muted-foreground">
                    手刻多步 agentic loop -- 模型自主判斷該查政策知識庫還是行程資料庫,過程即時可見。
                </p>
            </header>

            <ScrollArea className="flex-1 py-4">
                {turns.length === 0 && (
                    <div className="flex flex-col gap-2 pt-8">
                        <p className="text-sm text-muted-foreground">試試看:</p>
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => send(s)}
                                className="rounded-lg border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    {turns.map((turn, i) =>
                        turn.role === "user" ? (
                            <div key={i} className="ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                                {turn.text}
                            </div>
                        ) : (
                            <div key={i} className="max-w-[90%] rounded-2xl border bg-card px-4 py-3">
                                {turn.steps && turn.steps.length > 0 && <ToolStepTimeline steps={turn.steps} />}
                                {turn.text ? (
                                    <Markdown>{turn.text}</Markdown>
                                ) : (
                                    turn.pending && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            思考中...
                                        </div>
                                    )
                                )}
                            </div>
                        )
                    )}
                </div>
                <div ref={scrollRef} />
            </ScrollArea>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                }}
                className="flex gap-2 border-t py-4"
            >
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="輸入問題..."
                    disabled={isStreaming}
                />
                <Button type="submit" disabled={isStreaming || !input.trim()}>
                    {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        </div>
    );
}
