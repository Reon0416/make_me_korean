import { NextResponse } from 'next/server';

import { fallbackExplanation, isAnswerCorrect } from '@/lib/quiz';
import { appendMistake, markMistakeResolved } from '@/lib/sheets';
import type { AnswerResult, QuizQuestion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: QuizQuestion; userAnswer?: string };
    if (!body.question) {
      return NextResponse.json({ message: '問題データがありません。' }, { status: 400 });
    }

    const userAnswer = String(body.userAnswer || '').trim();
    const question = body.question;
    const isCorrect = isAnswerCorrect(question.mode, userAnswer, question.answer);
    let resolvedMistake = false;

    if (question.source === 'mistake') {
      if (isCorrect && question.mistakeRowNumber) {
        await markMistakeResolved(question.mistakeRowNumber);
        resolvedMistake = true;
      }
    } else if (question.source !== 'number' && !isCorrect) {
      await appendMistake(question, userAnswer);
    }

    const result: AnswerResult = {
      isCorrect,
      correctAnswer: question.answer,
      korean: question.korean,
      reading: question.reading,
      japanese: question.japanese,
      explanation: question.explanation || fallbackExplanation(question),
      resolvedMistake,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '回答の保存に失敗しました。' },
      { status: 500 },
    );
  }
}
