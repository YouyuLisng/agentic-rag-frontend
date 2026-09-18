export interface ToolStep {
    turn: number;
    toolUseId: string;
    name: string;
    input: Record<string, unknown>;
    status: "running" | "done" | "error";
    result?: string;
}

export interface ConversationTurn {
    role: "user" | "assistant";
    text?: string;
    steps?: ToolStep[];
    pending?: boolean;
    impl?: "handrolled" | "langchain";
}
