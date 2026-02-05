import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    // 1. Verificación de seguridad
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      throw new Error("Faltan credenciales de Google en las variables de entorno de Vercel.");
    }

    // 2. Limpieza de credenciales
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      .replace(/\\n/g, '\n')
      .replace(/"/g, '');

    // 3. Limpieza del ID
    let sheetId = process.env.GOOGLE_SHEET_ID;
    if (sheetId.includes('/d/')) {
      sheetId = sheetId.split('/d/')[1].split('/')[0];
    }

    // --- LÓGICA MULTI-HOJA ---
    const requestedSheet = req.query.sheet;
    const tabName = requestedSheet === 'financiero' ? 'fact_financiero' : 'fact_ebitda';
    const range = requestedSheet === 'financiero' ? `${tabName}!A:H` : `${tabName}!A:E`;

    // 4. Autenticación
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 5. Obtención de datos
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return res.status(200).json([]);
    }

    // 6. Procesamiento
    const headers = rows[0].map(h => h ? h.trim() : `Col_${Math.random()}`);
    const data = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        const val = row[i];
        obj[header] = (typeof val === 'string') ? val.trim() : val;
      });
      return obj;
    });

    return res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
