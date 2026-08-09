import { NextRequest, NextResponse } from 'next/server';

import { createQuestion } from '@/lib/quiz';
import { getVocabulary } from '@/lib/sheets';
import type { QuizMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const mode = (request.nextUrl.searchParams.get('mode') || 'mixed') as QuizMode;
    const excludedItemKeys = getItemKeysParam(request, 'exclude');
    const onlyItemKeys = getItemKeysParam(request, 'only');
    const vocabulary = await getVocabulary();
    return NextResponse.json(createQuestion(vocabulary, mode, { excludedItemKeys, onlyItemKeys }));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '問題の取得に失敗しました。' },
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
