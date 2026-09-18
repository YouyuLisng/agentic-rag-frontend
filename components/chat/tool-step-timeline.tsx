"use client";

import { BookOpen, CalendarCheck, CheckCircle2, Compass, FileText, Loader2, XCircle } from "lucide-react";

import { MODEL_LABELS, TOOL_LABELS } from "@/lib/chat";
import { cn } from "@/lib/utils";

import type { ToolStep } from "./tool-step";

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    search_knowledge: BookOpen,
    search_tours: Compass,
    get_tour_detail: FileText,
    check_availability: CalendarCheck,
};

function formatInput(input: Record<string, unknown>): string {
    const entries = Object.entries(input).filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (entries.length === 0) return "";
    return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

// The decision-visualization payoff of the whole project -- this is what
// makes "the model autonomously chose to call these tools, in this order"
// something a viewer actually *sees* happening, not just text they have
// to trust.
export function ToolStepTimeline({ steps }: { steps: ToolStep[] }) {
    if (steps.length === 0) return null;

    return (
        <ol className="mb-3 flex flex-col gap-2">
            {steps.map((step) => {
                const Icon = TOOL_ICONS[step.name] ?? Compass;
                const label = TOOL_LABELS[step.name] ?? step.name;
                const inputText = formatInput(step.input);

                return (
                    <li
                        key={step.toolUseId}
                        className={cn(
                            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                            step.status === "running" && "border-blue-200 bg-blue-50",
                            step.status === "done" && "border-emerald-200 bg-emerald-50",
                            step.status === "error" && "border-red-200 bg-red-50"
                        )}
                    >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                {label}
                                {step.status === "running" && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                                )}
                                {step.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                {step.status === "error" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                                    {MODEL_LABELS[step.model] ?? step.model}
                                </span>
                            </div>
                            {inputText && <div className="truncate text-xs text-muted-foreground">{inputText}</div>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
