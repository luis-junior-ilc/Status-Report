import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-roi-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5 animate-in fade-in duration-200">
      <!-- Header Banner -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-5 sm:p-6 text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-1">
            <span>💹</span>
            <span>Visão Executiva de Retorno • Horizonte 12 Meses</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight">
            ROI &amp; Impacto de Negócio do Portfólio
          </h2>
          <p class="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Consolidado financeiro e qualitativo baseado nas <strong>estimativas gerenciais (12 meses)</strong> de economia de custos, ganho de receita e valor estratégico dos projetos.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <select
            [ngModel]="filterVerdict()"
            (ngModelChange)="filterVerdict.set($event)"
            class="text-xs font-bold bg-slate-800/90 text-white border border-slate-600 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="all">Todos os Projetos ({{ rows().length }})</option>
            <option value="mapped">Apenas Mapeados ({{ summary().mappedCount }})</option>
            <option value="positive">🟢 Positivos ({{ summary().positiveCount }})</option>
            <option value="strategic">🔵 Estratégicos ({{ summary().strategicCount }})</option>
            <option value="negative">🔴 Negativos ({{ summary().negativeCount }})</option>
            <option value="unmapped">⚪ Não Mapeados ({{ summary().unmappedCount }})</option>
          </select>

          <button
            *ngIf="service.isLocalEnvironment()"
            (click)="service.isAdminOpen.set(true)"
            class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer">
            ✏️ Configurar ROI na Curadoria
          </button>
        </div>
      </div>

      <!-- 4 Global KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">💸 Investimento Mapeado</span>
          <div class="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
            {{ service.formatCurrency(summary().totalInvestment) }}
          </div>
          <span class="text-[11px] text-slate-500 mt-1 block">
            {{ summary().mappedCount }} de {{ rows().length }} projetos com ROI preenchido
          </span>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-sm">
          <span class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">📈 Retorno Estimado (12m)</span>
          <div class="mt-1.5 text-2xl font-black text-emerald-700 tracking-tight">
            {{ service.formatCurrency(summary().totalAnnualBenefit) }}
          </div>
          <span class="text-[11px] text-emerald-700/80 mt-1 block">
            Economia + Receita adicional projetada
          </span>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-blue-200/90 shadow-sm">
          <span class="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">⚖️ Impacto Líquido &amp; ROI</span>
          <div class="mt-1.5 flex items-baseline gap-2">
            <span
              [ngClass]="summary().netImpact >= 0 ? 'text-blue-700' : 'text-rose-700'"
              class="text-2xl font-black tracking-tight">
              {{ summary().netImpact >= 0 ? '+' : '' }}{{ service.formatCurrency(summary().netImpact) }}
            </span>
            <span
              *ngIf="summary().totalInvestment > 0"
              [ngClass]="summary().globalRoiPct >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
              class="text-xs font-extrabold px-2 py-0.5 rounded-full border">
              {{ summary().globalRoiPct >= 0 ? '+' : '' }}{{ summary().globalRoiPct }}%
            </span>
          </div>
          <span class="text-[11px] text-slate-500 mt-1 block">
            {{ summary().avgPayback !== null ? 'Payback médio: ' + summary().avgPayback + ' meses' : 'Payback: informe economia/receita' }}
          </span>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">🎯 Veredito do Portfólio</span>
          <div class="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              🟢 {{ summary().positiveCount }} Positivos
            </span>
            <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              🔵 {{ summary().strategicCount }} Estratégicos
            </span>
            <span *ngIf="summary().negativeCount > 0" class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              🔴 {{ summary().negativeCount }} Negativos
            </span>
            <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              ⚪ {{ summary().unmappedCount }} Sem ROI
            </span>
          </div>
        </div>
      </div>

      <!-- Visual Composition + Qualitative Map -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Composition -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">
              💰 Composição do Retorno Estimado (12 Meses)
            </h3>
            <span class="text-[11px] font-bold text-slate-500">
              Total: {{ service.formatCurrency(summary().totalAnnualBenefit) }}
            </span>
          </div>

          <div class="space-y-3">
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1">
                <span class="text-emerald-800">Economia / Redução de Custos</span>
                <span class="text-emerald-700">
                  {{ service.formatCurrency(summary().totalAnnualCostSaving) }} ({{ summary().costSavingShare }}%)
                </span>
              </div>
              <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" [style.width.%]="summary().costSavingShare"></div>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1">
                <span class="text-blue-800">Ganho de Receita / Margem Adicional</span>
                <span class="text-blue-700">
                  {{ service.formatCurrency(summary().totalAnnualRevenueGain) }} ({{ summary().revenueGainShare }}%)
                </span>
              </div>
              <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div class="h-full bg-blue-500 rounded-full transition-all duration-500" [style.width.%]="summary().revenueGainShare"></div>
              </div>
            </div>
          </div>

          <p class="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            💡 Como não há medição pós go-live contínua, os valores representam a <strong>projeção anual (12m)</strong> validada com a gestão da operação.
          </p>
        </div>

        <!-- Qualitative Pillars -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">
              ⭐ Mapa de Impactos Qualitativos &amp; Estratégicos
            </h3>
            <span *ngIf="summary().avgQualitativeScore > 0" class="text-xs font-extrabold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Nota Média: ★ {{ summary().avgQualitativeScore }}/5
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div *ngFor="let item of qualitativeBreakdown()"
              class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <span class="font-semibold text-slate-700 truncate pr-2">{{ item.tag }}</span>
              <span class="font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                {{ item.count }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Ranking Table -->
      <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">
              🏆 Ranking de Projetos por Retorno (Maior → Menor)
            </h3>
            <span class="text-[11px] text-slate-500">Clique em qualquer projeto para abrir o Cronograma Oficial EAP e o card detalhado de ROI</span>
          </div>
          <span class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
            {{ filteredRows().length }} projeto(s) listado(s)
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th class="py-3 px-3.5">Projeto</th>
                <th class="py-3 px-2 text-right">Invest.</th>
                <th class="py-3 px-2 text-right">Econ./mês</th>
                <th class="py-3 px-2 text-right">Rec./mês</th>
                <th class="py-3 px-2 text-right">Retorno 12m</th>
                <th class="py-3 px-2 text-right">Líquido</th>
                <th class="py-3 px-2 text-center">Payback</th>
                <th class="py-3 px-2">Qualitativo</th>
                <th class="py-3 px-3.5 text-right">Veredito</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                *ngFor="let row of filteredRows()"
                (click)="openProjectEap(row.project)"
                class="hover:bg-blue-50/40 transition cursor-pointer">
                <td class="py-2.5 px-3.5 max-w-[220px]" [title]="row.project.name + ' (' + row.project.client + ')'">
                  <div class="font-bold text-slate-900 truncate">{{ row.project.name }}</div>
                  <div class="text-[10px] text-slate-400 font-medium truncate">{{ row.project.client }}</div>
                </td>
                <td class="py-2.5 px-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                  {{ row.roi.hasData ? service.formatCurrency(row.roi.investment) : '—' }}
                </td>
                <td class="py-2.5 px-2 text-right font-semibold text-emerald-700 whitespace-nowrap">
                  {{ row.roi.monthlyCostSaving > 0 ? service.formatCurrency(row.roi.monthlyCostSaving) : '—' }}
                </td>
                <td class="py-2.5 px-2 text-right font-semibold text-blue-700 whitespace-nowrap">
                  {{ row.roi.monthlyRevenueGain > 0 ? service.formatCurrency(row.roi.monthlyRevenueGain) : '—' }}
                </td>
                <td class="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">
                  {{ row.roi.annualBenefit > 0 ? service.formatCurrency(row.roi.annualBenefit) : '—' }}
                </td>
                <td
                  [ngClass]="row.roi.hasData ? (row.roi.netImpact >= 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black') : 'text-slate-400'"
                  class="py-2.5 px-2 text-right whitespace-nowrap">
                  {{ row.roi.hasData ? ((row.roi.netImpact >= 0 ? '+' : '') + service.formatCurrency(row.roi.netImpact)) : '—' }}
                </td>
                <td class="py-2.5 px-2 text-center font-semibold text-slate-700 whitespace-nowrap">
                  {{ row.roi.paybackMonths !== null ? (row.roi.paybackMonths + 'm') : '—' }}
                </td>
                <td class="py-2.5 px-2">
                  <div class="flex items-center gap-1 flex-wrap max-w-[160px]">
                    <span *ngIf="row.roi.qualitativeScore > 0" class="text-[10px] font-extrabold text-amber-600">
                      ★{{ row.roi.qualitativeScore }}
                    </span>
                    <span *ngFor="let tag of row.roi.qualitativeTags.slice(0, 2)"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 truncate max-w-[100px]">
                      {{ tag }}
                    </span>
                    <span *ngIf="!row.roi.qualitativeScore && row.roi.qualitativeTags.length === 0" class="text-slate-400">—</span>
                  </div>
                </td>
                <td class="py-2.5 px-3.5 text-right whitespace-nowrap">
                  <span [ngClass]="row.roi.badgeClass" class="text-[10px] font-extrabold px-2 py-0.5 rounded-full border">
                    {{ row.roi.verdictLabel }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="filteredRows().length === 0">
                <td colspan="9" class="py-10 text-center text-slate-400 text-xs">
                  Nenhum projeto encontrado para o filtro selecionado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class RoiDashboardComponent {
  service = inject(ProjectService);
  filterVerdict = signal<'all' | 'mapped' | 'positive' | 'strategic' | 'negative' | 'unmapped'>('all');

  readonly QUALITATIVE_TAGS = [
    'SLA & Experiência do Cliente',
    'Compliance & Fiscal',
    'Escalabilidade Operacional',
    'Produtividade & Menos Retrabalho',
    'Redução de Risco / Multas'
  ];

  rows = computed(() => {
    const list = this.service.filteredProjects().filter(p => p.category !== 'maintenance');
    return list
      .map(project => ({
        project,
        roi: this.service.calculateProjectRoi(project)
      }))
      .sort((a, b) => {
        if (a.roi.hasData !== b.roi.hasData) return a.roi.hasData ? -1 : 1;
        if (b.roi.netImpact !== a.roi.netImpact) return b.roi.netImpact - a.roi.netImpact;
        return b.roi.roiPct - a.roi.roiPct;
      });
  });

  filteredRows = computed(() => {
    const f = this.filterVerdict();
    const all = this.rows();
    if (f === 'all') return all;
    if (f === 'mapped') return all.filter(r => r.roi.hasData);
    if (f === 'unmapped') return all.filter(r => !r.roi.hasData);
    return all.filter(r => r.roi.hasData && r.roi.classification === f);
  });

  summary = computed(() => {
    const all = this.rows();
    let totalInvestment = 0;
    let totalAnnualCostSaving = 0;
    let totalAnnualRevenueGain = 0;
    let mappedCount = 0;
    let positiveCount = 0;
    let strategicCount = 0;
    let negativeCount = 0;
    let unmappedCount = 0;
    let paybackSum = 0;
    let paybackCount = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const { roi } of all) {
      if (!roi.hasData) {
        unmappedCount++;
        continue;
      }
      mappedCount++;
      totalInvestment += roi.investment;
      totalAnnualCostSaving += roi.monthlyCostSaving * 12;
      totalAnnualRevenueGain += roi.monthlyRevenueGain * 12;
      if (roi.classification === 'positive') positiveCount++;
      else if (roi.classification === 'strategic') strategicCount++;
      else if (roi.classification === 'negative') negativeCount++;
      if (roi.paybackMonths !== null) {
        paybackSum += roi.paybackMonths;
        paybackCount++;
      }
      if (roi.qualitativeScore > 0) {
        scoreSum += roi.qualitativeScore;
        scoreCount++;
      }
    }

    const totalAnnualBenefit = totalAnnualCostSaving + totalAnnualRevenueGain;
    const netImpact = totalAnnualBenefit - totalInvestment;
    const globalRoiPct = totalInvestment > 0 ? Math.round(((totalAnnualBenefit - totalInvestment) / totalInvestment) * 100) : 0;
    const avgPayback = paybackCount > 0 ? Math.round((paybackSum / paybackCount) * 10) / 10 : null;
    const avgQualitativeScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;
    const costSavingShare = totalAnnualBenefit > 0 ? Math.round((totalAnnualCostSaving / totalAnnualBenefit) * 100) : 0;
    const revenueGainShare = totalAnnualBenefit > 0 ? 100 - costSavingShare : 0;

    return {
      totalInvestment,
      totalAnnualCostSaving,
      totalAnnualRevenueGain,
      totalAnnualBenefit,
      netImpact,
      globalRoiPct,
      avgPayback,
      avgQualitativeScore,
      costSavingShare,
      revenueGainShare,
      mappedCount,
      positiveCount,
      strategicCount,
      negativeCount,
      unmappedCount
    };
  });

  qualitativeBreakdown = computed(() => {
    const all = this.rows();
    return this.QUALITATIVE_TAGS.map(tag => ({
      tag,
      count: all.filter(r => r.roi.qualitativeTags.includes(tag)).length
    }));
  });

  openProjectEap(project: Project) {
    this.service.selectedEapProjectId.set(project.id);
    this.service.activeView.set('eap-gantt');
  }
}
