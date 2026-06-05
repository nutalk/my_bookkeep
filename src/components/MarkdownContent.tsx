import { useMemo } from "react";

interface MarkdownContentProps {
  content: string;
}

/**
 * Lightweight markdown renderer for AI chat responses.
 * Handles bold, italic, inline code, code blocks, lists, and paragraphs.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  return <div className="space-y-2">{rendered}</div>;
}

type MarkdownNode =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "code"; language: string; code: string }
  | { type: "hr" };

type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string }
  | { type: "strikethrough"; text: string }
  | { type: "link"; href: string; text: string };

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

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push({ type: "hr" });
      i++;
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
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
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

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const regex =
    /(`[^`]+`)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(~~(.+?)~~)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // Inline code
      nodes.push({ type: "code", text: match[1].slice(1, -1) });
    } else if (match[2]) {
      // Bold
      nodes.push({ type: "bold", text: match[3] });
    } else if (match[4]) {
      // Italic
      nodes.push({ type: "italic", text: match[5] });
    } else if (match[6]) {
      // Strikethrough
      nodes.push({ type: "strikethrough", text: match[7] });
    } else if (match[8]) {
      // Link
      nodes.push({ type: "link", text: match[9], href: match[10] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

function renderBlock(node: MarkdownNode, key: number): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="leading-relaxed">
          {renderInlineNodes(node.children)}
        </p>
      );
    case "list":
      const ListTag = node.ordered ? "ol" : "ul";
      const listClass = node.ordered
        ? "list-decimal pl-5 space-y-1"
        : "list-disc pl-5 space-y-1";
      return (
        <ListTag key={key} className={listClass}>
          {node.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInlineNodes(item)}
            </li>
          ))}
        </ListTag>
      );
    case "code":
      return (
        <pre key={key} className="bg-neutral-950 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed">
          {node.language && (
            <div className="text-neutral-500 text-xs mb-1 uppercase tracking-wide">
              {node.language}
            </div>
          )}
          <code>{node.code}</code>
        </pre>
      );
    case "hr":
      return <hr key={key} className="border-neutral-700 my-2" />;
  }
}

function renderInlineNodes(nodes: InlineNode[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <span key={i}>{node.text}</span>;
      case "bold":
        return <strong key={i} className="font-semibold">{node.text}</strong>;
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
        return <del key={i} className="text-neutral-500">{node.text}</del>;
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
    }
  });
}
