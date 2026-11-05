import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { Project, EapPhase } from '../../models/project.model';

@Component({
  selector: 'app-project-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
      <div
        *ngFor="let p of service.filteredProjects()"
        class="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
        
        <!-- Top bar with Client, Status & RAG -->
        <div class="p-5 pb-3">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <!-- Priority Pill -->
              <span
                class="text-[10px] font-black px-2 py-0.5 rounded-md border shadow-2xs cursor-default"
                [ngClass]="service.getPriorityBadgeClass(p.priority || 'P2')"
                [title]="'Prioridade ' + (p.priority || 'P2') + ' (' + service.getPriorityLabel(p.priority || 'P2') + ')'">
                {{ p.priority || 'P2' }}
              </span>
              <img
                *ngIf="service.getClientLogo(p.client)"
                [src]="service.getClientLogo(p.client)"
                [alt]="p.client"
                class="h-5 max-w-[65px] object-contain rounded bg-white p-0.5 border border-slate-200">
              <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                {{ p.client }}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <span
                [ngClass]="getStatusBadgeClass(p.status)"
                class="text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {{ p.status }}
              </span>
              <span
                [ngClass]="getRagBadgeClass(p.ragStatus)"
                class="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                {{ getRagLabel(p.ragStatus) }}
              </span>
            </div>
          </div>

          <!-- Project Title -->
          <h3 class="text-base font-bold text-slate-900 tracking-tight leading-snug">
            {{ p.name }}
          </h3>

          <!-- Description if any -->
          <p class="text-xs text-slate-500 mt-1 line-clamp-2" [title]="p.description">
            {{ p.description || 'Projeto corporativo em acompanhamento gerencial.' }}
          </p>

          <!-- Systems Involved Chips -->
          <div *ngIf="p.systems && p.systems.length > 0" class="flex flex-wrap items-center gap-1 mt-2.5">
            <span
              *ngFor="let sys of p.systems"
              [ngClass]="service.getSystemBadgeClass(sys)"
              class="px-2 py-0.5 rounded-md font-bold text-[10px] border shadow-2xs">
              {{ sys }}
            </span>
          </div>

          <!-- Stepper: 5 Fases da EAP -->
          <div class="mt-4 pt-3 border-t border-slate-100">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Fase da EAP</span>
              <span [ngClass]="service.getMilestoneBadgeClass(p.currentMilestone)" class="px-2 py-0.5 rounded font-semibold text-[10px] normal-case">
                {{ p.currentMilestone }}
              </span>
            </div>
            <div class="grid grid-cols-5 gap-1 text-center">
              <div
                *ngFor="let m of milestones; let idx = index"
                class="flex flex-col items-center">
                <div
                  [ngClass]="getMilestoneStepClass(m, p.currentMilestone)"
                  class="w-full h-1.5 rounded-full mb-1 transition-all">
                </div>
                <span
                  [ngClass]="m === p.currentMilestone ? 'font-bold text-blue-700' : 'text-slate-400 font-medium'"
                  class="text-[9px] truncate w-full"
                  [title]="m">
                  {{ m }}
                </span>
              </div>
            </div>
          </div>

          <!-- Comparative Box: Acordo Firmado vs Real/Planejado -->
          <div class="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Comparativo de Prazos</span>
              <span
                [ngClass]="getVariancePillClass(p.varianceDays)"
                class="px-1.5 py-0.2 rounded font-extrabold text-[10px]">
                {{ p.varianceDays > 0 ? '+' + p.varianceDays + 'd desvio' : (p.varianceDays === 0 ? 'No Prazo' : p.varianceDays + 'd adiantado') }}
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div class="text-[10px] text-slate-400 font-medium">Acordo Firmado:</div>
                <div class="font-bold text-slate-700">
                  {{ formatDate(p.agreedDates.start) }} <span class="text-slate-400">até</span> {{ formatDate(p.agreedDates.end) }}
                </div>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium">Previsão Real:</div>
                <div class="font-bold" [ngClass]="p.varianceDays > 0 ? 'text-rose-600' : 'text-slate-700'">
                  {{ formatDate(p.plannedDates.start) }} <span class="text-slate-400">até</span> {{ formatDate(p.executedDates.end || p.plannedDates.end) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="mt-3.5">
            <div class="flex items-center justify-between text-xs font-semibold mb-1">
              <span class="text-slate-600">Progresso Geral</span>
              <span class="text-slate-900 font-bold">{{ p.progress }}%</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                [ngClass]="p.ragStatus === 'red' ? 'bg-rose-500' : (p.ragStatus === 'amber' ? 'bg-amber-500' : 'bg-blue-600')"
                class="h-full rounded-full transition-all duration-500"
                [style.width.%]="p.progress">
              </div>
            </div>
          </div>

          <!-- Executive Summary Report -->
          <div class="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100/80">
            <div class="text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1">
              <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Status Report Atual
            </div>
            <p class="text-xs text-slate-700 leading-relaxed font-normal">
              {{ service.getProjectCurrentStatusReport(p) }}
            </p>
          </div>
        </div>

        <!-- Card Footer: Team, Hours breakdown & Open EAP button -->
        <div class="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2">
          <div class="min-w-0">
            <div
              *ngIf="p.team?.leader"
              class="flex items-center gap-1 font-semibold text-slate-700 truncate text-[11px] cursor-help"
              [title]="service.getTeamTooltip(p)">
              <span>👤</span>
              <span class="truncate">{{ p.team!.leader }}</span>
              <span *ngIf="p.team?.members && p.team!.members!.length > 0" class="text-[10px] text-slate-400 font-normal">
                (+{{ p.team!.members!.length }})
              </span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Azure: <strong class="text-slate-700">{{ formatHours(p.hours.totalExecuted) }}h</strong> / {{ formatHours(p.hours.totalPlanned) }}h</span>
              <span *ngIf="p.hours.agreed" class="text-emerald-700 font-bold">• Acordo: {{ formatHours(p.hours.agreed) }}h</span>
            </div>
          </div>
          <button
            (click)="service.openEapForProject(p.id)"
            class="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 transition shrink-0 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer">
            <span>Ver EAP</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ProjectCardsComponent {
  service = inject(ProjectService);

  formatHours(val?: number | null): string {
    return this.service.formatHours(val);
  }

  milestones: EapPhase[] = [
    'Planejamento',
    'Desenvolvimento',
    'Homologação',
    'Treinamento',
    'Operação Assistida'
  ];

  getStatusBadgeClass(status: string) {
    if (status === 'Ativo') return 'bg-blue-100 text-blue-800';
    if (status === 'Finalizado') return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-200 text-slate-800';
  }

  getRagBadgeClass(rag: string) {
    if (rag === 'red') return 'bg-rose-100 text-rose-800';
    if (rag === 'amber') return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  }

  getRagLabel(rag: string) {
    if (rag === 'red') return 'Crítico';
    if (rag === 'amber') return 'Atenção';
    return 'No Prazo';
  }

  getVariancePillClass(variance: number) {
    if (variance > 7) return 'bg-rose-100 text-rose-800';
    if (variance > 0) return 'bg-amber-100 text-amber-800';
    if (variance < 0) return 'bg-cyan-100 text-cyan-800';
    return 'bg-emerald-100 text-emerald-800';
  }

  getMilestoneStepClass(m: EapPhase, current: EapPhase) {
    const order = this.milestones;
    const currentIdx = order.indexOf(current);
    const mIdx = order.indexOf(m);

    if (mIdx < currentIdx) return 'bg-emerald-500';
    if (mIdx === currentIdx) return 'bg-blue-600 ring-2 ring-blue-300';
    return 'bg-slate-200';
  }

  formatDate(dateStr?: string | null) {
    if (!dateStr) return 'Não definida';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  }
}
