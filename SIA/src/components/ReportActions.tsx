"use client";

import { useState } from "react";
import { Check, Copy, Download, FileJson } from "lucide-react";

export default function ReportActions({
  id,
  markdown,
  jsonPayload,
}: {
  id: number;
  markdown: string;
  jsonPayload: unknown;
}) {
  const [copied, setCopied] = useState(false);

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={() => download(`script-report-${id}.md`, markdown, "text/markdown")}
      >
        <Download size={14} /> Report (Markdown)
      </button>
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={() =>
          download(`script-analysis-${id}.json`, JSON.stringify(jsonPayload, null, 2), "application/json")
        }
      >
        <FileJson size={14} /> Full JSON
      </button>
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={async () => {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy report"}
      </button>
    </div>
  );
}
