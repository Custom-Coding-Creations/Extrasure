"use client";

import { FormEvent, ReactNode, useState } from "react";

type ChatRole = "user" | "assistant";

type UiMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ManualAssistantApiResponse = {
  ok: true;
  answer: string;
  confidence: "low" | "medium" | "high";
  sourceTitles: string[];
  sourcePaths?: string[];
  scope?: {
    inScope: boolean;
    reason: string;
  };
};

function createId() {
  return crypto.randomUUID();
}

function renderInlineMarkdown(content: string, keyPrefix: string): ReactNode[] {
  const chunks: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      chunks.push(content.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      chunks.push(
        <a
          key={`${keyPrefix}-link-${partIndex}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#174e8a] underline decoration-[#174e8a]/45 underline-offset-4 hover:text-[#103c6a]"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      chunks.push(
        <code
          key={`${keyPrefix}-inline-code-${partIndex}`}
          className="rounded bg-[#efe5cf] px-1.5 py-0.5 font-mono text-[0.85em] text-[#3f3728]"
        >
          {match[4]}
        </code>,
      );
    } else if (match[5]) {
      chunks.push(
        <strong key={`${keyPrefix}-strong-${partIndex}`} className="font-semibold text-[#24352e]">
          {match[5]}
        </strong>,
      );
    } else if (match[6]) {
      chunks.push(
        <em key={`${keyPrefix}-em-${partIndex}`} className="italic text-[#354940]">
          {match[6]}
        </em>,
      );
    }

    lastIndex = pattern.lastIndex;
    partIndex += 1;
  }

  if (lastIndex < content.length) {
    chunks.push(content.slice(lastIndex));
  }

  return chunks;
}

function renderMarkdownParagraphs(content: string, keyPrefix: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = content.split("\n");
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index].trim();

    if (!currentLine) {
      index += 1;
      continue;
    }

    const heading = currentLine.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const headingContent = renderInlineMarkdown(heading[2], `${keyPrefix}-heading-${index}`);
      const headingClass =
        level === 1
          ? "text-base font-semibold text-[#1f3028]"
          : level === 2
            ? "text-[0.95rem] font-semibold text-[#24352d]"
            : "text-[0.88rem] font-semibold uppercase tracking-[0.06em] text-[#4d6257]";

      blocks.push(
        <p key={`${keyPrefix}-h-${index}`} className={headingClass}>
          {headingContent}
        </p>,
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(currentLine)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(
        <blockquote
          key={`${keyPrefix}-q-${index}`}
          className="rounded-r-lg border-l-4 border-[#cdb68f] bg-[#fef3dd] px-3 py-2 text-[#4a574e]"
        >
          {quoteLines.map((line, lineIndex) => (
            <p key={`${keyPrefix}-q-${index}-${lineIndex}`}>{renderInlineMarkdown(line, `${keyPrefix}-q-inline-${lineIndex}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(currentLine)) {
      const listItems: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        listItems.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }

      blocks.push(
        <ul key={`${keyPrefix}-ul-${index}`} className="ml-5 list-disc space-y-1 text-[#32433b] marker:text-[#6f5c3d]">
          {listItems.map((item, itemIndex) => (
            <li key={`${keyPrefix}-ul-item-${itemIndex}`}>{renderInlineMarkdown(item, `${keyPrefix}-ul-inline-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(currentLine)) {
      const listItems: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        listItems.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }

      blocks.push(
        <ol key={`${keyPrefix}-ol-${index}`} className="ml-5 list-decimal space-y-1 text-[#32433b] marker:font-semibold marker:text-[#6f5c3d]">
          {listItems.map((item, itemIndex) => (
            <li key={`${keyPrefix}-ol-item-${itemIndex}`}>{renderInlineMarkdown(item, `${keyPrefix}-ol-inline-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines = [lines[index]];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index].trim();
      if (!nextLine || /^(#{1,3})\s+/.test(nextLine) || /^>\s?/.test(nextLine) || /^[-*]\s+/.test(nextLine) || /^\d+\.\s+/.test(nextLine)) {
        break;
      }
      paragraphLines.push(lines[index]);
      index += 1;
    }

    const paragraph = paragraphLines.join(" ").trim();
    if (paragraph) {
      blocks.push(
        <p key={`${keyPrefix}-p-${index}`} className="leading-relaxed text-[#32433b]">
          {renderInlineMarkdown(paragraph, `${keyPrefix}-p-inline-${index}`)}
        </p>,
      );
    }
  }

  return blocks;
}

function renderAssistantMarkdown(content: string): ReactNode {
  const codeBlockRegex = /```([\w-]+)?\n?([\s\S]*?)```/g;
  const rendered: ReactNode[] = [];
  let last = 0;
  let blockIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.slice(last, match.index);
    if (textBefore.trim()) {
      rendered.push(
        <div key={`text-${blockIndex}`} className="space-y-2">
          {renderMarkdownParagraphs(textBefore, `text-${blockIndex}`)}
        </div>,
      );
    }

    const language = match[1] || "text";
    const code = match[2].replace(/\n$/, "");
    rendered.push(
      <figure key={`code-${blockIndex}`} className="overflow-hidden rounded-lg border border-[#d7c29a] bg-[#2f312f]">
        <figcaption className="border-b border-[#454a46] bg-[#3d413d] px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#efe6d7]">
          {language}
        </figcaption>
        <pre className="max-h-72 overflow-auto p-3 text-xs text-[#f7f1e5]">
          <code>{code}</code>
        </pre>
      </figure>,
    );

    last = codeBlockRegex.lastIndex;
    blockIndex += 1;
  }

  const remainder = content.slice(last);
  if (remainder.trim()) {
    rendered.push(
      <div key={`text-${blockIndex}`} className="space-y-2">
        {renderMarkdownParagraphs(remainder, `text-${blockIndex}`)}
      </div>,
    );
  }

  if (rendered.length === 0) {
    return <p className="leading-relaxed text-[#32433b]">{content}</p>;
  }

  return <div className="space-y-3">{rendered}</div>;
}

export function AdminManualAssistant() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content:
        "Hi, I am your operations helper. Ask me how this system works in plain language, and I will explain step by step.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastSources, setLastSources] = useState<string[]>([]);
  const [lastSourcePaths, setLastSourcePaths] = useState<string[]>([]);
  const [lastConfidence, setLastConfidence] = useState<"low" | "medium" | "high">("medium");
  const [lastScopeStatus, setLastScopeStatus] = useState<string>("in-scope");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || sending) {
      return;
    }

    const nextUserMessage: UiMessage = {
      id: createId(),
      role: "user",
      content: message,
    };

    const nextHistory = [...messages, nextUserMessage]
      .map((entry) => ({ role: entry.role, content: entry.content }))
      .slice(-8);

    setInput("");
    setError("");
    setSending(true);
    setMessages((current) => [...current, nextUserMessage]);

    try {
      const response = await fetch("/api/admin/manual-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: nextHistory,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "I could not answer right now. Please try again.");
      }

      const payload = (await response.json()) as ManualAssistantApiResponse;

      setLastSources(payload.sourceTitles);
      setLastSourcePaths(payload.sourcePaths ?? []);
      setLastConfidence(payload.confidence);
      setLastScopeStatus(payload.scope?.inScope ? "in-scope" : "out-of-scope");
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: payload.answer,
        },
      ]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "I could not answer right now. Please try again.");
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            "I hit a temporary issue. If this is urgent, start with the incident section and verify deployment, payments, and admin access in that order.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl text-[#1b2f25]">Ask the Operations Assistant</h2>
          <p className="mt-2 text-sm text-[#445349]">
            Describe what you are trying to do. You can ask things like where a setting lives, what an environment variable does, how deployment works,
            or where a behavior lives in the codebase.
          </p>
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[#deceb0] bg-[#fff4df] px-3 py-2 text-xs text-[#445349]">Confidence: {lastConfidence}</div>
          <div className="rounded-lg border border-[#deceb0] bg-[#fff4df] px-3 py-2 text-xs text-[#445349]">Scope: {lastScopeStatus}</div>
        </div>
      </div>

      <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto rounded-xl border border-[#deceb0] bg-[#fffdf6] p-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[92%] rounded-xl border px-3 py-2 text-sm shadow-sm ${
              message.role === "user"
                ? "ml-auto border-[#35506b] bg-gradient-to-br from-[#e8f0f8] to-[#ddeaf8] text-[#1f3449]"
                : "mr-auto border-[#d8c9ac] bg-gradient-to-br from-[#fff8e8] to-[#fff3d7] text-[#33443a]"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">{message.role === "user" ? "You" : "Assistant"}</p>
            <div className="mt-2">
              {message.role === "assistant" ? (
                renderAssistantMarkdown(message.content)
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {error ? <p className="mt-3 rounded-lg border border-[#e9b2a0] bg-[#fff0ea] p-3 text-sm text-[#8a3d22]">{error}</p> : null}

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <label htmlFor="admin-manual-assistant-input" className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">
          Your question
        </label>
        <textarea
          id="admin-manual-assistant-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Example: I need to rotate a Stripe webhook secret. Where do I do it and what should I verify after?"
          rows={3}
          className="w-full rounded-xl border border-[#c9bb9e] bg-white px-3 py-2 text-sm text-[#1b2f25] placeholder-[#9a978f]"
        />
        <button
          type="submit"
          disabled={sending || input.trim().length === 0}
          className="self-start rounded-lg border border-[#1b2f25] bg-[#1b2f25] px-4 py-2 text-sm font-semibold text-[#fff9eb] transition hover:bg-[#142420] disabled:cursor-not-allowed disabled:border-[#c9bb9e] disabled:bg-[#d7ccb5] disabled:text-[#726a5c]"
        >
          {sending ? "Thinking..." : "Ask assistant"}
        </button>
      </form>

      {lastSources.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">Sources used</p>
          <p className="mt-1 text-sm text-[#445349]">{lastSources.join(" | ")}</p>
          {lastSourcePaths.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">Codebase citations</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-[#445349]">
                {lastSourcePaths.map((sourcePath) => (
                  <li key={sourcePath}>{sourcePath}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}