/**
 * BudgetBrain — Smart Email Domain Typo Detection & Auto-Correction Utility
 *
 * Detects common mobile/keyboard domain typos (e.g. gnail.com, gmai.com, hotmial.com)
 * and calculates single-character Levenshtein distance against popular email providers.
 */

const POPULAR_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'protonmail.com',
  'zoho.com',
];

const COMMON_TYPO_MAP: Record<string, string> = {
  // Gmail typos
  'gnail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmaio.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.om': 'gmail.com',

  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',

  // Hotmail & Outlook typos
  'hotmial.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'homail.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outook.com': 'outlook.com',

  // iCloud typos
  'icoud.com': 'icloud.com',
  'iclud.com': 'icloud.com',
  'icould.com': 'icloud.com',
};

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks an email address for domain typos.
 * Returns the suggested corrected email string if a typo is found, or null if valid / unrecognised.
 */
export function suggestEmailCorrection(email: string): string | null {
  if (!email || !email.includes('@')) return null;

  const trimmed = email.trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return null;

  const username = parts[0];
  const domain = parts[1].toLowerCase();

  if (!username || !domain || !domain.includes('.')) return null;

  // 1. Direct dictionary match
  if (COMMON_TYPO_MAP[domain]) {
    return `${username}@${COMMON_TYPO_MAP[domain]}`;
  }

  // 2. Fuzzy Levenshtein match (distance of 1 for minor single-letter slip)
  for (const validDomain of POPULAR_DOMAINS) {
    if (domain === validDomain) return null; // exact valid match
    if (levenshteinDistance(domain, validDomain) === 1) {
      return `${username}@${validDomain}`;
    }
  }

  return null;
}
