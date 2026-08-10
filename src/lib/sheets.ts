import { google } from 'googleapis';

import { parseNumberVocabulary, parseVocabulary } from './quiz';
import type { MistakeItem, NumberItem, NumberKind, NumberQuizKind, QuizQuestion, VocabularyItem } from './types';

const spreadsheetId = process.env.SPREADSHEET_ID || '1-AIYffuG3Dpqtct6wMTRChTIIsWwXcRX2QBp42oF77c';
const vocabularySheetName = process.env.VOCAB_SHEET_NAME || 'シート1';
const nativeNumberSheetName = process.env.NATIVE_NUMBER_SHEET_NAME || '固有数詞';
const sinoNumberSheetName = process.env.SINO_NUMBER_SHEET_NAME || '漢数詞';
const mistakeSheetName = process.env.MISTAKE_SHEET_NAME || '間違えた単語';
const numberCacheTtlMs = 5 * 60 * 1000;
const nativeStudyNumberValues = new Set([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '20',
  '30',
  '40',
  '50',
  '60',
  '70',
  '80',
  '90',
]);
const sinoStudyNumberValues = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
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

let numberVocabularyCache: { expiresAt: number; items: NumberItem[] } | null = null;
let numberVocabularyPromise: Promise<NumberItem[]> | null = null;

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

export async function getNumberVocabulary(kind: NumberQuizKind = 'mixed'): Promise<NumberItem[]> {
  const allNumbers = await getAllNumberVocabulary();
  return kind === 'mixed' ? allNumbers : allNumbers.filter((item) => item.kind === kind);
}

export async function getNumberStudyLists() {
  const allNumbers = await getAllNumberVocabulary();

  return {
    native: filterStudyNumbers(
      allNumbers.filter((item) => item.kind === 'native'),
      nativeStudyNumberValues,
    ),
    sino: filterStudyNumbers(
      allNumbers.filter((item) => item.kind === 'sino'),
      sinoStudyNumberValues,
    ),
  };
}

async function getAllNumberVocabulary(): Promise<NumberItem[]> {
  const now = Date.now();
  if (numberVocabularyCache && numberVocabularyCache.expiresAt > now) {
    return numberVocabularyCache.items;
  }

  if (!numberVocabularyPromise) {
    numberVocabularyPromise = loadAllNumberVocabulary()
      .then((items) => {
        numberVocabularyCache = { expiresAt: Date.now() + numberCacheTtlMs, items };
        return items;
      })
      .finally(() => {
        numberVocabularyPromise = null;
      });
  }

  return numberVocabularyPromise;
}

async function loadAllNumberVocabulary(): Promise<NumberItem[]> {
  const sheets = getSheetsClient();
  const [nativeResponse, sinoResponse] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetName(nativeNumberSheetName)}!A:Z`,
      valueRenderOption: 'FORMATTED_VALUE',
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetName(sinoNumberSheetName)}!A:Z`,
      valueRenderOption: 'FORMATTED_VALUE',
    }),
  ]);

  const native = parseNumberVocabulary((nativeResponse.data.values ?? []) as string[][], 'native');
  const sino = parseNumberVocabulary((sinoResponse.data.values ?? []) as string[][], 'sino');

  return [...native, ...sino];
}

function filterStudyNumbers(numbers: NumberItem[], allowedValues: Set<string>) {
  return numbers
    .filter((item) => allowedValues.has(normalizeNumberValue(item.value)))
    .sort((a, b) => Number(normalizeNumberValue(a.value)) - Number(normalizeNumberValue(b.value)));
}

function normalizeNumberValue(value: string) {
  return String(value || '').replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).trim();
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
