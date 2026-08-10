import type { QuizQuestion } from '@/lib/types';

type QuestionPromptProps = {
  question: QuizQuestion | null;
  showKana: boolean;
  fallback?: string;
};

export default function QuestionPrompt({ question, showKana, fallback = '...' }: QuestionPromptProps) {
  if (!question) return <>{fallback}</>;

  if (showKana && question.mode === 'ko_to_ja' && question.reading) {
    return (
      <ruby className="questionRuby">
        {question.question}
        <rt>{question.reading}</rt>
      </ruby>
    );
  }

  return <>{question.question}</>;
}
