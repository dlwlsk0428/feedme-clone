import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ children }: { children: string }) {
  return (
    <div className="rendered wrap-anywhere [&_li]:ml-4 [&_ol]:list-decimal [&_pre]:overflow-auto [&_table]:block [&_ul]:list-disc [&_img]:max-w-full">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
