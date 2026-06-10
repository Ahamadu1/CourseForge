// Strips markdown formatting from one raw block so TTS reads clean prose.
function cleanBlock(raw: string): string {
  return raw
    // Fenced code blocks → audible placeholder
    .replace(/```[\s\S]*?```/g, " [code example] ")
    // Inline code → bare text
    .replace(/`([^`]+)`/g, "$1")
    // Heading markers
    .replace(/^#{1,6}\s+/gm, "")
    // Bold / italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Links — keep display text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Images — drop entirely
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    // Blockquote markers
    .replace(/^>\s*/gm, "")
    // Unordered / ordered list markers
    .replace(/^[ \t]*[-*+]\s+/gm, "")
    .replace(/^[ \t]*\d+\.\s+/gm, "")
    // Horizontal rules
    .replace(/^[-*_]{3,}$/gm, "")
    // Collapse newlines into spaces
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Accepts an array of raw markdown blocks (split on blank lines) and returns
 * a parallel array of plain-text strings ready for speechSynthesis.
 * Empty strings in the output signal blocks that should be skipped by the TTS.
 */
export function prepareBlocks(blocks: string[]): string[] {
  return blocks.map(cleanBlock);
}
