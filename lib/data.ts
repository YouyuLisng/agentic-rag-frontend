const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ItineraryDay {
    day: number;
    title: string;
    description: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    hotel: string;
}

export interface Tour {
    id: string;
    title: string;
    country: string;
    location: string;
    days: number;
    budget_twd: number;
    suitable_for: string[];
    summary: string;
    itinerary: ItineraryDay[];
    capacity: number;
    enrolled_count: number;
}

export interface PolicyDocument {
    document_slug: string;
    title: string;
    content: string;
    chunk_count: number;
}

export async function fetchTours(): Promise<Tour[]> {
    const res = await fetch(`${API_URL}/tours`);
    if (!res.ok) throw new Error(`Failed to fetch tours: ${res.status}`);
    return res.json();
}

export async function fetchPolicies(): Promise<PolicyDocument[]> {
    const res = await fetch(`${API_URL}/policies`);
    if (!res.ok) throw new Error(`Failed to fetch policies: ${res.status}`);
    return res.json();
}
