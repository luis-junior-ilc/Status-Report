import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { MaintenancePeriod, MonthlyEffort, MemberEffort } from '../../models/maintenance.model';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-maintenance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 mb-12 animate-fade-in">
      
      <!-- TOP EXECUTIVE HEADER & FILTERS BAR -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <!-- Title & Description -->
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🛠️</span>
              <h2 class="text-xl font-black text-slate-900 tracking-tight">
                Painel de Sustentação
              </h2>
            </div>
          </div>

          <!-- Controls: Client Filter & Period Selector -->
          <div class="flex flex-wrap items-center gap-2.5">
            
            <!-- Client Selector -->
            <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span class="text-xs text-slate-400">🏢</span>
              <select
                [ngModel]="service.selectedClient()"
                (ngModelChange)="onClientChange($event)"
                class="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                <option value="Todos">Todos os Clientes</option>
                <option *ngFor="let c of service.clients()" [value]="c.name">{{ c.name }}</option>
              </select>
            </div>

            <!-- Period Selector Tabs -->
            <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                (click)="onPeriodChange('current_month')"
                [ngClass]="service.selectedMaintenancePeriod() === 'current_month' ? 'bg-white text-purple-700 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer">
                📅 Mês Atual
              </button>
              <button
                type="button"
                (click)="onPeriodChange('last_quarter')"
                [ngClass]="service.selectedMaintenancePeriod() === 'last_quarter' ? 'bg-white text-purple-700 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer">
                📊 Trimestre
              </button>
              <button
                type="button"
                (click)="onPeriodChange('year_2026')"
                [ngClass]="service.selectedMaintenancePeriod() === 'year_2026' ? 'bg-white text-purple-700 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer">
                📈 Ano 2026
              </button>
              <button
                type="button"
                (click)="onPeriodChange('all')"
                [ngClass]="service.selectedMaintenancePeriod() === 'all' ? 'bg-white text-purple-700 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer">
                🌐 Todo Período
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- LOADING STATE -->
      <div *ngIf="service.isLoadingMaintenance()" class="py-16 text-center bg-white rounded-2xl border border-slate-200">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
        <p class="mt-3 text-xs font-semibold text-slate-500">Calculando indicadores de sustentação e capacidade...</p>
      </div>

      <!-- MAIN METRICS CONTENT -->
      <ng-container *ngIf="!service.isLoadingMaintenance()">
        
        <!-- ROW 1: 4 TOP KPI CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- KPI 1: Horas em Sustentação -->
          <div class="bg-gradient-to-br from-purple-50 to-purple-100/60 p-4 rounded-2xl border border-purple-200 shadow-2xs relative overflow-hidden group">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛠️</span> Esforço em Sustentação
              </span>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                {{ metrics()?.maintenancePercent || 0 }}%
              </span>
            </div>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-3xl font-black text-purple-950">
                {{ formatHours(metrics()?.totalMaintenanceHours) }}
              </span>
              <span class="text-xs font-bold text-purple-800">horas</span>
            </div>
            <div class="mt-3">
              <div class="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
                <div class="bg-purple-600 h-1.5 rounded-full transition-all" [style.width.%]="metrics()?.maintenancePercent || 0"></div>
              </div>
              <p class="text-[10px] text-purple-800/80 font-medium mt-1">
                Dedicação voltada a suporte, estabilização e melhorias contínuas.
              </p>
            </div>
          </div>

          <!-- KPI 2: Novos Projetos -->
          <div class="bg-gradient-to-br from-blue-50 to-blue-100/60 p-4 rounded-2xl border border-blue-200 shadow-2xs relative overflow-hidden group">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🚀</span> Novos Projetos
              </span>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                {{ 100 - (metrics()?.maintenancePercent || 0) }}%
              </span>
            </div>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-3xl font-black text-blue-950">
                {{ formatHours(metrics()?.totalNewProjectHours) }}
              </span>
              <span class="text-xs font-bold text-blue-800">horas</span>
            </div>
            <div class="mt-3">
              <div class="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                <div class="bg-blue-600 h-1.5 rounded-full transition-all" [style.width.%]="100 - (metrics()?.maintenancePercent || 0)"></div>
              </div>
              <p class="text-[10px] text-blue-800/80 font-medium mt-1">
                Iniciativas de inovação, expansão de módulos e implantações.
              </p>
            </div>
          </div>

          <!-- KPI 3: Capacidade Total Executada -->
          <div class="bg-gradient-to-br from-slate-50 to-slate-100/80 p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️</span> Capacidade Computada
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                100%
              </span>
            </div>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-3xl font-black text-slate-900">
                {{ formatHours(metrics()?.totalCompanyHours) }}
              </span>
              <span class="text-xs font-bold text-slate-600">horas</span>
            </div>
            <p class="text-[10px] text-slate-500 font-medium mt-3.5">
              Soma total de horas apontadas na empresa no período selecionado.
            </p>
          </div>

          <!-- KPI 4: Sistemas em Sustentação & Equipe -->
          <div class="bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4 rounded-2xl border border-emerald-200 shadow-2xs relative overflow-hidden">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📂</span> Sistemas em Suporte
              </span>
            </div>
            <div class="flex items-baseline gap-1.5 mt-1">
              <span class="text-3xl font-black text-emerald-950">
                {{ metrics()?.activeMaintenanceProjects?.length || 0 }}
              </span>
              <span class="text-xs font-bold text-emerald-800">projetos ativos</span>
            </div>
            <div class="mt-3 flex items-center justify-between text-[10px] font-bold text-emerald-800">
              <span>👥 Integrantes com horas:</span>
              <strong class="text-emerald-950">{{ metrics()?.teamMembers?.length || 0 }} colaboradores</strong>
            </div>
          </div>

        </div>

        <!-- ROW 2: 2 ANALYTICAL CHARTS (SIDE BY SIDE) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- CHART 1: HISTÓRICO DE ESFORÇO MENSAL (NOVOS & SUSTENTAÇÃO) (COL-SPAN-7) -->
          <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-3">
                <div>
                  <h3 class="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>📈</span> Histórico de Esforço (2026)
                  </h3>
                </div>
                
                <!-- Controls: Series Filter & Mode Switcher (Aligned Side-by-Side) -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Series Filter (Ambos | Novos | Sustentação) -->
                  <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      (click)="monthlySeriesFilter.set('all')"
                      [ngClass]="monthlySeriesFilter() === 'all' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                      class="px-2.5 py-1 rounded-md text-[10px] transition cursor-pointer">
                      Ambos
                    </button>
                    <button
                      type="button"
                      (click)="monthlySeriesFilter.set('new_only')"
                      [ngClass]="monthlySeriesFilter() === 'new_only' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                      class="px-2.5 py-1 rounded-md text-[10px] transition cursor-pointer flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="monthlySeriesFilter() === 'new_only' ? 'bg-white' : 'bg-blue-600'"></span>
                      Novos
                    </button>
                    <button
                      type="button"
                      (click)="monthlySeriesFilter.set('maintenance_only')"
                      [ngClass]="monthlySeriesFilter() === 'maintenance_only' ? 'bg-purple-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                      class="px-2.5 py-1 rounded-md text-[10px] transition cursor-pointer flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="monthlySeriesFilter() === 'maintenance_only' ? 'bg-white' : 'bg-purple-600'"></span>
                      Sustentação
                    </button>
                  </div>

                  <!-- Mode Switcher (only when showing Ambos) -->
                  <div *ngIf="monthlySeriesFilter() === 'all'" class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      (click)="chartMode.set('grouped')"
                      [ngClass]="chartMode() === 'grouped' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                      class="px-2 py-0.5 rounded-md text-[10px] transition cursor-pointer"
                      title="Exibir barras lado a lado">
                      📊 Lado a Lado
                    </button>
                    <button
                      type="button"
                      (click)="chartMode.set('stacked')"
                      [ngClass]="chartMode() === 'stacked' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                      class="px-2 py-0.5 rounded-md text-[10px] transition cursor-pointer"
                      title="Exibir barras empilhadas">
                      📶 Empilhado
                    </button>
                  </div>
                </div>
              </div>

              <!-- SVG CHART CONTAINER -->
              <div class="relative w-full h-56 pt-2 select-none">
                <svg class="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="blueBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.95" />
                      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.8" />
                    </linearGradient>
                    <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#9333ea" stop-opacity="0.95" />
                      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.8" />
                    </linearGradient>
                  </defs>

                  <!-- Horizontal Grid lines -->
                  <line x1="30" y1="20" x2="585" y2="20" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="30" y1="65" x2="585" y2="65" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="30" y1="110" x2="585" y2="110" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="30" y1="155" x2="585" y2="155" stroke="#e2e8f0" stroke-width="1.5" />

                  <!-- Month Bars -->
                  <g *ngFor="let m of metrics()?.monthlyHistory || []; let idx = index">
                    <!-- Bar Group with Hover -->
                    <g class="cursor-pointer group" (mouseenter)="hoveredMonth.set(m)" (mouseleave)="hoveredMonth.set(null)">
                      
                      <!-- OPTION A: ALL (AMBOS) -->
                      <ng-container *ngIf="monthlySeriesFilter() === 'all'">
                        <!-- Grouped Mode -->
                        <g *ngIf="chartMode() === 'grouped'">
                          <rect
                            [attr.x]="36 + idx * 45"
                            [attr.y]="155 - getGroupedBarHeight(m.newProjectHours)"
                            width="16"
                            [attr.height]="getGroupedBarHeight(m.newProjectHours)"
                            rx="3"
                            fill="url(#blueBarGrad)"
                            class="transition-all duration-200 group-hover:brightness-110" />

                          <rect
                            [attr.x]="54 + idx * 45"
                            [attr.y]="155 - getGroupedBarHeight(m.maintenanceHours)"
                            width="16"
                            [attr.height]="getGroupedBarHeight(m.maintenanceHours)"
                            rx="3"
                            fill="url(#purpleBarGrad)"
                            class="transition-all duration-200 group-hover:brightness-110" />

                          <text
                            *ngIf="m.totalHours > 0"
                            [attr.x]="53 + idx * 45"
                            [attr.y]="getGroupedTopY(m)"
                            text-anchor="middle"
                            font-size="8.5"
                            font-weight="bold"
                            fill="#475569">
                            {{ formatHours(m.totalHours) }}h
                          </text>
                        </g>

                        <!-- Stacked Mode -->
                        <g *ngIf="chartMode() === 'stacked'">
                          <rect
                            [attr.x]="42 + idx * 45"
                            [attr.y]="155 - getStackedBarHeight(m.newProjectHours)"
                            width="24"
                            [attr.height]="getStackedBarHeight(m.newProjectHours)"
                            rx="3"
                            fill="url(#blueBarGrad)"
                            class="transition-all duration-200 group-hover:brightness-110" />

                          <rect
                            [attr.x]="42 + idx * 45"
                            [attr.y]="155 - getStackedBarHeight(m.newProjectHours) - getStackedBarHeight(m.maintenanceHours)"
                            width="24"
                            [attr.height]="getStackedBarHeight(m.maintenanceHours)"
                            rx="3"
                            fill="url(#purpleBarGrad)"
                            class="transition-all duration-200 group-hover:brightness-110" />

                          <text
                            *ngIf="m.totalHours > 0"
                            [attr.x]="54 + idx * 45"
                            [attr.y]="getStackedTopY(m)"
                            text-anchor="middle"
                            font-size="8.5"
                            font-weight="bold"
                            fill="#475569">
                            {{ formatHours(m.totalHours) }}h
                          </text>
                        </g>
                      </ng-container>

                      <!-- OPTION B: NEW PROJECTS ONLY (SÓ NOVOS) -->
                      <g *ngIf="monthlySeriesFilter() === 'new_only'">
                        <rect
                          [attr.x]="41 + idx * 45"
                          [attr.y]="155 - getSingleBarHeight(m.newProjectHours, maxNewMonthlyHours())"
                          width="26"
                          [attr.height]="getSingleBarHeight(m.newProjectHours, maxNewMonthlyHours())"
                          rx="4"
                          fill="url(#blueBarGrad)"
                          class="transition-all duration-200 group-hover:brightness-110" />

                        <text
                          *ngIf="m.newProjectHours > 0"
                          [attr.x]="54 + idx * 45"
                          [attr.y]="155 - getSingleBarHeight(m.newProjectHours, maxNewMonthlyHours()) - 5"
                          text-anchor="middle"
                          font-size="8.5"
                          font-weight="bold"
                          fill="#1d4ed8">
                          {{ formatHours(m.newProjectHours) }}h
                        </text>
                      </g>

                      <!-- OPTION C: MAINTENANCE ONLY (SÓ SUSTENTAÇÃO) -->
                      <g *ngIf="monthlySeriesFilter() === 'maintenance_only'">
                        <rect
                          [attr.x]="41 + idx * 45"
                          [attr.y]="155 - getSingleBarHeight(m.maintenanceHours, maxMaintenanceMonthlyHours())"
                          width="26"
                          [attr.height]="getSingleBarHeight(m.maintenanceHours, maxMaintenanceMonthlyHours())"
                          rx="4"
                          fill="url(#purpleBarGrad)"
                          class="transition-all duration-200 group-hover:brightness-110" />

                        <text
                          *ngIf="m.maintenanceHours > 0"
                          [attr.x]="54 + idx * 45"
                          [attr.y]="155 - getSingleBarHeight(m.maintenanceHours, maxMaintenanceMonthlyHours()) - 5"
                          text-anchor="middle"
                          font-size="8.5"
                          font-weight="bold"
                          fill="#7e22ce">
                          {{ formatHours(m.maintenanceHours) }}h
                        </text>
                      </g>

                      <!-- Month Label -->
                      <text
                        [attr.x]="53 + idx * 45"
                        y="175"
                        text-anchor="middle"
                        font-size="9.5"
                        font-weight="bold"
                        [attr.fill]="hoveredMonth()?.monthKey === m.monthKey ? '#4f46e5' : '#64748b'">
                        {{ m.label.split('/')[0] }}
                      </text>
                    </g>
                  </g>
                </svg>

                <!-- Floating Hover Tooltip -->
                <div
                  *ngIf="hoveredMonth() as hm"
                  class="absolute top-2 right-4 bg-slate-900/95 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700 pointer-events-none backdrop-blur-xs z-20">
                  <span class="font-extrabold text-purple-300 block mb-1">📅 {{ hm.label }}</span>
                  <div class="space-y-0.5 text-[11px]">
                    <div class="flex items-center justify-between gap-3 text-blue-200">
                      <span>Novos Projetos:</span>
                      <strong class="font-black">{{ formatHours(hm.newProjectHours) }}h</strong>
                    </div>
                    <div class="flex items-center justify-between gap-3 text-purple-200">
                      <span>Sustentação:</span>
                      <strong class="font-black">{{ formatHours(hm.maintenanceHours) }}h</strong>
                    </div>
                    <div class="flex items-center justify-between gap-3 text-slate-300 pt-1 border-t border-slate-700 mt-1">
                      <span>Total no Mês:</span>
                      <strong class="font-black">{{ formatHours(hm.totalHours) }}h ({{ hm.maintenancePercent }}% sustentação)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer summary -->
            <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
              <!-- If Ambos -->
              <ng-container *ngIf="monthlySeriesFilter() === 'all'">
                <div class="flex items-center gap-3">
                  <span>Média Novos: <strong class="text-blue-700">{{ formatHours(averageMonthlyNewProjectHours()) }}h/mês</strong></span>
                  <span>•</span>
                  <span>Média Sustentação: <strong class="text-purple-700">{{ formatHours(averageMonthlyMaintenanceHours()) }}h/mês</strong></span>
                </div>
                <span>Maior sustentação: <strong class="text-purple-700">{{ getPeakMaintenanceMonth() }}</strong></span>
              </ng-container>

              <!-- If Só Novos -->
              <ng-container *ngIf="monthlySeriesFilter() === 'new_only'">
                <span>Média Novos Projetos: <strong class="text-blue-700">{{ formatHours(averageMonthlyNewProjectHours()) }}h/mês</strong></span>
                <span>Mês de maior esforço: <strong class="text-blue-700">{{ getPeakNewProjectsMonth() }}</strong></span>
              </ng-container>

              <!-- If Só Sustentação -->
              <ng-container *ngIf="monthlySeriesFilter() === 'maintenance_only'">
                <span>Média Sustentação: <strong class="text-purple-700">{{ formatHours(averageMonthlyMaintenanceHours()) }}h/mês</strong></span>
                <span>Mês de maior esforço: <strong class="text-purple-700">{{ getPeakMaintenanceMonth() }}</strong></span>
              </ng-container>
            </div>
          </div>

          <!-- CHART 2: COMPARATIVO NOVOS PROJETOS VS. SUSTENTAÇÃO (COL-SPAN-5) -->
          <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 class="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>⚖️</span> Comparativo: Novos vs. Sustentação
                  </h3>
                </div>
              </div>

              <!-- DONUT CHART & GLOBAL PROPORTIONS -->
              <div class="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                
                <!-- SVG Donut Chart -->
                <div class="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
                    <!-- Background circle -->
                    <circle cx="70" cy="70" r="54" stroke="#e2e8f0" stroke-width="16" fill="transparent" />
                    <!-- Blue circle (New Projects) -->
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      stroke="#3b82f6"
                      stroke-width="16"
                      fill="transparent"
                      [attr.stroke-dasharray]="getNewProjectsDasharray()"
                      [attr.stroke-dashoffset]="getNewProjectsDashoffset()"
                      class="transition-all duration-500" />
                    <!-- Purple circle (Maintenance) -->
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      stroke="#9333ea"
                      stroke-width="16"
                      fill="transparent"
                      [attr.stroke-dasharray]="getMaintenanceDasharray()"
                      [attr.stroke-dashoffset]="getMaintenanceDashoffset()"
                      class="transition-all duration-500" />
                  </svg>
                  <!-- Center text -->
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span class="text-xl font-black text-slate-900 leading-none">
                      {{ metrics()?.maintenancePercent || 0 }}%
                    </span>
                    <span class="text-[9px] font-extrabold uppercase text-purple-700 tracking-wider mt-0.5">
                      Sustentação
                    </span>
                  </div>
                </div>

                <!-- Legend & Detailed Breakdown -->
                <div class="space-y-3 w-full max-w-[200px]">
                  
                  <div class="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                    <div class="flex items-center justify-between text-xs font-bold text-blue-900 mb-0.5">
                      <span class="flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Novos Projetos
                      </span>
                      <span>{{ 100 - (metrics()?.maintenancePercent || 0) }}%</span>
                    </div>
                    <span class="text-sm font-black text-blue-950 block">
                      {{ formatHours(metrics()?.totalNewProjectHours) }}h
                    </span>
                  </div>

                  <div class="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
                    <div class="flex items-center justify-between text-xs font-bold text-purple-900 mb-0.5">
                      <span class="flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Sustentação
                      </span>
                      <span>{{ metrics()?.maintenancePercent || 0 }}%</span>
                    </div>
                    <span class="text-sm font-black text-purple-950 block">
                      {{ formatHours(metrics()?.totalMaintenanceHours) }}h
                    </span>
                  </div>

                </div>

              </div>

            </div>

            <p class="text-[10px] text-slate-400 font-medium text-center pt-3 border-t border-slate-100 mt-3">
              Proporção calculada sobre tarefas e entregas sincronizadas do Azure DevOps e projetos manuais.
            </p>
          </div>

        </div>

        <!-- ROW 3: LISTA DE SISTEMAS / PROJETOS CADASTRADOS EM SUSTENTAÇÃO -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div class="flex items-center gap-2">
              <span class="text-xl">🛠️</span>
              <h3 class="text-base font-black text-slate-900 tracking-tight">
                Projetos de Sustentação
              </h3>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                {{ visibleMaintenanceProjects().length }} cadastrados
              </span>
            </div>
          </div>

          <!-- Project Cards Grid -->
          <div *ngIf="visibleMaintenanceProjects().length > 0; else noMaintenanceProjects"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div
              *ngFor="let p of visibleMaintenanceProjects()"
              class="p-4 rounded-2xl border border-purple-200 bg-purple-50/20 hover:bg-purple-50/40 hover:border-purple-300 transition flex flex-col justify-between shadow-2xs">
              
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                    {{ p.client }}
                  </span>
                  <div class="flex items-center gap-1.5">
                    <span
                      class="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                      [ngClass]="p.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'">
                      {{ p.status }}
                    </span>
                    <span
                      class="text-[10px] font-black px-2 py-0.5 rounded-full"
                      [ngClass]="p.ragStatus === 'red' ? 'bg-rose-100 text-rose-800' : (p.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')">
                      {{ getRagLabel(p.ragStatus) }}
                    </span>
                  </div>
                </div>

                <h4 class="text-sm font-black text-slate-900 leading-snug mb-1">
                  {{ p.name }}
                </h4>
                <p class="text-xs text-slate-500 line-clamp-2 mb-3">
                  {{ p.description || p.executiveSummary || 'Sustentação contínua da aplicação.' }}
                </p>

                <!-- Metrics bar -->
                <div class="grid grid-cols-2 gap-2 p-2 rounded-xl bg-white border border-slate-200 text-center mb-3">
                  <div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Horas Totais</span>
                    <span class="text-xs font-black text-slate-900">{{ formatHours(p.hours?.totalExecuted) }}h</span>
                  </div>
                  <div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Entregas/Tarefas</span>
                    <span class="text-xs font-black text-purple-700">{{ (p.activities?.length || 0) }} registradas</span>
                  </div>
                </div>
              </div>

              <!-- Card Bottom: Team -->
              <div class="pt-2 border-t border-slate-200/80 flex items-center text-xs">
                <span class="text-[10px] text-slate-500 truncate" [title]="service.getTeamTooltip(p)">
                  👥 {{ p.team?.leader || (p.team?.members?.join(', ') || 'Equipe ILC') }}
                </span>
              </div>

            </div>

          </div>

          <!-- Empty State: Inform how to categorize as Sustentação in Curadoria -->
          <ng-template #noMaintenanceProjects>
            <div class="py-10 px-6 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/30 text-center max-w-xl mx-auto my-4">
              <span class="text-3xl mb-2 block">🛠️</span>
              <h4 class="text-sm font-extrabold text-slate-800 mb-1">
                Nenhum projeto classificado como Sustentação no momento
              </h4>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">
                Todos os projetos estão classificados como <strong>🚀 Novos Projetos</strong>.
                Para marcar um projeto como Sustentação, abra a <strong>Curadoria</strong>, selecione o projeto e altere o botão <strong>Natureza do Projeto</strong> para <strong>🛠️ Sustentação</strong>.
              </p>
              <button
                type="button"
                (click)="service.isAdminOpen.set(true)"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5">
                <span>✍️ Abrir Curadoria para Classificar</span>
              </button>
            </div>
          </ng-template>

        </div>

      </ng-container>

    </div>
  `
})
export class MaintenanceDashboardComponent implements OnInit {
  service = inject(ProjectService);

  hoveredMonth = signal<MonthlyEffort | null>(null);

  metrics = computed(() => this.service.maintenanceMetrics());

  visibleMaintenanceProjects = computed<Project[]>(() => {
    return (this.metrics()?.activeMaintenanceProjects || []).filter(
      p => p.isVisible !== false && p.status !== 'Congelado'
    );
  });

  ngOnInit() {
    this.refreshData();
  }

  async refreshData() {
    await this.service.loadMaintenanceMetrics(
      this.service.selectedClient(),
      this.service.selectedMaintenancePeriod()
    );
  }

  onPeriodChange(p: MaintenancePeriod) {
    this.service.selectedMaintenancePeriod.set(p);
    this.refreshData();
  }

  onClientChange(clientName: string) {
    this.service.selectedClient.set(clientName);
    this.refreshData();
  }

  formatHours(val?: number | null): string {
    return this.service.formatHours(val);
  }

  getRagLabel(rag?: string): string {
    if (rag === 'green') return 'No Prazo';
    if (rag === 'amber') return 'Atenção';
    if (rag === 'red') return 'Desvio';
    return 'No Prazo';
  }

  // Monthly Chart Calculations
  monthlySeriesFilter = signal<'all' | 'new_only' | 'maintenance_only'>('all');
  chartMode = signal<'grouped' | 'stacked'>('grouped');

  maxGroupedMonthlyHours = computed(() => {
    const history = this.metrics()?.monthlyHistory || [];
    let max = 50;
    for (const m of history) {
      if ((m.newProjectHours || 0) > max) max = m.newProjectHours;
      if ((m.maintenanceHours || 0) > max) max = m.maintenanceHours;
    }
    return max;
  });

  maxStackedMonthlyHours = computed(() => {
    const history = this.metrics()?.monthlyHistory || [];
    let max = 50;
    for (const m of history) {
      if ((m.totalHours || 0) > max) max = m.totalHours;
    }
    return max;
  });

  maxNewMonthlyHours = computed(() => {
    const history = this.metrics()?.monthlyHistory || [];
    let max = 50;
    for (const m of history) {
      if ((m.newProjectHours || 0) > max) max = m.newProjectHours;
    }
    return max;
  });

  maxMaintenanceMonthlyHours = computed(() => {
    const history = this.metrics()?.monthlyHistory || [];
    let max = 50;
    for (const m of history) {
      if ((m.maintenanceHours || 0) > max) max = m.maintenanceHours;
    }
    return max;
  });

  getSingleBarHeight(hours: number, max: number): number {
    if (!hours || hours <= 0 || max <= 0) return 0;
    return Math.max(3, Math.round((hours / max) * 128));
  }

  averageMonthlyMaintenanceHours = computed(() => {
    const history = this.metrics()?.monthlyHistory || [];
    if (history.length === 0) return 0;
    const activeMonths = history.filter(m => m.maintenanceHours > 0);
    const divisor = activeMonths.length > 0 ? activeMonths.length : 12;
    const sum = history.reduce((acc, m) => acc + (m.maintenanceHours || 0), 0);
    return Math.round((sum / divisor) * 10) / 10;
  });

  averageMonthlyNewProjectHours = computed(() => {
    const history = this.metrics()?.monthlyHistory || [];
    if (history.length === 0) return 0;
    const activeMonths = history.filter(m => m.newProjectHours > 0);
    const divisor = activeMonths.length > 0 ? activeMonths.length : 12;
    const sum = history.reduce((acc, m) => acc + (m.newProjectHours || 0), 0);
    return Math.round((sum / divisor) * 10) / 10;
  });

  getGroupedBarHeight(hours: number): number {
    if (!hours || hours <= 0) return 0;
    const max = this.maxGroupedMonthlyHours();
    return Math.max(3, Math.round((hours / max) * 128));
  }

  getGroupedTopY(m: MonthlyEffort): number {
    const h1 = this.getGroupedBarHeight(m.newProjectHours || 0);
    const h2 = this.getGroupedBarHeight(m.maintenanceHours || 0);
    const maxH = Math.max(h1, h2);
    return Math.max(14, 155 - maxH - 4);
  }

  getStackedBarHeight(hours: number): number {
    if (!hours || hours <= 0) return 0;
    const max = this.maxStackedMonthlyHours();
    return Math.max(2, Math.round((hours / max) * 128));
  }

  getStackedTopY(m: MonthlyEffort): number {
    const h1 = this.getStackedBarHeight(m.newProjectHours || 0);
    const h2 = this.getStackedBarHeight(m.maintenanceHours || 0);
    return Math.max(14, 155 - h1 - h2 - 4);
  }

  getPeakNewProjectsMonth(): string {
    const history = this.metrics()?.monthlyHistory || [];
    let top: MonthlyEffort | null = null;
    for (const m of history) {
      if (!top || (m.newProjectHours || 0) > (top.newProjectHours || 0)) {
        top = m;
      }
    }
    if (top && (top.newProjectHours || 0) > 0) {
      return `${top.label} (${this.formatHours(top.newProjectHours)}h)`;
    }
    return 'Nenhum';
  }

  getPeakMaintenanceMonth(): string {
    const history = this.metrics()?.monthlyHistory || [];
    let top: MonthlyEffort | null = null;
    for (const m of history) {
      if (!top || m.maintenanceHours > top.maintenanceHours) {
        top = m;
      }
    }
    if (top && top.maintenanceHours > 0) {
      return `${top.label} (${this.formatHours(top.maintenanceHours)}h)`;
    }
    return 'Nenhum';
  }

  // Donut SVG Calculations (Circumference = 2 * PI * 54 = ~339.292)
  private readonly circumference = 339.292;

  getNewProjectsDasharray(): string {
    const totalHours = (this.metrics()?.totalNewProjectHours || 0) + (this.metrics()?.totalMaintenanceHours || 0);
    if (totalHours <= 0) return `0 ${this.circumference.toFixed(2)}`;
    const pctNew = 100 - (this.metrics()?.maintenancePercent || 0);
    const len = (pctNew / 100) * this.circumference;
    return `${len.toFixed(2)} ${this.circumference.toFixed(2)}`;
  }

  getNewProjectsDashoffset(): number {
    return 0;
  }

  getMaintenanceDasharray(): string {
    const totalHours = (this.metrics()?.totalNewProjectHours || 0) + (this.metrics()?.totalMaintenanceHours || 0);
    if (totalHours <= 0) return `0 ${this.circumference.toFixed(2)}`;
    const pctMaint = this.metrics()?.maintenancePercent || 0;
    const len = (pctMaint / 100) * this.circumference;
    return `${len.toFixed(2)} ${this.circumference.toFixed(2)}`;
  }

  getMaintenanceDashoffset(): number {
    const totalHours = (this.metrics()?.totalNewProjectHours || 0) + (this.metrics()?.totalMaintenanceHours || 0);
    if (totalHours <= 0) return 0;
    const pctNew = 100 - (this.metrics()?.maintenancePercent || 0);
    const lenNew = (pctNew / 100) * this.circumference;
    return -lenNew;
  }
}
