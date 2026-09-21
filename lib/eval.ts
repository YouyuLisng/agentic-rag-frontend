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

export interface ToolSelectionCaseResult {
    query: string;
    expected_tools: string[];
    actual_tools: string[];
    exact_match: boolean;
    precision: number;
    recall: number;
}

export interface ToolSelectionMetrics {
    n: number;
    exact_match_accuracy: number;
    avg_precision: number;
    avg_recall: number;
}

export interface ToolSelectionReport {
    metrics: ToolSelectionMetrics;
    cases: ToolSelectionCaseResult[];
}

export async function fetchToolSelectionEval(): Promise<ToolSelectionReport> {
    const res = await fetch(`${API_URL}/eval/tool-selection`);
    if (!res.ok) throw new Error(`Failed to fetch tool-selection eval report: ${res.status}`);
    return res.json();
}
