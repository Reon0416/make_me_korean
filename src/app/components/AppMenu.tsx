import Link from 'next/link';

type AppMenuProps = {
  active: 'vocabulary' | 'numbers' | 'basicNumbers' | 'numberTable' | 'mistakes';
};

const menuItems = [
  { key: 'vocabulary', label: '単語クイズ', href: '/' },
  { key: 'numbers', label: '数字クイズ', href: '/numbers' },
  { key: 'basicNumbers', label: '基礎数字クイズ', href: '/numbers/basic' },
  { key: 'numberTable', label: '数字一覧', href: '/numbers/table' },
  { key: 'mistakes', label: '間違えた単語', href: '/mistakes' },
] as const;

export default function AppMenu({ active }: AppMenuProps) {
  return (
    <details className="appMenu">
      <summary aria-label="メニューを開く">
        <span />
        <span />
        <span />
      </summary>
      <nav aria-label="アプリ内メニュー">
        {menuItems.map((item) => (
          <Link className={item.key === active ? 'active' : ''} href={item.href} key={item.key}>
            {item.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
