const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

// Claude API中継
app.post('/api/claude', async (req, res) => {
  try {
    const body = req.body;
    if (body.messages) {
      body.messages = body.messages.map(m => ({
        ...m,
        content: typeof m.content === 'string'
          ? m.content.replace(/[\u0000-\u001F\u007F]/g, ' ')
          : m.content
      }));
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GAS中継（CORSバイパス）
app.post('/api/gas', async (req, res) => {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby0yEh3ZU5cmQPRYve1r_Axhxv8cgE7NnoVX5goEk3skATjzvLgLfBrF1nUF13-NmCQhg/exec';
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      redirect: 'follow'
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { success: true, raw: text }; }
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// AssemblyAI アップロード中継
app.post('/api/aai/upload', express.raw({ type: '*/*', limit: '500mb' }), async (req, res) => {
  try {
    const response = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': process.env.ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream'
      },
      body: req.body
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AssemblyAI 文字起こし開始
app.post('/api/aai/transcript', async (req, res) => {
  try {
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': process.env.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AssemblyAI 結果取得
app.get('/api/aai/transcript/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${req.params.id}`, {
      headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
