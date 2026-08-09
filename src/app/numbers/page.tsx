'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import AppMenu from '@/app/components/AppMenu';
import type { AnswerResult, NumberQuizKind, QuizMode, QuizQuestion } from '@/lib/types';

type QuizProgress = {
  current: number;
  total: number;
};

const modes: Array<{ value: QuizMode; label: string }> = [
  { value: 'mixed', label: 'MIX' },
  { value: 'ko_to_ja', label: '韓→日' },
  { value: 'ja_to_ko', label: '日→韓' },
];

const kinds: Array<{ value: NumberQuizKind; label: string }> = [
  { value: 'mixed', label: 'MIX' },
  { value: 'sino', label: '漢数詞' },
  { value: 'native', label: '固有数詞' },
];

export default function NumbersPage() {
  const [mode, setMode] = useState<QuizMode>('mixed');
  const [kind, setKind] = useState<NumberQuizKind>('mixed');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [status, setStatus] = useState('数字クイズを読み込み中...');
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizProgress, setQuizProgress] = useState<QuizProgress>({ current: 0, total: 0 });
  const feedbackAudioRef = useRef<AudioContext | null>(null);
  const usedItemKeysRef = useRef<string[]>([]);

  const rememberQuestion = useCallback((nextQuestion: QuizQuestion) => {
    if (!nextQuestion.itemKey) return;

    const currentKeys = usedItemKeysRef.current;
    const nextKeys = currentKeys.includes(nextQuestion.itemKey)
      ? [nextQuestion.itemKey]
      : [...currentKeys, nextQuestion.itemKey];

    usedItemKeysRef.current = nextKeys;
    setQuizProgress({ current: nextKeys.length, total: nextQuestion.totalItems });
  }, []);

  const loadQuestion = useCallback(async (nextMode: QuizMode, nextKind: NumberQuizKind) => {
    setIsLoading(true);
    setStatus('次の数字を読み込み中...');
    setQuestion(null);
    setResult(null);
    setSelectedAnswer('');
    setShowExplanation(false);

    try {
      const exclude = encodeURIComponent(usedItemKeysRef.current.join(','));
      const response = await fetch(`/api/numbers/question?mode=${nextMode}&kind=${nextKind}&exclude=${exclude}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '数字クイズを取得できませんでした。');
      setQuestion(data);
      rememberQuestion(data);
      setStatus('3つの選択肢から選んでください。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '数字クイズを取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [rememberQuestion]);

  useEffect(() => {
    usedItemKeysRef.current = [];
    setQuizProgress({ current: 0, total: 0 });
    void loadQuestion(mode, kind);
  }, [kind, loadQuestion, mode]);

  function speakKorean(text: string) {
    readKorean(text, true);
  }

  function readKorean(text: string, shouldReportError = false) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (shouldReportError) setStatus('このブラウザは音声読み上げに対応していません。');
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

  useEffect(() => {
    if (!question || result || isLoading) return;
    const timerId = window.setTimeout(() => readKorean(question.korean), 180);
    return () => window.clearTimeout(timerId);
  }, [isLoading, question, result]);

  const getFeedbackAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!feedbackAudioRef.current || feedbackAudioRef.current.state === 'closed') {
      feedbackAudioRef.current = new AudioContextClass();
    }

    if (feedbackAudioRef.current.state === 'suspended') {
      void feedbackAudioRef.current.resume();
    }

    return feedbackAudioRef.current;
  }, []);

  const unlockFeedbackAudio = useCallback(() => {
    const audioContext = getFeedbackAudioContext();
    if (!audioContext) return;

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.connect(audioContext.destination);

    const oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(1, audioContext.currentTime);
    oscillator.connect(gain);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.025);
  }, [getFeedbackAudioContext]);

  useEffect(() => {
    const unlock = () => unlockFeedbackAudio();
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, [unlockFeedbackAudio]);

  function playFeedbackSound(isCorrect: boolean) {
    const audioContext = getFeedbackAudioContext();
    if (!audioContext) return;

    const startAt = audioContext.currentTime + 0.015;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.11, startAt + 0.018);

    const tones = isCorrect
      ? [
          { frequency: 660, start: 0, duration: 0.075 },
          { frequency: 880, start: 0.085, duration: 0.12 },
        ]
      : [
          { frequency: 220, start: 0, duration: 0.1 },
          { frequency: 165, start: 0.105, duration: 0.13 },
        ];

    tones.forEach((tone) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = isCorrect ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(tone.frequency, startAt + tone.start);
      oscillator.connect(gain);
      oscillator.start(startAt + tone.start);
      oscillator.stop(startAt + tone.start + tone.duration);
    });

    const endTime = startAt + 0.28;
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
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
      playFeedbackSound(data.isCorrect);
      setStatus('結果を確認したら次へ進んでください。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '判定できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }

  function handleNext() {
    void loadQuestion(mode, kind);
  }

  return (
    <main className={result ? 'appShell hasStickyAction' : 'appShell'}>
      <AppMenu active="numbers" />
      <section className="topBar">
        <div>
          <div className="titleRow">
            <p className="eyebrow">Number Quiz</p>
            <span className="countBadge">
              {quizProgress.total ? `${quizProgress.current}問目 / ${quizProgress.total}問中` : '0問目 / 0問中'}
            </span>
            <span className="countBadge">{kind === 'mixed' ? 'MIX' : kind === 'sino' ? '漢数詞' : '固有数詞'}</span>
          </div>
          <h1>韓国語 数字クイズ</h1>
          <p className="statusPill">{status}</p>
        </div>
      </section>

      <section className="modeRail" aria-label="数字の種類" role="group">
        {kinds.map((item) => (
          <button
            className={item.value === kind ? 'modeButton active' : 'modeButton'}
            key={item.value}
            onClick={() => setKind(item.value)}
            aria-pressed={item.value === kind}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="modeRail secondaryRail" aria-label="出題形式" role="group">
        {modes.map((item) => (
          <button
            className={item.value === mode ? 'modeButton active' : 'modeButton'}
            key={item.value}
            onClick={() => setMode(item.value)}
            aria-pressed={item.value === mode}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="quizPanel">
        <div className="quizHeader">
          <span className="promptBadge">{question?.promptLabel || '数字クイズ'}</span>
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
            <button className="skipButton" disabled={isLoading} onClick={handleNext} type="button">
              スキップ
            </button>
          </div>
        </div>

        {isLoading && !question ? (
          <div className="questionSkeleton compactSkeleton" aria-label="数字問題を読み込み中">
            <span />
            <span />
          </div>
        ) : (
          <div className="questionText compactQuestion" aria-live="polite">
            {question?.question || '...'}
          </div>
        )}

        <div className={isLoading && !question ? 'choices skeletonChoices' : 'choices'}>
          {isLoading && !question
            ? [0, 1, 2].map((item) => <div className="choiceSkeleton" key={item} />)
            : question?.choices.map((choice, index) => (
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
              aria-expanded={showExplanation}
              onClick={() => setShowExplanation((current) => !current)}
              type="button"
            >
              <span>{showExplanation ? '解説を閉じる' : '解説を見る'}</span>
              <span className="toggleMark">{showExplanation ? '−' : '+'}</span>
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
            <button className="nextPrimary stickyNext" disabled={isLoading} onClick={handleNext} type="button">
              次へ
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}
