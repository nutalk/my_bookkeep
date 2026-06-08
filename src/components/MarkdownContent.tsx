import { useMemo } from "react";

interface MarkdownContentProps {
  content: string;
}

/**
 * Lightweight markdown renderer for AI chat responses.
 * Handles headings, bold, italic, inline code, code blocks, lists,
 * tables, blockquotes, links, strikethrough, and horizontal rules.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  return <div className="space-y-2">{rendered}</div>;
}

type MarkdownNode =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "heading"; level: number; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "code"; language: string; code: string }
  | { type: "table"; headers: InlineNode[]; rows: InlineNode[][] }
  | { type: "blockquote"; children: InlineNode[] }
  | { type: "hr" };

type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string }
  | { type: "strikethrough"; text: string }
  | { type: "link"; href: string; text: string }
  | { type: "br" };

function renderMarkdown(content: string): React.ReactNode[] {
  const nodes = parseBlocks(content);
  return nodes.map((node, i) => renderBlock(node, i));
}

function parseBlocks(content: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (/^```/.test(line)) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    // Heading (# to ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        level: headingMatch[1].length,
        children: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      nodes.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      nodes.push({
        type: "blockquote",
        children: parseInline(quoteLines.join("\n")),
      });
      continue;
    }

    // Table
    if (
      /^\|/.test(line) &&
      i + 1 < lines.length &&
      /^\|[-\s:|]+\|$/.test(lines[i + 1])
    ) {
      const headerText = line;
      const headerCells = splitTableRow(headerText);
      const headers = parseInline(headerCells.join(" "));

      i += 2; // skip header and separator
      const rows: InlineNode[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = splitTableRow(lines[i]);
        rows.push(parseInline(cells.join(" ")));
        i++;
      }
      nodes.push({ type: "table", headers: headers as InlineNode[], rows });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s/.test(line)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*+]\s/, "");
        items.push(parseInline(itemText));
        i++;
      }
      nodes.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s/.test(line)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s/, "");
        items.push(parseInline(itemText));
        i++;
      }
      nodes.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph (collect consecutive non-empty lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^[-*_]{3,}$/.test(lines[i].trim()) &&
      !/^\s*>\s/.test(lines[i]) &&
      !/^\|/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const text = paraLines.join("\n");
      nodes.push({ type: "paragraph", children: parseInline(text) });
    } else {
      i++;
    }
  }

  return nodes;
}

/** Split a table row like | a | b | c | into ["a", "b", "c"] */
function splitTableRow(row: string): string[] {
  return row
    .split("|")
    .slice(1, -1)
    .map((s) => s.trim());
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const regex =
    /(`[^`]+`)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(~~(.+?)~~)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Split by newlines first to insert <br/> for single line breaks
  const segments = text.split("\n");

  for (let s = 0; s < segments.length; s++) {
    if (s > 0) {
      nodes.push({ type: "br" });
    }

    const segment = segments[s];
    let segLastIndex = 0;

    while ((match = regex.exec(segment)) !== null) {
      if (match.index > segLastIndex) {
        nodes.push({
          type: "text",
          text: segment.slice(segLastIndex, match.index),
        });
      }

      if (match[1]) {
        nodes.push({ type: "code", text: match[1].slice(1, -1) });
      } else if (match[2]) {
        nodes.push({ type: "bold", text: match[3] });
      } else if (match[4]) {
        nodes.push({ type: "italic", text: match[5] });
      } else if (match[6]) {
        nodes.push({ type: "strikethrough", text: match[7] });
      } else if (match[8]) {
        nodes.push({ type: "link", text: match[9], href: match[10] });
      }

      segLastIndex = match.index + match[0].length;
    }

    if (segLastIndex < segment.length) {
      nodes.push({ type: "text", text: segment.slice(segLastIndex) });
    }
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

function renderBlock(node: MarkdownNode, key: number): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const sizeMap: Record<number, string> = {
        1: "text-xl font-bold",
        2: "text-lg font-bold",
        3: "text-base font-semibold",
        4: "text-sm font-semibold",
        5: "text-sm font-medium",
        6: "text-xs font-medium",
      };
      const className = `${sizeMap[node.level] ?? "font-bold"} text-white mt-3 first:mt-0`;
      const children = renderInlineNodes(node.children);
      switch (node.level) {
        case 1:
          return (
            <h1 key={key} className={className}>
              {children}
            </h1>
          );
        case 2:
          return (
            <h2 key={key} className={className}>
              {children}
            </h2>
          );
        case 3:
          return (
            <h3 key={key} className={className}>
              {children}
            </h3>
          );
        case 4:
          return (
            <h4 key={key} className={className}>
              {children}
            </h4>
          );
        case 5:
          return (
            <h5 key={key} className={className}>
              {children}
            </h5>
          );
        case 6:
          return (
            <h6 key={key} className={className}>
              {children}
            </h6>
          );
        default:
          return (
            <h2 key={key} className={className}>
              {children}
            </h2>
          );
      }
    }
    case "paragraph":
      return (
        <p key={key} className="leading-relaxed">
          {renderInlineNodes(node.children)}
        </p>
      );
    case "list": {
      const ListTag = node.ordered ? "ol" : "ul";
      return (
        <ListTag
          key={key}
          className={
            node.ordered
              ? "list-decimal pl-5 space-y-1"
              : "list-disc pl-5 space-y-1"
          }
        >
          {node.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInlineNodes(item)}
            </li>
          ))}
        </ListTag>
      );
    }
    case "code":
      return (
        <pre
          key={key}
          className="bg-neutral-950 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed"
        >
          {node.language && (
            <div className="text-neutral-500 text-xs mb-1 uppercase tracking-wide">
              {node.language}
            </div>
          )}
          <code>{node.code}</code>
        </pre>
      );
    case "table":
      return (
        <div key={key} className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-700">
                {node.headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-semibold text-neutral-300"
                  >
                    {renderInlineNodes([header])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-neutral-800 last:border-0"
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-neutral-400">
                      {renderInlineNodes([cell])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-2 border-blue-500 pl-4 text-neutral-400 italic text-sm"
        >
          {renderInlineNodes(node.children)}
        </blockquote>
      );
    case "hr":
      return <hr key={key} className="border-neutral-700 my-3" />;
  }
}

function renderInlineNodes(nodes: InlineNode[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <span key={i}>{node.text}</span>;
      case "bold":
        return (
          <strong key={i} className="font-semibold">
            {node.text}
          </strong>
        );
      case "italic":
        return <em key={i}>{node.text}</em>;
      case "code":
        return (
          <code
            key={i}
            className="bg-neutral-700/50 text-green-400 rounded px-1 py-0.5 text-xs font-mono"
          >
            {node.text}
          </code>
        );
      case "strikethrough":
        return (
          <del key={i} className="text-neutral-500">
            {node.text}
          </del>
        );
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            {node.text}
          </a>
        );
      case "br":
        return <br key={i} />;
    }
  });
}
