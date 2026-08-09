import { NextRequest, NextResponse } from 'next/server';

import { createNumberQuestion } from '@/lib/quiz';
import { getNumberVocabulary } from '@/lib/sheets';
import type { NumberQuizKind, QuizMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const mode = (request.nextUrl.searchParams.get('mode') || 'mixed') as QuizMode;
    const kind = (request.nextUrl.searchParams.get('kind') || 'mixed') as NumberQuizKind;
    const excludedItemKeys = getItemKeysParam(request, 'exclude');
    const onlyItemKeys = getItemKeysParam(request, 'only');
    const numbers = await getNumberVocabulary(kind);
    return NextResponse.json(createNumberQuestion(numbers, mode, kind, { excludedItemKeys, onlyItemKeys }));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '数字クイズの取得に失敗しました。' },
      { status: 500 },
    );
  }
}

function getItemKeysParam(request: NextRequest, name: string) {
  return (request.nextUrl.searchParams.get(name) || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
