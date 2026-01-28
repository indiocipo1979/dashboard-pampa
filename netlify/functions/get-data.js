const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    // 1. Verificación de seguridad: ¿Están las claves en Netlify?
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      throw new Error("Faltan credenciales en Netlify (Email, Key o ID).");
    }

    // 2. Limpieza de credenciales (para evitar errores de formato)
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
    let sheetId = process.env.GOOGLE_SHEET_ID;
    if (sheetId.includes('/d/')) {
      sheetId = sheetId.split('/d/')[1].split('/')[0];
    }

    // --- LÓGICA MULTI-HOJA (El cerebro del cambio de pestaña) ---
    // Detectamos qué pide el dashboard: 'ebitda' (default) o 'financiero'
    const requestedSheet = event.queryStringParameters.sheet;
    
    // Si pide 'financiero', leemos la hoja 'fact_financiero'. Si no, 'fact_ebitda'.
    const tabName = requestedSheet === 'financiero' ? 'fact_financiero' : 'fact_ebitda';
    
    // Rango dinámico: Para financiero leemos más columnas (hasta la H) para cubrir todo
    const range = requestedSheet === 'financiero' ? `${tabName}!A:H` : `${tabName}!A:E`;

    console.log(`Solicitando datos de la hoja: ${tabName}`);

    // 3. Autenticación con Google
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 4. Obtención de datos
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const rows = response.data.values;

    // Si la hoja está vacía, devolvemos lista vacía sin error
    if (!rows || rows.length === 0) return { statusCode: 200, body: JSON.stringify([]) };

    // 5. Procesamiento y Limpieza de Datos
    // Convertimos las filas en objetos JSON fáciles de leer
    const headers = rows[0].map(h => h ? h.trim() : `Col_${Math.random()}`);
    
    const data = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        const val = row[i];
        // Quitamos espacios en blanco al principio y final de los textos
        obj[header] = (typeof val === 'string') ? val.trim() : val;
      });
      return obj;
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Error en get-data:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
