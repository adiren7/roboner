function offsetInRoot(root: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

/** Character offsets in fullText for a selection inside `root` (0-based, end exclusive). */
export function rangeToOffsets(
  root: Node,
  fullText: string,
  range: Range
): { start: number; end: number } | null {
  if (range.collapsed) return null;
  const start = offsetInRoot(root, range.startContainer, range.startOffset);
  const end = offsetInRoot(root, range.endContainer, range.endOffset);
  if (start < 0 || end < start || end > fullText.length) return null;
  // Verify slice matches selected text
  if (fullText.slice(start, end) !== range.toString()) {
    // Still return if close (whitespace); otherwise null
    const t = range.toString();
    if (t && fullText.slice(start, end) !== t) return null;
  }
  return { start, end };
}

export function getSelectionOffsets(
  root: HTMLElement,
  fullText: string
): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return rangeToOffsets(root, fullText, range);
}
