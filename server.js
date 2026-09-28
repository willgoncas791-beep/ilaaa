const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS, JS e Imágenes)
app.use(express.static(path.join(__dirname)));

// Endpoint API para procesar el inicio de sesión de prueba
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Faltan datos de acceso' });
  }

  return res.json({
    success: true,
    message: `Autenticación de Telebanking procesada para el usuario ${username}`,
    timestamp: new Date().toISOString()
  });
});

// Ruta principal abre index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Servidor Scotiabank Telebanking corriendo en puerto ${PORT}`);
  console.log(` Acceso local: http://localhost:${PORT}`);
  console.log(` Preparado para despliegue automático en DigitalOcean`);
  console.log(`==================================================`);
});
