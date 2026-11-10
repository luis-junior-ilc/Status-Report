import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-portfolio-macro',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mb-6">
      <!-- Header -->
      <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
        <div>
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Home</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Visão Macro do Portfólio
            </span>
          </h2>
        </div>

        <!-- Legend reflecting bar colors -->
        <div class="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-2 rounded bg-emerald-500"></span> No Prazo
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-2 rounded bg-amber-500"></span> Em Atenção
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-2 rounded bg-rose-500"></span> Com Desvio
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-2 rounded bg-slate-400"></span> Congelado
          </span>
        </div>
      </div>

      <!-- Percentage Ruler Container -->
      <div class="overflow-x-auto">
        <div class="min-w-[950px]">
          <!-- Ruler Header (0% to 100%) -->
          <div class="flex border-b border-slate-200 bg-slate-900 text-white text-xs font-bold py-2.5 px-4 sticky top-0 z-10">
            <!-- Project metadata column -->
            <div class="w-[420px] shrink-0 uppercase tracking-wider text-slate-400 text-[11px]">
              Projeto • Criticidade • Marco • Sistemas
            </div>

            <!-- Percentage Axis (0% to 100%) -->
            <div class="flex-1 px-3 text-[11px] text-slate-300 font-bold">
              <div class="relative w-full h-4">
                <span class="absolute left-0 top-0">0%</span>
                <span class="absolute left-[20%] top-0 -translate-x-1/2">20%</span>
                <span class="absolute left-[40%] top-0 -translate-x-1/2">40%</span>
                <span class="absolute left-[60%] top-0 -translate-x-1/2">60%</span>
                <span class="absolute left-[80%] top-0 -translate-x-1/2">80%</span>
                <span class="absolute right-0 top-0 text-right">100%</span>
              </div>
            </div>

            <!-- Action column -->
            <div class="w-14 shrink-0 text-center text-slate-400 text-[11px] uppercase tracking-wider font-extrabold pl-1">
              EAP
            </div>
          </div>

          <!-- Empty state -->
          <div *ngIf="service.filteredProjects().length === 0" class="py-16 text-center text-slate-400 text-xs">
            Nenhum projeto encontrado para os filtros selecionados.
          </div>

          <!-- Project Rows -->
          <div class="divide-y divide-slate-100">
            <div
              *ngFor="let p of service.filteredProjects()"
              (click)="service.openEapForProject(p.id)"
              class="flex items-center py-3 px-4 hover:bg-blue-50/50 transition cursor-pointer group">
              
              <!-- Left: Project Details (Logo + Name in line 1; Priority, Milestone, Systems, Leader in line 2) -->
              <div class="w-[420px] shrink-0 pr-4">
                <div class="flex items-center justify-between gap-1.5">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <!-- Client Logo or Text Fallback -->
                    <img
                      *ngIf="service.getClientLogo(p.client)"
                      [src]="service.getClientLogo(p.client)"
                      [alt]="p.client"
                      class="h-5 max-w-[55px] object-contain rounded bg-white px-1 py-0.5 border border-slate-200 shadow-2xs shrink-0"
                    />
                    <span
                      *ngIf="!service.getClientLogo(p.client)"
                      class="h-5 px-1.5 inline-flex items-center font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded text-[10px] shrink-0 leading-none">
                      {{ p.client }}
                    </span>
                    <span class="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate" [title]="p.name">
                      {{ p.name }}
                    </span>
                  </div>
                  <span
                    *ngIf="p.status !== 'Ativo'"
                    class="h-5 px-2 inline-flex items-center text-[10px] rounded font-semibold shrink-0 leading-none"
                    [ngClass]="p.status === 'Finalizado' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'">
                    {{ p.status }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <!-- Criticidade (Priority Pill) - Same height h-5 -->
                  <span
                    class="h-5 px-2 inline-flex items-center rounded text-[10px] font-black border shadow-2xs shrink-0 cursor-default leading-none"
                    [ngClass]="service.getPriorityBadgeClass(p.priority || 'P2')"
                    [title]="'Prioridade ' + (p.priority || 'P2') + ' (' + service.getPriorityLabel(p.priority || 'P2') + ')'">
                    {{ p.priority || 'P2' }}
                  </span>

                  <!-- Etapa (Marco da EAP) - Same height h-5 -->
                  <span
                    [ngClass]="service.getMilestoneBadgeClass(p.currentMilestone)"
                    class="h-5 px-2 inline-flex items-center rounded text-[10px] font-semibold border shadow-2xs shrink-0 leading-none">
                    {{ p.currentMilestone }}
                  </span>

                  <!-- Sistemas Badges - Same height h-5 -->
                  <span
                    *ngFor="let sys of p.systems"
                    [ngClass]="service.getSystemBadgeClass(sys)"
                    class="h-5 px-2 inline-flex items-center rounded text-[10px] font-bold border shadow-2xs shrink-0 leading-none">
                    {{ sys }}
                  </span>

                  <!-- Team Leader & Data de Entrega -->
                  <div class="h-5 inline-flex items-center gap-2 ml-auto shrink-0">
                    <span
                      *ngIf="p.team?.leader"
                      class="inline-flex items-center gap-1 text-[10px] text-slate-600 font-medium cursor-help leading-none"
                      [title]="service.getTeamTooltip(p)">
                      <span>👤</span>
                      <span class="truncate max-w-[110px]">{{ p.team!.leader }}</span>
                    </span>
                    <span
                      *ngIf="service.getDeliveryDate(p) !== '-'"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px] border border-slate-200 leading-none shadow-2xs"
                      title="Data de Entrega / Finalização">
                      <span class="text-blue-600 font-bold">🏁</span>
                      <span>Entrega: <strong class="text-slate-900 font-bold">{{ service.getDeliveryDate(p) }}</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Center: Percentage Bar colored by RAG status -->
              <div class="flex-1 px-3 relative">
                <!-- Background Percentage Grid ticks -->
                <div class="absolute inset-0 flex justify-between pointer-events-none px-3">
                  <div class="w-px h-full bg-slate-100"></div>
                  <div class="w-px h-full bg-slate-100"></div>
                  <div class="w-px h-full bg-slate-100"></div>
                  <div class="w-px h-full bg-slate-100"></div>
                  <div class="w-px h-full bg-slate-100"></div>
                  <div class="w-px h-full bg-slate-100"></div>
                </div>

                <!-- The Progress Bar (colored by RAG status) -->
                <div class="relative w-full bg-slate-100 rounded-xl h-6 p-0.5 overflow-hidden flex items-center shadow-xs">
                  <div
                    [ngClass]="getBarClass(p)"
                    class="h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                    [style.width.%]="p.progress">
                    <span class="text-[10px] font-extrabold text-white drop-shadow-xs whitespace-nowrap" *ngIf="p.progress >= 12">
                      {{ p.progress }}%
                    </span>
                  </div>
                  <span class="text-[10px] font-bold text-slate-600 ml-2" *ngIf="p.progress < 12">
                    {{ p.progress }}%
                  </span>
                </div>
              </div>

              <!-- Right: EAP Button (NO Hours column) -->
              <div class="w-14 shrink-0 flex items-center justify-center pl-1">
                <button
                  class="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-500 flex items-center justify-center transition shadow-2xs"
                  title="Abrir Cronograma EAP Detalhado">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PortfolioMacroComponent {
  service = inject(ProjectService);

  getBarClass(p: Project) {
    if (p.status === 'Finalizado') return 'bg-emerald-600';
    if (p.status === 'Congelado') return 'bg-slate-400';
    if (p.ragStatus === 'red') return 'bg-rose-500 shadow-sm';
    if (p.ragStatus === 'amber') return 'bg-amber-500 shadow-sm';
    return 'bg-emerald-500 shadow-sm';
  }
}
