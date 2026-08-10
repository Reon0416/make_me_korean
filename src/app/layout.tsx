import type { Metadata } from 'next';

import CompletionEffects from './components/CompletionEffects';
import './globals.css';
import './icon-controls.css';

export const metadata: Metadata = {
  title: '韓国語単語クイズ',
  description: 'スプレッドシートをデータベースにした韓国語単語クイズ',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <CompletionEffects />
      </body>
    </html>
  );
}
