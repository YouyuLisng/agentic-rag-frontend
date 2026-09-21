"use client";

import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, TriangleAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    fetchGenerationEval,
    fetchRetrievalEval,
    fetchToolSelectionEval,
    type EvalReport,
    type GenerationEvalReport,
    type ToolSelectionReport,
} from "@/lib/eval";
import { cn } from "@/lib/utils";

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="text-2xl font-semibold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
        </Card>
    );
}

function RankIcon({ rank }: { rank: number | null }) {
    if (rank === 1) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (rank !== null) return <TriangleAlert className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
}

// search_knowledge's retrieval quality, measured against a hand-labeled
// eval set (16 paraphrased queries, 2 per policy document) -- not just
// "it seemed to work when I tried it a few times."
function ScoreBadge({ score, goodAt, okAt }: { score: number; goodAt: number; okAt: number }) {
    return (
        <span
            className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                score >= goodAt && "bg-emerald-100 text-emerald-700",
                score >= okAt && score < goodAt && "bg-amber-100 text-amber-700",
                score < okAt && "bg-red-100 text-red-700"
            )}
        >
            {score.toFixed(2)}
        </span>
    );
}

export default function EvalPage() {
    const [report, setReport] = useState<EvalReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [genReport, setGenReport] = useState<GenerationEvalReport | null>(null);
    const [genLoading, setGenLoading] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);

    const [toolReport, setToolReport] = useState<ToolSelectionReport | null>(null);
    const [toolLoading, setToolLoading] = useState(false);
    const [toolError, setToolError] = useState<string | null>(null);

    // Only ever called from the button's onClick, never from an effect --
    // unlike retrieval eval, generation eval is far more expensive (a full
    // agent turn plus two judge calls per case) so it must not auto-run.
    const runGenerationEval = useCallback(() => {
        setGenLoading(true);
        setGenError(null);
        fetchGenerationEval()
            .then(setGenReport)
            .catch((e) => setGenError(e instanceof Error ? e.message : String(e)))
            .finally(() => setGenLoading(false));
    }, []);

    // Same reasoning as generation eval: a full agent turn per case, so
    // manually triggered only.
    const runToolSelectionEval = useCallback(() => {
        setToolLoading(true);
        setToolError(null);
        fetchToolSelectionEval()
            .then(setToolReport)
            .catch((e) => setToolError(e instanceof Error ? e.message : String(e)))
            .finally(() => setToolLoading(false));
    }, []);

    // Pure fetch, no upfront setState -- safe to call directly from the
    // mount effect. The initial `loading`/`error` state is already
    // correct (true/null) without needing to redundantly reset it.
    const runEval = useCallback(() => {
        return fetchRetrievalEval()
            .then(setReport)
            .catch((e) => setError(e instanceof Error ? e.message : String(e)))
            .finally(() => setLoading(false));
    }, []);

    const reload = useCallback(() => {
        setLoading(true);
        setError(null);
        runEval();
    }, [runEval]);

    useEffect(() => {
        runEval();
    }, [runEval]);

    return (
        <div className="mx-auto max-w-4xl px-4 py-6">
            <Link
                href="/"
                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> 回聊天室
            </Link>
            <div className="mb-1 flex items-center justify-between">
                <h1 className="text-lg font-semibold">RAG 檢索評估</h1>
                <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    重新評估
                </Button>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
                search_knowledge 對 16 題人工標註問題(每份政策文件 2 題,問法都改寫過,不是照抄標題)的即時檢索結果
                -- 每次重新評估都是對真實資料庫下的即時查詢,不是預先算好的快照。
            </p>

            {loading && !report && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> 評估中(16 次真實檢索查詢)...
                </div>
            )}
            {error && <div className="text-sm text-destructive">評估失敗:{error}</div>}

            {report && (
                <>
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MetricCard label="Accuracy@1" value={`${(report.metrics.accuracy_at_1 * 100).toFixed(1)}%`} />
                        <MetricCard label="Accuracy@3" value={`${(report.metrics.accuracy_at_3 * 100).toFixed(1)}%`} />
                        <MetricCard label="Accuracy@5" value={`${(report.metrics.accuracy_at_5 * 100).toFixed(1)}%`} />
                        <MetricCard label="MRR" value={report.metrics.mrr.toFixed(3)} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">逐題結果({report.metrics.n} 題)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>問題</TableHead>
                                        <TableHead>預期文件</TableHead>
                                        <TableHead>命中排名</TableHead>
                                        <TableHead className="text-right">Top similarity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.cases.map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <RankIcon rank={c.rank} />
                                            </TableCell>
                                            <TableCell className="max-w-[240px] text-sm whitespace-normal">{c.query}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {c.expected_slug}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    "text-sm",
                                                    c.rank === null && "text-destructive",
                                                    c.rank !== null && c.rank > 1 && "text-amber-600"
                                                )}
                                            >
                                                {c.rank ?? "未命中"}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {c.top_similarity.toFixed(3)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}

            <div className="mt-10 border-t pt-6">
                <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-base font-semibold">生成品質評估(Ragas 風格 LLM-as-a-Judge)</h2>
                    <Button variant="outline" size="sm" onClick={runGenerationEval} disabled={genLoading}>
                        {genLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {genReport ? "重新評估" : "開始評估"}
                    </Button>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                    8 題會實際跑一次完整 agent 對話,再用 Haiku 當裁判評分:Faithfulness 檢查回答有沒有幻覺(是否忠實於
                    檢索到的資料),Answer Relevancy 檢查回答是否真的切題(把答案反推回問題,再用 embedding 比對語意相似度)。
                    這裡會產生真實 API 費用,不會自動執行,需手動觸發。
                </p>

                {genError && <div className="mb-4 text-sm text-destructive">評估失敗:{genError}</div>}

                {genLoading && !genReport && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> 評估中(8 題,每題都要跑完整對話 + 裁判評分)...
                    </div>
                )}

                {genReport && (
                    <>
                        <div className="mb-6 grid grid-cols-2 gap-3">
                            <MetricCard
                                label="平均 Faithfulness"
                                value={genReport.metrics.avg_faithfulness.toFixed(3)}
                            />
                            <MetricCard
                                label="平均 Answer Relevancy"
                                value={genReport.metrics.avg_answer_relevancy.toFixed(3)}
                            />
                        </div>

                        <Card>
                            <CardContent className="pt-6">
                                <Accordion>
                                    {genReport.cases.map((c, i) => (
                                        <AccordionItem key={i} value={`case-${i}`}>
                                            <AccordionTrigger>
                                                <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2">
                                                    <span className="text-sm">{c.query}</span>
                                                    <div className="flex shrink-0 gap-2">
                                                        <ScoreBadge score={c.faithfulness} goodAt={1} okAt={0.5} />
                                                        <ScoreBadge score={c.answer_relevancy} goodAt={0.7} okAt={0.4} />
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="flex flex-col gap-3">
                                                    <div>
                                                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                                                            回答
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{c.answer}</p>
                                                    </div>

                                                    {c.faithfulness_claims.length > 0 && (
                                                        <div>
                                                            <div className="mb-1 text-xs font-medium text-muted-foreground">
                                                                事實陳述查核({c.faithfulness_claims.length} 條)
                                                            </div>
                                                            <ul className="flex flex-col gap-1">
                                                                {c.faithfulness_claims.map((claim, j) => (
                                                                    <li key={j} className="flex items-start gap-1.5 text-xs">
                                                                        {claim.supported ? (
                                                                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                                                                        ) : (
                                                                            <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                                                                        )}
                                                                        <span className="text-muted-foreground">{claim.claim}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {c.is_noncommittal ? (
                                                        <div className="text-xs text-amber-600">
                                                            裁判判定這是迴避性回答,Answer Relevancy 直接記 0。
                                                        </div>
                                                    ) : (
                                                        c.relevancy_questions.length > 0 && (
                                                            <div>
                                                                <div className="mb-1 text-xs font-medium text-muted-foreground">
                                                                    裁判反推的問題(用來跟原問題做 embedding 相似度比對)
                                                                </div>
                                                                <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                                                    {c.relevancy_questions.map((q, j) => (
                                                                        <li key={j}>- {q}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <div className="mt-10 border-t pt-6">
                <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-base font-semibold">工具選對率評估(Tool Selection Accuracy)</h2>
                    <Button variant="outline" size="sm" onClick={runToolSelectionEval} disabled={toolLoading}>
                        {toolLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {toolReport ? "重新評估" : "開始評估"}
                    </Button>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                    19 題人工標註問題(單一意圖、複合意圖、不需要工具的寒暄、邊界案例),檢查 agent
                    有沒有呼叫正確的工具組合——這是 Faithfulness/Answer Relevancy 看不到的錯誤類型:選錯工具、
                    漏呼叫工具、或多呼叫了不必要的工具。同樣會產生真實 API 費用,需手動觸發。
                </p>

                {toolError && <div className="mb-4 text-sm text-destructive">評估失敗:{toolError}</div>}

                {toolLoading && !toolReport && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> 評估中(19 題,每題都要跑完整對話)...
                    </div>
                )}

                {toolReport && (
                    <>
                        <div className="mb-6 grid grid-cols-3 gap-3">
                            <MetricCard
                                label="Exact Match"
                                value={`${(toolReport.metrics.exact_match_accuracy * 100).toFixed(1)}%`}
                            />
                            <MetricCard label="平均 Precision" value={toolReport.metrics.avg_precision.toFixed(3)} />
                            <MetricCard label="平均 Recall" value={toolReport.metrics.avg_recall.toFixed(3)} />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">逐題結果({toolReport.metrics.n} 題)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead>問題</TableHead>
                                            <TableHead>預期工具</TableHead>
                                            <TableHead>實際工具</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {toolReport.cases.map((c, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    {c.exact_match ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-destructive" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[240px] text-sm whitespace-normal">
                                                    {c.query}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {c.expected_tools.length > 0 ? c.expected_tools.join(", ") : "(無)"}
                                                </TableCell>
                                                <TableCell
                                                    className={cn("text-sm", !c.exact_match && "text-destructive")}
                                                >
                                                    {c.actual_tools.length > 0 ? c.actual_tools.join(", ") : "(無)"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
