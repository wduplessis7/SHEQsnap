"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// Utility: convert heading text to anchor id
function toId(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-0 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const id = toId(String(children));
    return (
      <h2
        id={id}
        className="text-xl font-semibold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200 scroll-mt-6"
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const id = toId(String(children));
    return (
      <h3
        id={id}
        className="text-lg font-semibold text-gray-800 mt-6 mb-3 scroll-mt-6"
      >
        {children}
      </h3>
    );
  },
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-gray-800 mt-5 mb-2">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-7 mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-6 mb-4 space-y-1 text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-6 mb-4 space-y-1 text-gray-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-7">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 pr-3 py-2 my-4 rounded-r text-gray-700 italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children, ...props }: any) => {
    if (inline) {
      return (
        <code
          className="bg-gray-100 text-gray-800 text-sm font-mono rounded px-1.5 py-0.5"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono">
        <code>{children}</code>
      </pre>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-100">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-200">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-gray-50 hover:bg-blue-50 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-gray-600 border border-gray-200">{children}</td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
};

interface MarkdownArticleProps {
  content: string;
}

export function MarkdownArticle({ content }: MarkdownArticleProps) {
  return (
    <article className="max-w-[75ch] leading-7">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
