require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── DB Pool ───────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:            process.env.DB_HOST,
  port:            parseInt(process.env.DB_PORT || '3306'),
  user:            process.env.DB_USER,
  password:        process.env.DB_PASS,
  database:        process.env.DB_NAME,
  ssl:             process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
});

// Helper
const db = () => pool;

// ═══════════════════════════════════════════════════════════════
// PRODUTOS
// ═══════════════════════════════════════════════════════════════

// GET /api/produtos
app.get('/api/produtos', async (req, res) => {
  try {
    const [rows] = await db().query('SELECT * FROM produtos WHERE ativo=1 ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/produtos
app.post('/api/produtos', async (req, res) => {
  try {
    const { nome, emoji = '📦', unidade, preco } = req.body;
    if (!nome || !unidade) return res.status(400).json({ ok: false, error: 'nome e unidade são obrigatórios' });
    const [r] = await db().query(
      'INSERT INTO produtos (nome,emoji,unidade,preco) VALUES (?,?,?,?)',
      [nome, emoji, unidade, parseFloat(preco) || 0]
    );
    const [[row]] = await db().query('SELECT * FROM produtos WHERE id=?', [r.insertId]);
    res.json({ ok: true, data: row });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PUT /api/produtos/:id
app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { nome, emoji = '📦', unidade, preco } = req.body;
    await db().query(
      'UPDATE produtos SET nome=?,emoji=?,unidade=?,preco=? WHERE id=?',
      [nome, emoji, unidade, parseFloat(preco) || 0, req.params.id]
    );
    const [[row]] = await db().query('SELECT * FROM produtos WHERE id=?', [req.params.id]);
    res.json({ ok: true, data: row });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/produtos/:id  (soft delete)
app.delete('/api/produtos/:id', async (req, res) => {
  try {
    await db().query('UPDATE produtos SET ativo=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true, data: { id: req.params.id } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// PEDIDOS
// ═══════════════════════════════════════════════════════════════

// GET /api/pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const [pedidos] = await db().query(
      'SELECT * FROM pedidos ORDER BY data_pedido DESC, id DESC LIMIT 200'
    );
    for (const p of pedidos) {
      const [itens] = await db().query(
        `SELECT pi.*, pr.nome, pr.emoji, pr.unidade
         FROM pedido_itens pi JOIN produtos pr ON pr.id=pi.produto_id
         WHERE pi.pedido_id=?`, [p.id]
      );
      p.itens = itens;
    }
    res.json({ ok: true, data: pedidos });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/pedidos
app.post('/api/pedidos', async (req, res) => {
  const conn = await db().getConnection();
  try {
    const { cliente, data_pedido, pago = 0, notas = '', itens = [] } = req.body;
    if (!cliente || !itens.length) return res.status(400).json({ ok: false, error: 'cliente e itens são obrigatórios' });

    const total = itens.reduce((s, it) => s + parseFloat(it.quantidade) * parseFloat(it.preco_unit), 0);
    await conn.beginTransaction();

    const [r] = await conn.query(
      'INSERT INTO pedidos (cliente,data_pedido,total,pago,notas) VALUES (?,?,?,?,?)',
      [cliente, data_pedido || new Date().toISOString().slice(0,10), total, pago ? 1 : 0, notas]
    );
    const pid = r.insertId;

    for (const it of itens) {
      await conn.query(
        'INSERT INTO pedido_itens (pedido_id,produto_id,quantidade,preco_unit) VALUES (?,?,?,?)',
        [pid, it.produto_id, parseFloat(it.quantidade), parseFloat(it.preco_unit)]
      );
    }
    await conn.commit();

    const [[ped]] = await conn.query('SELECT * FROM pedidos WHERE id=?', [pid]);
    const [itensDB] = await conn.query(
      `SELECT pi.*, pr.nome, pr.emoji, pr.unidade
       FROM pedido_itens pi JOIN produtos pr ON pr.id=pi.produto_id WHERE pi.pedido_id=?`, [pid]
    );
    ped.itens = itensDB;
    res.json({ ok: true, data: ped });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: e.message });
  } finally { conn.release(); }
});

// PUT /api/pedidos/:id  (toggle pago)
app.put('/api/pedidos/:id', async (req, res) => {
  try {
    const { pago } = req.body;
    await db().query('UPDATE pedidos SET pago=? WHERE id=?', [pago ? 1 : 0, req.params.id]);
    res.json({ ok: true, data: { id: req.params.id, pago } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/pedidos/:id
app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    await db().query('DELETE FROM pedidos WHERE id=?', [req.params.id]);
    res.json({ ok: true, data: { id: req.params.id } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// RELATÓRIO
// ═══════════════════════════════════════════════════════════════

app.get('/api/relatorio', async (req, res) => {
  try {
    const tipo = req.query.tipo || 'semanal';
    const hoje = new Date();

    let inicio, fim, label;
    if (tipo === 'semanal') {
      const day  = hoje.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const ini  = new Date(hoje); ini.setDate(hoje.getDate() + diff);
      const end  = new Date(ini);  end.setDate(ini.getDate() + 6);
      inicio = ini.toISOString().slice(0,10);
      fim    = end.toISOString().slice(0,10);
      label  = `Semana ${inicio}`;
    } else {
      inicio = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`;
      const lastDay = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).getDate();
      fim   = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${lastDay}`;
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      label = `${meses[hoje.getMonth()]} ${hoje.getFullYear()}`;
    }

    // Totais
    const [[totais]] = await db().query(`
      SELECT
        COUNT(*)                                              AS num_pedidos,
        COALESCE(SUM(total),0)                               AS total,
        COALESCE(SUM(CASE WHEN pago=1 THEN total ELSE 0 END),0) AS recebido,
        COALESCE(SUM(CASE WHEN pago=0 THEN total ELSE 0 END),0) AS pendente
      FROM pedidos WHERE data_pedido BETWEEN ? AND ?`, [inicio, fim]);

    // Por produto
    const [porProduto] = await db().query(`
      SELECT p.id, p.nome, p.emoji, p.unidade,
             COALESCE(SUM(pi.quantidade),0)                     AS qtd_total,
             COALESCE(SUM(pi.quantidade * pi.preco_unit),0)     AS receita
      FROM produtos p
      LEFT JOIN pedido_itens pi ON pi.produto_id=p.id
      LEFT JOIN pedidos ped     ON ped.id=pi.pedido_id AND ped.data_pedido BETWEEN ? AND ?
      WHERE p.ativo=1
      GROUP BY p.id ORDER BY p.id`, [inicio, fim]);

    // Tendência — últimas 8 semanas
    const tendencia = [];
    for (let i = 7; i >= 0; i--) {
      const d   = new Date(hoje); d.setDate(hoje.getDate() - i*7);
      const dow = d.getDay();
      const s   = new Date(d); s.setDate(d.getDate() + (dow===0?-6:1-dow));
      const e   = new Date(s); e.setDate(s.getDate()+6);
      const sw  = s.toISOString().slice(0,10);
      const ew  = e.toISOString().slice(0,10);
      const [[row]] = await db().query(
        'SELECT COALESCE(SUM(total),0) AS total FROM pedidos WHERE data_pedido BETWEEN ? AND ?', [sw, ew]
      );
      tendencia.push({ semana: sw, total: parseFloat(row.total) });
    }

    res.json({ ok: true, data: { label, tipo, inicio, fim, totais, porProduto, tendencia } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── DB init (cria tabelas se não existirem) ───────────────────────────────
async function initDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS produtos (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    nome      VARCHAR(100)  NOT NULL,
    emoji     VARCHAR(10)   DEFAULT '📦',
    unidade   VARCHAR(30)   NOT NULL DEFAULT 'unid.',
    preco     DECIMAL(10,2) NOT NULL DEFAULT 0,
    ativo     TINYINT(1)    DEFAULT 1,
    criado_em DATETIME      DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await pool.query(`CREATE TABLE IF NOT EXISTS pedidos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cliente     VARCHAR(150)  NOT NULL,
    data_pedido DATE          NOT NULL,
    total       DECIMAL(10,2) NOT NULL DEFAULT 0,
    pago        TINYINT(1)    DEFAULT 0,
    notas       TEXT,
    criado_em   DATETIME      DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await pool.query(`CREATE TABLE IF NOT EXISTS pedido_itens (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id   INT           NOT NULL,
    produto_id  INT           NOT NULL,
    quantidade  DECIMAL(10,2) NOT NULL DEFAULT 1,
    preco_unit  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)  ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`);

  // Produtos iniciais
  const [[count]] = await pool.query('SELECT COUNT(*) AS n FROM produtos');
  if (count.n === 0) {
    await pool.query(
      "INSERT INTO produtos (nome,emoji,unidade,preco) VALUES ('Ovos Orgânicos','🥚','dúzia',120), ('Patos Vivos','🦆','unid.',850)"
    );
  }
  console.log('✅ Base de dados inicializada');
}

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🌿 Kasheka Farm a correr na porta ${PORT}`);
  await initDB();
});
