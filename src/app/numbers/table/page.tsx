'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import AppMenu from '@/app/components/AppMenu';
import type { NumberItem } from '@/lib/types';

type NumberLists = {
  native: NumberItem[];
  sino: NumberItem[];
};

export default function NumberTablePage() {
  const [lists, setLists] = useState<NumberLists>({ native: [], sino: [] });
  const [status, setStatus] = useState('数字一覧を読み込み中...');
  const [isLoading, setIsLoading] = useState(true);

  const loadLists = useCallback(async () => {
    setIsLoading(true);
    setStatus('数字一覧を読み込み中...');

    try {
      const response = await fetch('/api/numbers/list', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '数字一覧を取得できませんでした。');
      setLists({ native: data.native ?? [], sino: data.sino ?? [] });
      setStatus('覚える数字だけを表示しています。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '数字一覧を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  return (
    <main className="appShell">
      <AppMenu active="numberTable" />
      <section className="topBar">
        <div>
          <div className="titleRow">
            <p className="eyebrow">Number Table</p>
            <span className="countBadge">学習用</span>
          </div>
          <h1>覚える数字</h1>
          <p className="statusPill">{status}</p>
        </div>
      </section>

      <div className="pageNav">
        <Link className="reviewLink mutedLink" href="/numbers">
          数字クイズへ戻る
        </Link>
      </div>

      <section className="studyPanel">
        <div className="studyHeader">
          <div>
            <p className="eyebrow">Native Numbers</p>
            <h2>固有数詞</h2>
          </div>
          <span className="countBadge quiet">1-10 / 20-90</span>
        </div>
        <NumberTable items={lists.native} isLoading={isLoading} title="固有数詞" />
      </section>

      <section className="studyPanel">
        <div className="studyHeader">
          <div>
            <p className="eyebrow">Sino-Korean Numbers</p>
            <h2>漢数詞</h2>
          </div>
          <span className="countBadge quiet">1-10</span>
        </div>
        <NumberTable items={lists.sino} isLoading={isLoading} title="漢数詞" />
      </section>
    </main>
  );
}

function NumberTable({ items, isLoading, title }: { items: NumberItem[]; isLoading: boolean; title: string }) {
  return (
    <div className="numberTableBlock">
      <div className="numberTable" role="table" aria-label={`${title}の一覧`}>
        <div className="numberTableHead" role="row">
          <span role="columnheader">数字</span>
          <span role="columnheader">韓国語</span>
          <span role="columnheader">読み方</span>
        </div>
        {items.length ? (
          items.map((item) => (
            <div className="numberTableRow" role="row" key={`${item.kind}-${item.value}-${item.korean}`}>
              <span role="cell">{item.value}</span>
              <strong role="cell">{item.korean}</strong>
              <span role="cell">{item.reading || '-'}</span>
            </div>
          ))
        ) : (
          <p className="emptyText">{isLoading ? '読み込み中...' : '一覧データを取得できませんでした。'}</p>
        )}
      </div>
    </div>
  );
}
