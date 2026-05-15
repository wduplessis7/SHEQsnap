import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { getArticleBySlug, getPrevNextArticles } from "@/lib/help-articles";
import { MarkdownArticle } from "./markdown-article";

interface Props {
  params: { slug: string };
}

function getMarkdownContent(filename: string): string {
  const filePath = path.join(process.cwd(), "src", "content", "help", filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

function extractHeadings(markdown: string): { text: string; id: string; level: number }[] {
  const lines = markdown.split("\n");
  const headings: { text: string; id: string; level: number }[] = [];
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      headings.push({ text, id, level });
    }
  }
  return headings;
}

export default function ArticlePage({ params }: Props) {
  const article = getArticleBySlug(params.slug);
  if (!article) notFound();

  const content = getMarkdownContent(article.filename);
  const headings = extractHeadings(content);
  const { prev, next } = getPrevNextArticles(params.slug);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/help" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <BookOpen className="h-4 w-4" />
          Help Centre
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{article.title}</span>
      </div>

      <div className="flex gap-8">
        {/* Table of Contents — sticky sidebar */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-6 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                On this page
              </p>
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className={`block text-sm text-gray-500 hover:text-blue-600 transition-colors leading-snug py-0.5 ${
                    h.level === 3 ? "pl-4" : ""
                  }`}
                >
                  {h.text}
                </a>
              ))}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <MarkdownArticle content={content} />

          {/* Prev / Next navigation */}
          <div className="mt-12 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/help/${prev.slug}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <ChevronLeft className="h-4 w-4 shrink-0 group-hover:-translate-x-1 transition-transform" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Previous</p>
                  <p className="font-medium">{prev.title}</p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/help/${next.slug}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group text-right ml-auto"
              >
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Next</p>
                  <p className="font-medium">{next.title}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
