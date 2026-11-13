const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const projectStore = require('./services/projectStore');
const syncScheduler = require('./services/syncScheduler');
const weeklyReportStore = require('./services/weeklyReportStore');
const teamStore = require('./services/teamStore');
const accessStore = require('./services/accessStore');

const app = express();
app.disable('x-powered-by');

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Restricted CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida pelo CORS.'));
  }
}));

app.use(express.json({ limit: '10mb' }));

// Simple in-memory rate limiter for auth & admin endpoints
const authRateMap = new Map();
function rateLimitAuth(maxAttempts = 25, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = authRateMap.get(key);
    if (!entry || now > entry.resetAt) {
      authRateMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.'
      });
    }
    next();
  };
}

function isLocalRequest(req) {
  if (process.env.VERCEL || process.env.READ_ONLY_MODE === 'true') return false;
  if (req.headers['x-forwarded-for']) return false;
  const remote = (req.socket?.remoteAddress || req.ip || '').replace(/^::ffff:/, '');
  const isLocalIp = remote === '127.0.0.1' || remote === '::1';
  const host = (req.hostname || req.headers.host || '').split(':')[0].toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  return isLocalIp && isLocalHost;
}

// Serve static logos if uploaded
const publicLogos = path.join(__dirname, 'public/assets/logos');
try {
  if (!require('fs').existsSync(publicLogos)) {
    require('fs').mkdirSync(publicLogos, { recursive: true });
  }
} catch (_) {}
app.use('/assets/logos', express.static(publicLogos));

// Viewer Authentication & Access Control Endpoints
app.get('/api/auth/config', (req, res) => {
  res.json({
    success: true,
    data: accessStore.getPublicAuthConfig()
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const user = accessStore.verifySessionToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
  }
  res.json({ success: true, user });
});

app.post('/api/auth/request-otp', rateLimitAuth(10), async (req, res) => {
  try {
    const result = await accessStore.requestEmailOtp(req.body.email);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/verify-otp', rateLimitAuth(15), (req, res) => {
  try {
    const { email, code, challengeToken } = req.body;
    const result = accessStore.verifyEmailOtp(email, code, challengeToken);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login-password', rateLimitAuth(20), (req, res) => {
  try {
    const { email, password, passwordProof } = req.body;
    const result = accessStore.verifyPasscode(email, password, passwordProof);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/change-first-password', (req, res) => {
  try {
    const { email, newPassword, firstAccessToken } = req.body;
    const result = accessStore.completeFirstAccessPasswordChange(email, newPassword, firstAccessToken);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/reset-forgotten-password', (req, res) => {
  try {
    const { email, newPassword, resetToken } = req.body;
    const result = accessStore.resetForgottenPassword(email, newPassword, resetToken);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/microsoft', async (req, res) => {
  try {
    const result = await accessStore.verifyMicrosoftToken(req.body.accessToken, req.body.idToken);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

// Viewer Authorization Middleware for Public Portfolio Endpoints
function checkViewerAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const viewerUser = bearerToken ? accessStore.verifySessionToken(bearerToken) : null;
  if (viewerUser) {
    req.viewerUser = viewerUser;
  }

  const isLocal = isLocalRequest(req);
  const forceAuth = req.headers['x-force-auth'] === 'true';

  const authCfg = accessStore.getPublicAuthConfig();
  if ((!isLocal || forceAuth) && authCfg.requireAuthOnline !== false && !req.viewerUser) {
    return res.status(401).json({
      success: false,
      requiresAuth: true,
      message: 'Autenticação necessária para acessar o Portfólio Executivo.'
    });
  }

  // Enforce client scope if viewerUser is restricted to a single client/system
  if (req.viewerUser && req.viewerUser.clientFilter && req.viewerUser.clientFilter !== 'Todos') {
    req.query.client = req.viewerUser.clientFilter;
  }

  next();
}

// Public API endpoints
app.get('/api/public/projects', checkViewerAuth, (req, res) => {
  const clientFilter = req.query.client || null;
  const includeMaintenance = req.query.includeMaintenance === 'true';
  res.json({
    success: true,
    data: projectStore.getPublicProjects(clientFilter, includeMaintenance)
  });
});

app.get('/api/public/clients', checkViewerAuth, (req, res) => {
  let clients = projectStore.getClients();
  if (req.viewerUser && req.viewerUser.clientFilter && req.viewerUser.clientFilter !== 'Todos') {
    clients = clients.filter(c => c.name === req.viewerUser.clientFilter);
  }
  res.json({
    success: true,
    data: clients
  });
});

app.get('/api/public/stats', checkViewerAuth, (req, res) => {
  const clientFilter = req.query.client || null;
  res.json({
    success: true,
    data: projectStore.getStats(clientFilter)
  });
});

app.get('/api/public/maintenance-metrics', checkViewerAuth, (req, res) => {
  const clientFilter = req.query.client || null;
  const period = req.query.period || 'year_2026';
  res.json({
    success: true,
    data: projectStore.getMaintenanceMetrics(clientFilter, period)
  });
});

app.get('/api/public/team-allocation', checkViewerAuth, (req, res) => {
  const clientFilter = req.query.client || null;
  const period = req.query.period || 'year_2026';
  res.json({
    success: true,
    data: teamStore.getTeamAllocationReport(clientFilter, period, true)
  });
});

// Client Portal Endpoint (Secure Token-gated view)
app.get('/api/public/client-portal/:slug', (req, res) => {
  const { slug } = req.params;
  const token = req.query.token;

  const client = projectStore.getClientBySlug(slug);
  if (!client) {
    return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
  }

  // Token validation
  if (!projectStore.verifyClientToken(client, token)) {
    return res.status(401).json({ success: false, message: 'Token de acesso inválido ou expirado para este cliente.' });
  }

  const projects = projectStore.getPublicProjects(client.name);
  const stats = projectStore.getStats(client.name);

  res.json({
    success: true,
    client: {
      name: client.name,
      slug: client.slug,
      logoUrl: client.logoUrl,
      description: client.description
    },
    data: projects,
    stats: stats
  });
});

// Public Weekly Status Reports (for Executive Presentation & History)
app.get('/api/public/weekly-reports', checkViewerAuth, (req, res) => {
  res.json({
    success: true,
    data: weeklyReportStore.getAllReports()
  });
});

app.get('/api/public/weekly-reports/:id', checkViewerAuth, (req, res) => {
  const report = weeklyReportStore.getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Relatório semanal não encontrado.' });
  }
  res.json({
    success: true,
    data: report
  });
});

// Admin / Curator Authentication (Strictly restricted to Localhost)
function checkAdminAuth(req, res, next) {
  if (!isLocalRequest(req)) {
    return res.status(403).json({
      success: false,
      message: 'Modo somente visualização: a Curadoria e as atualizações são restritas à máquina local do administrador.'
    });
  }

  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (!pin || pin !== config.adminPin) {
    return res.status(401).json({ success: false, message: 'PIN administrativo incorreto ou ausente.' });
  }
  next();
}

// Admin Access Control & Security Management
app.get('/api/admin/access-control', checkAdminAuth, (req, res) => {
  res.json({
    success: true,
    data: accessStore.getAdminConfig()
  });
});

app.put('/api/admin/access-control/settings', checkAdminAuth, (req, res) => {
  try {
    const updated = accessStore.updateAdminSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/access-control/users', checkAdminAuth, (req, res) => {
  try {
    const updated = accessStore.upsertUser(req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/access-control/users/:id', checkAdminAuth, (req, res) => {
  try {
    const updated = accessStore.deleteUser(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/access-control/users/:id/invite', checkAdminAuth, async (req, res) => {
  try {
    const result = await accessStore.sendInvitationEmail(req.params.id, req.body.dashboardUrl);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Admin Team Management (Visibility & Project Allocation)
app.get('/api/admin/team', checkAdminAuth, (req, res) => {
  res.json({
    success: true,
    data: teamStore.getAllMembers()
  });
});

app.put('/api/admin/team/:name', checkAdminAuth, (req, res) => {
  try {
    const updated = teamStore.updateMember(req.params.name, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/team', checkAdminAuth, (req, res) => {
  try {
    const updated = teamStore.updateAllMembers(req.body.members);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Admin Weekly Report Management
app.post('/api/admin/weekly-reports/generate', checkAdminAuth, (req, res) => {
  try {
    const report = weeklyReportStore.generateCurrentWeek();
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/weekly-reports', checkAdminAuth, (req, res) => {
  try {
    const saved = weeklyReportStore.saveReport(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/weekly-reports/:id', checkAdminAuth, (req, res) => {
  try {
    const updated = weeklyReportStore.saveReport({ id: req.params.id, ...req.body });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/weekly-reports/:id', checkAdminAuth, (req, res) => {
  const ok = weeklyReportStore.deleteReport(req.params.id);
  res.json({ success: ok });
});

app.get('/api/admin/projects', checkAdminAuth, (req, res) => {
  res.json({
    success: true,
    data: projectStore.getAllProjects()
  });
});

app.post('/api/admin/projects', checkAdminAuth, (req, res) => {
  const newProj = projectStore.createManualProject(req.body);
  try { weeklyReportStore.syncAllReportsWithProjects(); } catch (_) {}
  res.json({ success: true, data: newProj });
});

app.put('/api/admin/projects/:id', checkAdminAuth, (req, res) => {
  const updated = projectStore.updateProject(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
  }
  try {
    if (req.body.executiveSummary !== undefined) {
      weeklyReportStore.updateProjectStatusReport(req.params.id, req.body.executiveSummary);
    }
    weeklyReportStore.syncAllReportsWithProjects();
  } catch (_) {}
  res.json({ success: true, data: updated });
});

app.delete('/api/admin/projects/:id', checkAdminAuth, (req, res) => {
  const deleted = projectStore.deleteProject(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
  }
  try { weeklyReportStore.syncAllReportsWithProjects(); } catch (_) {}
  res.json({ success: true, message: 'Projeto excluído com sucesso.', data: deleted });
});

app.get('/api/admin/projects/:id/azure-audit', checkAdminAuth, async (req, res) => {
  try {
    const proj = projectStore.projects.find(p => p.id === req.params.id);
    if (!proj) {
      return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
    }
    const azureService = require('./services/azureDevOpsService');
    const auditData = await azureService.getProjectFullAudit(proj.name);
    res.json({ success: true, data: auditData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/clients/:slug', checkAdminAuth, (req, res) => {
  const updatedClient = projectStore.updateClient(req.params.slug, req.body);
  if (!updatedClient) {
    return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
  }
  res.json({ success: true, data: updatedClient });
});

app.post('/api/admin/clients/:slug/logo', checkAdminAuth, (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const updated = projectStore.saveClientLogo(req.params.slug, imageBase64);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Azure DevOps PAT & Status Endpoints
app.get('/api/admin/azure/status', checkAdminAuth, async (req, res) => {
  const status = projectStore.getAzureStatus();
  res.json({ success: true, data: status });
});

app.post('/api/admin/azure/test', checkAdminAuth, async (req, res) => {
  const azureService = require('./services/azureDevOpsService');
  const result = await azureService.testConnection();
  res.json(result);
});

app.post('/api/admin/azure/pat', checkAdminAuth, (req, res) => {
  try {
    const { pat } = req.body;
    const updated = projectStore.updateAzurePat(pat);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/sync', checkAdminAuth, async (req, res) => {
  const result = await syncScheduler.runSync();
  res.json(result);
});

app.post('/api/admin/publish-online', checkAdminAuth, (req, res) => {
  const { exec } = require('child_process');
  const rootDir = path.join(__dirname, '..');
  const cmd = 'git add server/data server/public/assets/logos && (git diff --cached --quiet || git commit -m "chore: atualizacao de dados do portfolio e status report") && git push origin main';

  exec(cmd, { cwd: rootDir, timeout: 60000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Publish Online] Erro ao publicar no GitHub:', stderr || err.message);
      return res.status(500).json({
        success: false,
        message: 'Falha ao enviar para o GitHub: ' + (stderr || err.message)
      });
    }
    res.json({
      success: true,
      message: '🚀 Dados enviados com sucesso para o GitHub! A versão online de visualização será atualizada automaticamente em instantes.'
    });
  });
});

// Direct Landscape PDF Export Endpoint (uses Headless Edge/Chrome so orientation is 100% A4 Landscape)
const pdfRenderCache = new Map();

app.get('/api/internal/pdf-render/:token', (req, res) => {
  const htmlDoc = pdfRenderCache.get(req.params.token);
  if (!htmlDoc) {
    return res.status(404).send('Not found');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(htmlDoc);
});

app.post('/api/public/export-pdf', checkViewerAuth, async (req, res) => {
  const fs = require('fs');
  const os = require('os');
  const crypto = require('crypto');
  const { execFile } = require('child_process');
  const { html, styles, filename } = req.body || {};

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ success: false, message: 'HTML do relatório ausente.' });
  }

  // Strip any <script> tags or inline event handlers from client-supplied HTML before headless rendering
  const sanitizedHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');

  const browserCandidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  const browserExe = browserCandidates.find(p => fs.existsSync(p));
  if (!browserExe) {
    return res.status(500).json({ success: false, message: 'Navegador headless não encontrado no servidor.' });
  }

  const token = `${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
  const fullHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <base href="http://localhost:${config.port}/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  ${styles || ''}
  <style>
    @page {
      size: A4 landscape;
      margin: 5mm 6mm;
    }
    html, body {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
    }
    .ppt-slides-print-container {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .ppt-slide {
      width: 100% !important;
      height: 192mm !important;
      max-height: 192mm !important;
      min-height: 192mm !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
      padding: 5mm 7mm !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      border-radius: 12px !important;
      margin: 0 !important;
    }
    .ppt-slide + .ppt-slide {
      page-break-before: always !important;
      break-before: page !important;
    }
    .ppt-slide.theme-dark {
      background-color: #090d16 !important;
      border: 1px solid #1e293b !important;
      color: #f8fafc !important;
    }
    .ppt-slide.theme-light {
      background-color: #e2e8f0 !important;
      border: 1px solid #94a3b8 !important;
      color: #0f172a !important;
    }
    .ppt-slide .line-clamp-1,
    .ppt-slide .line-clamp-2,
    .ppt-slide .line-clamp-3,
    .ppt-slide .line-clamp-4,
    .ppt-slide .line-clamp-5,
    .ppt-slide .line-clamp-6 {
      display: block !important;
      -webkit-line-clamp: unset !important;
      -webkit-box-orient: unset !important;
      overflow: visible !important;
    }
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;

  pdfRenderCache.set(token, fullHtml);
  setTimeout(() => pdfRenderCache.delete(token), 60000);
  const tmpPdfPath = path.join(os.tmpdir(), `status_report_${token}.pdf`);
  const isFreshHtml = html.includes('data-pdf-v4="true"');
  const detectedTheme = html.includes('theme-light') ? 'light' : 'dark';
  const renderUrl = isFreshHtml
    ? `http://localhost:${config.port}/api/internal/pdf-render/${token}`
    : `http://localhost:${config.port}/?view=report&theme=${detectedTheme}`;

  const browserArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    ...(isFreshHtml ? [] : ['--virtual-time-budget=4500']),
    `--print-to-pdf=${tmpPdfPath}`,
    renderUrl
  ];

  execFile(
    browserExe,
    browserArgs,
    { timeout: 30000 },
    (err) => {
      pdfRenderCache.delete(token);
      if (err || !fs.existsSync(tmpPdfPath)) {
        console.error('[PDF Export] Erro ao gerar PDF:', err);
        return res.status(500).json({ success: false, message: 'Falha ao gerar PDF em paisagem.' });
      }
      try {
        const pdfBuffer = fs.readFileSync(tmpPdfPath);
        fs.unlinkSync(tmpPdfPath);
        const safeName = (filename || 'Status_Report_Executivo_Paisagem.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
        res.send(pdfBuffer);
      } catch (readErr) {
        console.error('[PDF Export] Erro ao ler PDF gerado:', readErr);
        res.status(500).json({ success: false, message: 'Erro ao processar arquivo PDF.' });
      }
    }
  );
});

// Serve frontend build (with no-cache on index.html and JS bundles so updates take effect immediately)
const frontendDist = path.join(__dirname, '../frontend/dist/frontend/browser');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`[Server] Backend executando na porta ${config.port}`);
    if (process.env.READ_ONLY_MODE !== 'true') {
      syncScheduler.start();
    }
  });
}

module.exports = app;
