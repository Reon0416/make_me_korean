import { NextRequest, NextResponse } from 'next/server';

import { createNumberQuestion } from '@/lib/quiz';
import { getNumberStudyLists } from '@/lib/sheets';
import type { NumberKind, QuizMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const mode = (request.nextUrl.searchParams.get('mode') || 'ko_to_ja') as QuizMode;
    const kind = getNumberKind(request.nextUrl.searchParams.get('kind'));
    const excludedItemKeys = getItemKeysParam(request, 'exclude');
    const onlyItemKeys = getItemKeysParam(request, 'only');
    const lists = await getNumberStudyLists();
    const numbers = kind === 'sino' ? lists.sino : lists.native;

    return NextResponse.json(createNumberQuestion(numbers, mode, kind, { excludedItemKeys, onlyItemKeys }));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '基礎数字クイズの取得に失敗しました。' },
      { status: 500 },
    );
  }
}

function getNumberKind(value: string | null): NumberKind {
  return value === 'native' ? 'native' : 'sino';
}

function getItemKeysParam(request: NextRequest, name: string) {
  return (request.nextUrl.searchParams.get(name) || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
