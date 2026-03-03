const net = require('net');
const express = require('express');
const cors = require('cors');

// ===== CONFIGURAÇÃO DAS BALANÇAS =====
const BALANCAS = {
  rsp: {
    ip: '192.168.69.151',
    port: 23,
    peso: null,
    ultimaLeitura: null
  },
  klabin: {
    ip: '192.168.88.251',
    port: 23,
    peso: null,
    ultimaLeitura: null
  }
};

// ===== TCP CLIENT GENÉRICO =====
function startTcpClient(nome, balanca) {
  let socket = null;
  let buffer = '';

  function conectar() {
    if (socket) {
      socket.destroy();
      socket = null;
    }

    socket = new net.Socket();

    // 🔥 ajustes críticos para tempo real
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 5000);

    socket.connect(balanca.port, balanca.ip, () => {
      console.log(
        new Date().toISOString(),
        `[${nome}] Conectado à balança ${balanca.ip}:${balanca.port}`
      );
    });

    socket.on('data', (data) => {
      buffer += data.toString('utf8');

      const linhas = buffer.split('\n');
      buffer = linhas.pop();

      for (const linha of linhas) {
        const texto = linha.trim();
        if (!texto) continue;

        const match = texto.match(/([+-]?\d+)\s*kg/i);
        if (!match) continue;

        balanca.peso = Number(match[1]);
        balanca.ultimaLeitura = new Date();
      }
    });

    socket.on('close', (hadError) => {
      console.warn(
        new Date().toISOString(),
        `[${nome}] Conexão encerrada`,
        hadError ? '(com erro)' : ''
      );
      setTimeout(conectar, 3000);
    });

    socket.on('error', (err) => {
      console.error(
        new Date().toISOString(),
        `[${nome}] Erro TCP:`,
        err.message
      );
      socket.destroy();
    });
  }

  conectar();
}

// 🔌 Inicia as duas balanças
startTcpClient('RSP', BALANCAS.rsp);
startTcpClient('KLABIN', BALANCAS.klabin);

// ===== API =====
const app = express();
app.use(cors());
app.use(express.json());

app.get('/peso', (req, res) => {
  res.json({
    peso_rsp: BALANCAS.rsp.peso,
    ultimaLeitura_rsp: BALANCAS.rsp.ultimaLeitura,

    peso_klabin: BALANCAS.klabin.peso,
    ultimaLeitura_klabin: BALANCAS.klabin.ultimaLeitura,

    unidade: 'kg'
  });
});

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.listen(9018, () => {
  console.log('API rodando em http://localhost:9018');
});