const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    // 1. Verificación de variables críticas
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      throw new Error("Faltan variables de entorno en Netlify (Email, Key o ID).");
    }

    // 2. Limpieza de la clave privada (corrige saltos de línea y comillas extra)
    // Esto es crucial para evitar el error 500/502 por formato de clave
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      .replace(/\\n/g, '\n')
      .replace(/"/g, '');

    // 3. Limpieza del ID de la hoja (extrae ID si se pegó la URL completa)
    let sheetId = process.env.GOOGLE_SHEET_ID;
    if (sheetId.includes('/d/')) {
      sheetId = sheetId.split('/d/')[1].split('/')[0];
    }

    // 4. Autenticación con Google
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
      range: 'fact_ebitda!A:E', // Lee las columnas A hasta E
    });

    const rows = response.data.values;
    
    // Si la hoja está vacía, devolvemos un array vacío pero con éxito (200)
    if (!rows || rows.length === 0) {
      return { 
        statusCode: 200, 
        body: JSON.stringify([]) 
      };
    }

    // 6. Procesamiento de datos (Headers + Filas)
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });

    return { 
      statusCode: 200, 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Opcional, útil para desarrollo
      },
      body: JSON.stringify(data) 
    };

  } catch (error) {
    console.error("Server Error:", error);
    // Devolvemos el error exacto para mostrarlo en el cartel rojo del Frontend
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
