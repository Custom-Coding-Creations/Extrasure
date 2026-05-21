import { retrievalCorpus } from "@/lib/admin-manual-retrieval-corpus";

type RetrievalChunk = {
  id: string;
  path: string;
  title: string;
  text: string;
};

type RetrievalMatch = RetrievalChunk & {
  score: number;
};

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s/_.-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreChunk(chunk: RetrievalChunk, tokens: string[], query: string) {
  if (tokens.length === 0) {
    return 0;
  }

  const haystack = `${chunk.title} ${chunk.path} ${chunk.text}`.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (chunk.path.toLowerCase().includes(token)) {
      score += 4;
    }

    if (chunk.title.toLowerCase().includes(token)) {
      score += 3;
    }

    if (haystack.includes(token)) {
      score += 1;
    }
  }

  const queryLower = query.toLowerCase().trim();
  if (queryLower.length > 8 && haystack.includes(queryLower)) {
    score += 10;
  }

  return score;
}

function formatContext(matches: RetrievalMatch[]) {
  return matches
    .map((match, index) => {
      return `${index + 1}. [${match.path}] ${match.text}`;
    })
    .join("\n\n");
}

function uniquePaths(matches: RetrievalMatch[]) {
  return Array.from(new Set(matches.map((match) => match.path)));
}

export async function retrieveAdminManualContext(query: string, max = 6) {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return {
      matches: [] as RetrievalMatch[],
      contextText: "",
      sourcePaths: [] as string[],
    };
  }

  const matches = retrievalCorpus
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, tokens, query),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return {
    matches,
    contextText: formatContext(matches),
    sourcePaths: uniquePaths(matches),
  };
}
