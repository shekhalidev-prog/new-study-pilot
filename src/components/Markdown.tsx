// Minimal, dependency-free Markdown renderer tuned for our AI output.
// Handles: #/##/### headings, **bold**, *italic*, `inline code`,
// ```code blocks```, > blockquotes, -/* bullet lists, 1. numbered lists,
// | tables |, --- rules, and paragraph breaks.
import { type JSX } from "react";

function inline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**"))
      parts.push(<strong key={i++} className="text-foreground">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`"))
      parts.push(
        <code key={i++} className="px-1.5 py-0.5 rounded bg-white/10 text-neon text-[0.9em] font-mono">
          {t.slice(1, -1)}
        </code>
      );
    else parts.push(<em key={i++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ children }: { children: string }) {
  const lines = children.replace(/\r\n/g, "\n").split("\n");
  const out: JSX.Element[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        <pre key={key++} className="my-3 p-4 rounded-xl glass overflow-x-auto text-sm font-mono text-neon whitespace-pre">
          {buf.join("\n")}
        </pre>
      );
      continue;
    }

    // Heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      const cls =
        lvl === 1
          ? "text-3xl font-display font-bold mt-6 mb-3"
          : lvl === 2
          ? "text-xl font-display font-semibold mt-5 mb-2 text-gradient"
          : lvl === 3
          ? "text-lg font-semibold mt-4 mb-2"
          : "text-base font-semibold mt-3 mb-1";
      const Tag = (`h${lvl}` as unknown) as keyof JSX.IntrinsicElements;
      out.push(<Tag key={key++} className={cls}>{inline(h[2])}</Tag>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      out.push(<hr key={key++} className="my-4 border-white/10" />);
      i++;
      continue;
    }

    // Table
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*-+/.test(lines[i + 1])) {
      const header = line.split("|").slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      out.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-xl glass">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {header.map((h, j) => (
                  <th key={j} className="text-left px-3 py-2 font-semibold text-neon">{inline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-white/5 last:border-0">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 align-top">{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <blockquote key={key++} className="my-3 pl-4 border-l-2 border-neon/60 text-muted-foreground italic">
          {inline(buf.join(" "))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={key++} className="my-2 space-y-1 list-disc pl-5 marker:text-neon">
          {items.map((it, j) => <li key={j}>{inline(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={key++} className="my-2 space-y-1 list-decimal pl-5 marker:text-neon">
          {items.map((it, j) => <li key={j}>{inline(it)}</li>)}
        </ol>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph (join consecutive text lines)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|\s*[-*]\s|\s*\d+\.\s|>\s|```|\|)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(
      <p key={key++} className="my-2 leading-relaxed text-muted-foreground">
        {inline(buf.join(" "))}
      </p>
    );
  }

  return <div className="max-w-none">{out}</div>;
}
