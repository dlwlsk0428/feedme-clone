import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ children }: { children: string }) {
  return (
    <div
      className="max-h-[28rem] overflow-auto p-5 text-[15px] leading-7 wrap-anywhere
        [&_a]:underline [&_a]:underline-offset-4
        [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground
        [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm
        [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold
        [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold
        [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold
        [&_img]:max-w-full
        [&_li]:ml-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ul]:mb-3 [&_ul]:list-disc
        [&_p]:mb-3
        [&_pre]:mb-3 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent
        [&_table]:mb-3 [&_table]:block [&_table]:overflow-auto [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1
        [&>*:first-child]:mt-0"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
