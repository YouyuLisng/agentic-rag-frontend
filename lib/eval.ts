const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface EvalCaseResult {
    query: string;
    expected_slug: string;
    retrieved_slugs: string[];
    rank: number | null;
    top_similarity: number;
}

export interface EvalMetrics {
    n: number;
    accuracy_at_1: number;
    accuracy_at_3: number;
    accuracy_at_5: number;
    mrr: number;
}

export interface EvalReport {
    metrics: EvalMetrics;
    cases: EvalCaseResult[];
}

export async function fetchRetrievalEval(): Promise<EvalReport> {
    const res = await fetch(`${API_URL}/eval/retrieval`);
    if (!res.ok) throw new Error(`Failed to fetch eval report: ${res.status}`);
    return res.json();
}

export interface ClaimVerdict {
    claim: string;
    supported: boolean;
}

export interface GenerationEvalCase {
    query: string;
    answer: string;
    context: string[];
    faithfulness: number;
    faithfulness_claims: ClaimVerdict[];
    answer_relevancy: number;
    relevancy_questions: string[];
    is_noncommittal: boolean;
}

export interface GenerationEvalMetrics {
    n: number;
    avg_faithfulness: number;
    avg_answer_relevancy: number;
}

export interface GenerationEvalReport {
    metrics: GenerationEvalMetrics;
    cases: GenerationEvalCase[];
}

export async function fetchGenerationEval(): Promise<GenerationEvalReport> {
    const res = await fetch(`${API_URL}/eval/generation`);
    if (!res.ok) throw new Error(`Failed to fetch generation eval report: ${res.status}`);
    return res.json();
}
