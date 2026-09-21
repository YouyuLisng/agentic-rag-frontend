"use client";

import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Markdown } from "@/components/chat/markdown";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPolicies, fetchTours, type PolicyDocument, type Tour } from "@/lib/data";
import { cn } from "@/lib/utils";

// Read-only view over the actual seed data -- so a viewer (an
// interviewer, say) can independently check whether the chatbot's
// answers actually match what's really in the database, rather than
// having to trust them.
export default function DataPage() {
    const [tours, setTours] = useState<Tour[]>([]);
    const [policies, setPolicies] = useState<PolicyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([fetchTours(), fetchPolicies()])
            .then(([t, p]) => {
                setTours(t);
                setPolicies(p);
            })
            .catch((e) => setError(e instanceof Error ? e.message : String(e)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="mx-auto max-w-4xl px-4 py-6">
            <Link
                href="/"
                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> 回聊天室
            </Link>
            <h1 className="mb-1 text-lg font-semibold">資料檢視</h1>
            <p className="mb-6 text-sm text-muted-foreground">
                資料庫裡實際的種子資料 -- 拿來對照聊天視窗裡的回答是否準確。
            </p>

            {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> 載入中...
                </div>
            )}
            {error && <div className="text-sm text-destructive">載入失敗:{error}</div>}

            {!loading && !error && (
                <Tabs defaultValue="tours">
                    <TabsList>
                        <TabsTrigger value="tours">行程資料({tours.length})</TabsTrigger>
                        <TabsTrigger value="policies">政策文件({policies.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="tours">
                        <Alert className="mt-4">
                            <ShieldCheck />
                            <AlertTitle>底價 / 內部成本資料隔離</AlertTitle>
                            <AlertDescription>
                                資料庫裡每個行程其實還有一個 <code>cost_price_twd</code>(內部底價)欄位,但這個頁面、
                                以及聊天機器人的所有工具回傳結果,都刻意不會包含這個欄位 --
                                這是資料層的設計,不是遺漏或前端過濾。聊天視窗本身在架構上就沒有管道查到這筆資料,
                                不管怎麼問(包含估算、反推、prompt injection)都一樣,已用真實對抗性測試驗證過
                                (後端 <code>app/scripts/security_probe.py</code>)。
                            </AlertDescription>
                        </Alert>
                        <div className="flex flex-col gap-4 pt-4">
                            {tours.map((tour) => (
                                <Card key={tour.id}>
                                    <CardHeader>
                                        <CardTitle className="flex flex-wrap items-center justify-between gap-1 text-base">
                                            {tour.title}
                                            <span
                                                className={cn(
                                                    "text-xs font-normal",
                                                    tour.enrolled_count >= tour.capacity
                                                        ? "text-destructive"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                名額 {tour.enrolled_count}/{tour.capacity}
                                                {tour.enrolled_count >= tour.capacity && "(已滿)"}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            <Badge variant="secondary">
                                                {tour.country} · {tour.location}
                                            </Badge>
                                            <Badge variant="secondary">{tour.days} 天</Badge>
                                            <Badge variant="secondary">NT${tour.budget_twd}</Badge>
                                            {tour.suitable_for.map((s) => (
                                                <Badge key={s} variant="outline">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{tour.summary}</p>

                                        <Accordion>
                                            <AccordionItem value="itinerary" className="border-none">
                                                <AccordionTrigger className="text-xs">
                                                    每日行程({tour.itinerary.length} 天)
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="flex flex-col gap-3">
                                                        {tour.itinerary.map((day) => (
                                                            <div key={day.day} className="border-l-2 pl-3 text-xs">
                                                                <div className="font-medium text-foreground">
                                                                    Day {day.day}:{day.title}
                                                                </div>
                                                                <div className="text-muted-foreground">
                                                                    {day.description}
                                                                </div>
                                                                <div className="mt-1 grid grid-cols-2 gap-1 text-muted-foreground">
                                                                    <div>早餐:{day.breakfast}</div>
                                                                    <div>午餐:{day.lunch}</div>
                                                                    <div>晚餐:{day.dinner}</div>
                                                                    <div>住宿:{day.hotel}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="policies">
                        <div className="flex flex-col gap-4 pt-4">
                            {policies.map((doc) => (
                                <Card key={doc.document_slug}>
                                    <CardHeader>
                                        <CardTitle className="text-base">{doc.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Markdown>{doc.content}</Markdown>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
