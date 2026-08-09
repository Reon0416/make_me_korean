export type QuizMode = 'mixed' | 'ko_to_ja' | 'ja_to_ko';
export type NumberKind = 'native' | 'sino';
export type NumberQuizKind = 'mixed' | NumberKind;

export type VocabularyItem = {
  korean: string;
  reading: string;
  japanese: string;
  explanation: string;
};

export type NumberItem = VocabularyItem & {
  value: string;
  kind: NumberKind;
};

export type QuizQuestion = {
  id: string;
  itemKey: string;
  mode: Exclude<QuizMode, 'mixed'>;
  promptLabel: string;
  inputType: 'choice';
  question: string;
  answer: string;
  choices: string[];
  korean: string;
  reading: string;
  japanese: string;
  explanation: string;
  source?: 'vocabulary' | 'mistake' | 'number';
  mistakeRowNumber?: number;
  numberKind?: NumberKind;
  numberValue?: string;
};

export type AnswerResult = {
  isCorrect: boolean;
  correctAnswer: string;
  korean: string;
  reading: string;
  japanese: string;
  explanation: string;
  resolvedMistake?: boolean;
};

export type MistakeItem = VocabularyItem & {
  rowNumber: number;
  timestamp: string;
  mode: string;
  question: string;
  userAnswer: string;
  status: string;
  resolvedAt: string;
};
