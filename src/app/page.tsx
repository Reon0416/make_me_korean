'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AnswerResult, QuizMode, QuizQuestion } from '@/lib/types';

type MistakeSummary = {
  count: number;
  recent: Array<{
    timestamp: string;
    mode: string;
    question: string;
    userAnswer: string;
    korean: string;
    reading: string;
    japanese: string;
  }>;
};

const modes: Array<{ value: QuizMode; label: string }> = [
  { value: 'mixed', label: 'ミックス' },
  { value: 'ko_to_ja', label: '韓国語 → 日本語' },
  { value: 'ja_to_ko', label: '日本語 → ハングル' },
];

export default function Home() {
  const [mode, setMode] = useState<QuizMode>('mixed');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [mistakes, setMistakes] = useState<MistakeSummary>({ count: 0, recent: [] });
  const [status, setStatus] = useState('読み込み中...');
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState({ total: 0, correct: 0, wrong: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const accuracy = useMemo(() => {
    if (!score.total) return 0;
    return Math.round((score.correct / score.total) * 100);
  }, [score]);

  const loadMistakes = useCallback(async () => {
    try {
      const response = await fetch('/api/mistakes', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok) setMistakes(data);
    } catch {
      // 履歴取得に失敗してもクイズ進行は止めない。
    }
  }, []);

  const loadQuestion = useCallback(async (nextMode: QuizMode) => {
    setIsLoading(true);
    setStatus('次の問題を読み込み中...');
    setQuestion(null);
    setResult(null);
    setAnswer('');

    try {
      const response = await fetch(`/api/question?mode=${nextMode}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '問題を取得できませんでした。');
      setQuestion(data);
      setStatus('テンポよく進めていきましょう');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '問題を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      await loadQuestion(mode);
      await loadMistakes();
    }

    void initialize();
  }, [loadMistakes, loadQuestion, mode]);

  useEffect(() => {
    if (question?.inputType === 'text' && !result) {
      inputRef.current?.focus();
    }
  }, [question, result]);

  async function submit(userAnswer = answer) {
    if (!question || result || !userAnswer.trim()) {
      if (!userAnswer.trim()) setStatus('回答を入力してください');
      return;
    }

    setIsLoading(true);
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
        wrong: current.wrong + (data.isCorrect ? 0 : 1),
      }));
      setStatus('結果を確認したら次へ');
      void loadMistakes();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '判定できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function handleNext() {
    void loadQuestion(mode);
  }

  return (
    <main className="appShell">
      <section className="topBar">
        <div>
          <p className="eyebrow">Spreadsheet Quiz</p>
          <h1>韓国語単語クイズ</h1>
          <p className="status">{status}</p>
        </div>
        <dl className="scoreBoard" aria-label="成績">
          <div>
            <dt>回答</dt>
            <dd>{score.total}</dd>
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

      <section className="modeRail" aria-label="出題形式">
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
          <span>{question?.promptLabel || '出題形式'}</span>
          <button className="skipButton" disabled={isLoading} onClick={handleNext} type="button">
            次の単語
          </button>
        </div>

        <div className="questionText" aria-live="polite">
          {question?.question || '...'}
        </div>

        {question?.inputType === 'choice' ? (
          <div className="choices">
            {question.choices.map((choice) => (
              <button
                className="choiceButton"
                disabled={isLoading || Boolean(result)}
                key={choice}
                onClick={() => {
                  setAnswer(choice);
                  void submit(choice);
                }}
                type="button"
              >
                {choice}
              </button>
            ))}
          </div>
        ) : (
          <form className="answerForm" onSubmit={handleSubmit}>
            <input
              autoComplete="off"
              disabled={isLoading || Boolean(result)}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="日本語で入力"
              ref={inputRef}
              type="text"
              value={answer}
            />
            <button disabled={isLoading || Boolean(result)} type="submit">
              答える
            </button>
          </form>
        )}

        {result ? (
          <section className={result.isCorrect ? 'resultBox correct' : 'resultBox wrong'}>
            <div className="resultTitle">{result.isCorrect ? '正解' : `不正解：${result.correctAnswer}`}</div>
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
            <button className="nextPrimary" disabled={isLoading} onClick={handleNext} type="button">
              次へ
            </button>
          </section>
        ) : null}
      </section>

      <aside className="historyPanel">
        <div>
          <h2>間違えた単語</h2>
          <p>{mistakes.count ? `累計 ${mistakes.count} 件` : 'まだありません'}</p>
        </div>
        {mistakes.recent.length ? (
          <ul>
            {mistakes.recent.map((item, index) => (
              <li key={`${item.timestamp}-${item.korean}-${index}`}>
                <strong>{item.korean}</strong>
                <span>{item.japanese}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </aside>
    </main>
  );
}
