import { NextResponse } from 'next/server';

import { getUnresolvedMistakes } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ mistakes: await getUnresolvedMistakes() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '間違えた単語の取得に失敗しました。' },
      { status: 500 },
    );
  }
}
