# 韓国語単語クイズ

Google スプレッドシート「韓国語単語集」をデータベースとして使う、Next.js / TypeScript 製の単語クイズアプリです。

## Stack

- Next.js 16
- TypeScript
- React
- Google Sheets API
- Vercel deploy target

## Data Source

既定のスプレッドシート:

`1-AIYffuG3Dpqtct6wMTRChTIIsWwXcRX2QBp42oF77c`

単語シートは次の列を想定しています。

- `韓国語`
- `読み方`
- `日本語の意味`
- 任意: `解説`

間違えた単語は、同じスプレッドシート内の `間違えた単語` タブに自動作成・保存されます。

## Local Startup

```bash
npm install
cp .env.example .env.local
npm run dev
```

この環境では npm cache の権限都合がある場合、次のように実行できます。

```bash
npm install --cache ./work/npm-cache
```

## Environment Variables

`.env.local` と Vercel の Environment Variables に設定してください。

```env
SPREADSHEET_ID=1-AIYffuG3Dpqtct6wMTRChTIIsWwXcRX2QBp42oF77c
VOCAB_SHEET_NAME=シート1
MISTAKE_SHEET_NAME=間違えた単語
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

`GOOGLE_PRIVATE_KEY` は改行を `\n` として入れてください。

例:

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Google Sheets API Setup

1. Google Cloud でプロジェクトを作成する
2. Google Sheets API を有効化する
3. サービスアカウントを作成する
4. サービスアカウントの JSON キーを作成する
5. JSON の `client_email` を `GOOGLE_SERVICE_ACCOUNT_EMAIL` に入れる
6. JSON の `private_key` を `GOOGLE_PRIVATE_KEY` に入れる
7. 「韓国語単語集」スプレッドシートをサービスアカウントのメールアドレスに編集者として共有する

読み取りだけでなく、間違い履歴を書き込むため編集者権限が必要です。

## Features

- ランダムに 1 問ずつ出題
- `韓国語 → 日本語` は入力式
- `日本語 → ハングル` は 3 択
- ミックス出題
- 回答後に正誤、読み方、意味、解説を表示
- 不正解の単語をスプレッドシートへ保存
- 直近の間違いを画面下に表示
- スマホ前提の押しやすい UI

## Git Branch Workflow

- `main`: production branch
- `feature/xxx`: new features
- `fix/xxx`: bug fixes
- `chore/xxx`: config or dependency changes

Do not commit `.env.local`, service account JSON, private keys, or tokens.

## Pull Request Flow

1. Create a feature branch from `main`
2. Commit the change
3. Push the branch to GitHub
4. Open a pull request
5. Check the Vercel Preview URL attached to the pull request
6. Merge to `main` after review

## Vercel Deployment

Connect the GitHub repository to Vercel. Pull requests create Preview Deployments. Merges into `main` create Production Deployments.

Set the same environment variables in Vercel before testing the preview or production URL.

## Cautions

- This app has no login by design. Treat the deployed URL as private.
- Anyone who can access the URL can submit answers and write mistake rows.
- The correct answer is included in the browser payload for simplicity. This is acceptable for private self-use, but not for a public quiz.
- Google Sheets is convenient for this scale, but a real database is better if user accounts, spaced repetition, or large histories become important.
