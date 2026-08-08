export type QuizMode = 'mixed' | 'ko_to_ja' | 'ja_to_ko';

export type VocabularyItem = {
  korean: string;
  reading: string;
  japanese: string;
  explanation: string;
};

export type QuizQuestion = {
  id: string;
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
  source?: 'vocabulary' | 'mistake';
  mistakeRowNumber?: number;
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
