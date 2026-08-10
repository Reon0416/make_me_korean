import type { Metadata } from 'next';
import './globals.css';
import './icon-controls.css';

export const metadata: Metadata = {
  title: '韓国語単語クイズ',
  description: 'スプレッドシートをデータベースにした韓国語単語クイズ',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
