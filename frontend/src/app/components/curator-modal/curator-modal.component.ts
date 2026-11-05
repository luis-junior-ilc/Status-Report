import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { Project, EapPhase, ClientConfig, AzureConfigStatus, AzureAuditItem, AzureAuditReport, ProjectPriority, ProjectTeam } from '../../models/project.model';
import { WeeklyReport, WeeklyReportProject, RoadmapProject, BoardDecision } from '../../models/weekly-report.model';

@Component({
  selector: 'app-curator-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="service.isAdminOpen()"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-6xl w-full h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Header -->
        <div class="p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Curadoria & Gestão Gerencial de Projetos</span>
              <span class="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                Área Executiva Local
              </span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Gestão de visibilidade, clientes, logotipo, EAP detalhada por dia/mês/ano e publicação da visão online.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              *ngIf="service.isAuthenticated() && service.isLocalEnvironment()"
              (click)="handlePublishOnline()"
              [disabled]="service.isPublishingOnline()"
              class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Enviar todas as atualizações de projetos e status report para o ambiente online (GitHub / Vercel)">
              <span>{{ service.isPublishingOnline() ? '⏳ Publicando Online...' : '🚀 Publicar Versão Online' }}</span>
            </button>
            <button
              (click)="service.isAdminOpen.set(false)"
              class="text-slate-400 hover:text-slate-700 p-2 rounded-xl text-xl font-bold leading-none cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        <!-- Auth Section if not authenticated -->
        <div *ngIf="!service.isAuthenticated()" class="p-8 text-center max-w-md mx-auto my-auto">
          <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl shadow-xs">
            🔒
          </div>
          <h3 class="text-sm font-bold text-slate-900 mb-1">Acesso Restrito ao Gestor</h3>
          <p class="text-xs text-slate-500 mb-4">Digite o PIN administrativo para acessar as ferramentas de curadoria.</p>
          <div class="flex gap-2">
            <input
              type="password"
              [ngModel]="service.adminPin()"
              (ngModelChange)="service.adminPin.set($event)"
              placeholder="Digite o PIN (ex: admin)"
              (keyup.enter)="handleLogin()"
              class="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
            <button
              (click)="handleLogin()"
              class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
              Entrar
            </button>
          </div>
          <div *ngIf="authError()" class="text-rose-600 text-xs mt-2 font-medium">{{ authError() }}</div>
        </div>

        <!-- Authenticated Content with 4 Tabs -->
        <div *ngIf="service.isAuthenticated()" class="flex-1 flex flex-col overflow-hidden">
          
          <!-- Navigation Tabs Bar -->
          <div class="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex space-x-2 text-xs font-bold">
            <button
              (click)="activeTab.set('projects')"
              [ngClass]="activeTab() === 'projects' ? 'bg-white border-t border-x border-slate-200 text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5">
              <span>Projetos & EAP</span>
              <span class="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
                {{ service.adminProjects().length }}
              </span>
            </button>
            <button
              (click)="activeTab.set('new-project')"
              [ngClass]="activeTab() === 'new-project' ? 'bg-white border-t border-x border-slate-200 text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5">
              <span class="text-blue-600 font-extrabold">+</span> Novo Projeto Manual
            </button>
            <button
              (click)="activeTab.set('custom-links')"
              [ngClass]="activeTab() === 'custom-links' ? 'bg-white border-t border-x border-slate-200 text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5">
              <span>🔗 Link de Visualização</span>
            </button>
            <button
              (click)="onOpenWeeklyReportTab()"
              [ngClass]="activeTab() === 'weekly-report' ? 'bg-white border-t border-x border-slate-200 text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5 font-bold">
              <span>📊 Status Report Diretoria</span>
            </button>
            <button
              (click)="activeTab.set('clients')"
              [ngClass]="activeTab() === 'clients' ? 'bg-white border-t border-x border-slate-200 text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5">
              Clientes & Co-Branding
            </button>
            <button
              (click)="onOpenAzureTab()"
              [ngClass]="activeTab() === 'azure' ? 'bg-white border-t border-x border-slate-200 text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5">
              <span>Azure DevOps & Conexão</span>
              <span *ngIf="service.azureStatus()?.isWarning" class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            </button>
            <button
              (click)="onOpenAccessTab()"
              [ngClass]="activeTab() === 'access' ? 'bg-white border-t border-x border-slate-200 text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5 font-bold">
              <span>🔐 Controle de Acesso</span>
            </button>
          </div>

          <!-- TAB 1: MASTER-DETAIL SPLIT VIEW FOR 18+ PROJECTS -->
          <div *ngIf="activeTab() === 'projects'" class="flex-1 flex overflow-hidden">
            
            <!-- LEFT COLUMN: Searchable and Filterable Project List -->
            <div class="w-80 sm:w-96 border-r border-slate-200 bg-slate-50/50 flex flex-col h-full overflow-hidden">
              
              <!-- Search and Filter Header -->
              <div class="p-3 border-b border-slate-200 bg-white space-y-2 relative">
                <!-- Search input with clear button -->
                <div class="relative">
                  <input
                    type="text"
                    [ngModel]="projectSearch()"
                    (ngModelChange)="projectSearch.set($event); selectFirstIfCurrentNotVisible()"
                    placeholder="Buscar por nome ou cliente..."
                    class="w-full pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500">
                  <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                  <button
                    *ngIf="projectSearch()"
                    (click)="projectSearch.set(''); selectFirstIfCurrentNotVisible()"
                    class="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    title="Limpar busca">
                    ✕
                  </button>
                </div>

                <!-- Filters Dropdown Trigger Row -->
                <div class="flex items-center gap-1.5">
                  <!-- Dropdown Trigger Button -->
                  <div class="relative flex-1">
                    <button
                      type="button"
                      (click)="isFilterDropdownOpen.set(!isFilterDropdownOpen())"
                      [ngClass]="activeFiltersCount() > 0 ? 'bg-blue-50 text-blue-800 border-blue-400 font-bold' : 'bg-slate-50 text-slate-700 border-slate-300 font-semibold'"
                      class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs hover:bg-slate-100 transition cursor-pointer shadow-2xs">
                      <div class="flex items-center gap-1.5 truncate">
                        <svg class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                        </svg>
                        <span class="truncate">Filtros de Exibição</span>
                        <span
                          *ngIf="activeFiltersCount() > 0"
                          class="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-black shrink-0">
                          {{ activeFiltersCount() }}
                        </span>
                      </div>
                      <svg class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200" [ngClass]="{'rotate-180': isFilterDropdownOpen()}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>

                    <!-- Invisible backdrop to close popover when clicking outside -->
                    <div
                      *ngIf="isFilterDropdownOpen()"
                      (click)="isFilterDropdownOpen.set(false)"
                      class="fixed inset-0 z-40">
                    </div>

                    <!-- Dropdown Popover Panel -->
                    <div
                      *ngIf="isFilterDropdownOpen()"
                      class="absolute left-0 top-full mt-1.5 w-full min-w-[280px] max-w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-3.5 max-h-[70vh] overflow-y-auto space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                      
                      <!-- Header in Popover -->
                      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🌪️ Filtrar Projetos</span>
                        </span>
                        <button
                          *ngIf="activeFiltersCount() > 0"
                          type="button"
                          (click)="clearAllFilters()"
                          class="text-[10px] font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer">
                          Limpar tudo
                        </button>
                      </div>

                      <!-- Group 1: Visibilidade -->
                      <div class="space-y-1.5">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Visibilidade</span>
                          <span class="text-[9px] text-slate-400 font-normal">Exibição pública</span>
                        </div>
                        <div class="space-y-1">
                          <label class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none">
                            <span class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="filterVisibilities().includes('visivel')"
                                (change)="toggleFilter(filterVisibilities, 'visivel')"
                                class="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
                              <span>👁️ Visíveis</span>
                            </span>
                            <span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                              {{ getVisibilityCount('Visiveis') }}
                            </span>
                          </label>

                          <label class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none">
                            <span class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="filterVisibilities().includes('oculto')"
                                (change)="toggleFilter(filterVisibilities, 'oculto')"
                                class="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
                              <span>🚫 Ocultos</span>
                            </span>
                            <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                              {{ getVisibilityCount('Ocultos') }}
                            </span>
                          </label>
                        </div>
                      </div>

                      <!-- Group 2: Origem -->
                      <div class="space-y-1.5 pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Origem</span>
                          <span class="text-[9px] text-slate-400 font-normal">Fonte de dados</span>
                        </div>
                        <div class="space-y-1">
                          <label class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none">
                            <span class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="filterOrigins().includes('azure')"
                                (change)="toggleFilter(filterOrigins, 'azure')"
                                class="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
                              <span>☁️ Azure DevOps</span>
                            </span>
                            <span class="text-[10px] font-bold bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded border border-sky-200">
                              {{ getOriginCount('Azure') }}
                            </span>
                          </label>

                          <label class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none">
                            <span class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="filterOrigins().includes('manual')"
                                (change)="toggleFilter(filterOrigins, 'manual')"
                                class="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
                              <span>✍️ Manual</span>
                            </span>
                            <span class="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200">
                              {{ getOriginCount('Manual') }}
                            </span>
                          </label>
                        </div>
                      </div>

                      <!-- Group 3: Clientes -->
                      <div class="space-y-1.5 pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Clientes</span>
                          <span class="text-[9px] text-slate-400 font-normal">Portfólio</span>
                        </div>
                        <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
                          <label
                            *ngFor="let item of availableClientsWithCount()"
                            class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none">
                            <span class="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                [checked]="filterClients().includes(item.name)"
                                (change)="toggleFilter(filterClients, item.name)"
                                class="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                              <span class="truncate">{{ item.name }}</span>
                            </span>
                            <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded shrink-0 ml-1">
                              {{ item.count }}
                            </span>
                          </label>
                        </div>
                      </div>

                      <!-- Group 4: Status do Projeto -->
                      <div class="space-y-1.5 pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Status</span>
                          <span class="text-[9px] text-slate-400 font-normal">Situação</span>
                        </div>
                        <div class="space-y-1">
                          <label
                            *ngFor="let s of ['Ativo', 'Finalizado', 'Congelado']"
                            class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none">
                            <span class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="filterStatuses().includes(s)"
                                (change)="toggleFilter(filterStatuses, s)"
                                class="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
                              <span>{{ s }}</span>
                            </span>
                            <span
                              class="text-[10px] font-bold px-1.5 py-0.2 rounded"
                              [ngClass]="s === 'Ativo' ? 'bg-emerald-50 text-emerald-700' : (s === 'Finalizado' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')">
                              {{ getStatusCount(s) }}
                            </span>
                          </label>
                        </div>
                      </div>

                      <!-- Group 5: Alertas & Inconsistências -->
                      <div class="space-y-1.5 pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Atenção</span>
                        </div>
                        <label class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none">
                          <span class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              [checked]="filterOnlyAlerts()"
                              (change)="filterOnlyAlerts.set(!filterOnlyAlerts()); selectFirstIfCurrentNotVisible()"
                              class="w-3.5 h-3.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer">
                            <span>⚠️ Apenas com Inconsistências</span>
                          </span>
                          <span class="text-[10px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                            {{ getAlertsCount() }}
                          </span>
                        </label>
                      </div>

                      <!-- Action Button to close popover -->
                      <div class="pt-2 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="button"
                          (click)="isFilterDropdownOpen.set(false)"
                          class="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer text-center">
                          Fechar
                        </button>
                      </div>

                    </div>
                  </div>

                  <!-- Quick Reset Button if filters active -->
                  <button
                    *ngIf="activeFiltersCount() > 0"
                    type="button"
                    (click)="clearAllFilters()"
                    class="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition shrink-0 cursor-pointer"
                    title="Limpar todos os filtros">
                    Limpar
                  </button>
                </div>

                <!-- Active Filter Tags / Chips -->
                <div *ngIf="activeFiltersCount() > 0" class="flex flex-wrap items-center gap-1 pt-1">
                  <!-- Visibility Tags -->
                  <span
                    *ngIf="filterVisibilities().includes('visivel')"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    👁️ Visíveis
                    <button type="button" (click)="toggleFilter(filterVisibilities, 'visivel')" class="hover:text-emerald-950 font-black cursor-pointer">×</button>
                  </span>
                  <span
                    *ngIf="filterVisibilities().includes('oculto')"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                    🚫 Ocultos
                    <button type="button" (click)="toggleFilter(filterVisibilities, 'oculto')" class="hover:text-slate-950 font-black cursor-pointer">×</button>
                  </span>

                  <!-- Origin Tags -->
                  <span
                    *ngIf="filterOrigins().includes('azure')"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                    ☁️ Azure
                    <button type="button" (click)="toggleFilter(filterOrigins, 'azure')" class="hover:text-sky-950 font-black cursor-pointer">×</button>
                  </span>
                  <span
                    *ngIf="filterOrigins().includes('manual')"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ✍️ Manual
                    <button type="button" (click)="toggleFilter(filterOrigins, 'manual')" class="hover:text-amber-950 font-black cursor-pointer">×</button>
                  </span>

                  <!-- Client Tags -->
                  <span
                    *ngFor="let c of filterClients()"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    🏢 {{ c }}
                    <button type="button" (click)="toggleFilter(filterClients, c)" class="hover:text-blue-950 font-black cursor-pointer">×</button>
                  </span>

                  <!-- Status Tags -->
                  <span
                    *ngFor="let s of filterStatuses()"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {{ s }}
                    <button type="button" (click)="toggleFilter(filterStatuses, s)" class="hover:text-indigo-950 font-black cursor-pointer">×</button>
                  </span>

                  <!-- Alerts Tag -->
                  <span
                    *ngIf="filterOnlyAlerts()"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⚠️ Alertas
                    <button type="button" (click)="filterOnlyAlerts.set(false); selectFirstIfCurrentNotVisible()" class="hover:text-amber-950 font-black cursor-pointer">×</button>
                  </span>
                </div>

                <!-- Results Counter -->
                <div class="flex items-center justify-between text-[10px] text-slate-500 font-bold px-0.5 pt-0.5">
                  <span>Exibindo {{ filteredAdminProjects().length }} de {{ service.adminProjects().length }} projetos</span>
                </div>
              </div>

              <!-- Projects List -->
              <div class="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                <div
                  *ngFor="let p of filteredAdminProjects()"
                  (click)="selectedProjectId.set(p.id)"
                  [ngClass]="selectedProjectId() === p.id ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-xs' : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-800'"
                  class="p-3 rounded-2xl border cursor-pointer transition flex flex-col gap-1.5">
                  
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs font-bold leading-tight line-clamp-1" [title]="p.name">
                      {{ p.name }}
                    </span>
                    <div class="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      <!-- Origin Badge -->
                      <span
                        class="text-[9px] font-black px-1.5 py-0.2 rounded"
                        [ngClass]="isManualProject(p) ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-sky-100 text-sky-800 border border-sky-200'">
                        {{ isManualProject(p) ? '✍️ Manual' : '☁️ Azure' }}
                      </span>
                      <!-- Category Badge -->
                      <span
                        *ngIf="p.category === 'maintenance'"
                        class="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                        🛠️ Sustentação
                      </span>
                      <!-- Status Badge -->
                      <span
                        class="text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase"
                        [ngClass]="p.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : (p.status === 'Finalizado' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800')">
                        {{ p.status }}
                      </span>
                      <!-- Visibility Badge -->
                      <span
                        class="text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5"
                        [ngClass]="p.isVisible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-300'"
                        [title]="p.isVisible ? 'Projeto visível no Dashboard' : 'Projeto oculto no Dashboard'">
                        <span>{{ p.isVisible ? '👁️ Visível' : '🚫 Oculto' }}</span>
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span class="font-bold text-slate-700 truncate max-w-[140px]">{{ p.client }}</span>
                    <span>{{ (p.activities?.length || 0) }} entregas • {{ formatHours(p.hours.totalPlanned) }}h (Azure)</span>
                  </div>

                  <!-- Inconsistency Badges -->
                  <div *ngIf="p.inconsistencies && p.inconsistencies.length > 0" class="flex flex-wrap gap-1 mt-0.5">
                    <span
                      *ngFor="let inc of p.inconsistencies"
                      class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                      {{ getInconsistencyLabel(inc) }}
                    </span>
                  </div>
                </div>

                <div *ngIf="filteredAdminProjects().length === 0" class="p-6 text-center text-xs text-slate-400 italic">
                  Nenhum projeto encontrado com estes filtros.
                </div>
              </div>

              <!-- Bottom Sync Azure Button -->
              <div class="p-3 border-t border-slate-200 bg-white flex items-center justify-between">
                <span class="text-[11px] text-slate-500">
                  Total listado: <strong>{{ filteredAdminProjects().length }}</strong>
                </span>
                <button
                  (click)="service.triggerSync()"
                  [disabled]="service.isSyncing()"
                  class="px-2.5 py-1 bg-slate-800 text-white text-[11px] font-bold rounded-lg hover:bg-slate-700 transition flex items-center gap-1 disabled:opacity-50">
                  <span>{{ service.isSyncing() ? 'Sincronizando...' : '🔄 Sincronizar' }}</span>
                </button>
              </div>
            </div>

            <!-- RIGHT COLUMN: FOCUSED PROJECT EDITOR -->
            <div *ngIf="activeProject() as p" class="flex-1 flex flex-col h-full overflow-hidden bg-white">
              
              <!-- Editor Sticky Top Header -->
              <div class="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 shrink-0">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-extrabold text-slate-900">{{ p.name }}</h3>
                    <span *ngIf="p.isManual" class="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Manual</span>
                  </div>
                  <span class="text-xs text-slate-500 font-semibold">{{ p.client }} • ID: {{ p.id }}</span>
                </div>

                <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <!-- Delete Manual Project Button -->
                  <button
                    *ngIf="p.isManual || p.id.startsWith('manual-')"
                    (click)="handleDeleteProject(p)"
                    type="button"
                    class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title="Excluir este projeto manual permanentemente">
                    <span>🗑️ Excluir Projeto</span>
                  </button>

                  <!-- Extrato do Azure DevOps Button -->
                  <button
                    *ngIf="!p.isManual"
                    (click)="openAzureAuditModal(p)"
                    type="button"
                    class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer">
                    <span>📋 Extrato Azure DevOps</span>
                  </button>

                  <!-- Visibility Toggle -->
                  <label class="inline-flex items-center cursor-pointer gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      [checked]="p.isVisible"
                      (change)="toggleVisibility(p, $event)"
                      class="sr-only peer">
                    <div class="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                    <span>{{ p.isVisible ? 'Visível no Dashboard' : 'Oculto' }}</span>
                  </label>

                  <!-- Save Button -->
                  <button
                    (click)="saveProject(p)"
                    [disabled]="savingId() === p.id"
                    class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5">
                    <span>{{ savingId() === p.id ? 'Salvando...' : '💾 Salvar Alterações' }}</span>
                  </button>
                </div>
              </div>

              <!-- Editor Scrollable Body -->
              <div class="flex-1 overflow-y-auto p-5 space-y-5">
                
                <!-- Inconsistency Alert Banner -->
                <div *ngIf="p.inconsistencies && p.inconsistencies.length > 0" class="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <span class="text-lg">⚠️</span>
                  <div>
                    <strong class="block font-bold">Inconsistências ou dados pendentes neste projeto:</strong>
                    <ul class="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                      <li *ngFor="let inc of p.inconsistencies">{{ getInconsistencyDetail(inc) }}</li>
                    </ul>
                  </div>
                </div>

                <!-- General Project Parameters Form -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                  
                  <!-- Editable Project Name (Especially for manual projects) -->
                  <div class="sm:col-span-2 md:col-span-4">
                    <label class="block font-bold text-slate-700 mb-1">
                      Nome do Projeto:
                      <span *ngIf="p.isManual" class="text-[10px] text-amber-700 font-semibold">(Projeto Manual - Totalmente Editável)</span>
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="p.name"
                      placeholder="Nome do Projeto"
                      class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div>
                    <label class="block font-bold text-slate-600 mb-1">Cliente Vinculado:</label>
                    <select
                      [(ngModel)]="p.client"
                      class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium bg-white outline-none">
                      <option value="ILC (Interno)">ILC (Interno)</option>
                      <option value="Mirassol">Mirassol</option>
                      <option value="John Deere">John Deere</option>
                      <option value="Petrobras">Petrobras</option>
                      <option value="Boge Ruber">Boge Ruber</option>
                    </select>
                  </div>

                  <div>
                    <label class="block font-bold text-slate-600 mb-1">Status Operacional:</label>
                    <select
                      [(ngModel)]="p.status"
                      class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium bg-white outline-none">
                      <option value="Ativo">Ativo</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="Congelado">Congelado</option>
                    </select>
                  </div>

                  <div>
                    <label class="block font-bold text-slate-600 mb-1">Natureza do Projeto:</label>
                    <div class="flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="p.category = 'new_project'"
                        [ngClass]="p.category !== 'maintenance' ? 'bg-blue-600 text-white font-black shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                        class="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition border border-transparent">
                        🚀 Novo
                      </button>
                      <button
                        type="button"
                        (click)="p.category = 'maintenance'"
                        [ngClass]="p.category === 'maintenance' ? 'bg-purple-600 text-white font-black shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                        class="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition border border-transparent">
                        🛠️ Sustentação
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block font-bold text-slate-600 mb-1">Farol de Saúde (RAG):</label>
                    <select
                      [(ngModel)]="p.manualRagStatus"
                      class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium bg-white outline-none">
                      <option value="auto">Automático (por prazo)</option>
                      <option value="green">Verde (No Prazo)</option>
                      <option value="amber">Amarelo (Em Atenção)</option>
                      <option value="red">Vermelho (Com Desvio)</option>
                    </select>
                  </div>

                  <div>
                    <label class="block font-bold text-slate-600 mb-1">Marco EAP Atual:</label>
                    <select
                      [(ngModel)]="p.currentMilestone"
                      class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium bg-white outline-none">
                      <option value="Planejamento">1. Planejamento</option>
                      <option value="Desenvolvimento">2. Desenvolvimento</option>
                      <option value="Homologação">3. Homologação</option>
                      <option value="Treinamento">4. Treinamento</option>
                      <option value="Operação Assistida">5. Operação Assistida</option>
                    </select>
                  </div>

                  <!-- Agreed Dates -->
                  <div>
                    <label class="block font-bold text-slate-600 mb-1">Início Acordado:</label>
                    <input
                      type="date"
                      [(ngModel)]="p.agreedDates.start"
                      class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white outline-none">
                  </div>

                  <div>
                    <label class="block font-bold text-slate-600 mb-1">Término Acordado:</label>
                    <input
                      type="date"
                      [(ngModel)]="p.agreedDates.end"
                      class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white outline-none">
                  </div>

                  <div class="sm:col-span-2 md:col-span-2">
                    <label class="block font-bold text-slate-600 mb-1">Previsão Real Término:</label>
                    <input
                      type="date"
                      [(ngModel)]="p.plannedDates.end"
                      [disabled]="!p.isManual && isFieldLocked(p, 'dates')"
                      class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-bold outline-none">
                  </div>
                </div>

                <!-- SECTION: PRIORIDADE DO PROJETO COM LEGENDA EXPLICATIVA INLINE -->
                <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span>🎯 Prioridade do Projeto</span>
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                          [ngClass]="service.getPriorityBadgeClass(p.priority || 'P2')">
                          Atual: {{ service.getPriorityLabel(p.priority || 'P2') }}
                        </span>
                      </h4>
                      <p class="text-[11px] text-slate-500 mt-0.5">
                        Defina o nível de criticidade deste projeto. A legenda com a descrição detalhada e critérios de cada prioridade está disponível diretamente nos cards abaixo:
                      </p>
                    </div>
                  </div>

                  <!-- 4 Priority Cards with Full Inline Description -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      *ngFor="let opt of priorityOptions"
                      (click)="p.priority = opt.id"
                      class="p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer"
                      [ngClass]="(p.priority || 'P2') === opt.id 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'">
                      
                      <div>
                        <div class="flex items-center justify-between gap-1 mb-2">
                          <span class="text-[11px] font-black px-2 py-0.5 rounded-md border" [ngClass]="opt.badge">
                            {{ opt.label }}
                          </span>
                          <span *ngIf="(p.priority || 'P2') === opt.id" class="text-indigo-600 text-sm font-black">
                            ✓
                          </span>
                        </div>

                        <p class="text-[11px] text-slate-600 leading-relaxed font-normal">
                          {{ opt.desc }}
                        </p>
                      </div>

                      <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold"
                        [ngClass]="(p.priority || 'P2') === opt.id ? 'text-indigo-700' : 'text-slate-400'">
                        <span>{{ (p.priority || 'P2') === opt.id ? '● Selecionado' : 'Clique para selecionar' }}</span>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- SECTION: SISTEMAS ENVOLVIDOS (VÍNCULO MANUAL COM SUPORTE DINÂMICO) -->
                <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span>💻 Sistemas Envolvidos no Projeto</span>
                        <span class="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                          Vínculo 100% Manual
                        </span>
                      </h4>
                      <p class="text-[11px] text-slate-500 mt-0.5">
                        Assinale os sistemas ILC impactados por este projeto ou cadastre sistemas adicionais (ex: SAP, TMS Rodopar, Senior RH).
                      </p>
                    </div>
                  </div>

                  <!-- Official Systems 4 Checkboxes -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div
                      *ngFor="let sys of officialSystems"
                      (click)="toggleSystem(p, sys.name)"
                      class="flex items-start gap-3 p-3 bg-white border rounded-xl hover:border-indigo-300 transition cursor-pointer"
                      [ngClass]="hasSystem(p, sys.name) ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400 shadow-2xs' : 'border-slate-200'">
                      <input
                        type="checkbox"
                        [checked]="hasSystem(p, sys.name)"
                        (click)="$event.stopPropagation(); toggleSystem(p, sys.name)"
                        class="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold text-slate-900">{{ sys.name }}</div>
                        <div class="text-[10px] font-medium text-slate-500 mt-0.5">
                          {{ sys.subtitle }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Custom / Additional Systems (e.g. SAP, Rodopar, Senior RH) -->
                  <div class="pt-2 border-t border-slate-200/80 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold text-slate-700">Outros Sistemas & Integrações Conectadas:</span>
                      <span class="text-[10px] text-slate-400">Pressione Enter ou clique em + Adicionar</span>
                    </div>

                    <!-- Custom systems chips -->
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span
                        *ngFor="let cs of getCustomSystems(p)"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span>{{ cs }}</span>
                        <button
                          type="button"
                          (click)="removeSystem(p, cs)"
                          class="hover:text-rose-600 ml-0.5 text-xs cursor-pointer font-bold"
                          title="Remover sistema">
                          ✕
                        </button>
                      </span>

                      <!-- Input to add custom system -->
                      <div class="flex items-center gap-1.5">
                        <input
                          type="text"
                          [ngModel]="customSystemInput()"
                          (ngModelChange)="customSystemInput.set($event)"
                          (keydown.enter)="addCustomSystem(p); $event.preventDefault()"
                          placeholder="Ex: SAP, TMS Rodopar, Senior RH..."
                          class="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]">
                        <button
                          type="button"
                          (click)="addCustomSystem(p)"
                          [disabled]="!customSystemInput().trim()"
                          class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer">
                          + Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SECTION: EQUIPE ENVOLVIDA (LÍDER & MEMBROS) -->
                <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>👥 Equipe Envolvida no Projeto</span>
                    </h4>
                    <p class="text-[11px] text-slate-500 mt-0.5">
                      Identifique a liderança (GP / Líder / Scrum Master) e os especialistas / desenvolvedores alocados.
                    </p>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] font-bold text-slate-700 mb-1">
                        Líder / GP / Scrum Master:
                      </label>
                      <input
                        type="text"
                        [ngModel]="p.team?.leader || ''"
                        (ngModelChange)="setLeader(p, $event)"
                        placeholder="Ex: Bruno Ferreira, Carlos Eduardo..."
                        class="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800">
                    </div>

                    <div>
                      <label class="block text-[11px] font-bold text-slate-700 mb-1">
                        Membros da Equipe (separados por vírgula):
                      </label>
                      <input
                        type="text"
                        [ngModel]="getTeamMembersString(p)"
                        (ngModelChange)="setTeamMembersFromString(p, $event)"
                        placeholder="Ex: Ana Silva, Marcos Souza, Roberto Lima..."
                        class="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-800">
                    </div>
                  </div>

                  <!-- Member badges preview -->
                  <div *ngIf="p.team?.members && p.team!.members!.length > 0" class="flex flex-wrap items-center gap-1.5 pt-1">
                    <span class="text-[10px] font-bold text-slate-400 mr-1">Alocados:</span>
                    <span
                      *ngFor="let m of p.team!.members"
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-200/80 text-slate-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>{{ m }}</span>
                    </span>
                  </div>
                </div>

                <!-- SECTION: LOCKED AZURE FIELDS (HOURS & PROGRESS) -->
                <div class="bg-blue-50/40 p-4 rounded-2xl border border-blue-200/80 text-xs space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        Campos Sincronizados do Azure DevOps (Horas, Progresso e Prazos)
                      </span>
                      <span
                        [ngClass]="isFieldLocked(p, 'ilcHours') ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-300'"
                        class="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1">
                        <span>{{ isFieldLocked(p, 'ilcHours') ? '🔒 Bloqueado (Azure Oficial)' : '🔓 Desbloqueado (Edição Manual)' }}</span>
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        (click)="toggleFieldLock(p, 'ilcHours')"
                        class="px-2.5 py-1 rounded-lg border text-xs font-bold transition"
                        [ngClass]="isFieldLocked(p, 'ilcHours') ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-amber-500 text-white border-amber-600'">
                        {{ isFieldLocked(p, 'ilcHours') ? '🔓 Desbloquear para edição' : '🔒 Bloquear campos' }}
                      </button>

                      <button
                        *ngIf="p.azureOriginal"
                        (click)="handleRestoreAzure(p)"
                        class="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold transition">
                        🔄 Restaurar do Azure
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label class="block font-bold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Progresso Físico (%):</span>
                        <span class="text-[10px] text-slate-400 font-normal">Azure</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        [(ngModel)]="p.progress"
                        [disabled]="isFieldLocked(p, 'ilcHours')"
                        class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-bold">
                    </div>

                    <div>
                      <label class="block font-bold text-emerald-700 mb-1 flex items-center justify-between">
                        <span>Horas Firmadas:</span>
                        <span class="text-[10px] text-emerald-600 font-normal">Cliente</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        [(ngModel)]="p.hours.agreed"
                        placeholder="Ex: 250"
                        class="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs">
                    </div>

                    <div>
                      <label class="block font-bold text-blue-700 mb-1 flex items-center justify-between">
                        <span>Planejado (Azure):</span>
                        <span class="text-[10px] text-blue-600 font-normal">Tasks</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        [(ngModel)]="p.hours.totalPlanned"
                        [disabled]="isFieldLocked(p, 'ilcHours')"
                        class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-bold">
                    </div>

                    <div>
                      <label class="block font-bold text-indigo-700 mb-1 flex items-center justify-between">
                        <span>Executado (Azure):</span>
                        <span class="text-[10px] text-indigo-600 font-normal">Apontado</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        [(ngModel)]="p.hours.totalExecuted"
                        [disabled]="isFieldLocked(p, 'ilcHours')"
                        class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-bold">
                    </div>
                  </div>
                </div>

                <!-- SECTION: EAP ACTIVITIES TABLE WITH PRECISE CALENDAR DATES -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Entregas na EAP & Cronograma Exato (Dia / Mês / Ano)
                      </h4>
                      <p class="text-[11px] text-slate-500">
                        Cada entrega posiciona o card no Gantt de acordo com a data de início e término exatas.
                      </p>
                    </div>
                    <button
                      (click)="addEmptyActivity(p)"
                      class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs">
                      + Adicionar Entrega na EAP
                    </button>
                  </div>

                  <!-- Empty activities alert -->
                  <div *ngIf="!p.activities || p.activities.length === 0" class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">
                    Nenhuma entrega cadastrada para este projeto. Clique no botão acima para adicionar blocos de entrega.
                  </div>

                  <!-- Table of activities -->
                  <div *ngIf="p.activities && p.activities.length > 0" class="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                    <table class="w-full text-left text-xs border-collapse">
                      <thead class="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                        <tr>
                          <th class="p-2.5">Título da Entrega</th>
                          <th class="p-2.5">Etapa EAP</th>
                          <th class="p-2.5">Data Início</th>
                          <th class="p-2.5">Data Término</th>
                          <th class="p-2.5">Horas (Exec/Plan)</th>
                          <th class="p-2.5">Situação</th>
                          <th class="p-2.5 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 bg-white">
                        <tr *ngFor="let act of p.activities; let actIdx = index" class="hover:bg-slate-50/60 transition">
                          <!-- Title -->
                          <td class="p-2 min-w-[200px]">
                            <input
                              type="text"
                              [(ngModel)]="act.title"
                              placeholder="Nome da funcionalidade / entrega"
                              class="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs outline-none">
                          </td>

                          <!-- EAP Phase -->
                          <td class="p-2">
                            <select
                              [(ngModel)]="act.eapPhase"
                              (ngModelChange)="act.hasManualEapPhase = true"
                              class="border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 bg-white">
                              <option value="Planejamento">1. Planejamento</option>
                              <option value="Desenvolvimento">2. Desenvolvimento</option>
                              <option value="Homologação">3. Homologação</option>
                              <option value="Treinamento">4. Treinamento</option>
                              <option value="Operação Assistida">5. Operação Assistida</option>
                            </select>
                          </td>

                          <!-- Start Date: Exact YYYY-MM-DD input -->
                          <td class="p-2">
                            <input
                              type="date"
                              [(ngModel)]="act.startDate"
                              class="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white outline-none">
                          </td>

                          <!-- Target Date: Exact YYYY-MM-DD input -->
                          <td class="p-2">
                            <input
                              type="date"
                              [(ngModel)]="act.targetDate"
                              class="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white outline-none">
                          </td>

                          <!-- Hours Exec / Plan -->
                          <td class="p-2">
                            <div class="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                [(ngModel)]="act.ilcHours"
                                placeholder="0"
                                class="w-12 border border-slate-300 rounded-lg px-1.5 py-1 text-xs text-center"
                                title="Horas Executadas">
                              <span class="text-slate-400">/</span>
                              <input
                                type="number"
                                step="0.1"
                                [(ngModel)]="act.ilcHoursTotal"
                                placeholder="0"
                                class="w-12 border border-slate-300 rounded-lg px-1.5 py-1 text-xs text-center"
                                title="Horas Planejadas">
                              <span class="text-[10px] text-slate-500 font-bold">h</span>
                            </div>
                          </td>

                          <!-- Status -->
                          <td class="p-2">
                            <select
                              [(ngModel)]="act.status"
                              class="border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white">
                              <option value="completed">Concluído</option>
                              <option value="in-progress">Em Curso</option>
                              <option value="planned">Planejado</option>
                            </select>
                          </td>

                          <!-- Delete -->
                          <td class="p-2 text-center">
                            <button
                              (click)="removeActivity(p, actIdx)"
                              class="p-1 text-rose-500 hover:text-rose-700 font-bold text-sm"
                              title="Remover entrega">
                              ✕
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            <!-- Fallback if no project selected -->
            <div *ngIf="!activeProject()" class="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-400">
              Selecione um projeto na lista à esquerda para editar.
            </div>

          </div>

          <!-- TAB 7: CONTROLE DE ACESSO & SEGURANÇA (100% Gratuito) -->
          <div *ngIf="activeTab() === 'access'" class="flex-1 p-6 overflow-y-auto space-y-6">
            <!-- Header Banner -->
            <div class="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-3xl p-6 text-white shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Segurança & Governança Corporativa
                  </span>
                  <h3 class="text-lg font-black mt-2">Controle de Acesso ao Portfólio Executivo</h3>
                  <p class="text-xs text-purple-200 mt-1 max-w-2xl">
                    Modelo híbrido 100% gratuito. Permite login via senha individual com troca obrigatória no primeiro acesso, código OTP de 6 dígitos no e-mail ou SSO Microsoft Office 365.
                  </p>
                </div>
                <button
                  (click)="openNewAccessUserModal()"
                  class="px-4 py-2.5 bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold rounded-xl shadow transition flex items-center gap-2">
                  <span>➕ Adicionar Usuário</span>
                </button>
              </div>
            </div>

            <!-- Global Security Settings -->
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 class="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Políticas Gerais de Acesso</h4>
              
              <div *ngIf="accessData() as ad" class="space-y-4">
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span class="text-xs font-bold text-slate-800 block">Exigir Autenticação na Versão Online</span>
                    <span class="text-[11px] text-slate-500">Quando ativo, visitantes na nuvem (Vercel) devem obrigatoriamente se autenticar para ver dados.</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="ad.requireAuthOnline" class="w-5 h-5 text-purple-600 rounded cursor-pointer" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Domínios Corporativos Autorizados (separados por vírgula)</label>
                  <input
                    type="text"
                    [ngModel]="allowedDomainsText()"
                    (ngModelChange)="allowedDomainsText.set($event)"
                    placeholder="Ex: opah.com.br, deere.com, ilclog.com.br"
                    class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <p class="text-[10px] text-slate-500 mt-1">Usuários com e-mail pertencente a esses domínios podem receber tokens ou cadastrar acessos.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Microsoft Entra ID (Client ID) - Opcional</label>
                    <input
                      type="text"
                      [(ngModel)]="ad.microsoftClientId"
                      placeholder="Ex: a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Microsoft Tenant ID - Opcional (common para multitenant)</label>
                    <input
                      type="text"
                      [(ngModel)]="ad.microsoftTenantId"
                      placeholder="common"
                      class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>

                <!-- SMTP Config -->
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-xs font-bold text-slate-800 block">Servidor de E-mail Gratuito (SMTP para Envio de Códigos & Convites)</span>
                      <span class="text-[10px] text-slate-500">Pode usar Gmail SMTP gratuito, Brevo (300 emails/dia grátis) ou Outlook SMTP.</span>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Host SMTP</label>
                      <input type="text" [(ngModel)]="ad.smtp.host" placeholder="smtp.gmail.com" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Porta</label>
                      <input type="number" [(ngModel)]="ad.smtp.port" placeholder="587" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Usuário / Remetente</label>
                      <input type="text" [(ngModel)]="ad.smtp.user" placeholder="notificacoes@seudominio.com" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                  </div>
                  <div class="text-[11px] text-slate-500 italic">
                    Nota de segurança: A senha do SMTP é configurada via variável de ambiente <code>SMTP_PASS</code> no arquivo <code>.env</code> ou na Vercel (nunca exposta em código).
                  </div>
                </div>

                <div class="flex justify-end pt-2">
                  <button
                    (click)="saveAccessSettings()"
                    class="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition">
                    Salvar Políticas de Acesso
                  </button>
                </div>
              </div>
            </div>

            <!-- Users List Table -->
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                  Usuários Autorizados ({{ accessData()?.users?.length || 0 }})
                </h4>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th class="py-2.5 px-3">Usuário / E-mail</th>
                      <th class="py-2.5 px-3">Organização</th>
                      <th class="py-2.5 px-3">Escopo (Cliente)</th>
                      <th class="py-2.5 px-3">1º Acesso</th>
                      <th class="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let u of accessData()?.users" class="hover:bg-slate-50/80 transition">
                      <td class="py-3 px-3">
                        <div class="font-bold text-slate-900">{{ u.name || 'Sem nome' }}</div>
                        <div class="text-[11px] text-slate-500 font-mono">{{ u.email }}</div>
                      </td>
                      <td class="py-3 px-3 text-slate-600">
                        {{ u.organization || 'ILC / Geral' }}
                      </td>
                      <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="u.clientFilter === 'Todos' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'">
                          {{ u.clientFilter || 'Todos' }}
                        </span>
                      </td>
                      <td class="py-3 px-3">
                        <span *ngIf="u.mustChangePassword" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          ⚠️ Troca Pendente
                        </span>
                        <span *ngIf="!u.mustChangePassword" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Senha Definida
                        </span>
                      </td>
                      <td class="py-3 px-3 text-right space-x-1">
                        <button
                          (click)="sendUserInvite(u)"
                          [disabled]="sendingInviteUserId() === u.id"
                          class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition"
                          title="Enviar convite e senha de primeiro acesso por e-mail">
                          {{ sendingInviteUserId() === u.id ? 'Enviando...' : '📧 Enviar Convite' }}
                        </button>
                        <button
                          (click)="openEditAccessUserModal(u)"
                          class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition">
                          ✏️ Editar
                        </button>
                        <button
                          (click)="deleteAccessUser(u)"
                          class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- USER EDIT/CREATE MODAL -->
          <div *ngIf="accessUserModalOpen()" class="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 class="text-sm font-black text-slate-900">
                  {{ editingAccessUser().id ? 'Editar Usuário de Acesso' : 'Novo Usuário de Acesso' }}
                </h3>
                <button (click)="closeAccessUserModal()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>

              <div class="space-y-3 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input type="text" [(ngModel)]="editingAccessUser().name" placeholder="Ex: Rodrigo Silva" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                  <input type="email" [(ngModel)]="editingAccessUser().email" placeholder="rodrigo@cliente.com" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Organização / Cargo</label>
                  <input type="text" [(ngModel)]="editingAccessUser().organization" placeholder="Ex: Diretoria John Deere" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Escopo de Visualização (Restringir Cliente)</label>
                  <select [(ngModel)]="editingAccessUser().clientFilter" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="Todos">Todos os Clientes (Visão Geral da Diretoria)</option>
                    <option *ngFor="let c of service.clients()" [value]="c.name">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Senha de 1º Acesso (ou nova senha)</label>
                  <input type="text" [(ngModel)]="editingAccessUser().accessPasscode" placeholder="Ex: ILC@2026" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <input type="checkbox" [(ngModel)]="editingAccessUser().mustChangePassword" id="chkMustChange" class="w-4 h-4 text-purple-600 rounded" />
                  <label for="chkMustChange" class="text-slate-700 font-semibold cursor-pointer">
                    Obrigar troca de senha no primeiro login
                  </label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button (click)="closeAccessUserModal()" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">Cancelar</button>
                <button (click)="saveAccessUser()" class="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs">
                  Salvar Usuário
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 2: NOVO PROJETO MANUAL -->
          <div *ngIf="activeTab() === 'new-project'" class="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <h3 class="text-sm font-bold text-slate-900 mb-1">Cadastrar Projeto Fora do Azure DevOps</h3>
              <p class="text-xs text-slate-500 mb-5">
                Projetos manuais são salvos com segurança no repositório corporativo e nunca serão sobrescritos pelas sincronizações automáticas.
              </p>

              <div class="space-y-4 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Nome do Projeto:</label>
                  <input
                    type="text"
                    [(ngModel)]="newProjData.name"
                    placeholder="Ex: Integração WMS Logística"
                    class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white">
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Cliente:</label>
                  <select
                    [(ngModel)]="newProjData.client"
                    class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium bg-white">
                    <option value="ILC (Interno)">ILC (Interno)</option>
                    <option value="Mirassol">Mirassol</option>
                    <option value="John Deere">John Deere</option>
                    <option value="Petrobras">Petrobras</option>
                    <option value="Boge Ruber">Boge Ruber</option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-bold text-slate-700 mb-1">Data Início Acordada:</label>
                    <input
                      type="date"
                      [(ngModel)]="newProjData.startDate"
                      class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white">
                  </div>
                  <div>
                    <label class="block font-bold text-slate-700 mb-1">Data Término Acordada:</label>
                    <input
                      type="date"
                      [(ngModel)]="newProjData.endDate"
                      class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-bold text-emerald-700 mb-1">Horas Firmadas com o Cliente:</label>
                    <input
                      type="number"
                      [(ngModel)]="newProjData.agreedHours"
                      placeholder="Ex: 200"
                      class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white font-bold text-emerald-800">
                  </div>
                  <div>
                    <label class="block font-bold text-blue-700 mb-1">Horas Planejadas Iniciais (Estimativa):</label>
                    <input
                      type="number"
                      [(ngModel)]="newProjData.plannedHours"
                      placeholder="Ex: 200"
                      class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white font-bold text-blue-800">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-bold text-slate-700 mb-1">Prioridade Inicial:</label>
                    <select
                      [(ngModel)]="newProjData.priority"
                      class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white font-bold text-slate-800">
                      <option *ngFor="let opt of priorityOptions" [value]="opt.id">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block font-bold text-slate-700 mb-1">Líder / GP / Scrum Master:</label>
                    <input
                      type="text"
                      [(ngModel)]="newProjData.teamLeader"
                      placeholder="Ex: Bruno Ferreira, Carlos..."
                      class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white text-slate-800">
                  </div>
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Membros da Equipe (separados por vírgula):</label>
                  <input
                    type="text"
                    [(ngModel)]="newProjData.teamMembers"
                    placeholder="Ex: Ana Silva, Marcos Souza, Roberto Lima..."
                    class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white text-slate-800">
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Status Report da Semana (Opcional):</label>
                  <textarea
                    [(ngModel)]="newProjData.executiveSummary"
                    rows="2"
                    placeholder="Status report inicial do projeto..."
                    class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none bg-white"></textarea>
                </div>

                <button
                  (click)="handleCreateManualProject()"
                  [disabled]="!newProjData.name"
                  class="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-xs shadow-sm">
                  Salvar Projeto Manual
                </button>
              </div>
            </div>
          </div>

          <!-- TAB: LINKS DE VISUALIZAÇÃO PERSONALIZADA (INDEPENDENTE DE CLIENTE) -->
          <div *ngIf="activeTab() === 'custom-links'" class="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-5">
            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <div>
                <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🔗 Criar Link de Visualização Personalizado</span>
                  <span class="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">Multi-Cliente</span>
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  Selecione exatamente os projetos que deseja compartilhar ou visualizar juntos, independentemente do cliente ao qual pertencem. Gere um link direto para apresentar apenas esses projetos selecionados.
                </p>
              </div>

              <!-- Filter and Quick Selection Actions -->
              <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div class="relative w-full sm:w-72">
                  <input
                    type="text"
                    [ngModel]="customLinkSearch()"
                    (ngModelChange)="customLinkSearch.set($event)"
                    placeholder="Filtrar projetos..."
                    class="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                  <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                </div>

                <div class="flex items-center gap-2 text-xs font-bold">
                  <button
                    (click)="selectAllCustomLinkProjects()"
                    class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition cursor-pointer">
                    Selecionar Todos
                  </button>
                  <button
                    (click)="clearAllCustomLinkProjects()"
                    class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition cursor-pointer">
                    Desmarcar Todos
                  </button>
                  <button
                    (click)="selectOnlyActiveCustomLinkProjects()"
                    class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg transition cursor-pointer">
                    Apenas Ativos
                  </button>
                </div>
              </div>

              <!-- Projects Checklist -->
              <div class="max-h-72 overflow-y-auto divide-y divide-slate-200 bg-white rounded-2xl border border-slate-200">
                <div
                  *ngFor="let p of filteredCustomLinkProjects()"
                  (click)="toggleCustomProjectSelection(p.id)"
                  class="p-3 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer">
                  <div class="flex items-center gap-3">
                    <input
                      type="checkbox"
                      [checked]="selectedCustomProjectIds().includes(p.id)"
                      (click)="$event.stopPropagation(); toggleCustomProjectSelection(p.id)"
                      class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500">
                    <div>
                      <div class="text-xs font-bold text-slate-900">{{ p.name }}</div>
                      <div class="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span class="font-semibold">{{ p.client }}</span>
                        <span>•</span>
                        <span [ngClass]="p.status === 'Ativo' ? 'text-blue-600' : 'text-slate-400'">{{ p.status }}</span>
                        <span>•</span>
                        <span [ngClass]="p.isVisible ? 'text-emerald-600 font-semibold' : 'text-slate-400 font-medium'">
                          {{ p.isVisible ? '👁️ Visível' : '🚫 Oculto' }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [ngClass]="p.ragStatus === 'green' ? 'bg-emerald-100 text-emerald-800' : (p.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')">
                    {{ p.ragStatus === 'green' ? 'No Prazo' : (p.ragStatus === 'amber' ? 'Atenção' : 'Atrasado') }}
                  </span>
                </div>
              </div>

              <!-- Generated Link Bar -->
              <div class="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Link de Visualização Direta ({{ selectedCustomProjectIds().length }} projetos selecionados)
                  </span>
                  <span *ngIf="copyLinkFeedback()" class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-in fade-in">
                    ✓ Link copiado!
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    readonly
                    [value]="generatedCustomLink()"
                    class="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 outline-none select-all">
                  <button
                    (click)="copyGeneratedCustomLink()"
                    [disabled]="selectedCustomProjectIds().length === 0"
                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer">
                    <span>📋 Copiar Link</span>
                  </button>
                  <a
                    [href]="generatedCustomLink()"
                    target="_blank"
                    [class.pointer-events-none]="selectedCustomProjectIds().length === 0"
                    [class.opacity-50]="selectedCustomProjectIds().length === 0"
                    class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer">
                    <span>↗ Abrir</span>
                  </a>
                </div>
              </div>

            </div>
          </div>

          <!-- TAB: GESTÃO DO STATUS REPORT SEMANAL (REUNIÃO DE DIRETORIA) -->
          <div *ngIf="activeTab() === 'weekly-report'" class="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
            
            <!-- Top Controls Card -->
            <div class="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Módulo de Governança
                  </span>
                  <span class="text-xs text-indigo-300">• Reunião Semanal de Diretoria</span>
                </div>
                <h3 class="text-base font-extrabold text-white">
                  Gestão do Status Report Semanal & Radar
                </h3>
                <p class="text-xs text-slate-300 mt-0.5 max-w-xl">
                  Gere a edição da semana com 1 clique a partir dos dados do Azure DevOps, personalize pontos de atenção e gerencie o pipeline de projetos no roadmap.
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  (click)="handleGenerateWeeklyReport()"
                  [disabled]="isGeneratingReport()"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer">
                  <span *ngIf="isGeneratingReport()" class="animate-spin">⏳</span>
                  <span>🚀 Gerar / Sincronizar Semana Atual</span>
                </button>
              </div>
            </div>

            <!-- Edition Selector & Metadata Card -->
            <div *ngIf="editableReport()" class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold text-slate-600 whitespace-nowrap">Selecionar Edição:</label>
                  <select
                    [ngModel]="editableReport()?.id"
                    (ngModelChange)="onSelectWeeklyReportToEdit($event)"
                    class="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                    <option *ngFor="let rep of service.weeklyReports()" [value]="rep.id">
                      {{ service.formatEditionTitle(rep) }} ({{ rep.period }})
                    </option>
                  </select>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    (click)="handleSaveWeeklyReport()"
                    class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
                    <span>💾 Salvar e Publicar</span>
                  </button>
                  <button
                    (click)="handleDeleteWeeklyReport()"
                    class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    title="Excluir esta edição do histórico">
                    <span>🗑️ Excluir</span>
                  </button>
                </div>
              </div>

              <!-- General Info Form -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 mb-1">Título da Edição</label>
                  <input
                    type="text"
                    [(ngModel)]="editableReport()!.title"
                    class="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-semibold">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 mb-1">Período de Avaliação</label>
                  <input
                    type="text"
                    [(ngModel)]="editableReport()!.period"
                    placeholder="Ex: 13/10/2026 a 17/10/2026"
                    class="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-semibold">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 mb-1">Data da Reunião</label>
                  <input
                    type="date"
                    [(ngModel)]="editableReport()!.meetingDate"
                    class="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-semibold">
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">Resumo Executivo para a Diretoria (Headline)</label>
                <textarea
                  rows="2"
                  [(ngModel)]="editableReport()!.executiveSummary"
                  class="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed font-medium"
                  placeholder="Mensagem síntese da semana a ser destacada na abertura da apresentação..."></textarea>
              </div>
            </div>

            <!-- Radar de Projetos no Roadmap (Pipeline) -->
            <div *ngIf="editableReport()" class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="text-base">🔭</span>
                  <div>
                    <h4 class="text-xs sm:text-sm font-extrabold text-slate-900">
                      Radar de Projetos no Roadmap ({{ editableReport()!.roadmapProjects?.length || 0 }})
                    </h4>
                    <p class="text-[11px] text-slate-500">
                      Iniciativas futuras, prospecções e oportunidades em negociação estratégica.
                    </p>
                  </div>
                </div>
                <button
                  (click)="addRoadmapItem()"
                  class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer">
                  <span>+ Adicionar ao Radar</span>
                </button>
              </div>

              <div class="space-y-3">
                <div
                  *ngFor="let item of editableReport()!.roadmapProjects; let idx = index"
                  class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Item #{{ idx + 1 }}
                    </span>
                    <button
                      (click)="removeRoadmapItem(idx)"
                      class="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                      title="Remover projeto do radar">
                      ✕ Remover
                    </button>
                  </div>

                  <!-- Linha 1: Dados Principais da Iniciativa -->
                  <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div class="sm:col-span-4">
                      <label class="block text-[10px] font-bold text-slate-500">Nome da Iniciativa</label>
                      <input
                        type="text"
                        [(ngModel)]="item.name"
                        placeholder="Ex: Novo App Corporativo"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-blue-500">
                    </div>
                    <div class="sm:col-span-3">
                      <label class="block text-[10px] font-bold text-slate-500">Cliente / Parceiro</label>
                      <input
                        type="text"
                        [(ngModel)]="item.client"
                        placeholder="Ex: ILC, Mirassol, John Deere"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500">
                    </div>
                    <div class="sm:col-span-3">
                      <label class="block text-[10px] font-bold text-slate-500">Estágio do Radar</label>
                      <select
                        [(ngModel)]="item.stage"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500">
                        <option *ngFor="let s of roadmapStageOptions" [value]="s">{{ s }}</option>
                        <option *ngIf="item.stage && !roadmapStageOptions.includes(item.stage)" [value]="item.stage">{{ item.stage }}</option>
                      </select>
                    </div>
                    <div class="sm:col-span-2">
                      <label class="block text-[10px] font-bold text-slate-500">Valor Estratégico</label>
                      <select
                        [(ngModel)]="item.strategicValue"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 outline-none focus:border-blue-500">
                        <option *ngFor="let val of strategicValueOptions" [value]="val">{{ val }}</option>
                        <option *ngIf="item.strategicValue && !strategicValueOptions.includes(item.strategicValue)" [value]="item.strategicValue">{{ item.strategicValue }}</option>
                      </select>
                    </div>
                  </div>

                  <!-- Linha 2: Previsão, Responsável e Descrição -->
                  <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div class="sm:col-span-3">
                      <label class="block text-[10px] font-bold text-slate-500">Previsão de Início</label>
                      <input
                        type="text"
                        [(ngModel)]="item.estimatedStart"
                        placeholder="Ex: Novembro/2026 ou A definir"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500">
                    </div>
                    <div class="sm:col-span-3">
                      <label class="block text-[10px] font-bold text-slate-500">Responsável</label>
                      <input
                        type="text"
                        [(ngModel)]="item.responsible"
                        placeholder="Ex: ILC, Comercial & PMO"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-blue-500">
                    </div>
                    <div class="sm:col-span-6">
                      <label class="block text-[10px] font-bold text-slate-500">Descrição / Escopo da Oportunidade</label>
                      <input
                        type="text"
                        [(ngModel)]="item.description"
                        placeholder="Breve descrição da proposta ou solução..."
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-blue-500">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Deliberações da Diretoria -->
            <div *ngIf="editableReport()" class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="text-base">⚖️</span>
                  <div>
                    <h4 class="text-xs sm:text-sm font-extrabold text-slate-900">
                      Deliberações & Decisões Esperadas da Diretoria ({{ editableReport()!.boardDecisions?.length || 0 }})
                    </h4>
                    <p class="text-[11px] text-slate-500">
                      Decisões que demandam validação da alta gestão.
                    </p>
                  </div>
                </div>
                <button
                  (click)="addDecisionItem()"
                  class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer">
                  <span>+ Adicionar Decisão</span>
                </button>
              </div>

              <div class="space-y-3">
                <div
                  *ngFor="let dec of editableReport()!.boardDecisions; let idx = index"
                  class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Decisão #{{ idx + 1 }}
                    </span>
                    <button
                      (click)="removeDecisionItem(idx)"
                      class="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer">
                      ✕ Remover
                    </button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div class="sm:col-span-2">
                      <label class="block text-[10px] font-bold text-slate-500">Título da Deliberação</label>
                      <input
                        type="text"
                        [(ngModel)]="dec.title"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500">Status</label>
                      <select
                        [(ngModel)]="dec.status"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none">
                        <option value="Aguardando Aval">Aguardando Aval</option>
                        <option value="Em Deliberação">Em Deliberação</option>
                        <option value="Alinhado">Alinhado</option>
                        <option value="Aprovado">Aprovado</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500">Prazo de Resolução</label>
                      <input
                        type="text"
                        [(ngModel)]="dec.deadline"
                        placeholder="Ex: 16/10/2026"
                        class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none">
                    </div>
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-slate-500">Impacto / Justificativa</label>
                    <input
                      type="text"
                      [(ngModel)]="dec.impact"
                      class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none">
                  </div>
                </div>
              </div>
            </div>

            <!-- Ajuste Fino dos Projetos Ativos e de Sustentação -->
            <div *ngIf="editableReport()" class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div class="flex items-center gap-2">
                  <span class="text-base">📌</span>
                  <div>
                    <h4 class="text-xs sm:text-sm font-extrabold text-slate-900">
                      Pontos de Atenção & Status dos Projetos ({{ weeklyOriginFilter() === 'Sustentacao' ? weeklyMaintenanceProjects().length : (weeklyOriginFilter() === 'Todos' ? filteredWeeklyActiveProjects().length + weeklyMaintenanceProjects().length : filteredWeeklyActiveProjects().length) }})
                    </h4>
                    <p class="text-[11px] text-slate-500">
                      Personalize o texto que a diretoria verá nos cards executivos de projetos e de sustentação desta edição.
                    </p>
                  </div>
                </div>

                <!-- Origin Filter for Weekly Active & Maintenance Projects -->
                <div class="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[10px] font-bold">
                  <button
                    type="button"
                    (click)="weeklyOriginFilter.set('Todos')"
                    [ngClass]="weeklyOriginFilter() === 'Todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
                    class="py-1 px-2.5 rounded-lg transition text-center cursor-pointer">
                    Todos ({{ getWeeklyOriginCount('Todos') }})
                  </button>
                  <button
                    type="button"
                    (click)="weeklyOriginFilter.set('Azure')"
                    [ngClass]="weeklyOriginFilter() === 'Azure' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
                    class="py-1 px-2.5 rounded-lg transition text-center cursor-pointer flex items-center gap-1">
                    <span>☁️ Azure</span>
                    <span class="text-[9px] opacity-80">({{ getWeeklyOriginCount('Azure') }})</span>
                  </button>
                  <button
                    type="button"
                    (click)="weeklyOriginFilter.set('Manual')"
                    [ngClass]="weeklyOriginFilter() === 'Manual' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
                    class="py-1 px-2.5 rounded-lg transition text-center cursor-pointer flex items-center gap-1">
                    <span>✍️ Manual</span>
                    <span class="text-[9px] opacity-80">({{ getWeeklyOriginCount('Manual') }})</span>
                  </button>
                  <button
                    type="button"
                    (click)="weeklyOriginFilter.set('Sustentacao')"
                    [ngClass]="weeklyOriginFilter() === 'Sustentacao' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
                    class="py-1 px-2.5 rounded-lg transition text-center cursor-pointer flex items-center gap-1">
                    <span>🛠️ Sustentação</span>
                    <span class="text-[9px] opacity-80">({{ getWeeklyOriginCount('Sustentacao') }})</span>
                  </button>
                </div>
              </div>

              <div *ngIf="weeklyOriginFilter() !== 'Sustentacao'" class="space-y-4">
                <div
                  *ngFor="let p of filteredWeeklyActiveProjects()"
                  class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-black text-slate-800">{{ p.name }}</span>
                      <span class="text-[10px] font-bold text-slate-500">({{ p.client }})</span>
                      <span
                        class="text-[9px] font-black px-1.5 py-0.2 rounded"
                        [ngClass]="isManualProject(p) ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-sky-100 text-sky-800 border border-sky-200'">
                        {{ isManualProject(p) ? '✍️ Manual' : '☁️ Azure' }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span [ngClass]="service.getMilestoneBadgeClass(p.currentMilestone)" class="px-2 py-0.5 rounded font-semibold text-[10px]">
                        {{ p.currentMilestone }}
                      </span>
                      <span class="text-[10px] font-black px-2 py-0.5 rounded-full"
                        [ngClass]="p.ragStatus === 'red' ? 'bg-rose-100 text-rose-800' : (p.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')">
                        {{ p.progress }}% • {{ p.ragStatus === 'red' ? 'Desvio' : (p.ragStatus === 'amber' ? 'Atenção' : 'No Prazo') }}
                      </span>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-600 mb-1">Status Report Anterior</label>
                      <textarea
                        rows="2"
                        [(ngModel)]="p.previousStatusReport"
                        placeholder="Reporte do ciclo anterior..."
                        class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none leading-relaxed"></textarea>
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-blue-700 mb-1">Status Report Atual</label>
                      <textarea
                        rows="2"
                        [(ngModel)]="p.statusReport"
                        placeholder="Avanço da semana / entregas..."
                        class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none leading-relaxed"></textarea>
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-rose-700 mb-1">Pontos de Atenção & Riscos</label>
                      <textarea
                        rows="2"
                        [(ngModel)]="p.attentionPoints"
                        placeholder="Riscos e bloqueios mapeados..."
                        class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none leading-relaxed"></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Projetos em Sustentação (N2/N3) -->
              <div *ngIf="(weeklyOriginFilter() === 'Todos' || weeklyOriginFilter() === 'Sustentacao') && weeklyMaintenanceProjects().length > 0"
                   class="space-y-3"
                   [ngClass]="{'pt-4 border-t border-slate-200': weeklyOriginFilter() === 'Todos'}">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">🛠️</span>
                    <h5 class="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                      Projetos em Sustentação & Operação Contínua ({{ weeklyMaintenanceProjects().length }})
                    </h5>
                  </div>
                  <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {{ editableReport()?.maintenanceSection?.periodLabel || editableReport()?.period }}
                  </span>
                </div>

                <div class="space-y-4">
                  <div
                    *ngFor="let mp of weeklyMaintenanceProjects()"
                    class="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-xl space-y-2.5">
                    
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-black text-slate-800">{{ mp.name }}</span>
                        <span class="text-[10px] font-bold text-slate-500">({{ mp.client }})</span>
                        <span class="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          🛠️ Sustentação
                        </span>
                        <span class="text-[9px] font-black px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200">
                          ☁️ Azure
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded font-bold text-[10px] bg-white text-slate-700 border border-slate-200">
                          No período: {{ formatHours(mp.hoursExecuted) }}h
                        </span>
                        <span class="text-[10px] font-black px-2 py-0.5 rounded-full"
                          [ngClass]="mp.ragStatus === 'red' ? 'bg-rose-100 text-rose-800' : (mp.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')">
                          {{ mp.ragStatus === 'red' ? 'Crítico' : (mp.ragStatus === 'amber' ? 'Atenção' : 'Operação Normal') }}
                        </span>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label class="block text-[10px] font-bold text-slate-600 mb-1">Status Report Anterior</label>
                        <textarea
                          rows="2"
                          [(ngModel)]="mp.previousStatusReport"
                          placeholder="Reporte de sustentação do ciclo anterior..."
                          class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none leading-relaxed"></textarea>
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-emerald-700 mb-1">Status Report Atual</label>
                        <textarea
                          rows="2"
                          [(ngModel)]="mp.statusReport"
                          (ngModelChange)="mp.summary = $event"
                          placeholder="Atendimentos, chamados N2/N3 e estabilidade na semana..."
                          class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none leading-relaxed"></textarea>
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-rose-700 mb-1">Pontos de Atenção & Riscos</label>
                        <textarea
                          rows="2"
                          [(ngModel)]="mp.attentionPoints"
                          placeholder="Incidentes relevantes ou pontos de atenção..."
                          class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none leading-relaxed"></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bottom Save Button -->
              <div class="pt-4 border-t flex justify-end">
                <button
                  (click)="handleSaveWeeklyReport()"
                  class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer">
                  <span>💾 Salvar e Publicar Edição Semanal</span>
                </button>
              </div>
            </div>

          </div>

          <!-- TAB 7: CONTROLE DE ACESSO & SEGURANÇA (100% Gratuito) -->
          <div *ngIf="activeTab() === 'access'" class="flex-1 p-6 overflow-y-auto space-y-6">
            <!-- Header Banner -->
            <div class="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-3xl p-6 text-white shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Segurança & Governança Corporativa
                  </span>
                  <h3 class="text-lg font-black mt-2">Controle de Acesso ao Portfólio Executivo</h3>
                  <p class="text-xs text-purple-200 mt-1 max-w-2xl">
                    Modelo híbrido 100% gratuito. Permite login via senha individual com troca obrigatória no primeiro acesso, código OTP de 6 dígitos no e-mail ou SSO Microsoft Office 365.
                  </p>
                </div>
                <button
                  (click)="openNewAccessUserModal()"
                  class="px-4 py-2.5 bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold rounded-xl shadow transition flex items-center gap-2">
                  <span>➕ Adicionar Usuário</span>
                </button>
              </div>
            </div>

            <!-- Global Security Settings -->
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 class="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Políticas Gerais de Acesso</h4>
              
              <div *ngIf="accessData() as ad" class="space-y-4">
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span class="text-xs font-bold text-slate-800 block">Exigir Autenticação na Versão Online</span>
                    <span class="text-[11px] text-slate-500">Quando ativo, visitantes na nuvem (Vercel) devem obrigatoriamente se autenticar para ver dados.</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="ad.requireAuthOnline" class="w-5 h-5 text-purple-600 rounded cursor-pointer" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Domínios Corporativos Autorizados (separados por vírgula)</label>
                  <input
                    type="text"
                    [ngModel]="allowedDomainsText()"
                    (ngModelChange)="allowedDomainsText.set($event)"
                    placeholder="Ex: opah.com.br, deere.com, ilclog.com.br"
                    class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <p class="text-[10px] text-slate-500 mt-1">Usuários com e-mail pertencente a esses domínios podem receber tokens ou cadastrar acessos.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Microsoft Entra ID (Client ID) - Opcional</label>
                    <input
                      type="text"
                      [(ngModel)]="ad.microsoftClientId"
                      placeholder="Ex: a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Microsoft Tenant ID - Opcional (common para multitenant)</label>
                    <input
                      type="text"
                      [(ngModel)]="ad.microsoftTenantId"
                      placeholder="common"
                      class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>

                <!-- SMTP Config -->
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-xs font-bold text-slate-800 block">Servidor de E-mail Gratuito (SMTP para Envio de Códigos & Convites)</span>
                      <span class="text-[10px] text-slate-500">Pode usar Gmail SMTP gratuito, Brevo (300 emails/dia grátis) ou Outlook SMTP.</span>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Host SMTP</label>
                      <input type="text" [(ngModel)]="ad.smtp.host" placeholder="smtp.gmail.com" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Porta</label>
                      <input type="number" [(ngModel)]="ad.smtp.port" placeholder="587" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Usuário / Remetente</label>
                      <input type="text" [(ngModel)]="ad.smtp.user" placeholder="notificacoes@seudominio.com" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                  </div>
                  <div class="text-[11px] text-slate-500 italic">
                    Nota de segurança: A senha do SMTP é configurada via variável de ambiente <code>SMTP_PASS</code> no arquivo <code>.env</code> ou na Vercel (nunca exposta em código).
                  </div>
                </div>

                <div class="flex justify-end pt-2">
                  <button
                    (click)="saveAccessSettings()"
                    class="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition">
                    Salvar Políticas de Acesso
                  </button>
                </div>
              </div>
            </div>

            <!-- Users List Table -->
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                  Usuários Autorizados ({{ accessData()?.users?.length || 0 }})
                </h4>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th class="py-2.5 px-3">Usuário / E-mail</th>
                      <th class="py-2.5 px-3">Organização</th>
                      <th class="py-2.5 px-3">Escopo (Cliente)</th>
                      <th class="py-2.5 px-3">1º Acesso</th>
                      <th class="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let u of accessData()?.users" class="hover:bg-slate-50/80 transition">
                      <td class="py-3 px-3">
                        <div class="font-bold text-slate-900">{{ u.name || 'Sem nome' }}</div>
                        <div class="text-[11px] text-slate-500 font-mono">{{ u.email }}</div>
                      </td>
                      <td class="py-3 px-3 text-slate-600">
                        {{ u.organization || 'ILC / Geral' }}
                      </td>
                      <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="u.clientFilter === 'Todos' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'">
                          {{ u.clientFilter || 'Todos' }}
                        </span>
                      </td>
                      <td class="py-3 px-3">
                        <span *ngIf="u.mustChangePassword" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          ⚠️ Troca Pendente
                        </span>
                        <span *ngIf="!u.mustChangePassword" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Senha Definida
                        </span>
                      </td>
                      <td class="py-3 px-3 text-right space-x-1">
                        <button
                          (click)="sendUserInvite(u)"
                          [disabled]="sendingInviteUserId() === u.id"
                          class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition"
                          title="Enviar convite e senha de primeiro acesso por e-mail">
                          {{ sendingInviteUserId() === u.id ? 'Enviando...' : '📧 Enviar Convite' }}
                        </button>
                        <button
                          (click)="openEditAccessUserModal(u)"
                          class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition">
                          ✏️ Editar
                        </button>
                        <button
                          (click)="deleteAccessUser(u)"
                          class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- USER EDIT/CREATE MODAL -->
          <div *ngIf="accessUserModalOpen()" class="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 class="text-sm font-black text-slate-900">
                  {{ editingAccessUser().id ? 'Editar Usuário de Acesso' : 'Novo Usuário de Acesso' }}
                </h3>
                <button (click)="closeAccessUserModal()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>

              <div class="space-y-3 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input type="text" [(ngModel)]="editingAccessUser().name" placeholder="Ex: Rodrigo Silva" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                  <input type="email" [(ngModel)]="editingAccessUser().email" placeholder="rodrigo@cliente.com" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Organização / Cargo</label>
                  <input type="text" [(ngModel)]="editingAccessUser().organization" placeholder="Ex: Diretoria John Deere" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Escopo de Visualização (Restringir Cliente)</label>
                  <select [(ngModel)]="editingAccessUser().clientFilter" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="Todos">Todos os Clientes (Visão Geral da Diretoria)</option>
                    <option *ngFor="let c of service.clients()" [value]="c.name">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Senha de 1º Acesso (ou nova senha)</label>
                  <input type="text" [(ngModel)]="editingAccessUser().accessPasscode" placeholder="Ex: ILC@2026" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <input type="checkbox" [(ngModel)]="editingAccessUser().mustChangePassword" id="chkMustChange" class="w-4 h-4 text-purple-600 rounded" />
                  <label for="chkMustChange" class="text-slate-700 font-semibold cursor-pointer">
                    Obrigar troca de senha no primeiro login
                  </label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button (click)="closeAccessUserModal()" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">Cancelar</button>
                <button (click)="saveAccessUser()" class="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs">
                  Salvar Usuário
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 3: CLIENTES & CO-BRANDING COM UPLOAD DE ARQUIVO DE LOGO -->
          <div *ngIf="activeTab() === 'clients'" class="flex-1 overflow-y-auto p-6 space-y-4">
            <div class="text-xs text-slate-500 mb-3">
              Configure o logotipo oficial de cada cliente (exibido ao lado do logo da ILC). Faça o upload do arquivo de imagem diretamente do seu computador.
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                *ngFor="let c of service.clients()"
                class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                
                <div class="flex items-center justify-between">
                  <span class="font-extrabold text-sm text-slate-900">{{ c.name }}</span>
                  <div class="h-8 w-24 flex items-center justify-center bg-white px-2 py-1 rounded border border-slate-200">
                    <img
                      *ngIf="c.logoUrl"
                      [src]="c.logoUrl"
                      [alt]="c.name"
                      class="max-h-full max-w-full object-contain"
                      onerror="this.style.display='none'">
                    <span *ngIf="!c.logoUrl" class="text-[10px] text-slate-400 italic">Sem logo</span>
                  </div>
                </div>

                <!-- File Upload for Logo -->
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Upload do Arquivo de Logotipo:</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      #fileInput
                      (change)="onLogoFileSelected(c, $event)"
                      class="hidden">
                    <button
                      (click)="fileInput.click()"
                      class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition">
                      📁 Escolher Imagem
                    </button>
                    <span class="text-[11px] text-slate-500 truncate flex-1">
                      {{ c.logoUrl ? 'Logo carregado' : 'Nenhuma imagem selecionada' }}
                    </span>
                  </div>
                </div>

                <!-- URL manual fallback -->
                <div>
                  <label class="block font-semibold text-slate-500 text-[11px] mb-0.5">Ou informe a URL do logo:</label>
                  <input
                    type="text"
                    [(ngModel)]="c.logoUrl"
                    placeholder="https://... ou caminho de imagem"
                    class="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none bg-white">
                </div>

                <!-- Exclusive access token -->
                <div class="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">Link de Acesso Exclusivo:</span>
                    <button
                      (click)="copyTokenLink(c)"
                      class="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition">
                      {{ copiedSlug() === c.slug ? '✓ Copiado!' : 'Copiar Link' }}
                    </button>
                  </div>
                  <div class="text-[11px] font-mono text-blue-700 break-all select-all mt-0.5">
                    /cliente/{{ c.slug }}?token={{ c.token }}
                  </div>
                </div>

                <button
                  (click)="handleSaveClient(c)"
                  class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition text-xs">
                  Atualizar Dados do Cliente
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 4: AZURE DEVOPS & CONEXÃO (PAT MANAGEMENT & COUNTDOWN) -->
          <div *ngIf="activeTab() === 'azure'" class="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-5">
            
            <!-- PAT Expiration Banner for 01/10/2027 -->
            <div
              *ngIf="service.azureStatus() as az"
              [ngClass]="az.isWarning ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-emerald-50 border-emerald-300 text-emerald-950'"
              class="p-5 rounded-3xl border flex items-start gap-3 shadow-xs">
              <span class="text-2xl mt-0.5">{{ az.isWarning ? '⚠️' : '🛡️' }}</span>
              <div class="flex-1">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="font-bold text-sm">Status do Token PAT do Azure DevOps</h4>
                  <span class="text-xs font-black px-2.5 py-0.5 rounded-full" [ngClass]="az.isWarning ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'">
                    Válido até {{ az.expirationDate }}
                  </span>
                </div>
                <p class="text-xs mt-1 leading-relaxed">
                  O token PAT configurado está ativo e com validade garantida até <strong>01/10/2027</strong>.
                  Restam aproximadamente <strong>{{ az.monthsRemaining }} meses</strong> ({{ az.daysRemaining }} dias) de vigência.
                </p>
              </div>
            </div>

            <!-- Azure Details Card -->
            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 text-xs">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Configuração da Organização</h4>
              
              <div>
                <label class="block font-bold text-slate-600 mb-1">URL da Organização:</label>
                <input
                  type="text"
                  [value]="service.azureStatus()?.orgUrl || 'https://projetosmirassol1.visualstudio.com'"
                  disabled
                  class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-100 text-slate-600 font-mono text-xs">
              </div>

              <div>
                <label class="block font-bold text-slate-600 mb-1">PAT Atual (Mascarado):</label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [value]="service.azureStatus()?.patMasked || '••••••••••••••••'"
                    disabled
                    class="flex-1 border border-slate-300 rounded-xl px-3 py-2 bg-slate-100 text-slate-600 font-mono text-xs">
                  
                  <button
                    (click)="handleTestAzure()"
                    [disabled]="isTestingAzure()"
                    class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-xs shrink-0 flex items-center gap-1.5">
                    <span>{{ isTestingAzure() ? 'Testando...' : '🔍 Testar Conexão' }}</span>
                  </button>
                </div>
                <div *ngIf="azureTestResult()" class="mt-2 text-xs font-bold p-2.5 rounded-xl border" [ngClass]="azureTestResult()!.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'">
                  {{ azureTestResult()!.message }}
                </div>
              </div>

              <!-- Update PAT section -->
              <div class="pt-4 border-t border-slate-200">
                <label class="block font-bold text-blue-900 mb-1">Atualizar Token PAT:</label>
                <div class="flex items-center gap-2">
                  <input
                    type="password"
                    [ngModel]="newPatInput()"
                    (ngModelChange)="newPatInput.set($event)"
                    placeholder="Cole o novo token PAT do Azure aqui"
                    class="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500">
                  <button
                    (click)="handleUpdatePat()"
                    [disabled]="!newPatInput() || isUpdatingPat()"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-xs shrink-0">
                    {{ isUpdatingPat() ? 'Atualizando...' : 'Salvar Novo PAT' }}
                  </button>
                </div>
                <div *ngIf="patUpdateSuccess()" class="mt-2 text-xs font-bold text-emerald-600">
                  ✓ Token PAT atualizado com sucesso e salvo com persistência!
                </div>
              </div>

            </div>

          </div>

          <!-- TAB 7: CONTROLE DE ACESSO & SEGURANÇA (100% Gratuito) -->
          <div *ngIf="activeTab() === 'access'" class="flex-1 p-6 overflow-y-auto space-y-6">
            <!-- Header Banner -->
            <div class="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-3xl p-6 text-white shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Segurança & Governança Corporativa
                  </span>
                  <h3 class="text-lg font-black mt-2">Controle de Acesso ao Portfólio Executivo</h3>
                  <p class="text-xs text-purple-200 mt-1 max-w-2xl">
                    Modelo híbrido 100% gratuito. Permite login via senha individual com troca obrigatória no primeiro acesso, código OTP de 6 dígitos no e-mail ou SSO Microsoft Office 365.
                  </p>
                </div>
                <button
                  (click)="openNewAccessUserModal()"
                  class="px-4 py-2.5 bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold rounded-xl shadow transition flex items-center gap-2">
                  <span>➕ Adicionar Usuário</span>
                </button>
              </div>
            </div>

            <!-- Global Security Settings -->
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 class="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Políticas Gerais de Acesso</h4>
              
              <div *ngIf="accessData() as ad" class="space-y-4">
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span class="text-xs font-bold text-slate-800 block">Exigir Autenticação na Versão Online</span>
                    <span class="text-[11px] text-slate-500">Quando ativo, visitantes na nuvem (Vercel) devem obrigatoriamente se autenticar para ver dados.</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="ad.requireAuthOnline" class="w-5 h-5 text-purple-600 rounded cursor-pointer" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Domínios Corporativos Autorizados (separados por vírgula)</label>
                  <input
                    type="text"
                    [ngModel]="allowedDomainsText()"
                    (ngModelChange)="allowedDomainsText.set($event)"
                    placeholder="Ex: opah.com.br, deere.com, ilclog.com.br"
                    class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <p class="text-[10px] text-slate-500 mt-1">Usuários com e-mail pertencente a esses domínios podem receber tokens ou cadastrar acessos.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Microsoft Entra ID (Client ID) - Opcional</label>
                    <input
                      type="text"
                      [(ngModel)]="ad.microsoftClientId"
                      placeholder="Ex: a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Microsoft Tenant ID - Opcional (common para multitenant)</label>
                    <input
                      type="text"
                      [(ngModel)]="ad.microsoftTenantId"
                      placeholder="common"
                      class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>

                <!-- SMTP Config -->
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-xs font-bold text-slate-800 block">Servidor de E-mail Gratuito (SMTP para Envio de Códigos & Convites)</span>
                      <span class="text-[10px] text-slate-500">Pode usar Gmail SMTP gratuito, Brevo (300 emails/dia grátis) ou Outlook SMTP.</span>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Host SMTP</label>
                      <input type="text" [(ngModel)]="ad.smtp.host" placeholder="smtp.gmail.com" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Porta</label>
                      <input type="number" [(ngModel)]="ad.smtp.port" placeholder="587" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Usuário / Remetente</label>
                      <input type="text" [(ngModel)]="ad.smtp.user" placeholder="notificacoes@seudominio.com" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                    </div>
                  </div>
                  <div class="text-[11px] text-slate-500 italic">
                    Nota de segurança: A senha do SMTP é configurada via variável de ambiente <code>SMTP_PASS</code> no arquivo <code>.env</code> ou na Vercel (nunca exposta em código).
                  </div>
                </div>

                <div class="flex justify-end pt-2">
                  <button
                    (click)="saveAccessSettings()"
                    class="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition">
                    Salvar Políticas de Acesso
                  </button>
                </div>
              </div>
            </div>

            <!-- Users List Table -->
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                  Usuários Autorizados ({{ accessData()?.users?.length || 0 }})
                </h4>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th class="py-2.5 px-3">Usuário / E-mail</th>
                      <th class="py-2.5 px-3">Organização</th>
                      <th class="py-2.5 px-3">Escopo (Cliente)</th>
                      <th class="py-2.5 px-3">1º Acesso</th>
                      <th class="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let u of accessData()?.users" class="hover:bg-slate-50/80 transition">
                      <td class="py-3 px-3">
                        <div class="font-bold text-slate-900">{{ u.name || 'Sem nome' }}</div>
                        <div class="text-[11px] text-slate-500 font-mono">{{ u.email }}</div>
                      </td>
                      <td class="py-3 px-3 text-slate-600">
                        {{ u.organization || 'ILC / Geral' }}
                      </td>
                      <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="u.clientFilter === 'Todos' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'">
                          {{ u.clientFilter || 'Todos' }}
                        </span>
                      </td>
                      <td class="py-3 px-3">
                        <span *ngIf="u.mustChangePassword" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          ⚠️ Troca Pendente
                        </span>
                        <span *ngIf="!u.mustChangePassword" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Senha Definida
                        </span>
                      </td>
                      <td class="py-3 px-3 text-right space-x-1">
                        <button
                          (click)="sendUserInvite(u)"
                          [disabled]="sendingInviteUserId() === u.id"
                          class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition"
                          title="Enviar convite e senha de primeiro acesso por e-mail">
                          {{ sendingInviteUserId() === u.id ? 'Enviando...' : '📧 Enviar Convite' }}
                        </button>
                        <button
                          (click)="openEditAccessUserModal(u)"
                          class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition">
                          ✏️ Editar
                        </button>
                        <button
                          (click)="deleteAccessUser(u)"
                          class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- USER EDIT/CREATE MODAL -->
          <div *ngIf="accessUserModalOpen()" class="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 class="text-sm font-black text-slate-900">
                  {{ editingAccessUser().id ? 'Editar Usuário de Acesso' : 'Novo Usuário de Acesso' }}
                </h3>
                <button (click)="closeAccessUserModal()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>

              <div class="space-y-3 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input type="text" [(ngModel)]="editingAccessUser().name" placeholder="Ex: Rodrigo Silva" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                  <input type="email" [(ngModel)]="editingAccessUser().email" placeholder="rodrigo@cliente.com" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Organização / Cargo</label>
                  <input type="text" [(ngModel)]="editingAccessUser().organization" placeholder="Ex: Diretoria John Deere" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Escopo de Visualização (Restringir Cliente)</label>
                  <select [(ngModel)]="editingAccessUser().clientFilter" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="Todos">Todos os Clientes (Visão Geral da Diretoria)</option>
                    <option *ngFor="let c of service.clients()" [value]="c.name">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Senha de 1º Acesso (ou nova senha)</label>
                  <input type="text" [(ngModel)]="editingAccessUser().accessPasscode" placeholder="Ex: ILC@2026" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <input type="checkbox" [(ngModel)]="editingAccessUser().mustChangePassword" id="chkMustChange" class="w-4 h-4 text-purple-600 rounded" />
                  <label for="chkMustChange" class="text-slate-700 font-semibold cursor-pointer">
                    Obrigar troca de senha no primeiro login
                  </label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button (click)="closeAccessUserModal()" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">Cancelar</button>
                <button (click)="saveAccessUser()" class="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs">
                  Salvar Usuário
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span class="text-xs text-slate-500">
            Painel Executivo ILC • PIN: <code>admin</code>
          </span>
          <button
            (click)="service.isAdminOpen.set(false)"
            class="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition">
            Concluir & Fechar
          </button>
        </div>

        <!-- AUDIT MODAL OVERLAY -->
        <div
          *ngIf="showAuditModal()"
          class="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            <!-- Header -->
            <div class="p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xl">📋</span>
                  <h3 class="text-base font-extrabold text-slate-900">Extrato & Diagnóstico do Azure DevOps</h3>
                  <span class="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    Auditoria
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Projeto: <strong class="text-slate-800">{{ auditReport()?.projectName || activeProject()?.name }}</strong> •
                  Verificação detalhada de preenchimento de Épicos, Features, Histórias e Tarefas.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  *ngIf="activeProject() as p"
                  (click)="openAzureAuditModal(p)"
                  [disabled]="isLoadingAudit()"
                  title="Atualizar dados do Azure"
                  class="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 text-sm font-bold transition">
                  <span [class.animate-spin]="isLoadingAudit()">🔄</span>
                </button>
                <button
                  (click)="closeAzureAuditModal()"
                  class="text-slate-400 hover:text-slate-700 p-2 rounded-xl text-xl font-bold leading-none cursor-pointer">
                  ✕
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="isLoadingAudit()" class="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h4 class="text-sm font-bold text-slate-800">Extraindo dados do Azure DevOps...</h4>
              <p class="text-xs text-slate-500 mt-1 max-w-md">Consultando Épicos, Features, Histórias, Tarefas, Bugs, datas planejadas e horas estimadas/executadas.</p>
            </div>

            <!-- Content State -->
            <div *ngIf="!isLoadingAudit() && auditReport() as rep" class="flex-1 flex flex-col overflow-hidden">
              
              <!-- Top Metrics Banner -->
              <div class="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
                <!-- Compliance Score -->
                <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Conformidade</span>
                  <div class="flex items-baseline gap-1 mt-1">
                    <span class="text-xl font-black" [ngClass]="{
                      'text-emerald-600': rep.complianceScore >= 80,
                      'text-amber-600': rep.complianceScore >= 50 && rep.complianceScore < 80,
                      'text-rose-600': rep.complianceScore < 50
                    }">{{ rep.complianceScore }}%</span>
                  </div>
                  <span class="text-[10px] font-medium text-slate-400">{{ rep.completeItems }}/{{ rep.totalItems }} conformes</span>
                </div>

                <!-- Total Items -->
                <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Itens</span>
                  <div class="text-xl font-black text-slate-900 mt-1">{{ rep.totalItems }}</div>
                  <span class="text-[10px] font-medium text-rose-500 font-bold" *ngIf="rep.incompleteItems > 0">
                    {{ rep.incompleteItems }} pendentes
                  </span>
                  <span class="text-[10px] font-medium text-emerald-600 font-bold" *ngIf="rep.incompleteItems === 0">
                    100% OK
                  </span>
                </div>

                <!-- Épicos -->
                <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Épicos</span>
                  <div class="text-xl font-black text-purple-900 mt-1">{{ rep.summary.epics.total }}</div>
                  <span class="text-[10px] text-slate-500">
                    {{ rep.summary.epics.complete }}/{{ rep.summary.epics.total }} conformes
                  </span>
                </div>

                <!-- Features -->
                <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Features</span>
                  <div class="text-xl font-black text-indigo-900 mt-1">{{ rep.summary.features.total }}</div>
                  <span class="text-[10px] text-slate-500">
                    {{ rep.summary.features.complete }}/{{ rep.summary.features.total }} conformes
                  </span>
                </div>

                <!-- US / PBI -->
                <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Histórias / PBI</span>
                  <div class="text-xl font-black text-blue-900 mt-1">{{ rep.summary.stories.total }}</div>
                  <span class="text-[10px] text-slate-500">
                    {{ rep.summary.stories.complete }}/{{ rep.summary.stories.total }} conformes
                  </span>
                </div>

                <!-- Tasks / Bugs -->
                <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Tarefas / Bugs</span>
                  <div class="text-xl font-black text-slate-900 mt-1">{{ rep.summary.tasks.total }}</div>
                  <span class="text-[10px] text-slate-500">
                    {{ rep.summary.tasks.complete }}/{{ rep.summary.tasks.total }} conformes
                  </span>
                </div>
              </div>

              <!-- Filter Bar & Search -->
              <div class="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
                <!-- Search input -->
                <div class="relative w-full sm:w-72">
                  <input
                    type="text"
                    [ngModel]="auditSearch()"
                    (ngModelChange)="auditSearch.set($event)"
                    placeholder="Buscar por ID, título ou responsável..."
                    class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                  <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                </div>

                <!-- Category Tabs -->
                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    (click)="auditFilter.set('Todos')"
                    [class]="auditFilter() === 'Todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer">
                    Todos ({{ rep.totalItems }})
                  </button>
                  <button
                    (click)="auditFilter.set('Épico')"
                    [class]="auditFilter() === 'Épico' ? 'bg-purple-600 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer">
                    Épicos ({{ rep.summary.epics.total }})
                  </button>
                  <button
                    (click)="auditFilter.set('Feature')"
                    [class]="auditFilter() === 'Feature' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer">
                    Features ({{ rep.summary.features.total }})
                  </button>
                  <button
                    (click)="auditFilter.set('US / PBI')"
                    [class]="auditFilter() === 'US / PBI' ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer">
                    Histórias ({{ rep.summary.stories.total }})
                  </button>
                  <button
                    (click)="auditFilter.set('Task / Bug')"
                    [class]="auditFilter() === 'Task / Bug' ? 'bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer">
                    Tarefas / Bugs ({{ rep.summary.tasks.total }})
                  </button>
                  <button
                    (click)="auditFilter.set('incompletos')"
                    [class]="auditFilter() === 'incompletos' ? 'bg-rose-600 text-white' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer">
                    <span>⚠️ Incompletos</span>
                    <span>({{ rep.incompleteItems }})</span>
                  </button>
                </div>
              </div>

              <!-- List / Table of items -->
              <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-100/50">
                <div *ngIf="filteredAuditItems().length === 0" class="text-center py-12 text-slate-400 text-xs">
                  Nenhum item corresponde ao filtro ou busca selecionada.
                </div>

                <div
                  *ngFor="let item of filteredAuditItems()"
                  class="bg-white rounded-2xl border p-3.5 transition shadow-2xs hover:shadow-xs"
                  [ngClass]="item.isComplete ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'">
                  
                  <!-- Top Row: ID, Category/Type, State, and Diagnosis Badge -->
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        #{{ item.id }}
                      </span>

                      <!-- Category Tag -->
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [ngClass]="{
                        'bg-purple-100 text-purple-800': item.category === 'Épico',
                        'bg-indigo-100 text-indigo-800': item.category === 'Feature',
                        'bg-blue-100 text-blue-800': item.category === 'US / PBI',
                        'bg-slate-100 text-slate-700': item.category === 'Task / Bug'
                      }">
                        {{ item.category }}
                      </span>

                      <!-- Work Item Type Tag -->
                      <span class="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {{ item.type }}
                      </span>

                      <!-- State Badge -->
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded" [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200': item.state === 'Done' || item.state === 'Closed' || item.state === 'Completed',
                        'bg-blue-50 text-blue-700 border border-blue-200': item.state === 'Active' || item.state === 'In Progress' || item.state === 'Doing',
                        'bg-slate-100 text-slate-600': item.state === 'New' || item.state === 'To Do' || item.state === 'Proposed'
                      }">
                        {{ item.state }}
                      </span>
                    </div>

                    <!-- Diagnosis Badge -->
                    <div>
                      <span *ngIf="item.isComplete" class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <span>✅</span>
                        <span>Preenchido adequadamente</span>
                      </span>
                      <span *ngIf="!item.isComplete" class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Pendente: {{ item.missingFields.join(', ') }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Title -->
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 mb-2">
                    {{ item.title }}
                  </h4>

                  <!-- Attributes Grid -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-slate-100">
                    <!-- Dates -->
                    <div class="flex items-center gap-1.5" [ngClass]="!item.startDate ? 'text-amber-700 font-bold' : 'text-slate-600'">
                      <span>📅 Início:</span>
                      <span>{{ formatAuditDate(item.startDate) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5" [ngClass]="!item.targetDate ? 'text-amber-700 font-bold' : 'text-slate-600'">
                      <span>🎯 Fim:</span>
                      <span>{{ formatAuditDate(item.targetDate) }}</span>
                    </div>

                    <!-- Assigned To -->
                    <div class="flex items-center gap-1.5 truncate" [ngClass]="!item.assignedTo ? 'text-amber-700 font-bold' : 'text-slate-600'" title="{{ item.assignedTo || 'Não atribuído' }}">
                      <span>👤 Responsável:</span>
                      <span class="truncate">{{ item.assignedTo || 'Não atribuído' }}</span>
                    </div>

                    <!-- Hours (for tasks/bugs or any item with hours) -->
                    <div class="flex items-center gap-1.5" [ngClass]="item.category === 'Task / Bug' && (item.originalEstimate === null || item.originalEstimate === 0) ? 'text-amber-700 font-bold' : 'text-slate-600'">
                      <span>⏱️ Horas:</span>
                      <span>
                        Plan: <strong>{{ formatHours(item.originalEstimate) }}h</strong> |
                        Exec: <strong>{{ formatHours(item.completedWork) }}h</strong>
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
                  (click)="closeAzureAuditModal()"
                  class="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer">
                  Fechar Extrato
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class CuratorModalComponent implements OnInit {
  service = inject(ProjectService);

  authError = signal<string | null>(null);
  savingId = signal<string | null>(null);
  activeTab = signal<'projects' | 'new-project' | 'custom-links' | 'weekly-report' | 'clients' | 'azure' | 'access'>('projects');

  // Weekly report curator state
  isGeneratingReport = signal<boolean>(false);
  editableReport = signal<WeeklyReport | null>(null);

  // Master-Detail selection & filters
  selectedProjectId = signal<string | null>(null);
  projectSearch = signal<string>('');

  // Dropdown checkbox filters for Projects & EAP tab
  isFilterDropdownOpen = signal<boolean>(false);
  filterVisibilities = signal<string[]>([]); // 'visivel', 'oculto'
  filterOrigins = signal<string[]>([]); // 'azure', 'manual'
  filterClients = signal<string[]>([]); // client names
  filterStatuses = signal<string[]>([]); // 'Ativo', 'Finalizado', 'Congelado'
  filterOnlyAlerts = signal<boolean>(false);

  // Weekly report tab filters
  weeklyOriginFilter = signal<'Todos' | 'Manual' | 'Azure' | 'Sustentacao'>('Todos');

  // Custom links state
  customLinkSearch = signal<string>('');
  selectedCustomProjectIds = signal<string[]>([]);
  copyLinkFeedback = signal<boolean>(false);

  // Azure DevOps Audit state
  showAuditModal = signal<boolean>(false);
  isLoadingAudit = signal<boolean>(false);
  auditReport = signal<AzureAuditReport | null>(null);
  auditFilter = signal<'Todos' | 'Épico' | 'Feature' | 'US / PBI' | 'Task / Bug' | 'incompletos'>('Todos');
  auditSearch = signal<string>('');

  // Azure & PAT states
  isTestingAzure = signal<boolean>(false);
  azureTestResult = signal<{ success: boolean; message: string } | null>(null);
  newPatInput = signal<string>('');
  isUpdatingPat = signal<boolean>(false);
  patUpdateSuccess = signal<boolean>(false);
  copiedSlug = signal<string | null>(null);

  customSystemInput = signal<string>('');

  officialSystems = [
    { id: 'Portal Integrator', name: 'Portal Integrator', subtitle: 'Web / B2B' },
    { id: 'App Smart Tracking', name: 'App Smart Tracking', subtitle: 'Mobile Motoristas / Operacional' },
    { id: 'Smart X', name: 'Smart X', subtitle: 'Formulários' },
    { id: 'App ILC', name: 'App ILC', subtitle: 'Mobile / Rastreamento de Cargas' }
  ];

  priorityOptions = [
    {
      id: 'P1' as ProjectPriority,
      label: 'P1 - Crítica / Estratégica',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      desc: 'Impacto direto em receita, conformidade legal/regulatória urgente ou risco de paralisação de operações críticas.'
    },
    {
      id: 'P2' as ProjectPriority,
      label: 'P2 - Alta',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      desc: 'Iniciativas estratégicas prioritárias, com prazos acordados rígidos e alto valor agregado para o negócio/cliente.'
    },
    {
      id: 'P3' as ProjectPriority,
      label: 'P3 - Média',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      desc: 'Evoluções funcionais programadas, melhorias de processos internos e automações com prazo moderado de entrega.'
    },
    {
      id: 'P4' as ProjectPriority,
      label: 'P4 - Baixa / Desejável',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      desc: 'Ajustes cosméticos, melhorias secundárias, débitos técnicos de baixo impacto ou tarefas sob demanda.'
    }
  ];

  roadmapStageOptions: string[] = [
    'Prospecção',
    'Ideação',
    'Proposta',
    'Negociação',
    'Discovery',
    'Viabilidade',
    'Arquitetura',
    'Escopo',
    'Budget',
    'Contrato',
    'Priorização',
    'Kick-off',
    'Espera',
    'Cancelado'
  ];

  strategicValueOptions: string[] = [
    'Muito Alto',
    'Alto',
    'Médio',
    'Baixo',
    'Estratégico',
    'Crítico'
  ];

  newProjData = {
    name: '',
    client: 'John Deere',
    startDate: '2026-08-01',
    endDate: '2027-01-31',
    agreedHours: 200,
    plannedHours: 200,
    ilcPlanned: 200,
    clientPlanned: 0,
    executiveSummary: '',
    priority: 'P2' as ProjectPriority,
    systems: [] as string[],
    teamLeader: '',
    teamMembers: ''
  };

  ngOnInit() {
    this.autoSelectFirstProject();
  }

  autoSelectFirstProject() {
    const list = this.service.adminProjects();
    if (list.length > 0 && !this.selectedProjectId()) {
      this.selectedProjectId.set(list[0].id);
    }
  }

  isManualProject(p: any): boolean {
    if (!p) return false;
    return !!(p.isManual || (p.id && String(p.id).startsWith('manual-')) || (p.projectId && String(p.projectId).startsWith('manual-')));
  }

  isAzureProject(p: any): boolean {
    return !this.isManualProject(p);
  }

  getVisibilityCount(type: 'Todos' | 'Visiveis' | 'Ocultos'): number {
    const list = this.service.adminProjects();
    if (type === 'Todos') return list.length;
    if (type === 'Visiveis') return list.filter(p => p.isVisible).length;
    return list.filter(p => !p.isVisible).length;
  }

  getOriginCount(type: 'Todos' | 'Manual' | 'Azure'): number {
    const list = this.service.adminProjects();
    if (type === 'Todos') return list.length;
    if (type === 'Manual') return list.filter(p => this.isManualProject(p)).length;
    return list.filter(p => this.isAzureProject(p)).length;
  }

  getWeeklyOriginCount(type: 'Todos' | 'Manual' | 'Azure' | 'Sustentacao'): number {
    const list = this.editableReport()?.activeProjects || [];
    const maintList = this.editableReport()?.maintenanceSection?.projects || [];
    if (type === 'Sustentacao') return maintList.length;
    if (type === 'Todos') return list.length + maintList.length;
    if (type === 'Manual') return list.filter(p => this.isManualProject(p)).length;
    return list.filter(p => this.isAzureProject(p)).length;
  }

  getStatusCount(status: string): number {
    return this.service.adminProjects().filter(p => p.status === status).length;
  }

  getAlertsCount(): number {
    return this.service.adminProjects().filter(p => p.inconsistencies && p.inconsistencies.length > 0).length;
  }

  activeFiltersCount = computed(() => {
    let count = 0;
    count += this.filterVisibilities().length;
    count += this.filterOrigins().length;
    count += this.filterClients().length;
    count += this.filterStatuses().length;
    if (this.filterOnlyAlerts()) count += 1;
    return count;
  });

  availableClientsWithCount = computed(() => {
    const list = this.service.adminProjects();
    const map = new Map<string, number>();
    for (const p of list) {
      const c = p.client || 'Sem cliente';
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  toggleFilter(listSignal: any, value: string) {
    const current = listSignal();
    if (current.includes(value)) {
      listSignal.set(current.filter((x: string) => x !== value));
    } else {
      listSignal.set([...current, value]);
    }
    this.selectFirstIfCurrentNotVisible();
  }

  clearAllFilters() {
    this.filterVisibilities.set([]);
    this.filterOrigins.set([]);
    this.filterClients.set([]);
    this.filterStatuses.set([]);
    this.filterOnlyAlerts.set(false);
    this.projectSearch.set('');
    this.selectFirstIfCurrentNotVisible();
  }

  selectFirstIfCurrentNotVisible() {
    setTimeout(() => {
      const filtered = this.filteredAdminProjects();
      if (filtered.length > 0 && !filtered.some(p => p.id === this.selectedProjectId())) {
        this.selectedProjectId.set(filtered[0].id);
      }
    }, 0);
  }

  // Filtered project list for the left column
  filteredAdminProjects = computed(() => {
    let list = this.service.adminProjects();
    const query = this.projectSearch().toLowerCase().trim();
    const visibilities = this.filterVisibilities();
    const origins = this.filterOrigins();
    const clients = this.filterClients();
    const statuses = this.filterStatuses();
    const alertOnly = this.filterOnlyAlerts();

    return list
      .filter(p => {
        // 1. Visibilidade (se selecionado 'visivel' e/ou 'oculto')
        if (visibilities.length > 0) {
          const isVis = !!p.isVisible;
          const matchVis = visibilities.includes('visivel') && isVis;
          const matchHidden = visibilities.includes('oculto') && !isVis;
          if (!matchVis && !matchHidden) return false;
        }

        // 2. Origem (se selecionado 'azure' e/ou 'manual')
        if (origins.length > 0) {
          const isManual = this.isManualProject(p);
          const isAzure = this.isAzureProject(p);
          const matchManual = origins.includes('manual') && isManual;
          const matchAzure = origins.includes('azure') && isAzure;
          if (!matchManual && !matchAzure) return false;
        }

        // 3. Clientes
        if (clients.length > 0) {
          if (!clients.some(c => c.toLowerCase() === (p.client || '').toLowerCase())) {
            return false;
          }
        }

        // 4. Status
        if (statuses.length > 0) {
          if (!statuses.includes(p.status)) {
            return false;
          }
        }

        // 5. Inconsistências / Alertas
        if (alertOnly && (!p.inconsistencies || p.inconsistencies.length === 0)) {
          return false;
        }

        // 6. Busca textual por nome, cliente ou resumo
        if (query) {
          const inName = (p.name || '').toLowerCase().includes(query);
          const inClient = (p.client || '').toLowerCase().includes(query);
          const inSummary = (p.executiveSummary || '').toLowerCase().includes(query);
          if (!inName && !inClient && !inSummary) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const clientDiff = (a.client || '').localeCompare(b.client || '', 'pt-BR', { sensitivity: 'base' });
        if (clientDiff !== 0) return clientDiff;
        return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
      });
  });

  // Filtered active projects for Weekly Report tab
  filteredWeeklyActiveProjects = computed(() => {
    const list = this.editableReport()?.activeProjects || [];
    const origin = this.weeklyOriginFilter();
    if (origin === 'Sustentacao') return [];
    if (origin === 'Manual') return list.filter(p => this.isManualProject(p));
    if (origin === 'Azure') return list.filter(p => this.isAzureProject(p));
    return list;
  });

  // Maintenance (Sustentação) projects for Weekly Report tab
  weeklyMaintenanceProjects = computed(() => {
    return this.editableReport()?.maintenanceSection?.projects || [];
  });

  // Active project for the right detail editor
  activeProject = computed(() => {
    const selId = this.selectedProjectId();
    const list = this.service.adminProjects();
    if (selId) {
      const found = list.find(p => p.id === selId);
      if (found) return found;
    }
    return list[0] || null;
  });

  // Filtered projects for Custom Link Generator
  filteredCustomLinkProjects = computed(() => {
    const query = this.customLinkSearch().toLowerCase().trim();
    const all = this.service.adminProjects();
    const list = !query ? all : all.filter(p => p.name.toLowerCase().includes(query) || p.client.toLowerCase().includes(query));
    return list.slice().sort((a, b) => {
      const clientDiff = (a.client || '').localeCompare(b.client || '', 'pt-BR', { sensitivity: 'base' });
      if (clientDiff !== 0) return clientDiff;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    });
  });

  // Generated URL for Custom View
  generatedCustomLink = computed(() => {
    const ids = this.selectedCustomProjectIds();
    if (ids.length === 0) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?projects=${ids.join(',')}`;
  });

  // Filtered Azure Audit items
  filteredAuditItems = computed(() => {
    const rep = this.auditReport();
    if (!rep || !rep.items) return [];

    const filter = this.auditFilter();
    const search = this.auditSearch().toLowerCase().trim();

    return rep.items.filter(item => {
      // Category filter
      if (filter === 'incompletos') {
        if (item.isComplete) return false;
      } else if (filter !== 'Todos') {
        if (item.category !== filter) return false;
      }

      // Search filter
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

  async handleLogin() {
    this.authError.set(null);
    try {
      await this.service.loadAdminData();
      await this.service.loadAzureStatus();
      this.autoSelectFirstProject();
    } catch (err: any) {
      this.authError.set('PIN incorreto. Tente novamente.');
    }
  }

  async onOpenAzureTab() {
    this.activeTab.set('azure');
    await this.service.loadAzureStatus();
  }

  isFieldLocked(p: Project, field: 'ilcHours' | 'progress' | 'dates'): boolean {
    if (p.isManual) return false;
    if (!p.lockedFields) return true;
    return p.lockedFields[field] !== false;
  }

  toggleFieldLock(p: Project, field: 'ilcHours' | 'progress' | 'dates') {
    if (!p.lockedFields) {
      p.lockedFields = { ilcHours: true, progress: true, dates: true };
    }
    const nextVal = !p.lockedFields[field];
    p.lockedFields.ilcHours = nextVal;
    p.lockedFields.progress = nextVal;
    p.lockedFields.dates = nextVal;
  }

  async handleRestoreAzure(p: Project) {
    if (confirm('Deseja restaurar os valores originais sincronizados do Azure DevOps? Os dados manuais de horas e progresso serão revertidos.')) {
      this.savingId.set(p.id);
      try {
        await this.service.updateProject(p.id, {
          restoreAzureValues: true
        } as any);
      } finally {
        this.savingId.set(null);
      }
    }
  }

  addEmptyActivity(p: Project) {
    if (!p.activities) p.activities = [];
    const todayIso = new Date().toISOString().split('T')[0];
    const targetIso = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    p.activities.push({
      id: 'manual-act-' + Date.now(),
      title: 'Nova Entrega na EAP',
      type: 'Feature',
      eapPhase: 'Desenvolvimento',
      month: 'OUT / 26',
      startDate: todayIso,
      targetDate: targetIso,
      dateStr: new Date().toLocaleDateString('pt-BR'),
      ilcHours: 0,
      ilcHoursTotal: 40,
      clientHours: 0,
      status: 'planned'
    });
  }

  removeActivity(p: Project, index: number) {
    if (p.activities) {
      p.activities.splice(index, 1);
    }
  }

  toggleVisibility(p: Project, ev: Event) {
    const target = ev.target as HTMLInputElement;
    p.isVisible = target.checked;
    this.saveProject(p);
  }

  hasSystem(p: Project, name: string): boolean {
    return p.systems ? p.systems.includes(name) : false;
  }

  toggleSystem(p: Project, name: string) {
    if (!p.systems) p.systems = [];
    const idx = p.systems.indexOf(name);
    if (idx > -1) {
      p.systems.splice(idx, 1);
    } else {
      p.systems.push(name);
    }
  }

  addCustomSystem(p: Project) {
    const val = this.customSystemInput().trim();
    if (!val) return;
    if (!p.systems) p.systems = [];
    if (!p.systems.includes(val)) {
      p.systems.push(val);
    }
    this.customSystemInput.set('');
  }

  removeSystem(p: Project, name: string) {
    if (!p.systems) return;
    const idx = p.systems.indexOf(name);
    if (idx > -1) {
      p.systems.splice(idx, 1);
    }
  }

  getCustomSystems(p: Project): string[] {
    if (!p.systems) return [];
    const officialNames = this.officialSystems.map(s => s.name);
    return p.systems.filter(s => !officialNames.includes(s));
  }

  setLeader(p: Project, val: string) {
    if (!p.team) p.team = {};
    p.team.leader = val;
  }

  getTeamMembersString(p: Project): string {
    return p.team?.members?.join(', ') || '';
  }

  setTeamMembersFromString(p: Project, val: string) {
    if (!p.team) p.team = {};
    p.team.members = val.split(',').map(s => s.trim()).filter(Boolean);
  }

  async saveProject(p: Project) {
    this.savingId.set(p.id);
    try {
      if (p.hours) {
        if (p.hours.agreed !== undefined) {
          p.hours.agreed = Math.round((Number(p.hours.agreed) || 0) * 10) / 10;
          p.hours.agreedHours = p.hours.agreed;
          p.agreedHours = p.hours.agreed;
        }
        if (p.hours.totalPlanned !== undefined) {
          p.hours.totalPlanned = Math.round((Number(p.hours.totalPlanned) || 0) * 10) / 10;
        }
        if (p.hours.totalExecuted !== undefined) {
          p.hours.totalExecuted = Math.round((Number(p.hours.totalExecuted) || 0) * 10) / 10;
        }
      }
      if (p.activities) {
        p.activities.forEach(a => {
          if (a.ilcHours !== undefined) a.ilcHours = Math.round((Number(a.ilcHours) || 0) * 10) / 10;
          if (a.ilcHoursTotal !== undefined) a.ilcHoursTotal = Math.round((Number(a.ilcHoursTotal) || 0) * 10) / 10;
        });
      }
      await this.service.updateProject(p.id, {
        name: p.name,
        description: p.description,
        client: p.client,
        category: p.category || 'new_project',
        status: p.status,
        isVisible: p.isVisible,
        currentMilestone: p.currentMilestone,
        progress: p.progress,
        manualRagStatus: p.manualRagStatus,
        agreedDates: p.agreedDates,
        plannedDates: p.plannedDates,
        agreedHours: p.hours?.agreed,
        hours: p.hours,
        activities: p.activities,
        lockedFields: p.lockedFields,
        priority: p.priority || 'P2',
        systems: p.systems || [],
        team: p.team || { leader: '', members: [] }
      });
      const currentRep = this.service.currentWeeklyReport();
      if (currentRep && this.editableReport()) {
        this.editableReport.set(JSON.parse(JSON.stringify(currentRep)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.savingId.set(null);
    }
  }

  async handleDeleteProject(p: Project) {
    if (confirm(`Tem certeza que deseja excluir o projeto manual "${p.name}"? Esta ação não pode ser desfeita.`)) {
      this.savingId.set(p.id);
      try {
        await this.service.deleteProject(p.id);
        this.selectedProjectId.set(null);
        this.autoSelectFirstProject();
      } catch (err) {
        console.error('Erro ao excluir projeto:', err);
      } finally {
        this.savingId.set(null);
      }
    }
  }

  toggleCustomProjectSelection(id: string) {
    const cur = this.selectedCustomProjectIds();
    if (cur.includes(id)) {
      this.selectedCustomProjectIds.set(cur.filter(x => x !== id));
    } else {
      this.selectedCustomProjectIds.set([...cur, id]);
    }
  }

  selectAllCustomLinkProjects() {
    const all = this.service.adminProjects().map(p => p.id);
    this.selectedCustomProjectIds.set(all);
  }

  clearAllCustomLinkProjects() {
    this.selectedCustomProjectIds.set([]);
  }

  selectOnlyActiveCustomLinkProjects() {
    const active = this.service.adminProjects()
      .filter(p => p.status === 'Ativo' || p.isVisible)
      .map(p => p.id);
    this.selectedCustomProjectIds.set(active);
  }

  copyGeneratedCustomLink() {
    const link = this.generatedCustomLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    this.copyLinkFeedback.set(true);
    setTimeout(() => this.copyLinkFeedback.set(false), 2500);
  }

  async handleCreateManualProject() {
    if (!this.newProjData.name) return;
    const agreedH = Number(this.newProjData.agreedHours) || Number(this.newProjData.plannedHours) || 200;
    const plannedH = Number(this.newProjData.plannedHours) || 200;
    const created = await this.service.createManualProject({
      name: this.newProjData.name,
      client: this.newProjData.client,
      category: 'new_project',
      executiveSummary: this.newProjData.executiveSummary || 'Projeto cadastrado manualmente.',
      agreedDates: {
        start: this.newProjData.startDate,
        end: this.newProjData.endDate
      },
      agreedHours: agreedH,
      hours: {
        agreed: agreedH,
        agreedHours: agreedH,
        planned: plannedH,
        executed: 0,
        ilcPlanned: plannedH,
        ilcExecuted: 0,
        clientPlanned: 0,
        clientExecuted: 0
      },
      priority: this.newProjData.priority || 'P2',
      systems: this.newProjData.systems || [],
      team: {
        leader: this.newProjData.teamLeader || '',
        members: this.newProjData.teamMembers ? this.newProjData.teamMembers.split(',').map(s => s.trim()).filter(Boolean) : []
      }
    });
    this.newProjData.name = '';
    this.newProjData.executiveSummary = '';
    this.newProjData.teamLeader = '';
    this.newProjData.teamMembers = '';
    this.newProjData.systems = [];
    this.newProjData.priority = 'P2';
    this.activeTab.set('projects');
    if (created?.id) {
      this.selectedProjectId.set(created.id);
    }
  }

  onLogoFileSelected(c: ClientConfig, ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await this.service.uploadClientLogo(c.slug, base64);
      c.logoUrl = `/assets/logos/${c.slug}.png?t=${Date.now()}`;
    };
    reader.readAsDataURL(file);
  }

  async handleSaveClient(c: ClientConfig) {
    await this.service.updateClient(c.slug, {
      logoUrl: c.logoUrl
    });
  }

  copyTokenLink(c: ClientConfig) {
    const url = `${window.location.origin}/cliente/${c.slug}?token=${c.token}`;
    navigator.clipboard.writeText(url);
    this.copiedSlug.set(c.slug);
    setTimeout(() => this.copiedSlug.set(null), 2500);
  }

  async handleTestAzure() {
    this.isTestingAzure.set(true);
    this.azureTestResult.set(null);
    try {
      const res = await this.service.testAzureConnection();
      if (res?.success) {
        this.azureTestResult.set({
          success: true,
          message: `Conexão validada! ${res.projectCount} projetos encontrados no Azure DevOps.`
        });
      } else {
        this.azureTestResult.set({
          success: false,
          message: `Falha na conexão: ${res?.error || 'Erro ao comunicar com a API do Azure.'}`
        });
      }
    } catch (err: any) {
      this.azureTestResult.set({ success: false, message: `Erro ao testar: ${err.message}` });
    } finally {
      this.isTestingAzure.set(false);
    }
  }

  async handleUpdatePat() {
    const pat = this.newPatInput().trim();
    if (!pat) return;
    this.isUpdatingPat.set(true);
    try {
      await this.service.updateAzurePat(pat);
      this.patUpdateSuccess.set(true);
      this.newPatInput.set('');
      setTimeout(() => this.patUpdateSuccess.set(false), 3000);
      await this.service.loadAzureStatus();
    } catch (err) {
      console.error(err);
    } finally {
      this.isUpdatingPat.set(false);
    }
  }

  formatHours(val?: number | null): string {
    return this.service.formatHours(val);
  }

  getInconsistencyLabel(inc: string): string {
    switch (inc) {
      case 'NO_AZURE_ITEMS': return 'Sem entregas';
      case 'NO_HOURS': return '0h';
      case 'NO_DATES': return 'Sem datas';
      case 'DELAYED_ITEMS': return 'Atraso';
      case 'NO_ACTIVITIES_WITH_DATES': return 'Itens s/ data';
      default: return inc;
    }
  }

  getInconsistencyDetail(inc: string): string {
    switch (inc) {
      case 'NO_AZURE_ITEMS': return 'Nenhum item de trabalho (Épico/Feature/Tarefa) localizado no Azure DevOps para este projeto.';
      case 'NO_HOURS': return 'Total de horas planejadas zerado (nenhuma estimativa informada nas tarefas).';
      case 'NO_DATES': return 'Datas de início ou término acordadas não foram definidas.';
      case 'DELAYED_ITEMS': return 'Existem entregas com data de término ultrapassada e não concluídas.';
      case 'NO_ACTIVITIES_WITH_DATES': return 'As entregas vinculadas não possuem datas de início ou término cadastradas.';
      default: return inc;
    }
  }

  async openAzureAuditModal(p: Project) {
    this.showAuditModal.set(true);
    this.isLoadingAudit.set(true);
    this.auditReport.set(null);
    this.auditFilter.set('Todos');
    this.auditSearch.set('');

    try {
      const rep = await this.service.getProjectAzureAudit(p.id);
      this.auditReport.set(rep);
    } catch (err) {
      console.error('Erro ao carregar extrato do Azure:', err);
    } finally {
      this.isLoadingAudit.set(false);
    }
  }

  closeAzureAuditModal() {
    this.showAuditModal.set(false);
    this.auditReport.set(null);
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

  onOpenWeeklyReportTab() {
    this.activeTab.set('weekly-report');
    this.service.loadWeeklyReports();
    const cur = this.service.currentWeeklyReport();
    if (cur) {
      this.editableReport.set(JSON.parse(JSON.stringify(cur)));
    } else {
      this.service.loadWeeklyReport('latest').then(() => {
        const loaded = this.service.currentWeeklyReport();
        if (loaded) this.editableReport.set(JSON.parse(JSON.stringify(loaded)));
      });
    }
  }

  async onSelectWeeklyReportToEdit(reportId: string) {
    await this.service.loadWeeklyReport(reportId);
    const loaded = this.service.currentWeeklyReport();
    if (loaded) {
      this.editableReport.set(JSON.parse(JSON.stringify(loaded)));
    }
  }

  async handleGenerateWeeklyReport() {
    this.isGeneratingReport.set(true);
    try {
      const currentDraft = this.editableReport();
      if (currentDraft) {
        await this.service.saveWeeklyReport(currentDraft);
      }
      const generated = await this.service.generateWeeklyReport();
      if (generated) {
        this.editableReport.set(JSON.parse(JSON.stringify(generated)));
        alert('Edição semanal gerada com sucesso a partir dos dados do Azure DevOps!');
      }
    } finally {
      this.isGeneratingReport.set(false);
    }
  }

  async handleSaveWeeklyReport() {
    const report = this.editableReport();
    if (!report) return;
    const ok = await this.service.saveWeeklyReport(report);
    if (ok) {
      const updated = this.service.currentWeeklyReport();
      if (updated) {
        this.editableReport.set(JSON.parse(JSON.stringify(updated)));
      }
      alert('Edição semanal salva e publicada com sucesso!');
    }
  }

  async handleDeleteWeeklyReport() {
    const report = this.editableReport();
    if (!report) return;
    const ok = await this.service.deleteWeeklyReport(report.id);
    if (ok) {
      const next = this.service.currentWeeklyReport();
      if (next) this.editableReport.set(JSON.parse(JSON.stringify(next)));
      else this.editableReport.set(null);
    }
  }

  addRoadmapItem() {
    const report = this.editableReport();
    if (!report) return;
    if (!report.roadmapProjects) report.roadmapProjects = [];
    report.roadmapProjects.push({
      id: 'road-' + Date.now(),
      name: 'Novo Projeto Estratégico',
      client: 'John Deere',
      estimatedStart: 'A definir',
      stage: 'Discovery',
      strategicValue: 'Alto',
      description: 'Descrição preliminar da oportunidade no radar.',
      responsible: 'Comercial & PMO'
    });
    this.editableReport.set({ ...report });
  }

  removeRoadmapItem(index: number) {
    const report = this.editableReport();
    if (!report || !report.roadmapProjects) return;
    report.roadmapProjects.splice(index, 1);
    this.editableReport.set({ ...report });
  }

  addDecisionItem() {
    const report = this.editableReport();
    if (!report) return;
    if (!report.boardDecisions) report.boardDecisions = [];
    report.boardDecisions.push({
      id: 'dec-' + Date.now(),
      title: 'Nova Deliberação de Diretoria',
      client: 'Geral',
      impact: 'Impacto nos prazos ou na alocação de recursos.',
      status: 'Aguardando Aval',
      deadline: 'Próxima Reunião'
    });
    this.editableReport.set({ ...report });
  }

  removeDecisionItem(index: number) {
    const report = this.editableReport();
    if (!report || !report.boardDecisions) return;
    report.boardDecisions.splice(index, 1);
    this.editableReport.set({ ...report });
  }

  async handlePublishOnline() {
    const res = await this.service.publishOnline();
    alert(res.message);
  }

  // --- ACCESS CONTROL CURATOR LOGIC ---
  accessData = signal<any | null>(null);
  isLoadingAccess = signal<boolean>(false);
  accessUserModalOpen = signal<boolean>(false);
  editingAccessUser = signal<any>({
    id: '',
    name: '',
    email: '',
    organization: '',
    clientFilter: 'Todos',
    accessPasscode: '',
    mustChangePassword: true,
    active: true
  });
  allowedDomainsText = signal<string>('');
  sendingInviteUserId = signal<string | null>(null);

  async onOpenAccessTab() {
    this.activeTab.set('access');
    await this.loadAccessConfig();
  }

  async loadAccessConfig() {
    this.isLoadingAccess.set(true);
    try {
      const data = await this.service.loadAdminAccessControl();
      if (data) {
        this.accessData.set(data);
        this.allowedDomainsText.set((data.allowedDomains || []).join(', '));
      }
    } finally {
      this.isLoadingAccess.set(false);
    }
  }

  async saveAccessSettings() {
    const data = this.accessData();
    if (!data) return;

    const domains = this.allowedDomainsText()
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(d => !!d);

    const ok = await this.service.updateAdminAccessSettings({
      requireAuthOnline: data.requireAuthOnline,
      allowedDomains: domains,
      microsoftClientId: data.microsoftClientId || '',
      microsoftTenantId: data.microsoftTenantId || '',
      smtp: data.smtp || {}
    });

    if (ok) {
      alert('Configurações de controle de acesso salvas com sucesso!');
      await this.loadAccessConfig();
    } else {
      alert('Erro ao salvar configurações de controle de acesso.');
    }
  }

  openNewAccessUserModal() {
    this.editingAccessUser.set({
      id: '',
      name: '',
      email: '',
      organization: '',
      clientFilter: 'Todos',
      accessPasscode: 'ILC@' + Math.floor(1000 + Math.random() * 9000),
      mustChangePassword: true,
      active: true
    });
    this.accessUserModalOpen.set(true);
  }

  openEditAccessUserModal(u: any) {
    this.editingAccessUser.set({
      id: u.id,
      name: u.name,
      email: u.email,
      organization: u.organization || '',
      clientFilter: u.clientFilter || 'Todos',
      accessPasscode: u.accessPasscode || '',
      mustChangePassword: u.mustChangePassword !== false,
      active: u.active !== false
    });
    this.accessUserModalOpen.set(true);
  }

  closeAccessUserModal() {
    this.accessUserModalOpen.set(false);
  }

  async saveAccessUser() {
    const u = this.editingAccessUser();
    if (!u.email || !u.email.includes('@')) {
      alert('Informe um e-mail válido.');
      return;
    }

    const ok = await this.service.upsertAdminAccessUser(u);
    if (ok) {
      this.closeAccessUserModal();
      await this.loadAccessConfig();
    } else {
      alert('Erro ao salvar usuário de acesso.');
    }
  }

  async deleteAccessUser(u: any) {
    if (!confirm(`Deseja realmente remover o acesso de ${u.name || u.email}?`)) return;
    const ok = await this.service.deleteAdminAccessUser(u.id);
    if (ok) {
      await this.loadAccessConfig();
    } else {
      alert('Erro ao excluir usuário.');
    }
  }

  async sendUserInvite(u: any) {
    this.sendingInviteUserId.set(u.id);
    try {
      const res = await this.service.sendAccessInvitationEmail(u.id);
      alert(res.message);
      if (res.success) {
        await this.loadAccessConfig();
      }
    } finally {
      this.sendingInviteUserId.set(null);
    }
  }
}

