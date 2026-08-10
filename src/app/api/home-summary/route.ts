import { NextResponse } from 'next/server';

import { getNumberStudyLists, getNumberVocabulary, getUnresolvedMistakes, getVocabulary } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [vocabulary, numbers, studyLists, mistakes] = await Promise.all([
      getVocabulary(),
      getNumberVocabulary(),
      getNumberStudyLists(),
      getUnresolvedMistakes(),
    ]);

    return NextResponse.json({
      vocabulary: vocabulary.length,
      numbers: numbers.length,
      basicNumbers: studyLists.sino.length + studyLists.native.length,
      mistakes: mistakes.length,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'トップ画面の件数取得に失敗しました。' },
      { status: 500 },
    );
  }
}
