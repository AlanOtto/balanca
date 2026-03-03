const net = require('net');
const express = require('express');
const cors = require('cors');

const BALANCA_IP = process.env.BALANCA_IP || '192.168.69.151';
const BALANCA_PORT = Number(process.env.BALANCA_PORT) || 23;

let pesoAtual = null;
let ultimaLeitura = null;

let socket = null;
let buffer = '';

// ===== TCP CLIENT =====
function startTcpClient() {
  if (socket) {
    socket.destroy();
    socket = null;
  }

  socket = new net.Socket();

  // 🔥 AJUSTES CRÍTICOS PARA TEMPO REAL
  socket.setNoDelay(true);          // desativa Nagle
  socket.setKeepAlive(true, 5000);  // mantém conexão viva

  socket.connect(BALANCA_PORT, BALANCA_IP, () => {
    console.log(new Date().toISOString(), 'Conectado à balança', `${BALANCA_IP}:${BALANCA_PORT}`);
  });

  socket.on('data', (data) => {
    buffer += data.toString('utf8');

    // quebra corretamente por linha
    const linhas = buffer.split('\n');
    buffer = linhas.pop(); // mantém resto do pacote

    for (const linha of linhas) {
      const texto = linha.trim();
      if (!texto) continue;

      const match = texto.match(/([+-]?\d+)\s*kg/i);
      if (!match) continue;

      pesoAtual = Number(match[1]);
      ultimaLeitura = new Date();
    }
  });

  socket.on('close', (hadError) => {
    console.warn(
      new Date().toISOString(),
      'Conexão TCP encerrada',
      hadError ? '(com erro)' : ''
    );
    setTimeout(startTcpClient, 3000);
  });

  socket.on('error', (err) => {
    console.error(new Date().toISOString(), 'Erro TCP:', err.message);
    socket.destroy();
  });
}

startTcpClient();

// ===== API =====
const app = express();
app.use(cors());
app.use(express.json());

app.get('/peso', (req, res) => {
  res.json({
    peso: pesoAtual,
    unidade: 'kg',
    ultimaLeitura
  });
});

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.listen(9018, () => {
  console.log('API rodando em http://localhost:9018');
});