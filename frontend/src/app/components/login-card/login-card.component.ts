import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 50;
    }
  `],
  template: `
    <div class="w-full h-full bg-slate-900 flex flex-col justify-center items-center p-3 sm:p-4 overflow-hidden relative select-none">
      <!-- Glow background ornaments -->
      <div class="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-sm sm:max-w-md relative z-10 flex flex-col items-center my-auto">
        <!-- Logo Header -->
        <div class="text-center mb-2.5 sm:mb-3">
          <div class="inline-flex items-center justify-center">
            <img
              src="/assets/logo-login-branco.png"
              alt="ILC Logo"
              class="h-16 sm:h-20 w-auto max-w-[260px] sm:max-w-[300px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              (error)="onLogoError($event)" />
            <div *ngIf="logoFailed()" class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 flex items-center justify-center ring-1 ring-white/20">
              <span class="text-2xl font-black text-white tracking-wider">ILC</span>
            </div>
          </div>
        </div>

        <!-- Main Card -->
        <div class="w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-2xl p-4 sm:p-5">

          <!-- FLUXO 1: TROCA DE SENHA OBRIGATÓRIA NO 1º ACESSO -->
          <div *ngIf="isChangingFirstPassword()">
            <div class="text-center mb-3">
              <div class="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-1.5 text-lg font-black ring-1 ring-amber-500/30">
                🔑
              </div>
              <h3 class="text-sm font-extrabold text-white">Primeiro Acesso Detectado</h3>
              <p class="text-xs text-slate-400 mt-0.5">
                Defina uma nova senha pessoal definitiva para continuar.
              </p>
            </div>

            <div class="space-y-2.5">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">E-mail Corporativo</label>
                <input type="text" [value]="loginEmail()" disabled class="w-full bg-slate-900/60 border border-slate-700 text-slate-400 text-xs rounded-xl px-3 py-2 cursor-not-allowed" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Nova Senha Pessoal</label>
                <input type="password" [(ngModel)]="newPassword" placeholder="Mínimo de 6 caracteres" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Confirmação da Nova Senha</label>
                <input type="password" [(ngModel)]="confirmNewPassword" placeholder="Repita a nova senha" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div *ngIf="errorMessage()" class="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {{ errorMessage() }}
              </div>

              <button (click)="submitFirstPasswordChange()" [disabled]="isLoading()" class="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                {{ isLoading() ? 'Atualizando senha...' : 'Salvar Senha & Acessar' }}
              </button>

              <button (click)="cancelFirstPasswordChange()" class="w-full text-center text-xs text-slate-400 hover:text-white pt-1 cursor-pointer">
                ← Voltar
              </button>
            </div>
          </div>

          <!-- FLUXO 2: ESQUECI MINHA SENHA / REDEFINIÇÃO VIA E-MAIL -->
          <div *ngIf="!isChangingFirstPassword() && isResettingPassword()">
            <div class="text-center mb-3">
              <div class="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-1.5 text-lg font-black ring-1 ring-blue-500/30">
                🔒
              </div>
              <h3 class="text-sm font-extrabold text-white">Recuperar Senha de Acesso</h3>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ resetStep() === 'request' ? 'Informe seu e-mail corporativo para receber um código de validação.' : (resetStep() === 'verify' ? 'Digite o código de 6 dígitos enviado para seu e-mail.' : 'Crie sua nova senha pessoal definitiva.') }}
              </p>
            </div>

            <!-- Etapa 1: Solicitar Código OTP -->
            <div *ngIf="resetStep() === 'request'" class="space-y-2.5">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  [ngModel]="loginEmail()"
                  (ngModelChange)="loginEmail.set($event)"
                  (keyup.enter)="submitForgotRequest()"
                  placeholder="seu.nome@empresa.com"
                  class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div *ngIf="errorMessage()" class="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {{ errorMessage() }}
              </div>

              <button
                (click)="submitForgotRequest()"
                [disabled]="isLoading()"
                class="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                {{ isLoading() ? 'Enviando código...' : '📧 Enviar Código de Recuperação' }}
              </button>

              <button
                (click)="cancelForgotPassword()"
                class="w-full text-center text-xs text-slate-400 hover:text-white pt-1 cursor-pointer">
                ← Voltar para o Login
              </button>
            </div>

            <!-- Etapa 2: Validar Código OTP -->
            <div *ngIf="resetStep() === 'verify'" class="space-y-2.5">
              <div class="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                {{ successFeedback() || ('Código de 6 dígitos enviado para ' + loginEmail() + '! Verifique sua caixa de entrada.') }}
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Código de 6 Dígitos</label>
                <input
                  type="text"
                  maxlength="6"
                  [(ngModel)]="resetOtpCode"
                  (keyup.enter)="submitForgotVerify()"
                  placeholder="Ex: 849201"
                  class="w-full text-center tracking-widest text-lg font-black bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600" />
              </div>

              <div *ngIf="errorMessage()" class="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {{ errorMessage() }}
              </div>

              <button
                (click)="submitForgotVerify()"
                [disabled]="isLoading()"
                class="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                {{ isLoading() ? 'Validando...' : 'Verificar Código' }}
              </button>

              <div class="flex items-center justify-between pt-1 text-xs">
                <button (click)="submitForgotRequest()" class="text-blue-400 hover:text-blue-300 cursor-pointer">Reenviar código</button>
                <button (click)="resetStep.set('request'); errorMessage.set(null)" class="text-slate-400 hover:text-white cursor-pointer">Trocar e-mail</button>
              </div>

              <button
                (click)="cancelForgotPassword()"
                class="w-full text-center text-xs text-slate-400 hover:text-white pt-1 cursor-pointer">
                ← Voltar para o Login
              </button>
            </div>

            <!-- Etapa 3: Criar Nova Senha -->
            <div *ngIf="resetStep() === 'new-password'" class="space-y-2.5">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Nova Senha Pessoal</label>
                <input
                  type="password"
                  [(ngModel)]="forgotNewPassword"
                  placeholder="Mínimo de 6 caracteres"
                  class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Confirmação da Nova Senha</label>
                <input
                  type="password"
                  [(ngModel)]="forgotConfirmPassword"
                  (keyup.enter)="submitForgotNewPassword()"
                  placeholder="Repita a nova senha"
                  class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div *ngIf="errorMessage()" class="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {{ errorMessage() }}
              </div>

              <button
                (click)="submitForgotNewPassword()"
                [disabled]="isLoading()"
                class="w-full py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer">
                {{ isLoading() ? 'Salvando...' : 'Salvar Nova Senha & Acessar Portfólio' }}
              </button>

              <button
                (click)="cancelForgotPassword()"
                class="w-full text-center text-xs text-slate-400 hover:text-white pt-1 cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>

          <!-- FLUXO 3: LOGIN NORMAL (Abas: Senha ou Token OTP por E-mail) -->
          <div *ngIf="!isChangingFirstPassword() && !isResettingPassword()">
            <!-- Tab Selector -->
            <div class="flex rounded-xl bg-slate-900/80 p-1 mb-2.5 border border-slate-700/50">
              <button (click)="activeTab.set('password'); errorMessage.set(null)" [class.bg-blue-600]="activeTab() === 'password'" [class.text-white]="activeTab() === 'password'" [class.text-slate-400]="activeTab() !== 'password'" class="flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer">
                🔑 E-mail & Senha
              </button>
              <button (click)="activeTab.set('otp'); errorMessage.set(null)" [class.bg-blue-600]="activeTab() === 'otp'" [class.text-white]="activeTab() === 'otp'" [class.text-slate-400]="activeTab() !== 'otp'" class="flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer">
                ✉️ Token por E-mail
              </button>
            </div>

            <!-- TAB A: Senha de Acesso -->
            <div *ngIf="activeTab() === 'password'" class="space-y-2.5">
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-0.5">E-mail Corporativo</label>
                <input type="email" [ngModel]="loginEmail()" (ngModelChange)="loginEmail.set($event)" placeholder="seu.nome@empresa.com" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-0.5">Senha de Acesso</label>
                <input type="password" [(ngModel)]="loginPassword" (keyup.enter)="submitPasswordLogin()" placeholder="Senha cadastrada ou senha de 1º acesso" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" />
              </div>

              <div *ngIf="errorMessage()" class="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {{ errorMessage() }}
              </div>

              <button (click)="submitPasswordLogin()" [disabled]="isLoading()" class="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                {{ isLoading() ? 'Autenticando...' : 'Acessar Portfólio' }}
              </button>

              <div class="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  (click)="startForgotPassword()"
                  class="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer">
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  (click)="activeTab.set('otp'); errorMessage.set(null)"
                  class="text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                  Entrar com código
                </button>
              </div>
            </div>

            <!-- TAB B: Token de 6 Dígitos por E-mail (OTP) -->
            <div *ngIf="activeTab() === 'otp'" class="space-y-2.5">
              <div *ngIf="!otpSent()">
                <p class="text-xs text-slate-400 mb-2">
                  Informe seu e-mail corporativo para receber um código numérico de 6 dígitos instantâneo.
                </p>
                <label class="block text-[11px] font-semibold text-slate-300 mb-0.5">E-mail Corporativo</label>
                <input type="email" [ngModel]="loginEmail()" (ngModelChange)="loginEmail.set($event)" placeholder="seu.nome@empresa.com" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500 mb-2" />

                <div *ngIf="errorMessage()" class="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 mb-2">
                  {{ errorMessage() }}
                </div>

                <button (click)="requestOtpCode()" [disabled]="isLoading()" class="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                  {{ isLoading() ? 'Enviando código...' : '📧 Enviar Código de Acesso' }}
                </button>
              </div>

              <div *ngIf="otpSent()">
                <div class="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 mb-2">
                  {{ successFeedback() || ('Código de 6 dígitos enviado para ' + loginEmail() + '! Verifique sua caixa de entrada.') }}
                </div>

                <label class="block text-[11px] font-semibold text-slate-300 mb-0.5">Código de 6 Dígitos</label>
                <input type="text" maxlength="6" [(ngModel)]="otpCode" (keyup.enter)="verifyOtpCode()" placeholder="Ex: 849201" class="w-full text-center tracking-widest text-lg font-black bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600 mb-2" />

                <div *ngIf="errorMessage()" class="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 mb-2">
                  {{ errorMessage() }}
                </div>

                <button (click)="verifyOtpCode()" [disabled]="isLoading()" class="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer">
                  {{ isLoading() ? 'Validando...' : 'Confirmar e Entrar' }}
                </button>

                <div class="flex items-center justify-between pt-1 text-xs">
                  <button (click)="requestOtpCode()" class="text-blue-400 hover:text-blue-300 cursor-pointer">Reenviar código</button>
                  <button (click)="otpSent.set(false); errorMessage.set(null)" class="text-slate-400 hover:text-white cursor-pointer">Trocar e-mail</button>
                </div>
              </div>
            </div>

            <!-- OPÇÃO SSO MICROSOFT (Office 365) - SEMPRE VISÍVEL -->
            <div class="mt-3 pt-2.5 border-t border-slate-700/60">
              <div *ngIf="service.ssoErrorMessage()" class="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 mb-2 leading-relaxed">
                <span class="font-bold">⚠️ Aviso SSO:</span> {{ service.ssoErrorMessage() }}
              </div>

              <a
                [href]="microsoftAuthUrl"
                (click)="trackMicrosoftClick()"
                class="w-full py-2 px-3 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition hover:border-slate-500 shadow-sm cursor-pointer no-underline text-center">
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                <span>Entrar com Microsoft (Office 365)</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Localhost Test Button -->
        <div *ngIf="service.isLocalEnvironment() && service.previewLoginOnLocalhost()" class="text-center mt-1.5">
          <button (click)="service.togglePreviewLogin()" class="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer">
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

  // Forgotten password states
  isResettingPassword = signal<boolean>(false);
  resetStep = signal<'request' | 'verify' | 'new-password'>('request');
  resetChallengeToken = signal<string>('');
  resetToken = signal<string>('');
  resetOtpCode = '';
  forgotNewPassword = '';
  forgotConfirmPassword = '';

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.service.loadAuthConfig();
  }

  onLogoError(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
    this.logoFailed.set(true);
  }

  startForgotPassword() {
    this.errorMessage.set(null);
    this.successFeedback.set(null);
    this.resetStep.set('request');
    this.resetOtpCode = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.isResettingPassword.set(true);
  }

  cancelForgotPassword() {
    this.isResettingPassword.set(false);
    this.resetStep.set('request');
    this.errorMessage.set(null);
    this.successFeedback.set(null);
  }

  async submitForgotRequest() {
    this.errorMessage.set(null);
    this.successFeedback.set(null);
    const email = this.loginEmail().trim();
    if (!email || !email.includes('@')) {
      this.errorMessage.set('Informe um e-mail corporativo válido.');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.service.requestEmailOtp(email);
      if (res.success && res.challengeToken) {
        this.resetChallengeToken.set(res.challengeToken);
        this.resetStep.set('verify');
        this.resetOtpCode = '';
        this.successFeedback.set(res.message || `Código de 6 dígitos enviado para ${email}.`);
      } else {
        this.errorMessage.set(res.message || 'E-mail não encontrado ou sem autorização.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitForgotVerify() {
    this.errorMessage.set(null);
    const code = this.resetOtpCode.trim();
    if (!code || code.length !== 6) {
      this.errorMessage.set('Digite o código de 6 dígitos recebido por e-mail.');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.service.verifyEmailOtp(
        this.loginEmail().trim(),
        code,
        this.resetChallengeToken(),
        false // Do not auto-login yet, proceed to new password creation
      );
      if (res.success && res.resetToken) {
        this.resetToken.set(res.resetToken);
        this.resetStep.set('new-password');
      } else {
        this.errorMessage.set(res.message || 'Código de verificação incorreto ou expirado.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitForgotNewPassword() {
    this.errorMessage.set(null);
    if (!this.forgotNewPassword || this.forgotNewPassword.length < 6) {
      this.errorMessage.set('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.errorMessage.set('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.service.resetForgottenPassword(
        this.loginEmail().trim(),
        this.forgotNewPassword,
        this.resetToken()
      );
      if (res.success) {
        this.isResettingPassword.set(false);
        if (this.service.isLocalEnvironment() && this.service.previewLoginOnLocalhost()) {
          this.service.previewLoginOnLocalhost.set(false);
        }
      } else {
        this.errorMessage.set(res.message || 'Falha ao redefinir a nova senha.');
      }
    } finally {
      this.isLoading.set(false);
    }
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
        if (this.service.isLocalEnvironment() && this.service.previewLoginOnLocalhost()) {
          this.service.previewLoginOnLocalhost.set(false);
        }
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
        this.otpCode = '';
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

  get microsoftAuthUrl(): string {
    const cfg = this.service.authConfig()?.microsoftSso;
    const clientId = (cfg?.clientId || 'a30ef563-d535-4789-95c3-3143ad734eea').trim();
    const tenant = (cfg?.tenantId || 'ab58c0ce-3b63-429b-a519-b1b2d29023ce').trim();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://status-report-phi.vercel.app';
    const redirectUri = encodeURIComponent(origin);
    const nonce = Math.random().toString(36).substring(2);
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token%20id_token&redirect_uri=${redirectUri}&scope=openid%20profile%20email%20User.Read&response_mode=fragment&state=sso&nonce=${nonce}`;
  }

  trackMicrosoftClick() {
    this.service.ssoErrorMessage.set(null);
    console.log('[LoginCard] Redirecionando para Microsoft SSO:', this.microsoftAuthUrl);
  }
}
