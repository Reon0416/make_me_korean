import type { QuizMode, QuizQuestion, VocabularyItem } from './types';

const HEADER_ALIASES = {
  korean: ['韓国語', 'ハングル', '単語', 'korean'],
  reading: ['読み方', '読み', '発音', 'カタカナ'],
  japanese: ['日本語の意味', '日本語', '意味', '訳'],
  explanation: ['解説', '説明', '例文', 'メモ'],
};

export function parseVocabulary(values: string[][]): VocabularyItem[] {
  if (values.length < 2) return [];

  const header = values[0].map((value) => value.trim());
  const columns = resolveColumns(header);

  return values
    .slice(1)
    .map((row) => ({
      korean: String(row[columns.korean] ?? '').trim(),
      reading: columns.reading >= 0 ? String(row[columns.reading] ?? '').trim() : '',
      japanese: String(row[columns.japanese] ?? '').trim(),
      explanation: columns.explanation >= 0 ? String(row[columns.explanation] ?? '').trim() : '',
    }))
    .filter((item) => item.korean && item.japanese);
}

export function createQuestion(vocabulary: VocabularyItem[], mode: QuizMode): QuizQuestion {
  if (vocabulary.length < 3) {
    throw new Error('3択を作るため、単語データを3行以上入れてください。');
  }

  const quizMode =
    mode === 'ko_to_ja' || mode === 'ja_to_ko'
      ? mode
      : Math.random() < 0.5
        ? 'ko_to_ja'
        : 'ja_to_ko';

  const item = pickOne(vocabulary);
  const question = quizMode === 'ko_to_ja' ? item.korean : item.japanese;
  const answer = quizMode === 'ko_to_ja' ? item.japanese : item.korean;
  const choiceKey = quizMode === 'ko_to_ja' ? 'japanese' : 'korean';

  return {
    id: crypto.randomUUID(),
    mode: quizMode,
    promptLabel: quizMode === 'ko_to_ja' ? '韓国語 → 日本語' : '日本語 → ハングル',
    inputType: 'choice',
    question,
    answer,
    choices: buildChoices(vocabulary, item, choiceKey),
    korean: item.korean,
    reading: item.reading,
    japanese: item.japanese,
    explanation: item.explanation,
  };
}

export function isAnswerCorrect(mode: QuizQuestion['mode'], userAnswer: string, correctAnswer: string) {
  if (mode === 'ja_to_ko' || mode === 'ko_to_ja') {
    return normalize(userAnswer) === normalize(correctAnswer);
  }

  const normalizedUserAnswer = normalize(userAnswer);
  const acceptedAnswers = correctAnswer
    .split(/[／/、,・|]/)
    .map(normalize)
    .filter(Boolean);

  return acceptedAnswers.some(
    (answer) =>
      normalizedUserAnswer === answer ||
      normalizedUserAnswer.includes(answer) ||
      answer.includes(normalizedUserAnswer),
  );
}

export function fallbackExplanation(question: QuizQuestion) {
  return `韓国語: ${question.korean} / 読み方: ${question.reading || '-'} / 意味: ${question.japanese}`;
}

function resolveColumns(header: string[]) {
  const find = (aliases: string[]) => aliases.map((alias) => header.indexOf(alias)).find((index) => index >= 0);
  const korean = find(HEADER_ALIASES.korean);
  const japanese = find(HEADER_ALIASES.japanese);

  if (korean === undefined || japanese === undefined) {
    throw new Error('見出し行に「韓国語」と「日本語の意味」を入れてください。');
  }

  return {
    korean,
    japanese,
    reading: find(HEADER_ALIASES.reading) ?? -1,
    explanation: find(HEADER_ALIASES.explanation) ?? -1,
  };
}

function pickOne<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildChoices(vocabulary: VocabularyItem[], correctItem: VocabularyItem, key: 'korean' | 'japanese') {
  const distractors = shuffle(vocabulary.filter((item) => item[key] !== correctItem[key]))
    .slice(0, 2)
    .map((item) => item[key]);

  return shuffle([correctItem[key], ...distractors]);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[。、,.!！?？\s　~〜～]/g, '')
    .trim();
}
