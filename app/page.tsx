"use client";

import { Loader2, Paperclip, Send, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Markdown } from "@/components/chat/markdown";
import { SourceCitations } from "@/components/chat/source-citations";
import { ToolStepTimeline } from "@/components/chat/tool-step-timeline";
import type { ConversationTurn } from "@/components/chat/tool-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
    MODEL_LABELS,
    streamChat,
    uploadDocument,
    type AgentEvent,
    type AgentImpl,
    type HistoryMessage,
    type UploadedDocument,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES = ".pdf,.docx,.jpg,.jpeg,.png";

const IMPL_LABELS: Record<AgentImpl, string> = {
    handrolled: "手刻版",
    langchain: "LangChain 版",
};

const SUGGESTIONS = [
    "找適合長輩、預算兩萬內的行程,第一個那團的詳細行程是什麼?",
    "退訂政策是什麼?另外我想知道去峇里島要辦簽證嗎?",
    "我想找峇里島的蜜月行程,另外峇里島簽證要辦嗎?",
];

// Pure: returns a new array, never mutates `prev` or any turn inside it.
// React (Strict Mode, in dev) double-invokes state updaters to catch
// impure ones -- an earlier version mutated `last` in place, which meant
// the throwaway first invocation's mutation was still visible to the
// second, real invocation, so every step got appended twice.
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
                        model: event.model,
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
            updated = { ...last, text: event.text, pending: false, answerModel: event.model, sources: event.sources };
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

function ConversationList({ turns }: { turns: ConversationTurn[] }) {
    return (
        <div className="flex flex-col gap-4">
            {turns.map((turn, i) =>
                turn.role === "user" ? (
                    <div
                        key={i}
                        className="ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground"
                    >
                        {turn.text}
                    </div>
                ) : (
                    <div key={i} className="max-w-[90%] rounded-2xl border bg-card px-4 py-3">
                        {turn.steps && turn.steps.length > 0 && <ToolStepTimeline steps={turn.steps} />}
                        {turn.text ? (
                            <>
                                {turn.answerModel && (
                                    <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                                        {MODEL_LABELS[turn.answerModel] ?? turn.answerModel} 撰寫最終回答
                                    </div>
                                )}
                                <Markdown>{turn.text}</Markdown>
                                {turn.sources && <SourceCitations sources={turn.sources} />}
                            </>
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
    );
}

export default function Home() {
    const [handrolledTurns, setHandrolledTurns] = useState<ConversationTurn[]>([]);
    const [langchainTurns, setLangchainTurns] = useState<ConversationTurn[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [impl, setImpl] = useState<AgentImpl>("handrolled");
    const [compareMode, setCompareMode] = useState(false);
    const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        });
    };

    async function handleFileSelect(file: File) {
        setIsUploading(true);
        setUploadError(null);
        try {
            const doc = await uploadDocument(file);
            setUploadedDoc(doc);
        } catch (e) {
            setUploadError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsUploading(false);
        }
    }

    // The backend keeps no session -- conversational continuity only
    // exists if we resend prior turns ourselves. Only settled turns with
    // final text qualify (a still-pending or mid-stream turn has none).
    function buildHistory(turns: ConversationTurn[]): HistoryMessage[] {
        return turns
            .filter((t): t is ConversationTurn & { text: string } => !!t.text)
            .map((t) => ({ role: t.role, text: t.text }));
    }

    function runOne(
        message: string,
        whichImpl: AgentImpl,
        priorTurns: ConversationTurn[],
        setTurns: typeof setHandrolledTurns
    ) {
        const history = buildHistory(priorTurns);

        setTurns((prev) => [
            ...prev,
            { role: "user", text: message },
            { role: "assistant", steps: [], pending: true, impl: whichImpl },
        ]);

        return streamChat(message, whichImpl, uploadedDoc?.document_id ?? null, history, (event) => {
            setTurns((prev) => updateLastAssistantTurn(prev, event));
            scrollToBottom();
        }).catch((e) => {
            const errText = e instanceof Error ? e.message : String(e);
            setTurns((prev) => updateLastAssistantTurn(prev, { type: "error", message: errText }));
        });
    }

    async function send(message: string) {
        if (!message.trim() || isStreaming) return;
        setInput("");
        setIsStreaming(true);
        scrollToBottom();

        // In compare mode, one question fires to both implementations at
        // once -- that's the whole point (seeing the difference without
        // having to re-ask). Otherwise it goes to whichever impl is
        // selected. Each track replays its own turn history, not the
        // other implementation's -- they're independent conversations
        // that happen to share the same questions.
        const tasks: Promise<void>[] = [];
        if (compareMode || impl === "handrolled") {
            tasks.push(runOne(message, "handrolled", handrolledTurns, setHandrolledTurns));
        }
        if (compareMode || impl === "langchain") {
            tasks.push(runOne(message, "langchain", langchainTurns, setLangchainTurns));
        }

        try {
            await Promise.all(tasks);
        } finally {
            setIsStreaming(false);
        }
    }

    const hasStarted = handrolledTurns.length > 0 || langchainTurns.length > 0;

    return (
        <div className={cn("mx-auto flex h-dvh w-full flex-col px-4", compareMode ? "max-w-6xl" : "max-w-3xl")}>
            <header className="flex flex-col gap-3 border-b py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-lg font-semibold">Agentic RAG 旅遊助理</h1>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                        <Link href="/eval" className="underline-offset-4 hover:underline">
                            RAG 檢索評估 →
                        </Link>
                        <Link href="/data" className="underline-offset-4 hover:underline">
                            查看資料庫原始資料 →
                        </Link>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    模型自主判斷該查政策知識庫還是行程資料庫,過程即時可見。
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className={cn("flex flex-1 gap-1 rounded-lg border p-1 text-sm", compareMode && "opacity-50")}>
                        {(Object.keys(IMPL_LABELS) as AgentImpl[]).map((key) => (
                            <button
                                key={key}
                                onClick={() => setImpl(key)}
                                disabled={compareMode}
                                className={cn(
                                    "flex-1 rounded-md px-3 py-1.5 transition-colors",
                                    !compareMode && impl === key
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-accent"
                                )}
                            >
                                {IMPL_LABELS[key]}
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch checked={compareMode} onCheckedChange={setCompareMode} />
                        同時比較兩版(雙倍 API 用量)
                    </label>
                </div>

                {uploadedDoc && (
                    <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">
                            {uploadedDoc.filename}({uploadedDoc.chunk_count} 個片段)-- 模式 B 已啟用,可以詢問文件內容
                        </span>
                        <button
                            onClick={() => setUploadedDoc(null)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="移除文件"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
                {uploadError && <div className="text-sm text-destructive">上傳失敗:{uploadError}</div>}
            </header>

            <ScrollArea className="flex-1 py-4">
                {!hasStarted && (
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

                {compareMode ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                        <div>
                            <div className="mb-2 text-xs font-semibold text-muted-foreground">手刻版</div>
                            <ConversationList turns={handrolledTurns} />
                        </div>
                        <div>
                            <div className="mb-2 text-xs font-semibold text-muted-foreground">LangChain 版</div>
                            <ConversationList turns={langchainTurns} />
                        </div>
                    </div>
                ) : (
                    <ConversationList turns={impl === "handrolled" ? handrolledTurns : langchainTurns} />
                )}
                <div ref={scrollRef} />
            </ScrollArea>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                }}
                className="flex gap-2 border-t py-4"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                        e.target.value = "";
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading || isStreaming}
                    onClick={() => fileInputRef.current?.click()}
                    title="上傳文件(PDF/Word/圖片)-- 模式 B"
                >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
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
