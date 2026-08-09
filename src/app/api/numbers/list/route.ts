import { NextResponse } from 'next/server';

import { getNumberStudyLists } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getNumberStudyLists());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '数字一覧の取得に失敗しました。' },
      { status: 500 },
    );
  }
}
