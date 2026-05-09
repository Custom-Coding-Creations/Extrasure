import { company, faqs, services } from "@/lib/site";

type KnowledgeMatch = {
  id: string;
  score: number;
  answer: string;
  source: string;
};

const baseKnowledge: KnowledgeMatch[] = [
  ...faqs.map((faq, index) => ({
    id: `faq_${index}`,
    score: 0,
    answer: `${faq.question}: ${faq.answer}`,
    source: "faq",
  })),
  ...services.map((service) => ({
    id: `service_${service.slug}`,
    score: 0,
    answer: `${service.name}: ${service.summary}. Signs: ${service.signs.join(", ")}. Typical process: ${service.process.join(", ")}. Starting price: ${service.startingAt}.`,
    source: "service",
  })),
  {
    id: "company_hours",
    score: 0,
    answer: `Business hours are ${company.hours.join("; ")}.`,
    source: "policy",
  },
  {
    id: "company_emergency",
    score: 0,
    answer: `Emergency policy: ${company.emergencyPolicy}`,
    source: "policy",
  },
];

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function getKnowledgeMatches(userInput: string, max = 3) {
  const tokens = tokenize(userInput);

  if (tokens.length === 0) {
    return [] as KnowledgeMatch[];
  }

  const scored = baseKnowledge
    .map((entry) => {
      const text = entry.answer.toLowerCase();
      const score = tokens.reduce((total, token) => total + (text.includes(token) ? 1 : 0), 0);
      return {
        ...entry,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, max);

  return scored;
}

export function buildKnowledgeContext(userInput: string) {
  const matches = getKnowledgeMatches(userInput);

  if (matches.length === 0) {
    return {
      confidence: "low" as const,
      contextText: "No direct internal FAQ or service match found.",
      sourceTypes: [] as string[],
    };
  }

  const contextText = matches
    .map((match, index) => `${index + 1}. ${match.answer}`)
    .join("\n");

  const confidence = matches[0].score >= 3 ? "high" : "medium";

  return {
    confidence,
    contextText,
    sourceTypes: Array.from(new Set(matches.map((match) => match.source))),
  };
}
