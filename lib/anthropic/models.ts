// Model selection strategy:
//   SONNET — complex generation that requires strong reasoning and creativity:
//             course outlines, lesson content, goal breakdowns.
//   HAIKU  — structured/constrained output where speed and cost matter more
//             than creative depth: quiz generation, knowledge-check questions.
//   OPUS   — reserved for future tasks that need maximum reasoning (e.g.
//             adaptive curriculum re-planning, weak-spot analysis).

export const MODELS = {
  SONNET: "claude-sonnet-4-6",
  HAIKU:  "claude-haiku-4-5-20251001",
  OPUS:   "claude-opus-4-7",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
