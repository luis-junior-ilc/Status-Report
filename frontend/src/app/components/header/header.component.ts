import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        <!-- Left: Logo & Sync Azure -->
        <div class="flex items-center space-x-3">
          <!-- Official ILC Logo -->
          <img
            src="/assets/ilc-logo.png"
            alt="ILC"
            class="h-9 w-auto object-contain bg-white/5 p-1 rounded-lg border border-slate-700/60"
            onerror="this.style.display='none'">

          <!-- Partner Client Logo if in client portal mode -->
          <div *ngIf="service.currentClientConfig()?.logoUrl && service.isClientPortalMode()" class="h-9 max-w-[140px] flex items-center bg-white p-1 rounded-lg border border-slate-700/60 shadow-xs">
            <img
              [src]="service.currentClientConfig()?.logoUrl"
              [alt]="service.selectedClient()"
              class="h-full w-auto max-w-[130px] object-contain">
          </div>

          <!-- Divider -->
          <span class="h-6 w-px bg-slate-700/80 block"></span>

          <!-- Sync Button (restricted to local administrator environment) -->
          <div class="flex items-center gap-2">
            <button
              *ngIf="!service.isClientPortalMode() && service.isLocalEnvironment()"
              (click)="service.triggerSync()"
              [disabled]="service.isSyncing()"
              class="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Sincronizar dados em tempo real com o Azure DevOps">
              <svg [ngClass]="{'animate-spin': service.isSyncing()}" class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>{{ service.isSyncing() ? 'Sincronizando...' : 'Sync' }}</span>
            </button>

            <!-- Sync timestamp -->
            <span class="text-[10px] text-slate-400 hidden sm:inline" *ngIf="service.stats()?.lastSync">
              Azure: {{ formatDate(service.stats()?.lastSync) }}
            </span>

            <!-- Custom selection exit if applicable -->
            <span *ngIf="service.isCustomView()" class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-bold flex items-center gap-1">
              <span>Seleção ({{ service.customProjectIds()?.length || 0 }})</span>
              <button (click)="service.clearCustomView()" class="hover:text-white font-extrabold ml-1 cursor-pointer" title="Sair da visão personalizada">✕</button>
            </span>
          </div>
        </div>

        <!-- Right: View Switcher & Actions -->
        <div class="flex items-center flex-wrap gap-2">
          <!-- Views Switcher -->
          <div class="bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 flex items-center text-xs font-semibold">
            
            <!-- 1. Home (antiga Visão Macro) -->
            <button
              (click)="service.activeView.set('macro')"
              [ngClass]="service.activeView() === 'macro' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Home (Visão do Portfólio)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              <span>Home</span>
            </button>

            <!-- 2. Cards -->
            <button
              (click)="service.activeView.set('cards')"
              [ngClass]="service.activeView() === 'cards' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Visualização em Cards">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
              <span>Cards</span>
            </button>

            <!-- 3. Tabela -->
            <button
              (click)="service.activeView.set('table')"
              [ngClass]="service.activeView() === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Visualização em Tabela">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <span>Tabela</span>
            </button>

            <!-- 4. Cronograma -->
            <button
              (click)="service.activeView.set('eap-gantt')"
              [ngClass]="service.activeView() === 'eap-gantt' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Cronograma do Projeto (EAP)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span>Cronograma</span>
            </button>

            <!-- 5. Sustentação -->
            <button
              (click)="service.activeView.set('maintenance')"
              [ngClass]="service.activeView() === 'maintenance' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Painel de Sustentação">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path>
              </svg>
              <span>Sustentação</span>
            </button>

            <!-- 6. Equipe -->
            <button
              (click)="service.activeView.set('team')"
              [ngClass]="service.activeView() === 'team' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Análise & Alocação de Equipe">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Equipe</span>
            </button>

            <!-- 7. Status Report -->
            <button
              (click)="service.activeView.set('report')"
              [ngClass]="service.activeView() === 'report' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Status Report">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span>Status Report</span>
            </button>

          </div>

          <!-- Curator Button (strictly restricted to local machine and hidden in online / client portal mode) -->
          <button
            *ngIf="!service.isClientPortalMode() && service.isLocalEnvironment()"
            (click)="service.isAdminOpen.set(true)"
            class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span>Curadoria</span>
          </button>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  service = inject(ProjectService);

  formatDate(dateStr?: string) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }
}
