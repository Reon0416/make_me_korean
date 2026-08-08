import { google } from 'googleapis';

import { parseVocabulary } from './quiz';
import type { MistakeItem, QuizQuestion, VocabularyItem } from './types';

const spreadsheetId = process.env.SPREADSHEET_ID || '1-AIYffuG3Dpqtct6wMTRChTIIsWwXcRX2QBp42oF77c';
const vocabularySheetName = process.env.VOCAB_SHEET_NAME || 'シート1';
const mistakeSheetName = process.env.MISTAKE_SHEET_NAME || '間違えた単語';
const mistakeHeaders = [
  '日時',
  '出題形式',
  '問題',
  '回答',
  '韓国語',
  '読み方',
  '日本語の意味',
  '解説',
  '状態',
  '解決日時',
];

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets API の環境変数が未設定です。');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function getVocabulary(): Promise<VocabularyItem[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(vocabularySheetName)}!A:Z`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  return parseVocabulary((response.data.values ?? []) as string[][]);
}

export async function appendMistake(question: QuizQuestion, userAnswer: string) {
  const sheets = getSheetsClient();
  await ensureMistakeSheet(sheets);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteSheetName(mistakeSheetName)}!A:J`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          new Date().toISOString(),
          question.promptLabel,
          question.question,
          userAnswer,
          question.korean,
          question.reading,
          question.japanese,
          question.explanation,
          '未解決',
          '',
        ],
      ],
    },
  });
}

export async function getUnresolvedMistakes(): Promise<MistakeItem[]> {
  const sheets = getSheetsClient();
  await ensureMistakeSheet(sheets);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(mistakeSheetName)}!A2:J`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = (response.data.values ?? []) as string[][];
  return rows
    .map((row, index) => toMistakeItem(row, index + 2))
    .filter((item) => item.korean && item.japanese && item.status !== '解決済み');
}

export async function getMistakeSummary() {
  const mistakes = await getUnresolvedMistakes();

  return {
    count: mistakes.length,
    recent: mistakes.slice(-10).reverse(),
  };
}

export async function markMistakeResolved(rowNumber: number) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error('解決する間違い単語の行番号が不正です。');
  }

  const sheets = getSheetsClient();
  await ensureMistakeSheet(sheets);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(mistakeSheetName)}!I${rowNumber}:J${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['解決済み', new Date().toISOString()]],
    },
  });
}

async function ensureMistakeSheet(sheets: ReturnType<typeof getSheetsClient>) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title)',
  });

  const exists = metadata.data.sheets?.some((sheet) => sheet.properties?.title === mistakeSheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: mistakeSheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10,
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      },
    });
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(mistakeSheetName)}!A1:J1`,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const currentHeader = ((headerResponse.data.values ?? [])[0] ?? []) as string[];
  const needsHeaderUpdate = mistakeHeaders.some((header, index) => currentHeader[index] !== header);

  if (needsHeaderUpdate) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheetName(mistakeSheetName)}!A1:J1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [mistakeHeaders],
      },
    });
  }
}

function toMistakeItem(row: string[], rowNumber: number): MistakeItem {
  return {
    rowNumber,
    timestamp: row[0] ?? '',
    mode: row[1] ?? '',
    question: row[2] ?? '',
    userAnswer: row[3] ?? '',
    korean: row[4] ?? '',
    reading: row[5] ?? '',
    japanese: row[6] ?? '',
    explanation: row[7] ?? '',
    status: row[8] || '未解決',
    resolvedAt: row[9] ?? '',
  };
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}
