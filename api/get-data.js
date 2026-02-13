const DOC_ID = process.env.GSHEET_DOC_ID || '1LdAFp1P18-ebcwGMt9BRlnFb3jcSwXZg0PlPWeo7XyA';

const SHEET_GIDS = {
  ebitda: process.env.GSHEET_GID_EBITDA || '1175648135',
  financiero: process.env.GSHEET_GID_FINANCIERO || '1222145617'
};

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const parseCsvToJson = (csvText) => {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row = {};

    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = values[j] ?? '';
    }

    rows.push(row);
  }

  return rows;
};

const fetchSheetCsv = async (docId, gid) => {
  const urls = [
    `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${gid}`
  ];

  let lastError;

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      if (!response.ok) {
        lastError = new Error(`Google Sheets HTTP ${response.status}`);
        continue;
      }

      const text = await response.text();
      if (!text || text.trim().length === 0 || /<html/i.test(text)) {
        lastError = new Error('Google Sheets devolvió contenido inválido');
        continue;
      }

      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No se pudo leer Google Sheets');
};

export default async function handler(req, res) {
  try {
    const sheet = req?.query?.sheet;
    const gid = SHEET_GIDS[sheet] || SHEET_GIDS.ebitda;

    const csvText = await fetchSheetCsv(DOC_ID, gid);
    const data = parseCsvToJson(csvText);

    res.status(200).json(data);
  } catch (error) {
    console.error('API Error get-data:', error);
    res.status(500).json({ error: 'Error al leer Google Sheets.' });
  }
}