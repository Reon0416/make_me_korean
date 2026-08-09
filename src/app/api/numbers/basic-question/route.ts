import { NextRequest, NextResponse } from 'next/server';

import { createNumberQuestion } from '@/lib/quiz';
import { getNumberStudyLists } from '@/lib/sheets';
import type { QuizMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const mode = (request.nextUrl.searchParams.get('mode') || 'ko_to_ja') as QuizMode;
    const excludedItemKeys = getItemKeysParam(request, 'exclude');
    const onlyItemKeys = getItemKeysParam(request, 'only');
    const lists = await getNumberStudyLists();
    const numbers = [...lists.sino, ...lists.native];

    return NextResponse.json(createNumberQuestion(numbers, mode, 'mixed', { excludedItemKeys, onlyItemKeys }));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '基礎数字クイズの取得に失敗しました。' },
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
