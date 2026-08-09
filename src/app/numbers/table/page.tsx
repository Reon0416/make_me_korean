'use client';

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
      setStatus('ハングルを押すと音声で確認できます。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '数字一覧を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  function speakKorean(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatus('このブラウザは音声読み上げに対応していません。');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ko'));
    if (koreanVoice) utterance.voice = koreanVoice;
    utterance.lang = 'ko-KR';
    utterance.rate = 0.82;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    setStatus(`${text} を読み上げています。`);
  }

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

      <section className="studyPanel">
        <div className="studyHeader">
          <div>
            <p className="eyebrow">Native Numbers</p>
            <h2>固有数詞</h2>
          </div>
          <span className="countBadge quiet">1-10 / 20-90</span>
        </div>
        <NumberTable items={lists.native} isLoading={isLoading} onSpeak={speakKorean} title="固有数詞" />
      </section>

      <section className="studyPanel">
        <div className="studyHeader">
          <div>
            <p className="eyebrow">Sino-Korean Numbers</p>
            <h2>漢数詞</h2>
          </div>
          <span className="countBadge quiet">1-10</span>
        </div>
        <NumberTable items={lists.sino} isLoading={isLoading} onSpeak={speakKorean} title="漢数詞" />
      </section>
    </main>
  );
}

function NumberTable({
  items,
  isLoading,
  onSpeak,
  title,
}: {
  items: NumberItem[];
  isLoading: boolean;
  onSpeak: (text: string) => void;
  title: string;
}) {
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
              <button
                className="numberSpeakButton"
                onClick={() => onSpeak(item.korean)}
                title={`${item.korean}を読み上げる`}
                type="button"
              >
                {item.korean}
              </button>
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
