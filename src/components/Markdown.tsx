
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const sections = [
  "Hinglish Explanation",
  "Easy Explanation (English)",
  "Detailed Explanation (English)",
  "Real-World Example",
  "Key Definitions",
  "Key Points",
  "Advantages",
  "Disadvantages / Limitations",
  "Applications",
  "Diagram / Flow (ASCII)",
  "Comparison Table",
  "Interview Questions",
  "Viva Questions",
  "Memory Trick",
  "Formula Sheet",
  "Summary",
];

function normalizeContent(text: string) {
  return text.split(/(```[\s\S]*?```)/g).map((part) => {
    if (part.startsWith("```")) return part;

    let result = part
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => `$$\n${f}\n$$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => `$${f}$`);

    result = result.split("\n").map((line) => {
      const clean = line
        .trim()
        .replace(/^#{1,4}\s*/, "")
        .replace(/^\*\*(.*?)\*\*$/, "$1")
        .replace(/:$/, "")
        .trim();

      const section = sections.find(
        (s) => s.toLowerCase() === clean.toLowerCase()
      );

      return section ? `## ${section}` : line;
    }).join("\n");

    return result;
  }).join("");
}

export function Markdown({ children }: { children: string }) {
  const content = normalizeContent(children);

  return (
    <div
      className="
        max-w-none leading-relaxed text-muted-foreground
        [&_.katex]:text-foreground
        [&_.katex-display]:my-5
        [&_.katex-display]:overflow-x-auto
        [&_.katex-display]:overflow-y-hidden
        [&_.katex-display]:py-2

        [&_h2]:text-xl
        [&_h2]:font-bold
        [&_h2]:text-purple-400
        [&_h2]:mt-8
        [&_h2]:mb-4
        [&_h2]:pb-2
        [&_h2]:border-b
        [&_h2]:border-purple-400/20

        [&_h3]:text-lg
        [&_h3]:font-semibold
        [&_h3]:text-foreground
        [&_h3]:mt-5
        [&_h3]:mb-3

        [&_p]:my-3
        [&_ul]:list-disc
        [&_ul]:pl-6
        [&_ol]:list-decimal
        [&_ol]:pl-6
        [&_li]:my-1

        [&_table]:w-full
        [&_table]:text-sm
        [&_table]:border-collapse

        [&_th]:text-left
        [&_th]:font-semibold
        [&_th]:text-purple-300
        [&_th]:bg-purple-500/10
        [&_th]:p-3
        [&_th]:border-b
        [&_th]:border-purple-400/20

        [&_td]:p-3
        [&_td]:border-b
        [&_td]:border-white/10

        [&_pre]:overflow-x-auto
        [&_pre]:rounded-xl
        [&_pre]:p-4
        [&_pre]:bg-black/20

        [&_blockquote]:border-l-2
        [&_blockquote]:border-fuchsia-400
        [&_blockquote]:pl-4
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={{
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-purple-400/20 bg-card/60 shadow-sm">
              <table className="w-full min-w-[400px] border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
