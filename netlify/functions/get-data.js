// Ubicación: netlify/functions/get-data.js
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    // Autenticación segura usando las variables de entorno de Netlify
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Conexión con la hoja de cálculo
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'fact_ebitda!A:E', // Lee Mes, Sucursal, Concepto, Subconcepto, Monto
    });

    const rows = response.data.values;
    
    // Si la hoja está vacía, devolvemos una lista vacía
    if (!rows || rows.length === 0) return { statusCode: 200, body: JSON.stringify([]) };

    // Procesamos los encabezados (Fila 1) y los datos
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });

    // Respuesta exitosa
    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data) 
    };

  } catch (error) {
    console.error("Error al leer Google Sheets:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "No se pudo conectar con la hoja de cálculo. Verifica permisos y credenciales." }) 
    };
  }
};