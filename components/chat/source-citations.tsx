"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import type { SourceRef } from "@/lib/chat";
import { cn } from "@/lib/utils";

// The "出處引用可點開回原文" requirement, literally: click a source
// badge, see the exact retrieved chunk text right here -- not just
// trust the model's own prose mention of it ("根據退訂政策...").
export function SourceCitations({ sources }: { sources: SourceRef[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    if (sources.length === 0) return null;

    return (
        <div className="mt-2 border-t pt-2">
            <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">出處(點擊查看原文)</div>
            <div className="flex flex-wrap gap-1.5">
                {sources.map((s, i) => (
                    <button
                        key={`${s.document_slug}-${i}`}
                        type="button"
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                            openIndex === i
                                ? "border-primary bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent"
                        )}
                    >
                        {s.title}
                        {openIndex === i ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                ))}
            </div>

            {openIndex !== null && (
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs">
                    <div className="mb-1.5 flex items-center justify-between font-medium text-foreground">
                        <span>{sources[openIndex].title}</span>
                        <span className="font-normal text-muted-foreground">
                            similarity {sources[openIndex].similarity.toFixed(3)}
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap text-muted-foreground">{sources[openIndex].content}</p>
                </div>
            )}
        </div>
    );
}
