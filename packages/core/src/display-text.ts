const WORD_PATTERN =
  /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?/g;

function formatDisplayWord(word: string) {
  const hasLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(word);

  if (!hasLetter) {
    return word;
  }

  if (word === word.toLocaleUpperCase("id-ID") && /[A-Z]/.test(word)) {
    return word;
  }

  return `${word.charAt(0).toLocaleUpperCase("id-ID")}${word
    .slice(1)
    .toLocaleLowerCase("id-ID")}`;
}

export function formatDisplayTitle(
  value: string | null | undefined,
  fallback = "",
) {
  const text = (value || fallback).trim().replace(/\s+/g, " ");

  if (!text) {
    return fallback;
  }

  return text.replace(WORD_PATTERN, formatDisplayWord);
}
