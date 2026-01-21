const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    // 1. VALIDACIÓN DE VARIABLES
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) throw new Error("Falta el EMAIL en Netlify");
    if (!process.env.GOOGLE_PRIVATE_KEY) throw new Error("Falta la CLAVE PRIVADA en Netlify");
    if (!process.env.GOOGLE_SHEET_ID) throw new Error("Falta el ID DE LA HOJA en Netlify");

    // 2. LIMPIEZA AUTOMÁTICA DE LA CLAVE PRIVADA
    // Esto arregla si la clave tiene comillas extra o saltos de línea mal formateados
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      .replace(/\\n/g, '\n')   // Convierte los \n literales en saltos reales
      .replace(/"/g, '');      // Quita comillas dobles si se colaron al principio o final

    // 3. LIMPIEZA AUTOMÁTICA DEL ID DE LA HOJA
    // Si pegaste la URL entera (https://...), esto extrae solo el ID
    let sheetId = process.env.GOOGLE_SHEET_ID;
    if (sheetId.includes('/d/')) {
      sheetId = sheetId.split('/d/')[1].split('/')[0];
    }

    console.log("Intentando conectar con Sheet ID:", sheetId);
    console.log("Usando Email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

    // 4. AUTENTICACIÓN
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 5. OBTENCIÓN DE DATOS
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'fact_ebitda!A:E',
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) return { statusCode: 200, body: JSON.stringify([]) };

    // Procesar datos
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });

    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data) 
    };

  } catch (error) {
    console.error("ERROR REAL DE GOOGLE:", error.message);
    
    // AQUÍ ESTÁ EL CAMBIO: Devolvemos el mensaje exacto de Google para que lo leas
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: error.message, 
        details: "Por favor copia este mensaje y pégalo en el chat." 
      }) 
    };
  }
};
