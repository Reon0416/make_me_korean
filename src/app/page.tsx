'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import styles from './page.module.css';

type HomeSummary = {
  vocabulary: number;
  numbers: number;
  basicNumbers: number;
  mistakes: number;
};

type TrainingItem = {
  href: string;
  mark: string;
  title: string;
  countKey?: keyof HomeSummary;
  variant?: 'quiz' | 'study' | 'review';
};

const trainingItems: TrainingItem[] = [
  { href: '/quiz', mark: '単', title: '単語クイズ', countKey: 'vocabulary' },
  { href: '/numbers', mark: '数', title: '数字クイズ', countKey: 'numbers' },
  { href: '/numbers/basic', mark: '基', title: '基礎数字クイズ', countKey: 'basicNumbers' },
  { href: '/numbers/table', mark: '表', title: '数字一覧', variant: 'study' },
  { href: '/mistakes', mark: '復', title: '間違えた単語', countKey: 'mistakes', variant: 'review' },
];

export default function Home() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch('/api/home-summary', { cache: 'no-store' });
        const data = await response.json();
        if (response.ok) setSummary(data);
      } catch {
        setSummary(null);
      }
    }

    void loadSummary();
  }, []);

  return (
    <main className={`appShell ${styles.homeShell}`}>
      <section className={styles.trainingList} aria-label="学習メニュー">
        {trainingItems.map((item) => {
          const count = item.countKey && summary ? summary[item.countKey] : null;
          const variant = item.variant || 'quiz';

          return (
            <Link className={`${styles.trainingItem} ${styles[variant]}`} href={item.href} key={item.href}>
              <span className={styles.trainingMark} aria-hidden="true">{item.mark}</span>
              <span className={styles.trainingTitle}>{item.title}</span>
              <span className={styles.trainingCount}>{item.countKey ? (count === null ? '...' : `あと${count}問`) : '一覧'}</span>
              <span className={styles.trainingArrow} aria-hidden="true">›</span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
