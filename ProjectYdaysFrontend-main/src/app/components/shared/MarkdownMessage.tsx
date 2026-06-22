import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-2 mt-4 text-xl font-bold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-3 font-bold first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-4 border-blue-400 pl-3 italic text-slate-600 dark:text-slate-300">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-700">{children}</thead>,
        th: ({ children }) => <th className="whitespace-nowrap border-b px-3 py-2 font-bold dark:border-slate-600">{children}</th>,
        td: ({ children }) => <td className="border-b px-3 py-2 align-top dark:border-slate-700">{children}</td>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400"
          >
            {children}
          </a>
        ),
        code: ({ className, children }) =>
          className ? (
            <code className={`${className} block overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100`}>
              {children}
            </code>
          ) : (
            <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">{children}</code>
          ),
        hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
});
