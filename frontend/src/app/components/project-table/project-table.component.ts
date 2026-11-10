import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-project-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-8">
      <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 class="text-sm font-bold text-slate-900">
          Tabela Consolidada de Projetos (Visão Diretoria)
        </h2>
        <span class="text-xs text-slate-500 font-medium">
          {{ service.filteredProjects().length }} projetos listados
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-100/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th class="py-3 px-4">Prioridade</th>
              <th class="py-3 px-4">Cliente</th>
              <th class="py-3 px-4">Projeto</th>
              <th class="py-3 px-4">Sistemas</th>
              <th class="py-3 px-4">Líder / Entrega</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Saúde</th>
              <th class="py-3 px-4">Marco Atual</th>
              <th class="py-3 px-4">Acordo (Fim)</th>
              <th class="py-3 px-4">Previsão Real</th>
              <th class="py-3 px-4">Desvio</th>
              <th class="py-3 px-4">Progresso</th>
              <th class="py-3 px-4">Horas Azure</th>
              <th class="py-3 px-4 text-center">Ação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              *ngFor="let p of service.filteredProjects()"
              class="hover:bg-slate-50 transition">
              <!-- Prioridade -->
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="text-[10px] font-black px-2 py-0.5 rounded border shadow-2xs"
                  [ngClass]="service.getPriorityBadgeClass(p.priority || 'P2')"
                  [title]="service.getPriorityLabel(p.priority || 'P2')">
                  {{ p.priority || 'P2' }}
                </span>
              </td>
              <!-- Cliente -->
              <td class="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <img
                    *ngIf="service.getClientLogo(p.client)"
                    [src]="service.getClientLogo(p.client)"
                    [alt]="p.client"
                    class="h-5 max-w-[50px] object-contain rounded bg-white px-0.5 border border-slate-200"
                  />
                  <span class="bg-slate-100 px-2 py-0.5 rounded">{{ p.client }}</span>
                </div>
              </td>
              <!-- Projeto -->
              <td class="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate" [title]="p.name">
                {{ p.name }}
              </td>
              <!-- Sistemas -->
              <td class="py-3 px-4">
                <div class="flex flex-wrap items-center gap-1 max-w-[180px]">
                  <span
                    *ngFor="let sys of p.systems"
                    [ngClass]="service.getSystemBadgeClass(sys)"
                    class="px-1.5 py-0.2 rounded font-bold text-[9px] border shadow-2xs whitespace-nowrap">
                    {{ sys }}
                  </span>
                  <span *ngIf="!p.systems || p.systems.length === 0" class="text-slate-300 text-[11px]">-</span>
                </div>
              </td>
              <!-- Líder & Entrega -->
              <td class="py-3 px-4 whitespace-nowrap text-[11px]">
                <div *ngIf="p.team?.leader" class="font-bold text-slate-800 flex items-center gap-1 cursor-help" [title]="service.getTeamTooltip(p)">
                  <span>👤</span>
                  <span class="truncate max-w-[120px]">{{ p.team!.leader }}</span>
                </div>
                <!-- Data de Entrega / Finalização -->
                <div *ngIf="getDeliveryDate(p) !== '-'" class="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                  <span class="text-blue-600 font-bold">🏁</span>
                  <span>Entrega: <strong class="text-slate-800 font-bold">{{ getDeliveryDate(p) }}</strong></span>
                </div>
                <div *ngIf="p.team?.members && p.team!.members!.length > 0" class="text-[10px] text-slate-400 truncate max-w-[120px] cursor-help mt-0.5" [title]="service.getTeamTooltip(p)">
                  {{ p.team!.members!.length }} membro(s)
                </div>
                <span *ngIf="!p.team?.leader && getDeliveryDate(p) === '-' && (!p.team?.members || p.team!.members!.length === 0)" class="text-slate-300">-</span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  [ngClass]="p.status === 'Ativo' ? 'text-blue-700 bg-blue-50' : (p.status === 'Finalizado' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 bg-slate-100')"
                  class="px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {{ p.status }}
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  *ngIf="p.status === 'Ativo'"
                  [ngClass]="p.ragStatus === 'red' ? 'bg-rose-100 text-rose-800' : (p.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')"
                  class="px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                  {{ p.ragStatus === 'red' ? 'Desvio' : (p.ragStatus === 'amber' ? 'Atenção' : 'No Prazo') }}
                </span>
                <span *ngIf="p.status !== 'Ativo'" class="text-slate-400 font-semibold text-[10px]">-</span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span [ngClass]="service.getMilestoneBadgeClass(p.currentMilestone)" class="px-2 py-0.5 rounded font-semibold text-[10px]">
                  {{ p.currentMilestone }}
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap font-medium text-slate-600">
                {{ formatDate(p.agreedDates.end) }}
              </td>
              <td class="py-3 px-4 whitespace-nowrap font-bold" [ngClass]="p.varianceDays > 0 ? 'text-rose-600' : 'text-slate-800'">
                {{ formatDate(p.executedDates.end || p.plannedDates.end) }}
              </td>
              <td class="py-3 px-4 whitespace-nowrap font-bold">
                <span *ngIf="p.varianceDays > 0" class="text-rose-600">+{{ p.varianceDays }}d</span>
                <span *ngIf="p.varianceDays === 0" class="text-emerald-600">0d</span>
                <span *ngIf="p.varianceDays < 0" class="text-cyan-600">{{ p.varianceDays }}d</span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-blue-600 h-full rounded-full" [style.width.%]="p.progress"></div>
                  </div>
                  <span class="font-bold text-[11px] text-slate-800">{{ p.progress }}%</span>
                </div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-slate-700">
                <div>
                  <span class="font-bold">{{ formatHours(p.hours.totalExecuted) }}h</span> / {{ formatHours(p.hours.totalPlanned) }}h
                </div>
                <div *ngIf="p.hours.agreed" class="text-[10px] text-emerald-700 font-bold">
                  Acordo: {{ formatHours(p.hours.agreed) }}h
                </div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-center">
                <button
                  (click)="service.openEapForProject(p.id)"
                  class="text-blue-600 hover:text-blue-800 font-bold hover:underline">
                  Ver EAP
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ProjectTableComponent {
  service = inject(ProjectService);

  getDeliveryDate(p: any): string {
    return this.service.getDeliveryDate(p);
  }

  formatHours(val?: number | null): string {
    return this.service.formatHours(val);
  }

  formatDate(dateStr?: string | null) {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  }
}
