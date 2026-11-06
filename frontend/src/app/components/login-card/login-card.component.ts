import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <!-- Glow background ornaments -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <!-- Logo Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center mb-3">
            <img
              src="/assets/ilc-logo.png"
              alt="ILC Logo"
              class="h-16 w-auto object-contain drop-shadow-md"
              (error)="onLogoError($event)" />
            <div *ngIf="logoFailed()" class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 flex items-center justify-center ring-1 ring-white/20">
              <span class="text-2xl font-black text-white tracking-wider">ILC</span>
            </div>
          </div>
          <h2 class="text-2xl font-black tracking-tight text-white">Portfólio Estratégico ILC</h2>
        </div>

        <!-- Main Card -->
        <div class="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-3xl p-6 sm:p-8">

          <!-- FLUXO 1: TROCA DE SENHA OBRIGATÓRIA NO 1º ACESSO -->
          <div *ngIf="isChangingFirstPassword()">
            <div class="text-center mb-5">
              <div class="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-2 text-xl font-black ring-1 ring-amber-500/30">
                🔑
              </div>
              <h3 class="text-base font-extrabold text-white">Primeiro Acesso Detectado</h3>
              <p class="text-xs text-slate-400 mt-1">
                Para a segurança da sua conta corporativa, defina uma nova senha pessoal definitiva.
              </p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">E-mail Corporativo</label>
                <input type="text" [value]="loginEmail()" disabled class="w-full bg-slate-900/60 border border-slate-700 text-slate-400 text-xs rounded-xl px-3.5 py-2.5 cursor-not-allowed" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Nova Senha Pessoal</label>
                <input type="password" [(ngModel)]="newPassword" placeholder="Mínimo de 6 caracteres" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Confirmação da Nova Senha</label>
                <input type="password" [(ngModel)]="confirmNewPassword" placeholder="Repita a nova senha" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {{ errorMessage() }}
              </div>

              <button (click)="submitFirstPasswordChange()" [disabled]="isLoading()" class="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                {{ isLoading() ? 'Atualizando senha...' : 'Salvar Senha & Acessar Portfólio' }}
              </button>

              <button (click)="cancelFirstPasswordChange()" class="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer">
                ← Voltar
              </button>
            </div>
          </div>

          <!-- FLUXO 2: LOGIN NORMAL (Abas: Senha ou Token OTP por E-mail) -->
          <div *ngIf="!isChangingFirstPassword()">
            <!-- Tab Selector -->
            <div class="flex rounded-xl bg-slate-900/80 p-1 mb-5 border border-slate-700/50">
              <button (click)="activeTab.set('password'); errorMessage.set(null)" [class.bg-blue-600]="activeTab() === 'password'" [class.text-white]="activeTab() === 'password'" [class.text-slate-400]="activeTab() !== 'password'" class="flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer">
                🔑 E-mail & Senha
              </button>
              <button (click)="activeTab.set('otp'); errorMessage.set(null)" [class.bg-blue-600]="activeTab() === 'otp'" [class.text-white]="activeTab() === 'otp'" [class.text-slate-400]="activeTab() !== 'otp'" class="flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer">
                ✉️ Token por E-mail
              </button>
            </div>

            <!-- TAB A: Senha de Acesso -->
            <div *ngIf="activeTab() === 'password'" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">E-mail Corporativo</label>
                <input type="email" [ngModel]="loginEmail()" (ngModelChange)="loginEmail.set($event)" placeholder="seu.nome@empresa.com" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Senha de Acesso</label>
                <input type="password" [(ngModel)]="loginPassword" (keyup.enter)="submitPasswordLogin()" placeholder="Senha cadastrada ou senha de 1º acesso" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {{ errorMessage() }}
              </div>

              <button (click)="submitPasswordLogin()" [disabled]="isLoading()" class="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                {{ isLoading() ? 'Autenticando...' : 'Acessar Portfólio' }}
              </button>

              <div class="text-center pt-1">
                <button (click)="activeTab.set('otp'); errorMessage.set(null)" class="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                  Esqueceu a senha? Receba um token de 6 dígitos no e-mail
                </button>
              </div>
            </div>

            <!-- TAB B: Token de 6 Dígitos por E-mail (OTP) -->
            <div *ngIf="activeTab() === 'otp'" class="space-y-4">
              <div *ngIf="!otpSent()">
                <p class="text-xs text-slate-400 mb-3">
                  Informe seu e-mail corporativo para receber um código numérico de 6 dígitos instantâneo.
                </p>
                <label class="block text-xs font-semibold text-slate-300 mb-1">E-mail Corporativo</label>
                <input type="email" [ngModel]="loginEmail()" (ngModelChange)="loginEmail.set($event)" placeholder="seu.nome@empresa.com" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500 mb-3" />

                <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 mb-3">
                  {{ errorMessage() }}
                </div>

                <button (click)="requestOtpCode()" [disabled]="isLoading()" class="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                  {{ isLoading() ? 'Enviando código...' : '📧 Enviar Código de Acesso' }}
                </button>
              </div>

              <div *ngIf="otpSent()">
                <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 mb-3">
                  {{ successFeedback() || ('Código de 6 dígitos enviado para ' + loginEmail() + '! Verifique sua caixa de entrada.') }}
                </div>

                <label class="block text-xs font-semibold text-slate-300 mb-1">Código de 6 Dígitos</label>
                <input type="text" maxlength="6" [(ngModel)]="otpCode" (keyup.enter)="verifyOtpCode()" placeholder="Ex: 849201" class="w-full text-center tracking-widest text-lg font-black bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600 mb-3" />

                <div *ngIf="errorMessage()" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 mb-3">
                  {{ errorMessage() }}
                </div>

                <button (click)="verifyOtpCode()" [disabled]="isLoading()" class="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                  {{ isLoading() ? 'Validando...' : 'Confirmar e Entrar' }}
                </button>

                <div class="flex items-center justify-between pt-2 text-xs">
                  <button (click)="requestOtpCode()" class="text-blue-400 hover:text-blue-300 cursor-pointer">Reenviar código</button>
                  <button (click)="otpSent.set(false); errorMessage.set(null)" class="text-slate-400 hover:text-white cursor-pointer">Trocar e-mail</button>
                </div>
              </div>
            </div>

            <!-- OPÇÃO SSO MICROSOFT (Office 365) - SEMPRE VISÍVEL -->
            <div class="mt-6 pt-5 border-t border-slate-700/60">
              <button
                type="button"
                (click)="handleMicrosoftLogin()"
                class="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2.5 transition hover:border-slate-500 shadow-sm cursor-pointer">
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                <span>Entrar com Microsoft (Office 365)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Localhost Test Button -->
        <div *ngIf="service.isLocalEnvironment() && service.previewLoginOnLocalhost()" class="text-center mt-4">
          <button (click)="service.togglePreviewLogin()" class="text-xs text-slate-500 hover:text-slate-300 underline cursor-pointer">
            [Modo Teste Local] Fechar simulação de login
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoginCardComponent implements OnInit {
  service = inject(ProjectService);

  activeTab = signal<'password' | 'otp'>('password');
  loginEmail = signal<string>(typeof window !== 'undefined' ? (localStorage.getItem('ilc_last_email') || '') : '');
  loginPassword = '';
  otpCode = '';
  otpSent = signal<boolean>(false);
  challengeToken = signal<string>('');
  successFeedback = signal<string | null>(null);
  logoFailed = signal<boolean>(false);

  // First password change states
  isChangingFirstPassword = signal<boolean>(false);
  firstAccessToken = signal<string>('');
  newPassword = '';
  confirmNewPassword = '';

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.service.loadAuthConfig();
  }

  onLogoError(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
    this.logoFailed.set(true);
  }

  async submitPasswordLogin() {
    this.errorMessage.set(null);
    const email = this.loginEmail().trim();
    const pass = this.loginPassword.trim();
    if (!email || !pass) {
      this.errorMessage.set('Por favor, informe seu e-mail e senha.');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.service.loginWithPassword(email, pass);
      if (res.mustChangePassword) {
        this.isChangingFirstPassword.set(true);
        this.firstAccessToken.set(res.firstAccessToken || '');
        this.newPassword = '';
        this.confirmNewPassword = '';
        return;
      }
      if (res.success) {
        // Explicitly exit preview if simulating on localhost
        if (this.service.isLocalEnvironment() && this.service.previewLoginOnLocalhost()) {
          this.service.previewLoginOnLocalhost.set(false);
        }
      } else {
        this.errorMessage.set(res.message || 'E-mail ou senha incorretos.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitFirstPasswordChange() {
    this.errorMessage.set(null);
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage.set('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMessage.set('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.service.completeFirstPasswordChange(
        this.loginEmail().trim(),
        this.newPassword,
        this.firstAccessToken()
      );
      if (res.success) {
        this.isChangingFirstPassword.set(false);
      } else {
        this.errorMessage.set(res.message || 'Falha ao redefinir senha.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  cancelFirstPasswordChange() {
    this.isChangingFirstPassword.set(false);
    this.firstAccessToken.set('');
    this.newPassword = '';
    this.confirmNewPassword = '';
  }

  async requestOtpCode() {
    this.errorMessage.set(null);
    this.successFeedback.set(null);
    const email = this.loginEmail().trim();
    if (!email || !email.includes('@')) {
      this.errorMessage.set('Informe um endereço de e-mail corporativo válido.');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.service.requestEmailOtp(email);
      if (res.success && res.challengeToken) {
        this.challengeToken.set(res.challengeToken);
        this.otpSent.set(true);
        this.otpCode = (res as any).devCode || '';
        this.successFeedback.set(res.message || `Código de 6 dígitos enviado para ${email}.`);
      } else {
        this.errorMessage.set(res.message || 'Não foi possível gerar o código para este e-mail.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyOtpCode() {
    this.errorMessage.set(null);
    const code = this.otpCode.trim();
    if (!code || code.length !== 6) {
      this.errorMessage.set('Digite o código de 6 dígitos recebido por e-mail.');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.service.verifyEmailOtp(
        this.loginEmail().trim(),
        code,
        this.challengeToken()
      );
      if (res.success) {
        if (this.service.isLocalEnvironment() && this.service.previewLoginOnLocalhost()) {
          this.service.previewLoginOnLocalhost.set(false);
        }
      } else {
        this.errorMessage.set(res.message || 'Código incorreto ou expirado.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  handleMicrosoftLogin() {
    const cfg = this.service.authConfig()?.microsoftSso;
    if (cfg?.clientId) {
      // Azure AD / Entra ID OAuth2 Authorization Code / Implicit flow
      const tenant = cfg.tenantId || 'common';
      const redirectUri = encodeURIComponent(window.location.origin);
      const clientId = encodeURIComponent(cfg.clientId);
      const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=User.Read%20openid%20profile%20email&response_mode=fragment`;
      window.location.href = authUrl;
    } else {
      alert('SSO Microsoft (Office 365): Para ativar a integração com seu Azure AD / Microsoft 365 corporativo, configure o Client ID na aba "Controle de Acesso" da Curadoria.');
    }
  }
}
