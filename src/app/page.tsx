'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import AppMenu from '@/app/components/AppMenu';
import type { AnswerResult, QuizMode, QuizQuestion } from '@/lib/types';

type QuizProgress = {
  current: number;
  total: number;
};

const modes: Array<{ value: QuizMode; label: string }> = [
  { value: 'mixed', label: 'MIX' },
  { value: 'ko_to_ja', label: '韓→日' },
  { value: 'ja_to_ko', label: '日→韓' },
];

export default function Home() {
  const [mode, setMode] = useState<QuizMode>('mixed');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [status, setStatus] = useState('読み込み中...');
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizProgress, setQuizProgress] = useState<QuizProgress>({ current: 0, total: 0 });
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongItemKeys, setWrongItemKeys] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const feedbackAudioRef = useRef<AudioContext | null>(null);
  const usedItemKeysRef = useRef<string[]>([]);
  const activeItemKeysRef = useRef<string[]>([]);
  const progressPercent = quizProgress.total ? Math.round((quizProgress.current / quizProgress.total) * 100) : 0;
  const shouldShowStatus = /失敗|できません|対応していません|入れてください/.test(status);

  const resetCycle = useCallback((onlyItemKeys: string[] = []) => {
    activeItemKeysRef.current = onlyItemKeys;
    usedItemKeysRef.current = [];
    setQuizProgress({ current: 0, total: onlyItemKeys.length || 0 });
    setAnsweredCount(0);
    setCorrectCount(0);
    setWrongItemKeys([]);
    setIsComplete(false);
  }, []);

  const rememberQuestion = useCallback((nextQuestion: QuizQuestion) => {
    if (!nextQuestion.itemKey) return;

    const currentKeys = usedItemKeysRef.current;
    const nextKeys = currentKeys.includes(nextQuestion.itemKey)
      ? [nextQuestion.itemKey]
      : [...currentKeys, nextQuestion.itemKey];

    usedItemKeysRef.current = nextKeys;
    setQuizProgress({ current: nextKeys.length, total: nextQuestion.totalItems });
  }, []);

  const loadQuestion = useCallback(async (nextMode: QuizMode) => {
    setIsLoading(true);
    setStatus('次の問題を読み込み中...');
    setQuestion(null);
    setResult(null);
    setSelectedAnswer('');
    setShowExplanation(false);

    try {
      const exclude = encodeURIComponent(usedItemKeysRef.current.join(','));
      const only = encodeURIComponent(activeItemKeysRef.current.join(','));
      const response = await fetch(`/api/question?mode=${nextMode}&exclude=${exclude}&only=${only}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '問題を取得できませんでした。');
      setQuestion(data);
      rememberQuestion(data);
      setStatus('3つの選択肢から選んでください。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '問題を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [rememberQuestion]);

  useEffect(() => {
    async function initialize() {
      resetCycle();
      await loadQuestion(mode);
    }

    void initialize();
  }, [loadQuestion, mode, resetCycle]);

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
    if (!question || result || isLoading || isComplete) return;
    const timerId = window.setTimeout(() => readKorean(question.korean), 180);
    return () => window.clearTimeout(timerId);
  }, [isComplete, isLoading, question, result]);

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
    const peakVolume = isCorrect ? 0.26 : 0.11;
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startAt + 0.018);

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
    if (!question || result || !userAnswer.trim() || isComplete) return;

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

      const nextAnsweredCount = answeredCount + 1;
      const nextCorrectCount = correctCount + (data.isCorrect ? 1 : 0);
      const nextWrongItemKeys = data.isCorrect ? wrongItemKeys : Array.from(new Set([...wrongItemKeys, question.itemKey]));
      const completed = nextAnsweredCount >= question.totalItems;

      setResult(data);
      setAnsweredCount(nextAnsweredCount);
      setCorrectCount(nextCorrectCount);
      setWrongItemKeys(nextWrongItemKeys);
      setIsComplete(completed);
      playFeedbackSound(data.isCorrect);
      setStatus(completed ? '1周が完了しました。' : '結果を確認したら次へ進んでください。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '判定できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }

  function handleNext() {
    void loadQuestion(mode);
  }

  function handleRestart() {
    resetCycle();
    void loadQuestion(mode);
  }

  function handleRetryWrong() {
    const retryKeys = [...wrongItemKeys];
    resetCycle(retryKeys);
    void loadQuestion(mode);
  }

  return (
    <main className={result && !isComplete ? 'appShell hasStickyAction' : 'appShell'}>
      <AppMenu active="vocabulary" />
      <section className="topBar">
        <div>
          <div className="progressHeader">
            <span className="progressText">
              {quizProgress.total ? `${quizProgress.total}問中 ${quizProgress.current}問目` : '0問中 0問目'}
            </span>
          </div>
          <div
            className="progressTrack"
            aria-label="この周回の進捗"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressPercent}
            role="progressbar"
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          {shouldShowStatus ? <p className="statusLine">{status}</p> : null}
        </div>
      </section>

      <section className="modeRail" aria-label="出題形式" role="group">
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
        {isComplete ? (
          <section className="completionBox">
            <p>結果</p>
            <strong>{quizProgress.total}問中 {correctCount}問正解</strong>
            <button className="nextPrimary" disabled={isLoading} onClick={wrongItemKeys.length ? handleRetryWrong : handleRestart} type="button">
              {wrongItemKeys.length ? '間違えた問題をもう一度やる' : 'もう一度やる'}
            </button>
          </section>
        ) : (
          <>
            <div className="quizHeader">
              <span className="promptBadge">{question?.promptLabel || '出題形式'}</span>
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
              <div className="questionSkeleton" aria-label="問題を読み込み中">
                <span />
                <span />
              </div>
            ) : (
              <div className="questionText" aria-live="polite">
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
          </>
        )}
      </section>
    </main>
  );
}
