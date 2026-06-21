/**
 * @param {string} text
 * @param {string} query
 * @returns {number} 0 = no match, higher = better
 */
export function fuzzyMatchScore(text, query) {
  const haystack = text.toLowerCase().trim();
  const needle = query.toLowerCase().trim();
  if (!needle) return 1;
  if (!haystack) return 0;

  if (haystack === needle) return 1000;
  if (haystack.startsWith(needle)) return 900 + needle.length;
  if (haystack.includes(needle)) return 700 + needle.length - haystack.indexOf(needle);

  const words = haystack.split(/\s+/);
  if (words.some((word) => word.startsWith(needle))) return 500 + needle.length;

  let qi = 0;
  let consecutive = 0;
  let bestConsecutive = 0;
  for (let i = 0; i < haystack.length && qi < needle.length; i++) {
    if (haystack[i] === needle[qi]) {
      qi++;
      consecutive++;
      bestConsecutive = Math.max(bestConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  if (qi === needle.length) {
    return 300 + bestConsecutive * 10 + needle.length;
  }

  return 0;
}

/**
 * @template {{ name: string }} T
 * @param {T[]} items
 * @param {string} query
 * @param {{ limit?: number }} [options]
 */
export function fuzzyFilterByName(items, query, options = {}) {
  const limit = options.limit ?? 50;
  const trimmed = query.trim();
  if (!trimmed) return items;

  return items
    .map((item) => ({ item, score: fuzzyMatchScore(item.name, trimmed) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
