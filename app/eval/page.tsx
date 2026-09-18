"use client";

import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, TriangleAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchRetrievalEval, type EvalReport } from "@/lib/eval";
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
export default function EvalPage() {
    const [report, setReport] = useState<EvalReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        </div>
    );
}
