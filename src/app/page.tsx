import Link from 'next/link';

import AppMenu from '@/app/components/AppMenu';

const trainingItems = [
  {
    href: '/quiz',
    mark: '単',
    title: '単語クイズ',
    meta: '韓→日 / 日→韓',
    description: 'スプレッドシートの単語を1周重複なしで出題',
  },
  {
    href: '/numbers',
    mark: '数',
    title: '数字クイズ',
    meta: '漢数詞 / 固有数詞',
    description: '追加した数字シートからランダムに出題',
  },
  {
    href: '/numbers/basic',
    mark: '基',
    title: '基礎数字クイズ',
    meta: '漢数詞 / 固有数詞',
    description: 'まず覚える数字だけを集中的に練習',
  },
  {
    href: '/numbers/table',
    mark: '表',
    title: '数字一覧',
    meta: '読み上げ対応',
    description: '覚える数字を表で確認して音声で復習',
  },
  {
    href: '/mistakes',
    mark: '復',
    title: '間違えた単語',
    meta: '復習モード',
    description: '間違えた単語だけを解き直す',
  },
];

export default function Home() {
  return (
    <main className="appShell homeShell">
      <AppMenu active="home" />

      <section className="homeHero" aria-labelledby="home-title">
        <p className="homeKicker">Korean training</p>
        <h1 id="home-title">今日は何をやる？</h1>
        <p>やる内容を選ぶと、すぐに問題を始められます。</p>
      </section>

      <section className="trainingList" aria-label="学習メニュー">
        {trainingItems.map((item) => (
          <Link className="trainingItem" href={item.href} key={item.href}>
            <span className="trainingMark" aria-hidden="true">{item.mark}</span>
            <span className="trainingMain">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <i>{item.meta}</i>
            </span>
            <span className="trainingArrow" aria-hidden="true">›</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
