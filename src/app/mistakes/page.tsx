'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AnswerResult, MistakeItem, QuizMode, QuizQuestion } from '@/lib/types';

const modes: Array<{ value: QuizMode; label: string }> = [
  { value: 'mixed', label: 'ミックス' },
  { value: 'ko_to_ja', label: '韓国語→日本語' },
  { value: 'ja_to_ko', label: '日本語→ハングル' },
];

export default function MistakesPage() {
  const [mode, setMode] = useState<QuizMode>('mixed');
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [status, setStatus] = useState('間違えた単語を読み込み中...');
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ total: 0, correct: 0 });

  const accuracy = useMemo(() => {
    if (!score.total) return 0;
    return Math.round((score.correct / score.total) * 100);
  }, [score]);

  const loadMistakes = useCallback(async () => {
    try {
      const response = await fetch('/api/mistakes/list', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '間違えた単語を取得できませんでした。');
      const nextMistakes = data.mistakes ?? [];
      setMistakes(nextMistakes);
      setStatus(nextMistakes.length ? '復習する単語を選択肢で答えてください。' : '未解決の間違い単語はありません。');
      return nextMistakes as MistakeItem[];
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '間違えた単語を取得できませんでした。');
      return [];
    }
  }, []);

  const loadQuestion = useCallback(async (nextMode: QuizMode) => {
    setIsLoading(true);
    setQuestion(null);
    setResult(null);
    setSelectedAnswer('');
    setShowExplanation(false);
    setStatus('復習クイズを読み込み中...');

    try {
      const response = await fetch(`/api/review-question?mode=${nextMode}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '復習クイズを取得できませんでした。');
      setQuestion(data);
      setStatus('正解した単語はリストから外れます。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '復習クイズを取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      const nextMistakes = await loadMistakes();
      if (nextMistakes.length >= 3) {
        await loadQuestion(mode);
      }
    }

    void initialize();
  }, [loadMistakes, loadQuestion, mode]);

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
  }

  async function submit(userAnswer: string) {
    if (!question || result || !userAnswer.trim()) return;

    setIsLoading(true);
    setSelectedAnswer(userAnswer);
    setStatus('判定中...');

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, userAnswer }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '判定できませんでした。');

      setResult(data);
      setScore((current) => ({
        total: current.total + 1,
        correct: current.correct + (data.isCorrect ? 1 : 0),
      }));
      setStatus(data.resolvedMistake ? '正解です。リストから外しました。' : '結果を確認したら次へ進んでください。');
      await loadMistakes();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '判定できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }

  function handleNext() {
    void loadQuestion(mode);
  }

  return (
    <main className={result ? 'appShell hasStickyAction' : 'appShell'}>
      <section className="topBar">
        <div>
          <p className="eyebrow">Review Quiz</p>
          <h1>間違えた単語</h1>
          <p className="status">{status}</p>
        </div>
        <dl className="scoreBoard" aria-label="復習成績">
          <div>
            <dt>未解決</dt>
            <dd>{mistakes.length}</dd>
          </div>
          <div>
            <dt>正解</dt>
            <dd>{score.correct}</dd>
          </div>
          <div>
            <dt>正答率</dt>
            <dd>{accuracy}%</dd>
          </div>
        </dl>
      </section>

      <div className="pageNav">
        <Link className="reviewLink mutedLink" href="/">
          通常クイズへ戻る
        </Link>
      </div>

      <section className="modeRail" aria-label="復習の出題形式">
        {modes.map((item) => (
          <button
            className={item.value === mode ? 'modeButton active' : 'modeButton'}
            key={item.value}
            onClick={() => setMode(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="quizPanel">
        <div className="quizHeader">
          <span className="promptBadge">{question?.promptLabel || '復習クイズ'}</span>
          <div className="quizActions">
            {question ? (
              <button
                className="audioButton"
                disabled={isLoading}
                onClick={() => speakKorean(question.korean)}
                title="韓国語を読み上げる"
                type="button"
              >
                音声
              </button>
            ) : null}
            <button className="skipButton" disabled={isLoading || mistakes.length < 3} onClick={handleNext} type="button">
              次へ
            </button>
          </div>
        </div>

        <div className="questionText compactQuestion" aria-live="polite">
          {question?.question || (isLoading ? '...' : '未解決が3件以上で復習できます')}
        </div>

        <div className="choices">
          {question?.choices.map((choice, index) => (
            <button
              className={[
                'choiceButton',
                result && choice === question.answer ? 'correctChoice' : '',
                result && choice === selectedAnswer && choice !== question.answer ? 'wrongChoice' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={isLoading || Boolean(result)}
              key={`${choice}-${index}`}
              onClick={() => void submit(choice)}
              type="button"
            >
              <span className="choiceIndex">{index + 1}</span>
              {choice}
            </button>
          ))}
        </div>

        {result ? (
          <section className={result.isCorrect ? 'resultBox correct' : 'resultBox wrong'}>
            <div className="resultHeader">
              <div className="resultTitle">{result.isCorrect ? '正解' : `不正解：${result.correctAnswer}`}</div>
              <button
                className="audioButton"
                disabled={isLoading}
                onClick={() => speakKorean(result.korean)}
                title="韓国語を読み上げる"
                type="button"
              >
                音声
              </button>
            </div>
            <button
              className="detailToggle"
              onClick={() => setShowExplanation((current) => !current)}
              type="button"
            >
              {showExplanation ? '解説を閉じる' : '解説を見る'}
            </button>
            {showExplanation ? (
              <div className="resultGrid">
                <div>
                  <span>韓国語</span>
                  <strong>{result.korean}</strong>
                </div>
                <div>
                  <span>読み方</span>
                  <strong>{result.reading || '-'}</strong>
                </div>
                <div>
                  <span>意味</span>
                  <strong>{result.japanese}</strong>
                </div>
                <div>
                  <span>解説</span>
                  <strong>{result.explanation || '-'}</strong>
                </div>
              </div>
            ) : null}
            <button className="nextPrimary stickyNext" disabled={isLoading || mistakes.length < 3} onClick={handleNext} type="button">
              次の復習へ
            </button>
          </section>
        ) : null}
      </section>

      <section className="historyPanel">
        <div>
          <h2>未解決リスト</h2>
          <p>{mistakes.length ? `${mistakes.length} 件` : 'なし'}</p>
        </div>
      </section>
    </main>
  );
}
