'use client';

import { useEffect, useRef } from 'react';

function parseResult(text: string) {
  const match = text.match(/(\d+)問中\s*(\d+)問正解/);
  if (!match) return null;

  const total = Number(match[1]);
  const correct = Number(match[2]);
  if (!total) return null;

  return { total, correct, isPerfect: total === correct };
}

function playCompletionSound(isPerfect: boolean) {
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  const startAt = audioContext.currentTime + 0.02;
  const gain = audioContext.createGain();
  gain.connect(audioContext.destination);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(isPerfect ? 0.85 : 0.55, startAt + 0.025);

  const tones = isPerfect
    ? [
        { frequency: 659, start: 0, duration: 0.08 },
        { frequency: 784, start: 0.08, duration: 0.08 },
        { frequency: 988, start: 0.16, duration: 0.1 },
        { frequency: 1319, start: 0.27, duration: 0.18 },
      ]
    : [
        { frequency: 294, start: 0, duration: 0.16 },
        { frequency: 247, start: 0.16, duration: 0.2 },
        { frequency: 196, start: 0.34, duration: 0.24 },
      ];

  tones.forEach((tone) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = isPerfect ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(tone.frequency, startAt + tone.start);
    oscillator.connect(gain);
    oscillator.start(startAt + tone.start);
    oscillator.stop(startAt + tone.start + tone.duration);
  });

  const endTime = startAt + (isPerfect ? 0.58 : 0.68);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  window.setTimeout(() => void audioContext.close(), 900);
}

export default function CompletionEffects() {
  const lastPlayedRef = useRef('');

  useEffect(() => {
    function applyEffects() {
      const completionBox = document.querySelector<HTMLElement>('.completionBox');
      const resultText = completionBox?.querySelector('strong')?.textContent ?? '';
      const result = parseResult(resultText);
      if (!completionBox || !result) return;

      completionBox.classList.toggle('perfectResult', result.isPerfect);
      completionBox.classList.toggle('missedResult', !result.isPerfect);

      const playKey = `${result.total}-${result.correct}`;
      if (lastPlayedRef.current === playKey) return;
      lastPlayedRef.current = playKey;
      playCompletionSound(result.isPerfect);
    }

    applyEffects();
    const observer = new MutationObserver(applyEffects);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
