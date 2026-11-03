export function caseHealthScore(input: { facts: number; parties: number; documents: number; citations: number }): number {
  const facts = input.facts >= 30 ? 30 : 0;
  const parties = Math.min(40, input.parties * 20);
  const documents = Math.min(15, input.documents * 5);
  const citations = Math.min(15, input.citations * 5);
  return facts + parties + documents + citations;
}
