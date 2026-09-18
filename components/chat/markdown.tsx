import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
    return (
        <div
            className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-3
                prose-table:text-sm prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1"
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        </div>
    );
}
