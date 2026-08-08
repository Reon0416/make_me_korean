import { NextRequest, NextResponse } from 'next/server';

import { createQuestion } from '@/lib/quiz';
import { getVocabulary } from '@/lib/sheets';
import type { QuizMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const mode = (request.nextUrl.searchParams.get('mode') || 'mixed') as QuizMode;
    const vocabulary = await getVocabulary();
    return NextResponse.json(createQuestion(vocabulary, mode));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '問題の取得に失敗しました。' },
      { status: 500 },
    );
  }
}
