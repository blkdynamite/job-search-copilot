"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  ContentBlock,
  LOADING_SETS,
  OPENING,
  PHASES,
} from "@/lib/chat";
import { Markdown } from "./Markdown";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

// API-shaped history: user messages carry content blocks; assistant messages are their display text.
function toApiMessages(msgs: ChatMessage[]) {
  return msgs
    .filter((m) => m.api !== null || m.role === "assistant")
    .map((m) =>
      m.role === "user"
        ? { role: "user" as const, content: m.api as ContentBlock[] }
        : { role: "assistant" as const, content: m.display }
    );
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loadingSet, setLoadingSet] = useState<string[]>(LOADING_SETS["0"]);
  const [tick, setTick] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, tick]);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, [loading]);

  async function send() {
    if (loading) return;
    const text = input.trim();
    if (!text && !pendingFile) return;
    setError(null);

    const hadFile = !!pendingFile;
    setLoadingSet(hadFile ? LOADING_SETS.file : LOADING_SETS[String(phase)] ?? LOADING_SETS["0"]);
    setTick(0);

    const apiContent: ContentBlock[] = [];
    let displayText = text;
    try {
      if (pendingFile) {
        const b64 = await readFileAsBase64(pendingFile);
        apiContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: b64 },
        });
        displayText = `📄 ${pendingFile.name}` + (text ? `\n${text}` : "");
      }
      apiContent.push({ type: "text", text: text || "Here is my resume." });
    } catch {
      setError("Couldn't read that file. Try again or paste the text.");
      return;
    }

    const userMsg: ChatMessage = { role: "user", display: displayText, api: apiContent };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setPendingFile(null);
    setLoading(true);

    // Placeholder assistant bubble we stream into.
    setMessages((prev) => [...prev, { role: "assistant", display: "", api: null, phase }]);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toApiMessages(next) }),
      });
      if (!resp.ok || !resp.body) throw new Error(await resp.text().catch(() => "Request failed"));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      const applyMarker = (raw: string) => {
        const m = raw.match(/^\s*\[PHASE:(\d)\]\s*/);
        let display = raw;
        let ph = phase;
        if (m) {
          ph = parseInt(m[1], 10);
          display = raw.replace(m[0], "");
          setPhase(ph);
        }
        return { display, ph };
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const lines = ev.split("\n");
          const type = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
          if (!dataLine) continue;
          const data = JSON.parse(dataLine);
          if (type === "delta") {
            acc += data.text;
            const { display } = applyMarker(acc);
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: "assistant", display, api: null, phase };
              return copy;
            });
          } else if (type === "done") {
            const { display, ph } = applyMarker(data.text || acc);
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: "assistant", display, api: null, phase: ph };
              return copy;
            });
          } else if (type === "error") {
            throw new Error(data.message);
          }
        }
      }
    } catch (e) {
      // Drop the empty streaming bubble and surface the error.
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].role === "assistant" && !copy[copy.length - 1].display) {
          copy.pop();
        }
        return copy;
      });
      setError(e instanceof Error ? e.message : "Something went wrong. Send again to retry.");
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const streaming = loading && messages[messages.length - 1]?.role === "assistant" && !!messages[messages.length - 1]?.display;

  return (
    <div className="min-h-screen flex flex-col font-body text-slate">
      {/* Header */}
      <header
        className="px-5 py-4 flex items-center justify-between border-b bg-white"
        style={{ borderColor: "#D7DEE8" }}
      >
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-display font-bold tracking-tight text-ink">
            First<span className="text-amber">Hour</span>
          </span>
          <span className="text-xs uppercase tracking-widest font-mono" style={{ color: "#98A2B3" }}>
            beta
          </span>
        </div>
        <div className="text-xs font-mono text-slate">
          <span className="text-amber">●</span> the swarm hasn&apos;t found them yet
        </div>
      </header>

      {/* Phase rail */}
      <div
        className="px-5 py-3 flex items-center border-b overflow-x-auto"
        style={{ borderColor: "#D7DEE8", background: "#F8FAFC" }}
      >
        {PHASES.map((p, i) => {
          const active = phase === p.n;
          const done = phase > p.n;
          return (
            <div key={p.n} className="flex items-center shrink-0">
              {i > 0 && (
                <div
                  className="w-8 h-px mx-1"
                  style={{ background: done || active ? "#0E7490" : "#D7DEE8" }}
                />
              )}
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium font-mono"
                style={{
                  background: active ? "#0E7490" : done ? "#E0F2F7" : "transparent",
                  color: active ? "#FFFFFF" : done ? "#0E7490" : "#98A2B3",
                }}
              >
                <span>{done ? "✓" : p.n}</span>
                <span>{p.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] px-4 py-3 rounded-2xl text-sm"
                style={
                  m.role === "user"
                    ? { background: "#0F1728", color: "#EEF1F5", borderBottomRightRadius: 6 }
                    : { background: "#FFFFFF", color: "#344054", border: "1px solid #E4E9F0", borderBottomLeftRadius: 6 }
                }
              >
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap leading-relaxed">{m.display}</div>
                ) : (
                  <Markdown text={m.display} />
                )}
              </div>
            </div>
          ))}
          {loading && !streaming && (
            <div className="flex justify-start">
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-mono text-teal"
                style={{ background: "#FFFFFF", border: "1px solid #E4E9F0" }}
              >
                <span className="fh-pulse text-amber">●</span>
                <span>{loadingSet[tick % loadingSet.length]}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="text-xs px-4 py-2 rounded-lg" style={{ background: "#FEF3F2", color: "#B42318" }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 pb-5 pt-2 bg-dawn">
        <div className="max-w-2xl mx-auto">
          {pendingFile && (
            <div
              className="flex items-center gap-2 mb-2 text-xs px-3 py-2 rounded-lg w-fit font-mono text-amber"
              style={{ background: "#FFF6ED" }}
            >
              📄 {pendingFile.name}
              <button onClick={() => setPendingFile(null)} className="ml-1 font-bold" style={{ color: "#B54708" }}>
                ×
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 p-2 rounded-2xl bg-white" style={{ border: "1px solid #D7DEE8" }}>
            <button
              onClick={() => fileRef.current?.click()}
              title="Upload resume (PDF)"
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "#F2F4F7", color: "#475467" }}
            >
              +
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPendingFile(f);
                e.target.value = "";
              }}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder={phase === 0 ? "Paste your resume, or attach the PDF…" : "Reply, or paste job links…"}
              className="flex-1 resize-none outline-none text-sm py-2 bg-transparent text-ink"
              style={{ minHeight: 38, maxHeight: 140 }}
            />
            <button
              onClick={send}
              disabled={loading || (!input.trim() && !pendingFile)}
              className="shrink-0 px-4 h-9 rounded-xl text-sm font-display font-semibold text-white"
              style={{ background: loading || (!input.trim() && !pendingFile) ? "#D7DEE8" : "#DC6803" }}
            >
              Send
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "#98A2B3" }}>
            Nothing here is invented — every line must survive an interview.
          </p>
        </div>
      </div>
    </div>
  );
}
