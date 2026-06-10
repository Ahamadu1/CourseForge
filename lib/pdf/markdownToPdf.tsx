// Converts Markdown strings into react-pdf View/Text elements.
// Runs server-side only — no "use client".
// Handles: H2–H4, paragraphs, bullet + ordered lists, HR, inline bold/italic/code.

import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

const S = StyleSheet.create({
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: "#3C3489",
    lineHeight: 1.3,
    marginTop: 14,
    marginBottom: 5,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#3C3489",
    lineHeight: 1.3,
    marginTop: 10,
    marginBottom: 4,
  },
  h4: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#7F77DD",
    lineHeight: 1.3,
    marginTop: 8,
    marginBottom: 3,
  },
  body: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.65,
    color: "#1C1C1C",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletMarker: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#7F77DD",
    width: 16,
    flexShrink: 0,
  },
  hr: {
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 0.5,
    marginTop: 10,
    marginBottom: 12,
  },
  code: {
    fontFamily: "Courier",
    fontSize: 9.5,
    color: "#374151",
  },
});

// ─── Inline parser ────────────────────────────────────────────────────────────

type Seg = { k: "text" | "bold" | "italic" | "boldItalic" | "code"; t: string };

function parseSegments(text: string): Seg[] {
  const out: Seg[] = [];
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ k: "text", t: text.slice(last, m.index) });
    if (m[2])      out.push({ k: "boldItalic", t: m[2] });
    else if (m[3]) out.push({ k: "bold",       t: m[3] });
    else if (m[4]) out.push({ k: "italic",     t: m[4] });
    else if (m[5]) out.push({ k: "code",       t: m[5] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ k: "text", t: text.slice(last) });
  return out.length > 0 ? out : [{ k: "text", t: text }];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderInline(text: string, baseStyle: any): React.ReactElement {
  const segs = parseSegments(text);
  if (segs.length === 1 && segs[0].k === "text") {
    return <Text style={baseStyle}>{text}</Text>;
  }
  return (
    <Text style={baseStyle}>
      {segs.map((seg, i) => {
        if (seg.k === "bold")
          return <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>{seg.t}</Text>;
        if (seg.k === "italic")
          return <Text key={i} style={{ fontFamily: "Helvetica-Oblique" }}>{seg.t}</Text>;
        if (seg.k === "boldItalic")
          return <Text key={i} style={{ fontFamily: "Helvetica-BoldOblique" }}>{seg.t}</Text>;
        if (seg.k === "code")
          return <Text key={i} style={S.code}>{seg.t}</Text>;
        return <Text key={i}>{seg.t}</Text>;
      })}
    </Text>
  );
}

function stripMarkers(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

// ─── Block parser ─────────────────────────────────────────────────────────────

type Block =
  | { t: "h2" | "h3" | "h4"; text: string }
  | { t: "para"; text: string }
  | { t: "bullet" | "ordered"; items: string[] }
  | { t: "hr" };

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (line.startsWith("#### ")) { blocks.push({ t: "h4", text: line.slice(5) }); i++; continue; }
    if (line.startsWith("### "))  { blocks.push({ t: "h3", text: line.slice(4) }); i++; continue; }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      blocks.push({ t: "h2", text: line.replace(/^#+\s+/, "") }); i++; continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { blocks.push({ t: "hr" }); i++; continue; }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (/^[-*•]\s+/.test(l)) { items.push(l.replace(/^[-*•]\s+/, "")); i++; }
        else if (!l) { i++; break; }
        else break;
      }
      blocks.push({ t: "bullet", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (/^\d+[.)]\s+/.test(l)) { items.push(l.replace(/^\d+[.)]\s+/, "")); i++; }
        else if (!l) { i++; break; }
        else break;
      }
      blocks.push({ t: "ordered", items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l) { i++; break; }
      if (/^#+\s/.test(l) || /^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l) || /^(-{3,}|\*{3,}|_{3,})$/.test(l)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) blocks.push({ t: "para", text: paraLines.join(" ") });
  }

  return blocks;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function renderMarkdownToPdf(content: string): React.ReactElement[] {
  return parseBlocks(content).map((block, idx) => {
    switch (block.t) {
      case "h2":
        return <View key={idx}><Text style={S.h2}>{stripMarkers(block.text)}</Text></View>;
      case "h3":
        return <View key={idx}><Text style={S.h3}>{stripMarkers(block.text)}</Text></View>;
      case "h4":
        return <View key={idx}><Text style={S.h4}>{stripMarkers(block.text)}</Text></View>;
      case "para":
        return <View key={idx} style={{ marginBottom: 7 }}>{renderInline(block.text, S.body)}</View>;
      case "bullet":
        return (
          <View key={idx} style={{ marginBottom: 7 }}>
            {block.items.map((item, j) => (
              <View key={j} style={S.bulletRow}>
                <Text style={S.bulletMarker}>•</Text>
                <View style={{ flex: 1 }}>{renderInline(item, S.body)}</View>
              </View>
            ))}
          </View>
        );
      case "ordered":
        return (
          <View key={idx} style={{ marginBottom: 7 }}>
            {block.items.map((item, j) => (
              <View key={j} style={S.bulletRow}>
                <Text style={[S.bulletMarker, { width: 20 }]}>{j + 1}.</Text>
                <View style={{ flex: 1 }}>{renderInline(item, S.body)}</View>
              </View>
            ))}
          </View>
        );
      case "hr":
        return <View key={idx} style={S.hr} />;
    }
  });
}
