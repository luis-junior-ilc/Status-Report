const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ACCESS_FILE = path.join(__dirname, '../data/access_control.json');

class AccessStore {
  constructor() {
    this.data = {
      requireAuthOnline: true,
      jwtSecret: 'ilc-exec-dashboard-secret-2026-9f8e7d6c5b4a3f2e1d0c',
      microsoftSso: {
        enabled: true,
        clientId: process.env.MS_CLIENT_ID || '',
        tenantId: process.env.MS_TENANT_ID || 'common'
      },
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.office365.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        fromName: 'PMO ILC • Painel Executivo'
      },
      allowedDomains: [],
      users: [
        {
          id: 'usr-admin-1',
          name: 'Luis Junior',
          email: 'luis.junior@opah.com.br',
          organization: 'Opah IT / ILC',
          clientFilter: 'Todos',
          role: 'board',
          active: true,
          accessPasscode: 'ILC@2026',
          createdAt: new Date().toISOString()
        }
      ]
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(ACCESS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
        this.data = {
          ...this.data,
          ...raw,
          microsoftSso: {
            ...this.data.microsoftSso,
            ...(raw.microsoftSso || {}),
            clientId: process.env.MS_CLIENT_ID || raw.microsoftSso?.clientId || '',
            tenantId: process.env.MS_TENANT_ID || raw.microsoftSso?.tenantId || 'common'
          },
          smtp: {
            ...this.data.smtp,
            ...(raw.smtp || {}),
            host: process.env.SMTP_HOST || raw.smtp?.host || 'smtp.office365.com',
            port: parseInt(process.env.SMTP_PORT || raw.smtp?.port || '587', 10),
            user: process.env.SMTP_USER || raw.smtp?.user || ''
          }
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[AccessStore] Erro ao carregar access_control.json:', err.message);
    }
  }

  save() {
    if (process.env.VERCEL) return;
    try {
      const dir = path.dirname(ACCESS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Never persist SMTP password in JSON file (keep in .env / process.env.SMTP_PASS)
      const toSave = JSON.parse(JSON.stringify(this.data));
      if (toSave.smtp) delete toSave.smtp.pass;
      fs.writeFileSync(ACCESS_FILE, JSON.stringify(toSave, null, 2), 'utf8');
    } catch (err) {
      console.error('[AccessStore] Erro ao salvar access_control.json:', err.message);
    }
  }

  getSecret() {
    return process.env.AUTH_SECRET || this.data.jwtSecret || 'ilc-exec-dashboard-secret-2026';
  }

  signHmac(payloadStr) {
    return crypto.createHmac('sha256', this.getSecret()).update(payloadStr).digest('base64url');
  }

  sanitizeUser(u) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      organization: u.organization || 'Diretoria',
      clientFilter: u.clientFilter || 'Todos',
      role: u.role || 'board',
      active: u.active !== false
    };
  }

  getPublicAuthConfig() {
    return {
      requireAuthOnline: this.data.requireAuthOnline !== false,
      microsoftSso: {
        enabled: this.data.microsoftSso?.enabled !== false,
        clientId: process.env.MS_CLIENT_ID || this.data.microsoftSso?.clientId || '',
        tenantId: process.env.MS_TENANT_ID || this.data.microsoftSso?.tenantId || 'common'
      },
      smtpConfigured: !!(
        (process.env.SMTP_USER || this.data.smtp?.user) &&
        (process.env.SMTP_PASS || this.getLocalEnvSmtpPass())
      )
    };
  }

  getLocalEnvSmtpPass() {
    if (process.env.SMTP_PASS) return process.env.SMTP_PASS;
    if (this.data.smtp?.pass) {
      process.env.SMTP_PASS = this.data.smtp.pass;
      return this.data.smtp.pass;
    }
    const candidates = [
      path.join(__dirname, '../.env'),
      path.join(__dirname, '../../.env'),
      path.join(process.cwd(), 'server/.env'),
      path.join(process.cwd(), '.env')
    ];
    for (const envPath of candidates) {
      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const m = content.match(/^SMTP_PASS=(.*)$/m);
          if (m && m[1].trim()) {
            const val = m[1].trim();
            process.env.SMTP_PASS = val;
            return val;
          }
        }
      } catch (_) {}
    }
    return '';
  }

  getAdminConfig() {
    return {
      requireAuthOnline: this.data.requireAuthOnline !== false,
      microsoftSso: this.data.microsoftSso,
      smtp: {
        ...this.data.smtp,
        hasPassword: !!this.getLocalEnvSmtpPass()
      },
      allowedDomains: this.data.allowedDomains || [],
      users: (this.data.users || []).map(u => {
        const { accessPasscode, ...safeUser } = u;
        return {
          ...safeUser,
          hasPasscode: !!accessPasscode
        };
      })
    };
  }

  updateAdminSettings(settings) {
    if (settings.requireAuthOnline !== undefined) {
      this.data.requireAuthOnline = !!settings.requireAuthOnline;
    }
    if (settings.microsoftSso) {
      this.data.microsoftSso = {
        ...this.data.microsoftSso,
        enabled: settings.microsoftSso.enabled !== false,
        clientId: (settings.microsoftSso.clientId || '').trim(),
        tenantId: (settings.microsoftSso.tenantId || 'common').trim() || 'common'
      };
    }
    if (settings.allowedDomains !== undefined && Array.isArray(settings.allowedDomains)) {
      this.data.allowedDomains = settings.allowedDomains
        .map(d => String(d).trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);
    }
    if (settings.smtp) {
      this.data.smtp = {
        host: (settings.smtp.host || 'smtp.office365.com').trim(),
        port: parseInt(settings.smtp.port || '587', 10),
        secure: !!settings.smtp.secure,
        user: (settings.smtp.user || '').trim(),
        fromName: (settings.smtp.fromName || 'PMO ILC • Painel Executivo').trim()
      };
      if (settings.smtp.pass && settings.smtp.pass.trim()) {
        const passVal = settings.smtp.pass.trim();
        process.env.SMTP_PASS = passVal;
        try {
          const envPath = path.join(__dirname, '../.env');
          let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
          if (envContent.includes('SMTP_PASS=')) {
            envContent = envContent.replace(/SMTP_PASS=.*/g, `SMTP_PASS=${passVal}`);
          } else {
            envContent += `\nSMTP_PASS=${passVal}\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
        } catch (e) {
          console.warn('[AccessStore] Não foi possível salvar SMTP_PASS no .env:', e.message);
        }
      }
    }
    this.save();
    return this.getAdminConfig();
  }

  upsertUser(userData) {
    if (!userData || !userData.email) {
      throw new Error('O e-mail do usuário é obrigatório.');
    }
    const cleanEmail = userData.email.trim().toLowerCase();
    const existingIdx = (this.data.users || []).findIndex(
      u => u.id === userData.id || u.email.toLowerCase() === cleanEmail
    );

    if (existingIdx >= 0) {
      const prev = this.data.users[existingIdx];
      const newPass = (userData.accessPasscode || '').trim();
      const passChanged = newPass.length > 0;
      this.data.users[existingIdx] = {
        ...prev,
        name: (userData.name || prev.name || cleanEmail.split('@')[0]).trim(),
        email: cleanEmail,
        organization: (userData.organization ?? prev.organization ?? 'Diretoria').trim(),
        clientFilter: userData.clientFilter || prev.clientFilter || 'Todos',
        role: userData.role || prev.role || 'board',
        active: userData.active !== undefined ? !!userData.active : prev.active !== false,
        accessPasscode: passChanged ? newPass : prev.accessPasscode,
        mustChangePassword: userData.mustChangePassword !== undefined
          ? !!userData.mustChangePassword
          : (passChanged ? true : !!prev.mustChangePassword)
      };
      this.save();
      const { accessPasscode, ...safeUser } = this.data.users[existingIdx];
      return { ...safeUser, hasPasscode: !!accessPasscode };
    } else {
      const newPass = (userData.accessPasscode || '').trim();
      const generatedPass = newPass || `ILC-${Math.floor(1000 + Math.random() * 9000)}`;
      const newUser = {
        id: 'usr-' + Date.now(),
        name: (userData.name || cleanEmail.split('@')[0]).trim(),
        email: cleanEmail,
        organization: (userData.organization || 'Diretoria').trim(),
        clientFilter: userData.clientFilter || 'Todos',
        role: userData.role || 'board',
        active: userData.active !== false,
        accessPasscode: generatedPass,
        mustChangePassword: userData.mustChangePassword !== undefined ? !!userData.mustChangePassword : true,
        createdAt: new Date().toISOString()
      };
      if (!this.data.users) this.data.users = [];
      this.data.users.unshift(newUser);
      this.save();
      const { accessPasscode, ...safeUser } = newUser;
      return { ...safeUser, hasPasscode: !!accessPasscode };
    }
  }

  deleteUser(id) {
    const before = (this.data.users || []).length;
    this.data.users = (this.data.users || []).filter(u => u.id !== id);
    if (this.data.users.length !== before) {
      this.save();
      return true;
    }
    return false;
  }

  findAuthorizedUser(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { authorized: false, reason: 'Informe um endereço de e-mail corporativo válido.' };
    }

    const explicitUser = (this.data.users || []).find(u => u.email.toLowerCase() === cleanEmail);
    if (explicitUser) {
      if (explicitUser.active === false) {
        return { authorized: false, reason: 'O acesso deste e-mail encontra-se suspenso pelo administrador.' };
      }
      return { authorized: true, user: explicitUser };
    }

    const domain = cleanEmail.split('@')[1];
    const allowedDomains = (this.data.allowedDomains || []).map(d => d.toLowerCase().replace(/^@/, ''));
    if (domain && allowedDomains.includes(domain)) {
      return {
        authorized: true,
        user: {
          id: 'dom-' + cleanEmail,
          name: cleanEmail.split('@')[0].replace(/[._]/g, ' '),
          email: cleanEmail,
          organization: domain.toUpperCase(),
          clientFilter: 'Todos',
          role: 'board',
          active: true
        }
      };
    }

    return {
      authorized: false,
      reason: 'Este e-mail não possui permissão de acesso ao Painel Executivo. Solicite a liberação ao PMO.'
    };
  }

  createSessionToken(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      organization: user.organization || 'Diretoria',
      clientFilter: user.clientFilter || 'Todos',
      role: user.role || 'board',
      exp: Date.now() + 7 * 24 * 3600 * 1000 // 7 days
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = this.signHmac(payloadB64);
    return `${payloadB64}.${sig}`;
  }

  verifySessionToken(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    try {
      const [payloadB64, sig] = token.split('.');
      const expectedSig = this.signHmac(payloadB64);
      if (sig !== expectedSig) return null;
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (!payload.exp || Date.now() > payload.exp) return null;
      // Re-check if user is still authorized in current access_control.json
      const check = this.findAuthorizedUser(payload.email);
      if (!check.authorized) return null;
      return check.user;
    } catch (_) {
      return null;
    }
  }

  getTransporter() {
    const nodemailer = require('nodemailer');
    const user = process.env.SMTP_USER || this.data.smtp?.user;
    const pass = this.getLocalEnvSmtpPass();
    if (!user || !pass) {
      throw new Error(
        'Envio de e-mail (SMTP) ainda não configurado. Utilize o login via Senha de Acesso ou SSO Microsoft, ou configure o e-mail remetente na aba Controle de Acesso da Curadoria.'
      );
    }
    const host = process.env.SMTP_HOST || this.data.smtp?.host || 'smtp.office365.com';
    const port = parseInt(process.env.SMTP_PORT || this.data.smtp?.port || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const domain = (user && user.includes('@')) ? user.split('@')[1] : 'ilc.com.br';

    return nodemailer.createTransport({
      host,
      port,
      secure,
      name: domain,
      auth: { user, pass },
      tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
    });
  }

  async requestEmailOtp(email) {
    const check = this.findAuthorizedUser(email);
    if (!check.authorized) {
      throw new Error(check.reason);
    }

    const user = check.user;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min
    const rawStr = `${user.email.toLowerCase()}|${code}|${expiresAt}`;
    const signature = this.signHmac(rawStr);
    const challengeToken = Buffer.from(
      JSON.stringify({ email: user.email.toLowerCase(), expiresAt, signature })
    ).toString('base64url');

    const smtpConfigured = !!(
      (process.env.SMTP_USER || this.data.smtp?.user) &&
      (process.env.SMTP_PASS || this.getLocalEnvSmtpPass())
    );

    if (smtpConfigured) {
      try {
        const transporter = this.getTransporter();
        const fromAddr = process.env.SMTP_USER || this.data.smtp?.user;
        const fromName = this.data.smtp?.fromName || 'PMO ILC • Painel Executivo';

        await transporter.sendMail({
          from: `"${fromName}" <${fromAddr}>`,
          to: user.email,
          subject: `Código de Acesso: ${code} • Painel Executivo de Projetos ILC`,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #1e293b;">
              <div style="font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                ILC • Governança Executiva de Projetos
              </div>
              <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff;">
                Olá, ${user.name}
              </h2>
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px;">
                Utilize o token numérico abaixo para acessar o <strong>Dashboard Gerencial & Status Report Executivo</strong>:
              </p>
              <div style="background: #1e293b; border: 2px solid #3b82f6; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: monospace;">
                  ${code}
                </span>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                ⏳ Este código é válido por <strong>15 minutos</strong> e é de uso pessoal e intransferível.
              </p>
            </div>
          `
        });

        return {
          challengeToken,
          email: user.email,
          message: `Enviamos um código de 6 dígitos para ${user.email}.`
        };
      } catch (err) {
        console.error('[AccessStore] Falha ao disparar e-mail SMTP:', err.message);
        // Fallback for local development if SMTP credentials fail
        return {
          challengeToken,
          email: user.email,
          devCode: code,
          message: `Código gerado: ${code} (Serviço SMTP offline ou com erro de conexão).`
        };
      }
    } else {
      // SMTP not configured yet: provide instant OTP token with clear message so access is never blocked
      console.log(`[AccessStore] SMTP não configurado. Código OTP gerado para ${user.email}: ${code}`);
      return {
        challengeToken,
        email: user.email,
        devCode: code,
        message: `Código de acesso: ${code} (SMTP não configurado - use este código para entrar).`
      };
    }
  }

  verifyEmailOtp(email, code, challengeToken) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    if (!cleanEmail || !cleanCode || !challengeToken) {
      throw new Error('Informe o código de 6 dígitos recebido por e-mail.');
    }

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(challengeToken, 'base64url').toString('utf8'));
    } catch (_) {
      throw new Error('Token de desafio inválido.');
    }

    if (decoded.email !== cleanEmail) {
      throw new Error('O e-mail informado não corresponde ao token solicitado.');
    }
    if (Date.now() > decoded.expiresAt) {
      throw new Error('Este código expirou. Solicite um novo código.');
    }

    const expectedSig = this.signHmac(`${cleanEmail}|${cleanCode}|${decoded.expiresAt}`);
    if (decoded.signature !== expectedSig) {
      throw new Error('Código de verificação incorreto. Confira os 6 dígitos enviados para seu e-mail.');
    }

    const check = this.findAuthorizedUser(cleanEmail);
    if (!check.authorized) {
      throw new Error(check.reason);
    }

    const resetExp = Date.now() + 15 * 60 * 1000;
    const resetSig = this.signHmac(`pwdreset|${cleanEmail}|${resetExp}`);
    const resetToken = Buffer.from(
      JSON.stringify({ email: cleanEmail, exp: resetExp, sig: resetSig })
    ).toString('base64url');

    return {
      sessionToken: this.createSessionToken(check.user),
      resetToken,
      user: this.sanitizeUser(check.user)
    };
  }

  resetForgottenPassword(email, newPassword, resetToken) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanNew = String(newPassword || '').trim();
    if (cleanNew.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }
    if (!resetToken) {
      throw new Error('Token de redefinição ausente. Faça a validação do código recebido por e-mail.');
    }

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(resetToken, 'base64url').toString('utf8'));
    } catch (_) {
      throw new Error('Token de redefinição inválido.');
    }

    if (decoded.email !== cleanEmail || Date.now() > decoded.exp) {
      throw new Error('Sessão de redefinição expirada. Solicite um novo código por e-mail.');
    }
    const expectedSig = this.signHmac(`pwdreset|${cleanEmail}|${decoded.exp}`);
    if (decoded.sig !== expectedSig) {
      throw new Error('Assinatura do token de redefinição inválida.');
    }

    const check = this.findAuthorizedUser(cleanEmail);
    if (!check.authorized) {
      throw new Error(check.reason);
    }

    let user = (this.data.users || []).find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        ...check.user,
        id: check.user.id || ('usr_' + Date.now().toString(36)),
        createdAt: new Date().toISOString()
      };
      if (!this.data.users) this.data.users = [];
      this.data.users.push(user);
    }

    user.accessPasscode = cleanNew;
    user.mustChangePassword = false;
    this.save();

    const passwordProof = this.createPasswordProof(cleanEmail, cleanNew);
    return {
      sessionToken: this.createSessionToken(user),
      passwordProof,
      user: this.sanitizeUser(user),
      message: 'Senha atualizada com sucesso!'
    };
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(String(password || '').trim()).digest('hex');
  }

  createPasswordProof(email, newPassword) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const pwdHash = this.hashPassword(newPassword);
    const sig = this.signHmac(`pwdproof|${cleanEmail}|${pwdHash}`);
    return `${pwdHash}.${sig}`;
  }

  verifyPasswordProof(email, password, passwordProof) {
    if (!passwordProof || typeof passwordProof !== 'string' || !passwordProof.includes('.')) return false;
    const cleanEmail = (email || '').trim().toLowerCase();
    const pwdHash = this.hashPassword(password);
    const [storedHash, sig] = passwordProof.split('.');
    if (storedHash !== pwdHash) return false;
    const expectedSig = this.signHmac(`pwdproof|${cleanEmail}|${pwdHash}`);
    return sig === expectedSig;
  }

  verifyPasscode(email, passcode, passwordProof = null) {
    const check = this.findAuthorizedUser(email);
    if (!check.authorized) {
      throw new Error(check.reason);
    }
    const user = check.user;
    const cleanPass = String(passcode || '').trim();
    if (!cleanPass) {
      throw new Error('Informe sua senha de acesso.');
    }

    // 1. Check if user already updated their personal password via stateless proof or in-memory update
    if (this.verifyPasswordProof(user.email, cleanPass, passwordProof)) {
      return {
        mustChangePassword: false,
        sessionToken: this.createSessionToken(user),
        user: this.sanitizeUser(user)
      };
    }

    // 2. Check user's stored password in access_control.json
    if (!user.accessPasscode || user.accessPasscode !== cleanPass) {
      throw new Error('Senha de acesso incorreta. Caso tenha esquecido, utilize a opção "Receber Token por E-mail".');
    }

    if (user.mustChangePassword) {
      // Return a short-lived reset token requiring password change on first login
      const exp = Date.now() + 15 * 60 * 1000;
      const sig = this.signHmac(`firstlogin|${user.email.toLowerCase()}|${exp}`);
      const firstAccessToken = Buffer.from(
        JSON.stringify({ email: user.email.toLowerCase(), exp, sig })
      ).toString('base64url');

      return {
        mustChangePassword: true,
        firstAccessToken,
        email: user.email,
        name: user.name,
        message: 'Este é o seu primeiro acesso. Por segurança, defina sua nova senha pessoal.'
      };
    }

    return {
      mustChangePassword: false,
      sessionToken: this.createSessionToken(user),
      user: this.sanitizeUser(user)
    };
  }

  completeFirstAccessPasswordChange(email, newPassword, firstAccessToken) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanNew = String(newPassword || '').trim();
    if (cleanNew.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }
    if (!firstAccessToken) {
      throw new Error('Token de primeiro acesso ausente.');
    }

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(firstAccessToken, 'base64url').toString('utf8'));
    } catch (_) {
      throw new Error('Token de primeiro acesso inválido.');
    }

    if (decoded.email !== cleanEmail || Date.now() > decoded.exp) {
      throw new Error('Sessão de primeiro acesso expirada. Faça login novamente.');
    }
    const expectedSig = this.signHmac(`firstlogin|${cleanEmail}|${decoded.exp}`);
    if (decoded.sig !== expectedSig) {
      throw new Error('Assinatura de primeiro acesso inválida.');
    }

    const check = this.findAuthorizedUser(cleanEmail);
    if (!check.authorized) {
      throw new Error(check.reason);
    }

    let user = (this.data.users || []).find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        ...check.user,
        id: check.user.id || ('usr_' + Date.now().toString(36)),
        createdAt: new Date().toISOString()
      };
      if (!this.data.users) this.data.users = [];
      this.data.users.push(user);
    }

    if (user.accessPasscode && cleanNew === user.accessPasscode) {
      throw new Error('A nova senha deve ser diferente da senha provisória de primeiro acesso.');
    }

    // Update in-memory and local JSON if writable
    user.accessPasscode = cleanNew;
    user.mustChangePassword = false;
    this.save();

    const passwordProof = this.createPasswordProof(cleanEmail, cleanNew);
    return {
      sessionToken: this.createSessionToken(user),
      passwordProof,
      user: this.sanitizeUser(user)
    };
  }

  async verifyMicrosoftToken(accessToken) {
    if (!accessToken) {
      throw new Error('Token de autenticação Microsoft ausente.');
    }
    const resp = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!resp.ok) {
      throw new Error('Não foi possível validar sua credencial junto à Microsoft.');
    }
    const profile = await resp.json();
    const msEmail = (profile.mail || profile.userPrincipalName || '').trim().toLowerCase();
    if (!msEmail) {
      throw new Error('Sua conta Microsoft não retornou um endereço de e-mail válido.');
    }

    const check = this.findAuthorizedUser(msEmail);
    if (!check.authorized) {
      throw new Error(`A conta Microsoft "${msEmail}" foi autenticada, mas não está na lista de acessos autorizados deste Painel.`);
    }

    const user = {
      ...check.user,
      name: profile.displayName || check.user.name
    };

    return {
      sessionToken: this.createSessionToken(user),
      user: this.sanitizeUser(user)
    };
  }

  async sendInvitationEmail(userId, dashboardUrl) {
    const user = (this.data.users || []).find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');

    const transporter = this.getTransporter();
    const fromAddr = process.env.SMTP_USER || this.data.smtp?.user;
    const fromName = this.data.smtp?.fromName || 'PMO ILC • Painel Executivo';
    const targetUrl = dashboardUrl || 'https://status-report.vercel.app';

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: user.email,
      subject: `Convite de Acesso • Painel Executivo de Projetos & Status Report ILC`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #1e293b;">
          <div style="font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            ILC • Governança Executiva de Projetos
          </div>
          <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff;">
            Olá, ${user.name}!
          </h2>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 20px;">
            Seu acesso ao <strong>Painel Executivo de Projetos & Status Report Semanal</strong> foi liberado.
          </p>
          <div style="background: #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 1px solid #334155;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">
              <strong>E-mail autorizado:</strong> <span style="color: #ffffff;">${user.email}</span>
            </p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">
              <strong>Escopo de visualização:</strong> <span style="color: #38bdf8;">${user.clientFilter === 'Todos' ? 'Portfólio Completo (Diretoria)' : user.clientFilter}</span>
            </p>
            ${user.accessPasscode ? `
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              <strong>Senha de 1º Acesso:</strong> <span style="color: #fbbf24; font-family: monospace; font-size: 15px; font-weight: 700;">${user.accessPasscode}</span>
              ${user.mustChangePassword ? '<br><span style="font-size: 11px; color: #94a3b8;">(No primeiro acesso será solicitada a criação de uma nova senha pessoal)</span>' : ''}
            </p>` : ''}
          </div>
          <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px;">
            Você pode acessar utilizando seu <strong>E-mail + Senha</strong>, solicitando um <strong>Token Numérico por E-mail</strong> na tela de login, ou entrando com sua conta <strong>Microsoft (Office 365)</strong>.
          </p>
          <div style="text-align: center; margin-bottom: 16px;">
            <a href="${targetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px;">
              Acessar Painel Executivo →
            </a>
          </div>
        </div>
      `
    });

    user.invitedAt = new Date().toISOString();
    this.save();
    return {
      success: true,
      message: `Convite enviado com sucesso para ${user.email}!`,
      user: this.sanitizeUser(user)
    };
  }
}

module.exports = new AccessStore();
