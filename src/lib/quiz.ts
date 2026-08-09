import type { MistakeItem, NumberItem, NumberKind, NumberQuizKind, QuizMode, QuizQuestion, VocabularyItem } from './types';

const HEADER_ALIASES = {
  number: ['数字', '番号', '数', 'number', 'value'],
  korean: ['韓国語', 'ハングル', '単語', '固有数詞', '漢数詞', 'korean'],
  reading: ['読み方', '読み', '発音', 'カタカナ'],
  japanese: ['日本語の意味', '日本語', '意味', '訳'],
  explanation: ['解説', '説明', '例文', 'メモ', '使い方'],
};

type QuizSourceItem = VocabularyItem & {
  rowNumber?: number;
  kind?: NumberKind;
  value?: string;
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

export function parseNumberVocabulary(values: string[][], kind: NumberKind): NumberItem[] {
  if (values.length < 2) return [];

  const header = values[0].map((value) => value.trim());
  const columns = resolveColumns(header, { allowNumberFallback: true });
  const numberColumn = findColumn(header, HEADER_ALIASES.number) ?? -1;

  return values
    .slice(1)
    .map((row, index) => {
      const value = numberColumn >= 0 ? String(row[numberColumn] ?? '').trim() : String(index + 1);
      const japanese = columns.japanese >= 0 ? String(row[columns.japanese] ?? '').trim() : value;
      const explanation = columns.explanation >= 0 ? String(row[columns.explanation] ?? '').trim() : '';

      return {
        value,
        kind,
        korean: String(row[columns.korean] ?? '').trim(),
        reading: columns.reading >= 0 ? String(row[columns.reading] ?? '').trim() : '',
        japanese: japanese || value,
        explanation,
      };
    })
    .filter((item) => item.value && item.korean && item.japanese);
}

export function createQuestion(
  vocabulary: VocabularyItem[],
  mode: QuizMode,
  excludedItemKeys: string[] = [],
): QuizQuestion {
  return buildQuestion(vocabulary, mode, 'vocabulary', excludedItemKeys);
}

export function createMistakeQuestion(
  mistakes: MistakeItem[],
  mode: QuizMode,
  excludedItemKeys: string[] = [],
): QuizQuestion {
  return buildQuestion(mistakes, mode, 'mistake', excludedItemKeys);
}

export function createNumberQuestion(
  numbers: NumberItem[],
  mode: QuizMode,
  kind: NumberQuizKind,
  excludedItemKeys: string[] = [],
): QuizQuestion {
  const candidates = kind === 'mixed' ? numbers : numbers.filter((item) => item.kind === kind);
  return buildQuestion(candidates, mode, 'number', excludedItemKeys);
}

export function isAnswerCorrect(mode: QuizQuestion['mode'], userAnswer: string, correctAnswer: string) {
  if (mode === 'ja_to_ko' || mode === 'ko_to_ja') {
    return normalize(userAnswer) === normalize(correctAnswer);
  }

  const normalizedUserAnswer = normalize(userAnswer);
  const acceptedAnswers = correctAnswer
    .split(/[、,・/|]/)
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
  const numberPrefix = question.numberValue ? `数字: ${question.numberValue} / ` : '';
  return `${numberPrefix}韓国語: ${question.korean} / 読み方: ${question.reading || '-'} / 意味: ${question.japanese}`;
}

function buildQuestion(
  items: QuizSourceItem[],
  mode: QuizMode,
  source: QuizQuestion['source'],
  excludedItemKeys: string[] = [],
): QuizQuestion {
  if (items.length < 3) {
    const target = source === 'mistake' ? '未解決の間違い単語' : source === 'number' ? '数字データ' : '単語データ';
    throw new Error(`3択を作るため、${target}を3件以上入れてください。`);
  }

  const quizMode =
    mode === 'ko_to_ja' || mode === 'ja_to_ko'
      ? mode
      : Math.random() < 0.5
        ? 'ko_to_ja'
        : 'ja_to_ko';

  const excluded = new Set(excludedItemKeys);
  const eligibleItems = items.filter((candidate) => !excluded.has(getItemKey(candidate, source)));
  const item = pickOne(eligibleItems.length ? eligibleItems : items);
  const question = quizMode === 'ko_to_ja' ? item.korean : getJapanesePrompt(item, source);
  const answer = quizMode === 'ko_to_ja' ? item.japanese : item.korean;
  const choiceKey = quizMode === 'ko_to_ja' ? 'japanese' : 'korean';
  const numberLabel = item.kind === 'native' ? '固有数詞' : item.kind === 'sino' ? '漢数詞' : '';

  return {
    id: crypto.randomUUID(),
    itemKey: getItemKey(item, source),
    totalItems: items.length,
    mode: quizMode,
    promptLabel:
      source === 'number'
        ? `${numberLabel} ${quizMode === 'ko_to_ja' ? '韓国語 → 日本語' : '日本語 → ハングル'}`
        : quizMode === 'ko_to_ja'
          ? '韓国語 → 日本語'
          : '日本語 → ハングル',
    inputType: 'choice',
    question,
    answer,
    choices: buildChoices(items, item, choiceKey),
    korean: item.korean,
    reading: item.reading,
    japanese: item.japanese,
    explanation: item.explanation,
    source,
    mistakeRowNumber: source === 'mistake' ? item.rowNumber : undefined,
    numberKind: source === 'number' ? item.kind : undefined,
    numberValue: source === 'number' ? item.value : undefined,
  };
}

function getJapanesePrompt(item: QuizSourceItem, source: QuizQuestion['source']) {
  if (source === 'number' && item.value && item.japanese !== item.value) {
    return `${item.value} / ${item.japanese}`;
  }

  return item.japanese;
}

function getItemKey(item: QuizSourceItem, source: QuizQuestion['source']) {
  const prefix = source ?? 'vocabulary';

  if (source === 'mistake' && item.rowNumber) {
    return `${prefix}:${item.rowNumber}:${normalizeKey(item.korean)}:${normalizeKey(item.japanese)}`;
  }

  if (source === 'number') {
    return `${prefix}:${item.kind ?? 'number'}:${normalizeKey(item.value ?? '')}:${normalizeKey(item.korean)}:${normalizeKey(item.japanese)}`;
  }

  return `${prefix}:${normalizeKey(item.korean)}:${normalizeKey(item.japanese)}`;
}

function normalizeKey(value: string) {
  return normalize(value).replace(/[:|]/g, '');
}

function resolveColumns(header: string[], options?: { allowNumberFallback?: boolean }) {
  const korean = findColumn(header, HEADER_ALIASES.korean);
  const japanese = findColumn(header, HEADER_ALIASES.japanese);
  const number = findColumn(header, HEADER_ALIASES.number);

  if (korean === undefined || (japanese === undefined && !(options?.allowNumberFallback && number !== undefined))) {
    throw new Error('見出し行に「韓国語」と「日本語の意味」を入れてください。');
  }

  return {
    korean,
    japanese: japanese ?? -1,
    reading: findColumn(header, HEADER_ALIASES.reading) ?? -1,
    explanation: findColumn(header, HEADER_ALIASES.explanation) ?? -1,
  };
}

function findColumn(header: string[], aliases: string[]) {
  return aliases.map((alias) => header.indexOf(alias)).find((index) => index >= 0);
}

function pickOne<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildChoices(items: QuizSourceItem[], correctItem: QuizSourceItem, key: 'korean' | 'japanese') {
  const seen = new Set([correctItem[key]]);
  const distractors = shuffle(items)
    .map((item) => item[key])
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, 2);

  if (distractors.length < 2) {
    throw new Error('3択を作るため、答えが重複しないデータを3件以上入れてください。');
  }

  return shuffle([correctItem[key], ...distractors]);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[。、,.!！?？\s　~〜]/g, '')
    .trim();
}
