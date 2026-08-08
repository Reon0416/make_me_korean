import { google } from 'googleapis';

import { parseVocabulary } from './quiz';
import type { QuizQuestion, VocabularyItem } from './types';

const spreadsheetId = process.env.SPREADSHEET_ID || '1-AIYffuG3Dpqtct6wMTRChTIIsWwXcRX2QBp42oF77c';
const vocabularySheetName = process.env.VOCAB_SHEET_NAME || 'シート1';
const mistakeSheetName = process.env.MISTAKE_SHEET_NAME || '間違えた単語';

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
    range: `${quoteSheetName(mistakeSheetName)}!A:H`,
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
        ],
      ],
    },
  });
}

export async function getMistakeSummary() {
  const sheets = getSheetsClient();
  await ensureMistakeSheet(sheets);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(mistakeSheetName)}!A2:H`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = (response.data.values ?? []) as string[][];
  return {
    count: rows.length,
    recent: rows
      .slice(-10)
      .reverse()
      .map((row) => ({
        timestamp: row[0] ?? '',
        mode: row[1] ?? '',
        question: row[2] ?? '',
        userAnswer: row[3] ?? '',
        korean: row[4] ?? '',
        reading: row[5] ?? '',
        japanese: row[6] ?? '',
      })),
  };
}

async function ensureMistakeSheet(sheets: ReturnType<typeof getSheetsClient>) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title)',
  });

  const exists = metadata.data.sheets?.some((sheet) => sheet.properties?.title === mistakeSheetName);
  if (exists) return;

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
                columnCount: 8,
                frozenRowCount: 1,
              },
            },
          },
        },
      ],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(mistakeSheetName)}!A1:H1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['日時', '出題形式', '問題', '回答', '韓国語', '読み方', '日本語の意味', '解説']],
    },
  });
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}
