export function countKnowledgeTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}
