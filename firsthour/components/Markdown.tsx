import React from "react";

// Minimal chat markdown renderer (ported from the prototype): bold, headers, before/after diff
// cards, and pipe-tables rendered monospaced. Intentionally small — chat output is short-form.
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let tableBuf: string[] = [];

  const flushTable = (key: string) => {
    if (tableBuf.length) {
      out.push(
        <pre
          key={key}
          className="overflow-x-auto text-xs leading-relaxed my-2 p-3 rounded-lg font-mono"
          style={{ background: "#0F1728", color: "#EEF1F5" }}
        >
          {tableBuf.join("\n")}
        </pre>
      );
      tableBuf = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.trim().startsWith("|")) {
      tableBuf.push(line);
      return;
    }
    flushTable("t" + i);

    if (/^\s*(\*\*)?Before:/.test(line)) {
      out.push(
        <p
          key={i}
          className="leading-relaxed text-xs my-1 px-3 py-2 rounded-lg"
          style={{ background: "#FEF3F2", color: "#912018", borderLeft: "3px solid #F04438" }}
        >
          {line.replace(/\*\*/g, "")}
        </p>
      );
      return;
    }
    if (/^\s*(\*\*)?After:/.test(line)) {
      out.push(
        <p
          key={i}
          className="leading-relaxed text-xs my-1 px-3 py-2 rounded-lg"
          style={{ background: "#E0F2F7", color: "#0E4A5C", borderLeft: "3px solid #0E7490" }}
        >
          {line.replace(/\*\*/g, "")}
        </p>
      );
      return;
    }
    if (/^#{1,3}\s/.test(line)) {
      out.push(
        <p key={i} className="font-display font-semibold mt-3 mb-1 text-ink">
          {line.replace(/^#{1,3}\s/, "")}
        </p>
      );
      return;
    }
    if (line.trim() === "") {
      out.push(<div key={i} className="h-2" />);
      return;
    }

    const boldParts = line.split(/\*\*(.+?)\*\*/g);
    out.push(
      <p key={i} className="leading-relaxed">
        {boldParts.map((p, j) =>
          j % 2 === 1 ? (
            <strong key={j} className="font-semibold text-ink">
              {p}
            </strong>
          ) : (
            <React.Fragment key={j}>{p}</React.Fragment>
          )
        )}
      </p>
    );
  });

  flushTable("tEnd");
  return <>{out}</>;
}
