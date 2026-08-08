import { NextResponse } from 'next/server';

import { getMistakeSummary } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getMistakeSummary());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '間違い履歴の取得に失敗しました。' },
      { status: 500 },
    );
  }
}
