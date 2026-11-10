import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { Project, ProjectActivity, EapPhase, AzureAuditReport } from '../../models/project.model';

@Component({
  selector: 'app-eap-gantt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="service.activeEapProject() as project" class="space-y-5 mb-10" [ngClass]="{'fixed inset-0 z-50 bg-slate-100 p-6 overflow-y-auto': isFullscreen()}">
      
      <!-- TOP EXECUTIVE CONTROL & TITLE BAR -->
      <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <!-- Left: Client Co-Branding & Project Title -->
          <div class="flex items-start gap-4">
            <!-- Client Logo Thumbnail (ONLY LOGO, NO CLIENT NAME TEXT) -->
            <div class="shrink-0 pt-0.5">
              <img
                *ngIf="service.getClientLogo(project.client)"
                [src]="service.getClientLogo(project.client)"
                [alt]="project.client"
                class="h-12 max-w-[140px] object-contain rounded-xl bg-white p-1.5 border border-slate-200 shadow-2xs"
              />
              <div
                *ngIf="!service.getClientLogo(project.client)"
                class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm">
                {{ project.client.slice(0, 2).toUpperCase() }}
              </div>
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cronograma Oficial EAP
                </span>
                <span *ngIf="project.category === 'maintenance'" class="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                  🛠️ Projeto de Sustentação
                </span>
                <span *ngIf="project.inconsistencies && project.inconsistencies.length > 0" class="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  ⚠️ Inconsistências Detectadas
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2.5">
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">
                  {{ project.name }}
                </h2>
              </div>
            </div>
          </div>

          <!-- Right: Actions & View Zoom Controls -->
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Time Zoom: Meses | Semanas | Dias -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
              <button
                (click)="timeZoom.set('months')"
                [ngClass]="timeZoom() === 'months' ? 'bg-white shadow-xs text-blue-700 font-extrabold' : 'text-slate-600 font-medium hover:text-slate-900'"
                class="px-3 py-1.5 rounded-xl transition cursor-pointer">
                Meses
              </button>
              <button
                (click)="timeZoom.set('weeks')"
                [ngClass]="timeZoom() === 'weeks' ? 'bg-white shadow-xs text-blue-700 font-extrabold' : 'text-slate-600 font-medium hover:text-slate-900'"
                class="px-3 py-1.5 rounded-xl transition cursor-pointer">
                Semanas
              </button>
              <button
                (click)="timeZoom.set('days')"
                [ngClass]="timeZoom() === 'days' ? 'bg-white shadow-xs text-blue-700 font-extrabold' : 'text-slate-600 font-medium hover:text-slate-900'"
                class="px-3 py-1.5 rounded-xl transition cursor-pointer">
                Dias
              </button>
            </div>

            <!-- Project Selector Dropdown -->
            <select
              [ngModel]="project.id"
              (ngModelChange)="service.selectedEapProjectId.set($event)"
              class="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 font-semibold outline-none max-w-xs truncate">
              <option *ngFor="let p of service.eapAvailableProjects()" [value]="p.id">
                [{{ p.category === 'maintenance' ? '🛠️ Sustentação' : (p.priority || 'P2') }}] {{ p.name }}
              </option>
            </select>

            <!-- Fullscreen / Wide Toggle Button -->
            <button
              (click)="toggleFullscreen()"
              [class]="isFullscreen() ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'"
              class="p-2 border rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              [title]="isFullscreen() ? 'Sair da tela cheia' : 'Expandir para tela cheia'">
              <svg *ngIf="!isFullscreen()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
              <svg *ngIf="isFullscreen()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <!-- Back to Sustentação or Home View -->
            <button
              *ngIf="project.category === 'maintenance'"
              (click)="service.activeView.set('maintenance')"
              class="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
              ← Sustentação
            </button>
            <button
              *ngIf="project.category !== 'maintenance'"
              (click)="service.activeView.set('macro')"
              class="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
              ← Home
            </button>
          </div>
        </div>

        <!-- PROJECT GOVERNANCE BAR: STATUS, PRIORIDADE, SISTEMAS ENVOLVIDOS & EQUIPE ALOCADA -->
        <div class="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
          
          <!-- Left: Status, Prioridade & Sistemas Envolvidos -->
          <div class="flex flex-wrap items-center gap-3">
            <!-- Status do Projeto (ao lado esquerdo de Prioridade) -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status:</span>
              <div
                [ngClass]="getRagPillClass(project.ragStatus, project.status)"
                class="flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-lg border shadow-2xs shrink-0 cursor-default">
                <span class="w-2 h-2 rounded-full animate-pulse" [ngClass]="getRagDotClass(project.ragStatus, project.status)"></span>
                <span>{{ getRagText(project) }}</span>
              </div>
            </div>

            <span class="text-slate-300 hidden sm:inline">|</span>

            <!-- Prioridade com badge explicativo -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Prioridade:</span>
              <span
                class="text-xs font-black px-2.5 py-0.5 rounded-lg border shadow-2xs flex items-center gap-1 cursor-default"
                [ngClass]="service.getPriorityBadgeClass(project.priority || 'P2')"
                [title]="service.getPriorityLabel(project.priority || 'P2')">
                <span>🎯</span>
                <span>{{ service.getPriorityLabel(project.priority || 'P2') }}</span>
              </span>
            </div>

            <span class="text-slate-300 hidden sm:inline">|</span>

            <!-- Sistemas Envolvidos -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sistemas:</span>
              <ng-container *ngIf="project.systems && project.systems.length > 0; else noSystems">
                <span
                  *ngFor="let sys of project.systems"
                  [ngClass]="service.getSystemBadgeClass(sys)"
                  class="px-2 py-0.5 rounded-lg text-xs font-bold border shadow-2xs">
                  {{ sys }}
                </span>
              </ng-container>
              <ng-template #noSystems>
                <span class="text-xs text-slate-400 italic">Nenhum sistema vinculado</span>
              </ng-template>
            </div>
          </div>

          <!-- Right: Equipe Alocada (Líder / GP + Membros) -->
          <div class="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
            <!-- Líder do Projeto -->
            <div *ngIf="project.team?.leader" class="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs cursor-help" [title]="service.getTeamTooltip(project)">
              <span class="text-[10px] font-black uppercase text-slate-400">Líder / GP:</span>
              <span class="font-extrabold text-slate-900 flex items-center gap-1">
                <span>👤</span>
                <span>{{ project.team!.leader }}</span>
              </span>
            </div>

            <!-- Membros / Especialistas Alocados -->
            <div *ngIf="project.team?.members && project.team!.members!.length > 0" class="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs cursor-help" [title]="service.getTeamTooltip(project)">
              <span class="text-[10px] font-black uppercase text-slate-400">Equipe:</span>
              <span class="font-bold text-slate-700 flex items-center gap-1">
                <span>👥</span>
                <span class="truncate max-w-xs">
                  {{ project.team!.members!.join(', ') }}
                </span>
                <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                  {{ project.team!.members!.length }}
                </span>
              </span>
            </div>

            <div *ngIf="!project.team?.leader && (!project.team?.members || project.team!.members!.length === 0)" class="text-xs text-slate-400 italic">
              Equipe não cadastrada
            </div>
          </div>

        </div>

        <!-- GRID 2 COLUNAS: OBJETIVO DO PROJETO & STATUS REPORT DA SEMANA -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          <!-- COLUNA 1: OBJETIVO DO PROJETO (ESTRATÉGICO: FATURAMENTO, CUSTO E QUALITATIVO) -->
          <div class="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 text-xs shadow-2xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <div class="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                  <span class="text-sm">🎯</span>
                  <span>Objetivo do Projeto</span>
                  <span class="text-[9px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    Faturamento • Custo • Qualitativo
                  </span>
                  <span *ngIf="objectiveSavedToast()" class="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-pulse">
                    ✓ Salvo com sucesso!
                  </span>
                </div>

                <!-- Edit Button -->
                <button
                  *ngIf="!isEditingObjective()"
                  (click)="startEditingObjective(project.objective || '')"
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                  title="Editar objetivo do projeto e sincronizar com a Curadoria">
                  <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span>Editar</span>
                </button>
              </div>

              <!-- Read-only View -->
              <div *ngIf="!isEditingObjective()">
                <div *ngIf="project.objective" class="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs min-h-[64px]">
                  {{ project.objective }}
                </div>
                <div *ngIf="!project.objective" class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-dashed border-slate-300 min-h-[64px]">
                  <span>Nenhum objetivo cadastrado. Defina as metas de Faturamento, Custo e Qualitativo.</span>
                  <button
                    type="button"
                    (click)="startEditingObjective('')"
                    class="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 underline cursor-pointer shrink-0">
                    + Cadastrar Objetivo
                  </button>
                </div>
              </div>

              <!-- Interactive Inline Editor -->
              <div *ngIf="isEditingObjective()" class="mt-1 space-y-2">
                <textarea
                  [ngModel]="editedObjective()"
                  (ngModelChange)="editedObjective.set($event)"
                  rows="4"
                  placeholder="Descreva o objetivo do projeto de forma resumida e direta:&#10;• Objetivo: Finalidade central do projeto;&#10;• Faturamento: Estimativa de receita, novos negócios ou expansão para o cliente;&#10;• Custo: Estimativa de redução de despesas, horas operacionais ou retrabalho;&#10;• Qualitativo: Ganhos de qualidade, satisfação de usuários (NPS), conformidade ou SLA."
                  class="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-y font-normal leading-relaxed">
                </textarea>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                  <span class="text-[10px] text-slate-500 font-medium">
                    💡 Salvo na Curadoria e visível no cronograma.
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="cancelEditingObjective()"
                      [disabled]="isSavingObjective()"
                      class="px-3 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      (click)="saveObjective(project.id)"
                      [disabled]="isSavingObjective()"
                      class="px-3.5 py-1 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                      <span *ngIf="isSavingObjective()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{{ isSavingObjective() ? 'Salvando...' : '💾 Salvar' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- COLUNA 2: STATUS REPORT DA SEMANA -->
          <div class="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 text-xs shadow-2xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <div class="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                  <span class="text-sm">📋</span>
                  <span>Status Report da Semana</span>
                  <span class="text-[9px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    Relato Executivo
                  </span>
                  <span *ngIf="statusReportSavedToast()" class="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-pulse">
                    ✓ Relato atualizado!
                  </span>
                </div>

                <!-- Edit Button -->
                <button
                  *ngIf="!isEditingStatusReport()"
                  (click)="startEditingStatusReport(service.getProjectCurrentStatusReport(project))"
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                  title="Editar relato e sincronizar com o Status Report semanal">
                  <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span>Editar</span>
                </button>
              </div>

              <!-- Read-only View -->
              <div *ngIf="!isEditingStatusReport()">
                <div class="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs min-h-[64px]">
                  {{ service.getProjectCurrentStatusReport(project) }}
                </div>
              </div>

              <!-- Interactive Inline Editor -->
              <div *ngIf="isEditingStatusReport()" class="mt-1 space-y-2">
                <textarea
                  [ngModel]="editedStatusReport()"
                  (ngModelChange)="editedStatusReport.set($event)"
                  rows="4"
                  placeholder="Digite o relato executivo da semana deste projeto..."
                  class="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-y font-normal leading-relaxed">
                </textarea>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                  <span class="text-[10px] text-slate-500 font-medium">
                    💡 Atualiza automaticamente o Status Report semanal.
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="cancelEditingStatusReport()"
                      [disabled]="isSavingStatusReport()"
                      class="px-3 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      (click)="saveStatusReport(project.id)"
                      [disabled]="isSavingStatusReport()"
                      class="px-3.5 py-1 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                      <span *ngIf="isSavingStatusReport()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{{ isSavingStatusReport() ? 'Salvando...' : '💾 Salvar' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- EXECUTIVE KPI STRIP -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          <!-- KPI 1: Datas Acordadas -->
          <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Datas Acordadas</span>
            <span class="text-xs font-black text-slate-800 block mt-0.5 truncate">
              {{ formatDateBr(project.agreedDates?.start) }} → {{ formatDateBr(project.agreedDates?.end) }}
            </span>
            <span class="text-[10px] text-slate-500 block truncate mt-0.5">
              Previsão: {{ formatDateBr(project.executedDates?.end || project.plannedDates?.end) }}
            </span>
          </div>

          <!-- KPI 2: Progresso Global -->
          <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progresso Global</span>
              <span class="text-xs font-black text-blue-700">{{ project.progress }}%</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-1.5">
              <div class="bg-blue-600 h-full rounded-full transition-all duration-500" [style.width.%]="project.progress"></div>
            </div>
            <span class="text-[10px] text-slate-500 block mt-1">Marco: {{ project.currentMilestone }}</span>
          </div>

          <!-- KPI 3: Esforço no Azure DevOps -->
          <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Esforço Azure DevOps</span>
            <span class="text-xs font-black text-slate-900 block mt-0.5">
              {{ formatHours(project.hours.totalExecuted) }}h <span class="text-slate-400 font-normal">/</span> {{ formatHours(project.hours.totalPlanned) }}h
            </span>
            <span class="text-[10px] text-blue-700 font-bold block mt-0.5">
              {{ getPercent(project.hours.totalExecuted, project.hours.totalPlanned) }}% da estimativa apontada
            </span>
          </div>

          <!-- KPI 4: Acordo Comercial com Cliente -->
          <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acordo com Cliente</span>
            <div class="flex items-center justify-between text-[11px] font-black mt-0.5">
              <span class="text-emerald-700">{{ formatHours(getAgreedHours(project)) }}h firmadas</span>
              <span
                [ngClass]="getAgreedBalance(project) >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                class="text-[10px] font-extrabold">
                {{ getAgreedBalance(project) >= 0 ? '+' + formatHours(getAgreedBalance(project)) + 'h saldo' : formatHours(getAgreedBalance(project)) + 'h saldo' }}
              </span>
            </div>
            <span
              [ngClass]="getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) > 100 ? 'text-rose-600' : 'text-emerald-700'"
              class="text-[10px] font-bold block mt-0.5">
              {{ getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) }}% do acordo consumido
            </span>
          </div>

          <!-- KPI 5: Itens na EAP -->
          <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 col-span-2 sm:col-span-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entregas na EAP</span>
            <span class="text-xs font-black text-slate-900 block mt-0.5">
              {{ (project.activities?.length || 0) }} entregas cadastradas
            </span>
            <span class="text-[10px] text-slate-500 block mt-0.5">
              Azure DevOps sincronizado
            </span>
          </div>
        </div>
      </div>

      <!-- COLOR LEGEND BAR -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-200/80 text-[11px] font-semibold text-slate-600 shadow-xs">
        <div class="flex items-center gap-2">
          <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Situação dos Blocos:</span>
          <span class="text-slate-400 text-xs hidden sm:inline">•</span>
          <span class="text-slate-500 text-[10px] hidden sm:inline">Cores oficiais do cronograma executivo</span>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded-md bg-emerald-600 border border-emerald-700 inline-block shadow-xs"></span>
            <span class="text-slate-900 font-extrabold">Concluído</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded-md bg-emerald-200 border border-emerald-400 inline-block shadow-xs"></span>
            <span class="text-slate-800 font-bold">Em Curso</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded-md bg-amber-300 border border-amber-500 inline-block shadow-xs"></span>
            <span class="text-slate-800 font-bold">Margem Curta (-1d a +1d)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded-md bg-rose-200 border border-rose-400 inline-block shadow-xs"></span>
            <span class="text-slate-800 font-bold">Atrasado</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded-md bg-slate-200 border border-slate-300 inline-block shadow-xs"></span>
            <span class="text-slate-700 font-bold">Planejado</span>
          </div>
        </div>
      </div>

      <!-- MAIN GANTT TIMELINE CONTAINER - 100% FULL WIDTH WITH FROZEN COLUMN -->
      <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden w-full">
        
        <!-- Empty State if no activities in project -->
        <div *ngIf="!project.activities || project.activities.length === 0" class="p-16 text-center">
          <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4 font-bold text-3xl">
            📋
          </div>
          <h3 class="text-base font-bold text-slate-800 mb-1">Nenhum item localizado no Azure DevOps</h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            Este projeto não possui entregas cadastradas no Azure DevOps no momento. Utilize a Curadoria para planejar a EAP manualmente ou adicione novas Features no Azure.
          </p>
          <button
            (click)="service.isAdminOpen.set(true)"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer">
            Abrir Curadoria para Planejar EAP
          </button>
        </div>

        <!-- Gantt Timeline Content when activities exist -->
        <div *ngIf="project.activities && project.activities.length > 0" class="overflow-x-auto w-full relative">
          <div [style.minWidth.px]="getTimelineMinWidth() + 256" class="w-full">
            
            <!-- TIMELINE RULER HEADER - Sticky Top & Frozen Left Column -->
            <div class="flex border-b border-slate-800 bg-slate-900 text-white select-none w-full sticky top-0 z-30">
              
              <!-- FROZEN FIRST COLUMN HEADER -->
              <div class="w-64 shrink-0 px-4 py-3 font-black text-xs uppercase tracking-wider flex items-center justify-between border-r border-slate-800 sticky left-0 z-30 bg-slate-900 shadow-[6px_0_16px_rgba(0,0,0,0.22)]">
                <span class="text-slate-100">Etapas da EAP</span>
                <span class="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full">5 Fases</span>
              </div>
              
              <!-- Ruler Timeline Slots Area -->
              <div class="flex-1 relative flex h-12 items-stretch">
                <!-- Time ticks columns -->
                <div
                  *ngFor="let col of rulerColumns()"
                  [style.width.%]="col.widthPercent"
                  class="h-full border-r border-slate-800/80 flex items-center justify-center uppercase tracking-wider text-[11px] font-extrabold truncate px-1 text-slate-200"
                  [title]="col.title">
                  {{ col.label }}
                </div>

                <!-- Yellow Pin Marker for 'HOJE' - Perfectly positioned inside ruler without clipping -->
                <div
                  *ngIf="todayPercent() >= 0 && todayPercent() <= 100"
                  [style.left.%]="todayPercent()"
                  class="absolute top-1.5 bottom-1.5 -translate-x-1/2 z-30 flex items-center pointer-events-none">
                  <span class="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full shadow-lg border border-amber-300 flex items-center gap-1 shrink-0 whitespace-nowrap">
                    📍 Hoje ({{ todayFormatted }})
                  </span>
                </div>
              </div>
            </div>

            <!-- MAIN EAP ROWS CONTAINER -->
            <div class="relative divide-y divide-slate-100 w-full">
              
              <!-- 5 OFFICIAL EAP ROWS -->
              <div
                *ngFor="let phase of officialPhases; let idx = index"
                class="flex items-stretch min-h-[76px] w-full hover:bg-slate-50/50 transition group">
                
                <!-- FROZEN LEFT COLUMN FOR EACH PHASE -->
                <div class="w-64 shrink-0 p-4 bg-slate-50/95 backdrop-blur-xs border-r border-slate-200/90 flex flex-col justify-between sticky left-0 z-20 shadow-[6px_0_16px_rgba(0,0,0,0.06)]">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      {{ idx + 1 }}
                    </div>
                    <div class="truncate">
                      <div class="text-xs font-black text-slate-900 leading-tight truncate" [title]="phase.name">
                        {{ phase.name }}
                      </div>
                      <div class="text-[10px] text-slate-500 font-semibold truncate mt-0.5">
                        {{ phase.subtitle }}
                      </div>
                    </div>
                  </div>

                  <!-- Phase Summary Pills (Deliveries count & Phase Hours) -->
                  <div class="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200/70 text-[10px] font-bold">
                    <span class="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                      {{ getActivitiesForPhase(project, phase.name).length }} {{ getActivitiesForPhase(project, phase.name).length === 1 ? 'entrega' : 'entregas' }}
                    </span>
                    <span class="text-blue-700 font-black bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {{ formatHours(getPhaseHours(project, phase.name)) }}h
                    </span>
                  </div>
                </div>

                <!-- DYNAMIC TIMELINE SLOTS AREA FOR THIS PHASE -->
                <div class="flex-1 relative bg-white py-3 px-0">
                  
                  <!-- Background vertical grid lines matching columns exactly -->
                  <div class="absolute inset-0 flex pointer-events-none">
                    <div
                      *ngFor="let col of rulerColumns()"
                      [style.width.%]="col.widthPercent"
                      class="h-full border-r border-slate-100">
                    </div>
                  </div>

                  <!-- Continuous Vertical Line for TODAY in body - Aligned exactly with ruler pin -->
                  <div
                    *ngIf="todayPercent() >= 0 && todayPercent() <= 100"
                    [style.left.%]="todayPercent()"
                    class="absolute top-0 bottom-0 w-0.5 bg-amber-400/90 z-20 pointer-events-none shadow-xs">
                  </div>

                  <!-- Non-overlapping Activity Lanes -->
                  <div class="relative z-10 space-y-2.5 px-1.5 py-1">
                    <div
                      *ngFor="let lane of getLanesForPhase(project, phase.name)"
                      class="relative h-10 w-full">
                      
                      <!-- Modern Clean Gantt Capsule Card - ONLY TITLE AS REQUESTED -->
                      <div
                        *ngFor="let act of lane"
                        (click)="openActivityDetails(act)"
                        [ngClass]="getCardStyle(act)"
                        [style.left]="getCardPosition(act).left"
                        [style.width]="getCardPosition(act).width"
                        class="absolute inset-y-0.5 px-3.5 rounded-xl border text-xs shadow-xs flex items-center transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer overflow-hidden select-none min-w-[70px]"
                        [title]="cleanActivityTitle(act.title) + ' • ' + getStatusLabel(act) + ' (' + getDisplayDateRange(act) + ') - Clique para ver detalhes completos'">
                        
                        <!-- APENAS O TÍTULO LIMPO -->
                        <span class="font-extrabold text-xs leading-normal truncate block w-full">
                          {{ cleanActivityTitle(act.title) }}
                        </span>

                      </div>

                    </div>

                    <!-- Placeholder if phase has no activities -->
                    <div
                      *ngIf="getLanesForPhase(project, phase.name).length === 0"
                      class="flex items-center justify-center py-4 text-slate-300 text-xs font-semibold italic">
                      Nenhuma entrega atribuída a esta etapa
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      </div>

      <!-- BOTTOM SECTION: EFFORT & DISTRIBUTION DETAILS (FULL WIDTH ENTERPRISE GRID) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        
        <!-- Left: Distribution by EAP Phase -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Orçamento de Horas por Etapa da EAP
                </h3>
                <span class="text-[10px] text-slate-400">
                  Consumo do esforço orçado vs entregas concluídas
                </span>
              </div>
              <span class="text-xs font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                Total Orçado: {{ formatHours(project.hours.totalPlanned) }}h
              </span>
            </div>

            <div class="space-y-3.5 mt-3">
              <div *ngFor="let dist of project.hours.distribution; let i = index" class="text-xs">
                <div class="flex flex-wrap items-center justify-between font-bold text-slate-700 mb-1 gap-1">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-lg bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">
                      {{ i + 1 }}
                    </span>
                    <span>{{ dist.phase }}</span>
                    <!-- Phase Scope Delivery Badge -->
                    <span
                      *ngIf="isPhaseCompleted(project, dist.phase)"
                      class="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.2 rounded-full flex items-center gap-1">
                      ✓ Concluída
                    </span>
                  </div>
                  <div class="text-right flex items-center gap-1.5 flex-wrap">
                    <span class="text-slate-900 font-extrabold">{{ formatHours(dist.executed) }}h</span>
                    <span class="text-slate-400 font-normal"> / {{ formatHours(dist.planned) }}h</span>
                    <span
                      [ngClass]="dist.percentage > 100 ? 'text-amber-700 font-black bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded' : 'text-blue-700 font-bold'"
                      class="ml-0.5">
                      ({{ dist.percentage }}% orçado)
                    </span>
                    <span *ngIf="dist.percentage > 100" class="text-[10px] font-bold text-amber-600">
                      (+{{ formatHours(dist.executed - dist.planned) }}h desvio)
                    </span>
                    <span *ngIf="dist.planned > 0 && dist.executed < dist.planned && isPhaseCompleted(project, dist.phase)" class="text-[10px] font-bold text-emerald-600">
                      (-{{ formatHours(dist.planned - dist.executed) }}h economia)
                    </span>
                  </div>
                </div>
                <!-- Progress bar (visualizing budget consumption) -->
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    [ngClass]="dist.percentage > 100 ? 'bg-amber-500' : 'bg-blue-600'"
                    class="h-full rounded-full transition-all duration-500"
                    [style.width.%]="Math.min(100, dist.percentage)">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Horas consolidadas das tarefas filhas no Azure DevOps</span>
            <span class="font-bold text-slate-800">{{ project.activities?.length || 0 }} entregas mapeadas</span>
          </div>
        </div>

        <!-- Right: Controle de Esforço: Acordo Comercial vs Execução Azure -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Controle de Esforço: Acordo Comercial vs Execução Azure
                </h3>
              </div>
              <span
                [ngClass]="{
                  'text-emerald-700 bg-emerald-50 border-emerald-200': getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) <= 85,
                  'text-amber-700 bg-amber-50 border-amber-200': getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) > 85 && getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) <= 100,
                  'text-rose-700 bg-rose-50 border-rose-200': getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) > 100
                }"
                class="text-xs font-extrabold px-2.5 py-0.5 rounded-full border">
                {{ getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) }}% do Acordo Consumido
              </span>
            </div>

            <!-- Big numbers / Dual comparison: Firmado Cliente | Planejado Azure | Executado Azure -->
            <div class="grid grid-cols-3 gap-2.5 mb-3.5">
              <!-- Box 1: Firmado Cliente -->
              <div class="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 text-center flex flex-col justify-between">
                <div class="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  <span>💼 Firmado</span>
                </div>
                <div class="my-1">
                  <span class="text-2xl font-black text-emerald-700 tracking-tight leading-none">
                    {{ formatHours(getAgreedHours(project)) }}<span class="text-xs font-normal text-emerald-600">h</span>
                  </span>
                </div>
                <span class="text-[9px] text-emerald-700 font-semibold block">
                  Acordo Comercial
                </span>
              </div>

              <!-- Box 2: Planejado Azure -->
              <div class="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-3 text-center flex flex-col justify-between">
                <div class="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                  <span>📋 Planejado</span>
                </div>
                <div class="my-1">
                  <span class="text-2xl font-black text-blue-700 tracking-tight leading-none">
                    {{ formatHours(project.hours.totalPlanned) }}<span class="text-xs font-normal text-blue-600">h</span>
                  </span>
                </div>
                <span class="text-[9px] text-blue-700 font-semibold block">
                  Estimativa Azure
                </span>
              </div>

              <!-- Box 3: Executado Azure -->
              <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center flex flex-col justify-between">
                <div class="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <span>⏱️ Executado</span>
                </div>
                <div class="my-1">
                  <span class="text-2xl font-black text-slate-900 tracking-tight leading-none">
                    {{ formatHours(project.hours.totalExecuted) }}<span class="text-xs font-normal text-slate-500">h</span>
                  </span>
                </div>
                <span class="text-[9px] text-slate-600 font-semibold block">
                  Apontado no Azure
                </span>
              </div>
            </div>

            <!-- Painel Comparativo de Consumo vs Acordo -->
            <div class="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 space-y-2 mb-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-700">Consumo do Volume Contratual</span>
                <span class="font-black text-slate-900">
                  {{ formatHours(project.hours.totalExecuted) }}h de {{ formatHours(getAgreedHours(project)) }}h
                </span>
              </div>

              <!-- Termômetro de consumo -->
              <div class="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  [ngClass]="{
                    'bg-emerald-500': getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) <= 85,
                    'bg-amber-500': getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) > 85 && getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) <= 100,
                    'bg-rose-500': getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)) > 100
                  }"
                  class="h-full rounded-full transition-all duration-500"
                  [style.width.%]="Math.min(100, getAgreedPercent(project.hours.totalExecuted, getAgreedHours(project)))">
                </div>
              </div>

              <!-- Linha com saldo e comparação -->
              <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 font-medium">
                <div class="flex items-center gap-1">
                  <span class="text-slate-500">Saldo Contratual:</span>
                  <span
                    [ngClass]="getAgreedBalance(project) >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'"
                    class="font-extrabold px-1.5 py-0.2 rounded-md border text-[10px]">
                    {{ getAgreedBalance(project) >= 0 ? '+' + formatHours(getAgreedBalance(project)) + 'h disponíveis' : formatHours(getAgreedBalance(project)) + 'h excedidas' }}
                  </span>
                </div>
                
                <div class="flex items-center gap-1 text-[10px]">
                  <span class="text-slate-500">Aderência Azure:</span>
                  <span class="font-bold text-blue-700">
                    {{ getPercent(project.hours.totalExecuted, project.hours.totalPlanned) }}% apontado
                  </span>
                </div>
              </div>

              <!-- Alerta sutil se Planejado Azure superar Acordo -->
              <div
                *ngIf="project.hours.totalPlanned > getAgreedHours(project)"
                class="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1">
                <span>⚠️</span>
                <span>A estimativa técnica no Azure ({{ formatHours(project.hours.totalPlanned) }}h) excede o acordo firmado em +{{ formatHours(project.hours.totalPlanned - getAgreedHours(project)) }}h.</span>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              (click)="openAzureAudit(project)"
              class="text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1 cursor-pointer">
              <span>📋 Ver Auditoria Detalhada de Horas</span>
              <span>↗</span>
            </button>
            <button
              (click)="service.activeView.set('macro')"
              class="text-blue-600 hover:text-blue-800 font-bold transition cursor-pointer">
              ← Voltar ao Portfólio
            </button>
          </div>
        </div>

      </div>

      <!-- DETAILED MODAL: Exibição completa ao clicar no bloco da EAP -->
      <div
        *ngIf="selectedActivity() as act"
        class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Modal Header -->
          <div class="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" [ngClass]="getCardStyle(act)">
                  {{ act.type || 'Entrega' }}
                </span>
                <span *ngIf="act.azureId || act.id" class="text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                  #{{ act.azureId || act.id }}
                </span>
                <span class="text-xs font-bold text-slate-500">
                  Fase: {{ act.eapPhase }}
                </span>
              </div>
              <h3 class="text-base font-extrabold text-slate-900 leading-tight">
                {{ cleanActivityTitle(act.title) }}
              </h3>
            </div>
            <button
              (click)="selectedActivity.set(null)"
              class="text-slate-400 hover:text-slate-700 p-1 rounded-xl text-lg font-bold cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 space-y-4 text-xs">
            
            <!-- Dates and Status Grid -->
            <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span class="text-slate-500 font-semibold block text-[11px]">Situação de Prazo:</span>
                <span class="font-extrabold text-xs" [ngClass]="getRagPillClass(act.isDelayed ? 'red' : (act.isTightMargin ? 'amber' : 'green'))">
                  {{ getStatusLabel(act) }}
                </span>
              </div>
              <div>
                <span class="text-slate-500 font-semibold block text-[11px]">Status no Azure:</span>
                <span class="font-bold text-slate-800 text-xs">{{ act.state || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-slate-500 font-semibold block text-[11px]">Data de Início:</span>
                <span class="font-bold text-slate-800">{{ act.startDate ? formatDateBr(act.startDate) : 'Não informada' }}</span>
              </div>
              <div>
                <span class="text-slate-500 font-semibold block text-[11px]">Data de Fim (Target):</span>
                <span class="font-bold text-slate-800">{{ act.targetDate ? formatDateBr(act.targetDate) : 'Não informada' }}</span>
              </div>
            </div>

            <!-- Responsável -->
            <div *ngIf="act.assignedTo" class="flex items-center gap-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-blue-950 font-semibold">
              <span class="text-sm">👤</span>
              <span>Responsável no Azure: <strong>{{ act.assignedTo }}</strong></span>
            </div>

            <!-- Esforço em Horas -->
            <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-slate-700 text-xs uppercase tracking-wider">Esforço em Horas (Tasks Vinculadas)</span>
                <span class="font-black text-sm text-slate-900">{{ formatHours(act.ilcHours) }}h / {{ formatHours(act.ilcHoursTotal) }}h</span>
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
                <div
                  class="bg-blue-600 h-full rounded-full transition-all duration-300"
                  [style.width.%]="act.ilcHoursTotal > 0 ? getPercent(act.ilcHours, act.ilcHoursTotal) : 0">
                </div>
              </div>
              <span class="text-[10px] text-slate-500">
                {{ act.ilcHoursTotal > 0 ? getPercent(act.ilcHours, act.ilcHoursTotal) : 0 }}% do esforço executado
              </span>
            </div>

            <!-- Linked Child Tasks list if available -->
            <div *ngIf="act.linkedTasks && act.linkedTasks.length > 0">
              <h4 class="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                Tarefas Vinculadas ({{ act.linkedTasks.length }})
              </h4>
              <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                <div
                  *ngFor="let t of act.linkedTasks"
                  class="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-[11px]">
                  <div class="truncate">
                    <span class="font-mono text-slate-400 font-bold">#{{ t.id }}</span>
                    <span class="font-semibold text-slate-800 ml-1">{{ t.title }}</span>
                    <span *ngIf="t.assignedTo" class="text-slate-400 text-[10px] block">👤 {{ t.assignedTo }}</span>
                  </div>
                  <span class="shrink-0 font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                    {{ t.completedWork || 0 }}h / {{ t.originalEstimate || 0 }}h
                  </span>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <a
              *ngIf="act.azureId"
              [href]="'https://projetosmirassol1.visualstudio.com/' + encodeProjectName(project.name) + '/_workitems/edit/' + act.azureId"
              target="_blank"
              class="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
              <span>Abrir no Azure DevOps</span>
              <span>↗</span>
            </a>
            <button
              (click)="selectedActivity.set(null)"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
              Fechar
            </button>
          </div>

        </div>
      </div>

      <!-- AZURE AUDIT MODAL: Extrato completo de work items do Azure DevOps -->
      <div
        *ngIf="showAuditModal()"
        class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          <!-- Header -->
          <div class="p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Extrato de Extração do Azure DevOps</span>
                <span class="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                  {{ auditProjectName() }}
                </span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Auditoria de preenchimento de campos obrigatórios (Datas de Início/Fim, Responsável e Horas).
              </p>
            </div>
            <button
              (click)="showAuditModal.set(false)"
              class="text-slate-400 hover:text-slate-700 p-2 rounded-xl text-xl font-bold cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoadingAudit()" class="flex-1 flex flex-col items-center justify-center p-8">
            <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="text-xs font-semibold text-slate-600">Auditando todos os itens no Azure DevOps...</p>
          </div>

          <!-- Content when loaded -->
          <div *ngIf="!isLoadingAudit() && auditReport() as rep" class="flex-1 flex flex-col overflow-hidden">
            
            <!-- KPI Summary Bar -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4 bg-slate-50 border-b border-slate-200 text-xs">
              <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span class="text-slate-400 font-bold block text-[10px] uppercase">Total de Itens</span>
                <span class="text-lg font-black text-slate-900">{{ rep.totalItems }}</span>
              </div>
              <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span class="text-purple-600 font-bold block text-[10px] uppercase">Épicos</span>
                <span class="text-lg font-black text-purple-700">{{ rep.summary.epics.total }}</span>
              </div>
              <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span class="text-indigo-600 font-bold block text-[10px] uppercase">Features</span>
                <span class="text-lg font-black text-indigo-700">{{ rep.summary.features.total }}</span>
              </div>
              <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span class="text-blue-600 font-bold block text-[10px] uppercase">Histórias (US)</span>
                <span class="text-lg font-black text-blue-700">{{ rep.summary.stories.total }}</span>
              </div>
              <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span class="text-emerald-600 font-bold block text-[10px] uppercase">Conformidade</span>
                <span class="text-lg font-black text-emerald-700">{{ rep.complianceScore }}%</span>
              </div>
            </div>

            <!-- Filter & Search -->
            <div class="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
              <div class="relative w-full sm:w-72">
                <input
                  type="text"
                  [ngModel]="auditSearch()"
                  (ngModelChange)="auditSearch.set($event)"
                  placeholder="Buscar por ID, título ou responsável..."
                  class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>

              <div class="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  (click)="auditFilter.set('Todos')"
                  [class]="auditFilter() === 'Todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'"
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer">
                  Todos ({{ rep.totalItems }})
                </button>
                <button
                  (click)="auditFilter.set('Épico')"
                  [class]="auditFilter() === 'Épico' ? 'bg-purple-600 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'"
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer">
                  Épicos ({{ rep.summary.epics.total }})
                </button>
                <button
                  (click)="auditFilter.set('Feature')"
                  [class]="auditFilter() === 'Feature' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'"
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer">
                  Features ({{ rep.summary.features.total }})
                </button>
                <button
                  (click)="auditFilter.set('US / PBI')"
                  [class]="auditFilter() === 'US / PBI' ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'"
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer">
                  Histórias ({{ rep.summary.stories.total }})
                </button>
                <button
                  (click)="auditFilter.set('Task / Bug')"
                  [class]="auditFilter() === 'Task / Bug' ? 'bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer">
                  Tarefas / Bugs ({{ rep.summary.tasks.total }})
                </button>
                <button
                  (click)="auditFilter.set('incompletos')"
                  [class]="auditFilter() === 'incompletos' ? 'bg-rose-600 text-white' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'"
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer">
                  ⚠️ Incompletos ({{ rep.incompleteItems }})
                </button>
              </div>
            </div>

            <!-- Items List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-100/50">
              <div *ngIf="filteredAuditItems().length === 0" class="text-center py-12 text-slate-400 text-xs">
                Nenhum item corresponde ao filtro ou busca selecionada.
              </div>

              <div
                *ngFor="let item of filteredAuditItems()"
                class="bg-white rounded-2xl border p-3.5 transition shadow-2xs hover:shadow-xs"
                [ngClass]="item.isComplete ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'">
                
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                      #{{ item.id }}
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [ngClass]="{
                      'bg-purple-100 text-purple-800': item.category === 'Épico',
                      'bg-indigo-100 text-indigo-800': item.category === 'Feature',
                      'bg-blue-100 text-blue-800': item.category === 'US / PBI',
                      'bg-slate-100 text-slate-700': item.category === 'Task / Bug'
                    }">
                      {{ item.category }}
                    </span>
                    <span class="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                      {{ item.type }}
                    </span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded" [ngClass]="{
                      'bg-emerald-50 text-emerald-700 border border-emerald-200': item.state === 'Done' || item.state === 'Closed' || item.state === 'Completed',
                      'bg-blue-50 text-blue-700 border border-blue-200': item.state === 'Active' || item.state === 'In Progress' || item.state === 'Doing',
                      'bg-slate-100 text-slate-600': item.state === 'New' || item.state === 'To Do' || item.state === 'Proposed'
                    }">
                      {{ item.state }}
                    </span>
                  </div>

                  <div>
                    <span *ngIf="item.isComplete" class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span>✅ Preenchido adequadamente</span>
                    </span>
                    <span *ngIf="!item.isComplete" class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                      <span>⚠️ Pendente: {{ item.missingFields.join(', ') }}</span>
                    </span>
                  </div>
                </div>

                <h4 class="text-xs sm:text-sm font-bold text-slate-900 mb-2">
                  {{ item.title }}
                </h4>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-slate-100">
                  <div class="flex items-center gap-1.5" [ngClass]="!item.startDate ? 'text-amber-700 font-bold' : 'text-slate-600'">
                    <span>📅 Início:</span>
                    <span>{{ formatAuditDate(item.startDate) }}</span>
                  </div>
                  <div class="flex items-center gap-1.5" [ngClass]="!item.targetDate ? 'text-amber-700 font-bold' : 'text-slate-600'">
                    <span>🎯 Fim:</span>
                    <span>{{ formatAuditDate(item.targetDate) }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 truncate" [ngClass]="!item.assignedTo ? 'text-amber-700 font-bold' : 'text-slate-600'" title="{{ item.assignedTo || 'Não atribuído' }}">
                    <span>👤 Responsável:</span>
                    <span class="truncate">{{ item.assignedTo || 'Não atribuído' }}</span>
                  </div>
                  <div class="flex items-center gap-1.5" [ngClass]="item.category === 'Task / Bug' && (item.originalEstimate === null || item.originalEstimate === 0) ? 'text-amber-700 font-bold' : 'text-slate-600'">
                    <span>⏱️ Horas:</span>
                    <span>
                      Plan: <strong>{{ item.originalEstimate ?? 0 }}h</strong> |
                      Exec: <strong>{{ item.completedWork ?? 0 }}h</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>
                Exibindo <strong>{{ filteredAuditItems().length }}</strong> de <strong>{{ rep.totalItems }}</strong> itens auditados.
              </span>
              <button
                (click)="showAuditModal.set(false)"
                class="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer">
                Fechar Extrato
              </button>
            </div>

          </div>

        </div>
      </div>

    </div>
  `
})
export class EapGanttComponent {
  service = inject(ProjectService);

  timeZoom = signal<'months' | 'weeks' | 'days'>('months');
  selectedActivity = signal<ProjectActivity | null>(null);
  isFullscreen = signal<boolean>(false);

  // Azure Audit state
  showAuditModal = signal<boolean>(false);
  isLoadingAudit = signal<boolean>(false);
  auditProjectName = signal<string>('');
  auditReport = signal<AzureAuditReport | null>(null);
  auditFilter = signal<'Todos' | 'Épico' | 'Feature' | 'US / PBI' | 'Task / Bug' | 'incompletos'>('Todos');
  auditSearch = signal<string>('');

  // Status Report da Semana inline editing
  isEditingStatusReport = signal<boolean>(false);
  editedStatusReport = signal<string>('');
  isSavingStatusReport = signal<boolean>(false);
  statusReportSavedToast = signal<boolean>(false);

  // Objetivo do Projeto inline editing
  isEditingObjective = signal<boolean>(false);
  editedObjective = signal<string>('');
  isSavingObjective = signal<boolean>(false);
  objectiveSavedToast = signal<boolean>(false);

  officialPhases: { name: EapPhase; subtitle: string }[] = [
    { name: 'Planejamento', subtitle: 'Requisitos e Base' },
    { name: 'Desenvolvimento', subtitle: 'Módulos e Backend' },
    { name: 'Homologação', subtitle: 'Testes e Validação' },
    { name: 'Treinamento', subtitle: 'Capacitação' },
    { name: 'Operação Assistida', subtitle: 'Go-Live & Suporte' }
  ];

  todayFormatted = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  constructor() {
    // Automatically select the best zoom perspective based on the project's real date span
    effect(() => {
      const proj = this.service.activeEapProject();
      if (!proj) return;
      this.isEditingStatusReport.set(false);
      this.isEditingObjective.set(false);
      const { earliest, latest } = this.projectDateBounds();
      const totalDays = Math.ceil((latest.getTime() - earliest.getTime()) / (24 * 3600 * 1000));
      if (totalDays <= 35) {
        this.timeZoom.set('days');
      } else if (totalDays <= 90) {
        this.timeZoom.set('weeks');
      } else {
        this.timeZoom.set('months');
      }
    }, { allowSignalWrites: true });
  }

  startEditingStatusReport(currentText: string | undefined) {
    this.editedStatusReport.set(currentText || '');
    this.isEditingStatusReport.set(true);
  }

  cancelEditingStatusReport() {
    this.isEditingStatusReport.set(false);
  }

  async saveStatusReport(projectId: string) {
    if (!projectId) return;
    this.isSavingStatusReport.set(true);
    try {
      await this.service.updateProject(projectId, {
        executiveSummary: this.editedStatusReport()
      });
      this.isEditingStatusReport.set(false);
      this.statusReportSavedToast.set(true);
      setTimeout(() => this.statusReportSavedToast.set(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar relato: ' + (err?.message || err));
    } finally {
      this.isSavingStatusReport.set(false);
    }
  }

  startEditingObjective(currentText: string | undefined) {
    this.editedObjective.set(currentText || '');
    this.isEditingObjective.set(true);
  }

  cancelEditingObjective() {
    this.isEditingObjective.set(false);
  }

  async saveObjective(projectId: string) {
    if (!projectId) return;
    this.isSavingObjective.set(true);
    try {
      await this.service.updateProject(projectId, {
        objective: this.editedObjective()
      });
      this.isEditingObjective.set(false);
      this.objectiveSavedToast.set(true);
      setTimeout(() => this.objectiveSavedToast.set(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar objetivo: ' + (err?.message || err));
    } finally {
      this.isSavingObjective.set(false);
    }
  }

  // Exact date bounds derived from project agreed dates and all activities
  projectDateBounds = computed(() => {
    const proj = this.service.activeEapProject();
    let earliest: Date | null = null;
    let latest: Date | null = null;

    if (proj?.agreedDates?.start) {
      const d = new Date(proj.agreedDates.start + 'T00:00:00');
      if (!isNaN(d.getTime())) earliest = d;
    }
    if (proj?.agreedDates?.end) {
      const d = new Date(proj.agreedDates.end + 'T23:59:59');
      if (!isNaN(d.getTime())) latest = d;
    }

    for (const act of proj?.activities || []) {
      if (act.startDate) {
        const d = new Date(act.startDate + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          if (!earliest || d < earliest) earliest = d;
        }
      }
      if (act.targetDate) {
        const d = new Date(act.targetDate + 'T23:59:59');
        if (!isNaN(d.getTime())) {
          if (!latest || d > latest) latest = d;
        }
      }
    }

    if (!earliest) earliest = new Date(2026, 8, 1);
    if (!latest) latest = new Date(2026, 11, 31);
    if (latest <= earliest) latest = new Date(earliest.getTime() + 30 * 24 * 3600 * 1000);

    return { earliest, latest };
  });

  // Computed timeline bounds based on Zoom mode (ELIMINATES EMPTY GAP BEFORE FIRST BLOCK!)
  timelineWindow = computed(() => {
    const { earliest, latest } = this.projectDateBounds();
    const zoom = this.timeZoom();

    let start: Date;
    let end: Date;

    if (zoom === 'days') {
      // Start 1 day before earliest date so deliveries start immediately without a giant void
      start = new Date(earliest.getTime() - 1 * 24 * 3600 * 1000);
      start.setHours(0, 0, 0, 0);
      end = new Date(latest.getTime() + 1 * 24 * 3600 * 1000);
      end.setHours(23, 59, 59, 999);
    } else if (zoom === 'weeks') {
      // Start on Monday of earliest week, end on Sunday of latest week
      const dStart = new Date(earliest);
      const day = dStart.getDay();
      const diffStart = dStart.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(dStart.setDate(diffStart));
      start.setHours(0, 0, 0, 0);

      const dEnd = new Date(latest);
      const dayEnd = dEnd.getDay();
      const diffEnd = dEnd.getDate() + (dayEnd === 0 ? 0 : 7 - dayEnd);
      end = new Date(dEnd.setDate(diffEnd));
      end.setHours(23, 59, 59, 999);
    } else {
      // Months view: start at the 1st of earliest month, end at last day of latest month
      start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
      end = new Date(latest.getFullYear(), latest.getMonth() + 1, 0, 23, 59, 59);
    }

    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 14 * 24 * 3600 * 1000);
    }
    const totalMs = Math.max(7 * 24 * 3600 * 1000, end.getTime() - start.getTime());

    return { start, end, totalMs };
  });

  // Dynamic Ruler Columns computed based on Zoom mode
  rulerColumns = computed(() => {
    const { start, end, totalMs } = this.timelineWindow();
    const zoom = this.timeZoom();

    if (zoom === 'months') {
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
      const monthList: { label: string; title: string }[] = [];

      while (cur <= endLimit) {
        const mStr = `${months[cur.getMonth()]} / ${String(cur.getFullYear()).slice(2)}`;
        monthList.push({ label: mStr, title: cur.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) });
        cur.setMonth(cur.getMonth() + 1);
      }

      const count = Math.max(1, monthList.length);
      const w = 100 / count;
      return monthList.map(m => ({ label: m.label, title: m.title, widthPercent: w }));
    }

    if (zoom === 'weeks') {
      const cur = new Date(start);
      const weekList: { label: string; title: string }[] = [];
      while (cur <= end) {
        const dStr = cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        weekList.push({ label: `Sem. ${dStr}`, title: `Semana iniciando em ${dStr}` });
        cur.setDate(cur.getDate() + 7);
      }

      const count = Math.max(1, weekList.length);
      const w = 100 / count;
      return weekList.map(item => ({ label: item.label, title: item.title, widthPercent: w }));
    }

    // Days mode: step by 1 day if short window (<= 25 days), or 2 days otherwise
    const totalDays = Math.ceil(totalMs / (24 * 3600 * 1000));
    const step = totalDays <= 25 ? 1 : 2;

    const cur = new Date(start);
    const dayList: { label: string; title: string }[] = [];
    while (cur <= end) {
      const dStr = cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dayList.push({ label: dStr, title: cur.toLocaleDateString('pt-BR') });
      cur.setDate(cur.getDate() + step);
    }
    const count = Math.max(1, dayList.length);
    const w = 100 / count;
    return dayList.map(item => ({ label: item.label, title: item.title, widthPercent: w }));
  });

  // Calculate percentage position of TODAY
  todayPercent = computed(() => {
    const { start, totalMs } = this.timelineWindow();
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = today.getTime() - start.getTime();
    return Math.round((diff / totalMs) * 1000) / 10;
  });

  // Filtered Azure Audit items
  filteredAuditItems = computed(() => {
    const rep = this.auditReport();
    if (!rep || !rep.items) return [];

    const filter = this.auditFilter();
    const search = this.auditSearch().toLowerCase().trim();

    return rep.items.filter(item => {
      if (filter === 'incompletos') {
        if (item.isComplete) return false;
      } else if (filter !== 'Todos') {
        if (item.category !== filter) return false;
      }

      if (search) {
        const idMatch = item.id.toString().includes(search);
        const titleMatch = (item.title || '').toLowerCase().includes(search);
        const assignedMatch = (item.assignedTo || '').toLowerCase().includes(search);
        const typeMatch = (item.type || '').toLowerCase().includes(search);
        if (!idMatch && !titleMatch && !assignedMatch && !typeMatch) return false;
      }

      return true;
    });
  });

  getTimelineMinWidth(): number {
    const zoom = this.timeZoom();
    if (zoom === 'days') return Math.max(1800, this.rulerColumns().length * 48);
    if (zoom === 'weeks') return Math.max(1300, this.rulerColumns().length * 85);
    return Math.max(1000, this.rulerColumns().length * 110);
  }

  toggleFullscreen() {
    this.isFullscreen.set(!this.isFullscreen());
  }

  getActivitiesForPhase(project: Project, phaseName: EapPhase): ProjectActivity[] {
    return (project.activities || []).filter(a => a.eapPhase === phaseName);
  }

  isPhaseCompleted(project: Project, phaseName: EapPhase): boolean {
    const acts = this.getActivitiesForPhase(project, phaseName);
    if (acts.length === 0) return false;
    return acts.every(a => a.status === 'completed' || ['closed', 'done', 'resolved', 'finalizado', 'concluído'].includes((a.state || '').toLowerCase()));
  }

  getPhaseHours(project: Project, phaseName: EapPhase): number {
    const acts = this.getActivitiesForPhase(project, phaseName);
    const sum = acts.reduce((acc, a) => acc + (a.ilcHoursTotal || 0), 0);
    return Math.round(Number(sum) * 10) / 10;
  }

  // Parse date range for activity
  getCardDateRange(act: ProjectActivity): { start: Date; end: Date } {
    const { start: winStart, end: winEnd } = this.timelineWindow();
    let startDate: Date;
    let endDate: Date;

    if (act.startDate && act.targetDate) {
      startDate = new Date(act.startDate + 'T00:00:00');
      endDate = new Date(act.targetDate + 'T23:59:59');
    } else if (act.startDate) {
      startDate = new Date(act.startDate + 'T00:00:00');
      endDate = new Date(startDate.getTime() + 14 * 24 * 3600 * 1000);
    } else if (act.targetDate) {
      endDate = new Date(act.targetDate + 'T23:59:59');
      startDate = new Date(endDate.getTime() - 14 * 24 * 3600 * 1000);
    } else {
      startDate = new Date(winStart);
      endDate = new Date(winStart.getTime() + 14 * 24 * 3600 * 1000);
    }

    if (isNaN(startDate.getTime())) startDate = new Date(winStart);
    if (isNaN(endDate.getTime())) endDate = new Date(winEnd);
    if (endDate <= startDate) endDate = new Date(startDate.getTime() + 24 * 3600 * 1000);

    return { start: startDate, end: endDate };
  }

  // Position calculation in percent: left and width with min-width safety
  getCardPosition(act: ProjectActivity): { left: string; width: string } {
    const { start: winStart, totalMs } = this.timelineWindow();
    const { start, end } = this.getCardDateRange(act);

    const leftMs = Math.max(0, start.getTime() - winStart.getTime());
    const leftPercent = Math.max(0, Math.min(93, (leftMs / totalMs) * 100));

    // True duration in ms
    const durationMs = Math.max(24 * 3600 * 1000, end.getTime() - start.getTime());
    const rawWidthPercent = (durationMs / totalMs) * 100;
    
    // Min width of 7% gives space for readability; longer deliveries stretch proportionally
    const widthPercent = Math.max(7, Math.min(100 - leftPercent, rawWidthPercent));

    return {
      left: `${leftPercent.toFixed(2)}%`,
      width: `${widthPercent.toFixed(2)}%`
    };
  }

  // Visual horizontal bounds (in percent) for strict collision detection
  getCardVisualBounds(act: ProjectActivity): { left: number; width: number; right: number } {
    const pos = this.getCardPosition(act);
    const left = parseFloat(pos.left);
    const width = parseFloat(pos.width);
    const gap = 1.0; // 1.0% visual margin between cards in the same lane
    return {
      left,
      width,
      right: left + width + gap
    };
  }

  // Non-overlapping collision-free lanes algorithm
  getLanesForPhase(project: Project, phase: EapPhase): ProjectActivity[][] {
    const acts = (project.activities || []).filter(a => a.eapPhase === phase);
    if (acts.length === 0) return [];

    // Sort by visual horizontal start (left) ascending; wider cards first if starts coincide
    const sorted = [...acts].sort((a, b) => {
      const bA = this.getCardVisualBounds(a);
      const bB = this.getCardVisualBounds(b);
      if (Math.abs(bA.left - bB.left) > 0.05) {
        return bA.left - bB.left;
      }
      return bB.width - bA.width;
    });

    const lanes: ProjectActivity[][] = [];

    for (const act of sorted) {
      const actBounds = this.getCardVisualBounds(act);
      let placed = false;

      // Try placing in an existing lane
      for (const lane of lanes) {
        let hasCollision = false;
        for (const existing of lane) {
          const exBounds = this.getCardVisualBounds(existing);
          // Collision exists if neither card is strictly outside the other's visual bounding box
          if (!(actBounds.left >= exBounds.right || exBounds.left >= actBounds.right)) {
            hasCollision = true;
            break;
          }
        }

        if (!hasCollision) {
          lane.push(act);
          placed = true;
          break;
        }
      }

      // If every existing lane has a collision, create a new parallel lane
      if (!placed) {
        lanes.push([act]);
      }
    }

    return lanes;
  }

  // STRICT 5-COLOR PALETTE
  getCardStyle(act: ProjectActivity): string {
    // 1. Verde Forte: Concluído
    if (act.status === 'completed') {
      return 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-800/10';
    }
    // 2. Vermelho Claro: Atrasado
    if (act.isDelayed) {
      return 'bg-rose-200 text-rose-950 border-rose-400 shadow-rose-300/10 font-medium';
    }
    // 3. Laranja / Âmbar: Margem Curta (≤ 2 dias)
    if (act.isTightMargin) {
      return 'bg-amber-300 text-amber-950 border-amber-500 shadow-amber-400/10 font-medium';
    }
    // 4. Verde Claro: Em Curso
    if (act.status === 'in-progress') {
      return 'bg-emerald-200 text-emerald-950 border-emerald-400 shadow-emerald-300/10';
    }
    // 5. Cinza: Planejado
    return 'bg-slate-200 text-slate-700 border-slate-300 shadow-slate-200/10';
  }

  getStatusLabel(act: ProjectActivity): string {
    if (act.status === 'completed') return 'Concluído';
    if (act.isDelayed) return 'Atrasado';
    if (act.isTightMargin) return 'Margem Curta';
    if (act.status === 'in-progress') return 'Em curso';
    return 'Planejado';
  }

  getDisplayDateRange(act: ProjectActivity): string {
    if (act.startDate && act.targetDate) {
      const s = new Date(act.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const t = new Date(act.targetDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `${s} - ${t}`;
    }
    if (act.targetDate) {
      return 'Até ' + new Date(act.targetDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    return act.dateStr || act.month || 'A definir';
  }

  getRagText(project: Project): string {
    if (project.status === 'Congelado') return 'Congelado';
    if (project.status === 'Finalizado') return 'Finalizado';
    if (project.ragStatus === 'red') return 'Atrasado';
    if (project.ragStatus === 'amber') return 'Atenção';
    return 'No Prazo';
  }

  getRagPillClass(rag: string, status?: string): string {
    if (status === 'Congelado') return 'bg-slate-200 text-slate-800 border-slate-300 font-extrabold';
    if (status === 'Finalizado') return 'bg-blue-100 text-blue-900 border-blue-200 font-extrabold';
    if (rag === 'red') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (rag === 'amber') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }

  getRagDotClass(rag: string, status?: string): string {
    if (status === 'Congelado') return 'bg-slate-500';
    if (status === 'Finalizado') return 'bg-blue-500';
    if (rag === 'red') return 'bg-rose-500';
    if (rag === 'amber') return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  openActivityDetails(act: ProjectActivity) {
    this.selectedActivity.set(act);
  }

  async openAzureAudit(project: Project) {
    this.auditProjectName.set(project.name);
    this.showAuditModal.set(true);
    this.isLoadingAudit.set(true);
    this.auditReport.set(null);
    this.auditFilter.set('Todos');
    this.auditSearch.set('');

    try {
      const rep = await this.service.getProjectAzureAudit(project.id);
      this.auditReport.set(rep);
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err);
    } finally {
      this.isLoadingAudit.set(false);
    }
  }

  formatDateBr(isoDate?: string | null): string {
    if (!isoDate) return '-';
    try {
      return new Date(isoDate + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch {
      return isoDate;
    }
  }

  formatAuditDate(d: string | null): string {
    if (!d) return 'Não informado';
    try {
      const parts = d.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch {
      return d;
    }
  }

  encodeProjectName(name: string): string {
    return encodeURIComponent(name);
  }

  Math = Math;

  formatHours(val?: number | null): string {
    if (val === null || val === undefined || isNaN(val)) return '0';
    const rounded = Math.round(Number(val) * 10) / 10;
    return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  getAgreedHours(project?: Project | null): number {
    if (!project) return 0;
    const h = project.hours?.agreed ?? project.agreedHours ?? project.hours?.totalPlanned ?? 0;
    return Math.round(Number(h) * 10) / 10;
  }

  getAgreedBalance(project?: Project | null): number {
    if (!project) return 0;
    const balance = this.getAgreedHours(project) - (project.hours?.totalExecuted || 0);
    return Math.round(Number(balance) * 10) / 10;
  }

  getAgreedPercent(executed: number, agreed: number): number {
    if (!agreed || agreed <= 0) return 0;
    return Math.round((executed / agreed) * 100);
  }

  getPercent(num: number, den: number): number {
    if (!den || den <= 0) return 0;
    return Math.min(100, Math.round((num / den) * 100));
  }

  cleanActivityTitle(rawTitle?: string | null): string {
    if (!rawTitle) return '';
    let t = rawTitle.trim();
    // 1. Remove leading #1234
    t = t.replace(/^#\d+[\s:–—-]*/, '');
    // 2. Remove leading emojis/symbols before brackets
    t = t.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s]+/u, '');
    // 3. Remove bracket tags like [Épico 1], [JD-PROMISS], [Promessa MVP], [Frete Expresso]
    while (/^\[[^\]]+\][\s:–—-]*/.test(t) || /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s]*\[[^\]]+\][\s:–—-]*/u.test(t)) {
      t = t.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s]*\[[^\]]+\][\s:–—-]*/u, '');
    }
    // 4. Remove leading #1234 if any
    t = t.replace(/^#\d+[\s:–—-]*/, '');
    // 5. Remove unbracketed type prefix like 'Épico 1 - ', 'Feature 2: ', 'US 1: '
    t = t.replace(/^(?:Épico|Epico|Feature|US|PBI|História|Historia|Task|Tarefa)\s*\d*[\s:–—-]+/i, '');
    // 6. Remove remaining leading emojis or punctuation (like - or :)
    t = t.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s:–—-]+/u, '').trim();
    return t || rawTitle;
  }
}
