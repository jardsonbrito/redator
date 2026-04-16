/**
 * diffWords — diff de texto baseado em LCS (Longest Common Subsequence) por cláusulas.
 * Cada token é uma cláusula inteira (trecho até vírgula, ponto, ponto-e-vírgula etc.).
 * Alterações são marcadas por cláusula completa — menos poluição visual, leitura pedagógica.
 */

export type DiffBlock =
  | { type: 'equal'; text: string }
  | { type: 'change'; before: string; after: string };

export interface DiffResult {
  blocks: DiffBlock[];
  /** true quando os textos são muito diferentes (< 30% de similaridade) */
  tooLarge: boolean;
}

// ─── Tokenização ──────────────────────────────────────────────────────────────

/**
 * Separa o texto em cláusulas (até vírgula, ponto, ponto-e-vírgula, ! ou ?),
 * preservando quebras de parágrafo como token especial '\n'.
 * Ex: "A educação é um direito, não um privilégio. Porém, há muito a melhorar."
 *  → ["A educação é um direito,", "não um privilégio.", "Porém,", "há muito a melhorar."]
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      // Divide após pontuação seguida de espaço (lookbehind)
      const clausulas = line
        .split(/(?<=[.,;!?])\s+/)
        .map(c => c.trim())
        .filter(Boolean);
      tokens.push(...clausulas);
    }
    if (i < lines.length - 1) tokens.push('\n');
  }
  return tokens;
}

/** Reconstrói texto a partir de tokens, respeitando '\n' como quebra de linha */
function tokensToText(tokens: string[]): string {
  let result = '';
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '\n') {
      result += '\n';
    } else {
      if (i > 0 && tokens[i - 1] !== '\n') result += ' ';
      result += tokens[i];
    }
  }
  return result;
}

// ─── LCS ─────────────────────────────────────────────────────────────────────

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

type RawToken =
  | { type: 'equal'; word: string }
  | { type: 'removed'; word: string }
  | { type: 'added'; word: string };

function backtrack(dp: number[][], a: string[], b: string[]): RawToken[] {
  const result: RawToken[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: 'equal', word: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', word: b[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', word: a[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

// ─── Agrupamento ──────────────────────────────────────────────────────────────

/** Agrupa tokens brutos em blocos contínuos de alteração */
function groupTokens(raw: RawToken[]): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  let equalWords: string[] = [];
  let removedWords: string[] = [];
  let addedWords: string[] = [];

  const flushEqual = () => {
    if (equalWords.length > 0) {
      blocks.push({ type: 'equal', text: tokensToText(equalWords) });
      equalWords = [];
    }
  };

  const flushChange = () => {
    if (removedWords.length > 0 || addedWords.length > 0) {
      blocks.push({
        type: 'change',
        before: tokensToText(removedWords),
        after: tokensToText(addedWords),
      });
      removedWords = [];
      addedWords = [];
    }
  };

  for (const token of raw) {
    if (token.type === 'equal') {
      flushChange();
      equalWords.push(token.word);
    } else if (token.type === 'removed') {
      flushEqual();
      removedWords.push(token.word);
    } else {
      // added
      flushEqual();
      addedWords.push(token.word);
    }
  }
  flushChange();
  flushEqual();

  return blocks;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Calcula o diff entre dois textos agrupando alterações em blocos contínuos.
 * Se a similaridade for < 30%, retorna `tooLarge: true` (reescrita total).
 */
export function diffWords(original: string, lapidada: string): DiffResult {
  const a = tokenize(original);
  const b = tokenize(lapidada);

  if (a.length === 0 || b.length === 0) {
    return { blocks: [{ type: 'equal', text: lapidada }], tooLarge: false };
  }

  const dp = computeLCS(a, b);
  const lcsLen = dp[a.length][b.length];
  const similarity = lcsLen / Math.max(a.length, b.length);

  if (similarity < 0.30) {
    return { blocks: [], tooLarge: true };
  }

  const raw = backtrack(dp, a, b);
  const blocks = groupTokens(raw);
  return { blocks, tooLarge: false };
}
