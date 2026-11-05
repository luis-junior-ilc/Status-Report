import { Component, inject, computed, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltersComponent } from '../filters/filters.component';
import { ProjectService } from '../../services/project.service';
import { WeeklyReportProject, RoadmapProject, BoardDecision } from '../../models/weekly-report.model';

@Component({
  selector: 'app-executive-report',
  standalone: true,
  imports: [CommonModule, FormsModule, FiltersComponent],
  template: `
    <div class="print:p-0 print:m-0 print:mb-0 print:bg-white print:text-slate-900 transition-all font-sans mb-10">

      <!-- ======================================================== -->
      <!-- TOP EXECUTIVE CONTROL BAR (SCREEN ONLY)                  -->
      <!-- ======================================================== -->
      <div
        class="bg-white rounded-2xl border border-slate-300 shadow-xs px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 print:hidden">
        
        <!-- Left: Co-branding & Title -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
            📊
          </div>
          <div class="flex flex-col">
            <h1 class="text-sm sm:text-base font-extrabold tracking-tight text-slate-950 leading-tight">
              Status Report
            </h1>
            <p class="text-[11px] font-bold text-slate-700 mt-0.5">
              Edição {{ service.formatEditionTitle(currentReport()) }}
            </p>
            <p class="text-[11px] text-slate-600 mt-0.5 font-medium">
              Período {{ currentReport()?.period }} • Emissão: {{ formatDate(currentReport()?.meetingDate) }}
            </p>
          </div>
        </div>

        <!-- Right: Actions & Edition Dropdown -->
        <div class="flex items-center flex-wrap gap-2">
          
          <!-- Dropdown da Edição -->
          <select
            [ngModel]="service.selectedReportId()"
            (ngModelChange)="onSelectReport($event)"
            class="text-[11px] font-bold rounded-xl px-2.5 py-1.5 border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer">
            <option *ngFor="let rep of service.weeklyReports()" [value]="rep.id">
              {{ service.formatEditionTitle(rep) }}
            </option>
          </select>

          <!-- Theme Switcher Button -->
          <button
            (click)="togglePresentationTheme()"
            class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer border"
            [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800' : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'"
            [title]="'Alternar tema da apresentação (atualmente ' + (presentationTheme() === 'dark' ? 'Escuro' : 'Claro') + ')'">
            <span>{{ presentationTheme() === 'dark' ? '🌙 Tema: Escuro' : '☀️ Tema: Claro' }}</span>
          </button>

          <!-- Presentation Mode Button (Opens interactive PPT 16:9 Landscape viewer) -->
          <button
            (click)="openPresenter()"
            class="px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition flex items-center gap-1.5 shadow-2xs cursor-pointer bg-slate-900 hover:bg-slate-800 text-white border border-slate-800"
            title="Apresentar em tela cheia slide a slide estilo PowerPoint">
            <span>🖥️ Apresentação PPT (Slides)</span>
          </button>

          <!-- Download PDF Landscape Button -->
          <button
            (click)="printReport()"
            [disabled]="isDownloadingPdf()"
            class="px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition flex items-center gap-1.5 shadow-2xs cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white border border-blue-500"
            title="Baixar o relatório formatado em apresentação PPT Paisagem">
            <span>{{ isDownloadingPdf() ? '⏳ Gerando PDF Paisagem...' : '📥 Baixar PDF (PPT Paisagem)' }}</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="service.isLoadingReport()" class="py-16 text-center print:hidden">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p class="mt-2 text-xs font-semibold text-slate-500">Carregando edição executiva...</p>
      </div>

      <!-- ======================================================== -->
      <!-- STANDARD REPORT VIEW (VISIBLE ON SCREEN, HIDDEN ON PRINT) -->
      <!-- ======================================================== -->
      <div *ngIf="!service.isLoadingReport() && currentReport()" class="standard-report-view space-y-5 print:hidden">

        <!-- 1. HERO BANNER: EXECUTIVE PULSE KPIS (HIGH CONTRAST) -->
        <div class="rounded-2xl border border-slate-300 bg-white text-slate-900 shadow-xs p-3.5 sm:p-4 transition-all overflow-visible space-y-2.5">
          
          <!-- Linha 1: Execução & Faróis da Esteira Ativa (7 Indicadores) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            <!-- 1. Ativos -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200/70 rounded-xl border border-slate-300 text-center shadow-2xs transition cursor-help"
              title="Projetos Ativos: Quantidade de projetos em andamento na esteira (exclui pausados e concluídos).">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-tight block truncate">⚡ Ativos</span>
                <span class="text-[9px] text-slate-400">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-slate-950 block mt-0.5">{{ getActiveCount() }}</span>
              <span class="text-[9px] sm:text-[10px] text-slate-600 font-medium block truncate mt-0.5">em andamento</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-blue-300 mb-0.5 block">⚡ Projetos Ativos</span>
                <span class="text-slate-300 font-normal block">Volume de iniciativas operacionais em execução na esteira corporativa.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Total de projetos com status 'Ativo' (exclui Congelados e Finalizados).
                </span>
                <div class="absolute top-full left-4 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 2. Saúde -->
            <div class="group relative px-2 py-2 sm:py-2.5 rounded-xl border text-center shadow-2xs transition cursor-help"
              [ngClass]="getPortfolioHealth() >= 70 ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/70' : (getPortfolioHealth() >= 50 ? 'bg-amber-50 border-amber-300 hover:bg-amber-100/70' : 'bg-rose-50 border-rose-300 hover:bg-rose-100/70')"
              title="Saúde do Portfólio: Índice ponderado executivo (No Prazo: 100, Atenção: 75, Desvio: 25) dividido pelo total de projetos ativos.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight block truncate"
                  [ngClass]="getPortfolioHealth() >= 70 ? 'text-emerald-900' : (getPortfolioHealth() >= 50 ? 'text-amber-900' : 'text-rose-900')">
                  💚 Saúde
                </span>
                <span class="text-[9px] opacity-70">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black block mt-0.5"
                [ngClass]="getPortfolioHealth() >= 70 ? 'text-emerald-700' : (getPortfolioHealth() >= 50 ? 'text-amber-700' : 'text-rose-700')">
                {{ getPortfolioHealth() }}%
              </span>
              <span class="text-[9px] sm:text-[10px] font-semibold block truncate mt-0.5"
                [ngClass]="getPortfolioHealth() >= 70 ? 'text-emerald-800' : (getPortfolioHealth() >= 50 ? 'text-amber-800' : 'text-rose-800')">
                do portfólio
              </span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-60 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-emerald-300 mb-0.5 block">💚 Saúde do Portfólio</span>
                <span class="text-slate-300 font-normal block">Índice sintético ponderado de estabilidade operacional e previsibilidade de entrega.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> (No Prazo × 100 + Atenção × 75 + Desvio × 25) ÷ Total de Projetos Ativos.
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 3. Avanço Médio -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200/70 rounded-xl border border-slate-300 text-center shadow-2xs transition cursor-help"
              title="Avanço Médio: Média do percentual de conclusão física dos projetos ativos.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-tight block truncate">📈 Avanço</span>
                <span class="text-[9px] text-slate-400">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-blue-700 block mt-0.5">{{ getAverageProgress() }}%</span>
              <span class="text-[9px] sm:text-[10px] text-slate-600 font-medium block truncate mt-0.5">conclusão física</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-blue-300 mb-0.5 block">📈 Avanço Físico Médio</span>
                <span class="text-slate-300 font-normal block">Média real do progresso das entregas dos projetos ativos.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Soma do % de progresso físico de cada projeto ativo ÷ Total de Ativos.
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 4. Consumo Horas -->
            <div class="group relative px-2 py-2 sm:py-2.5 rounded-xl border text-center shadow-2xs transition cursor-help"
              [ngClass]="getHoursConsumption().percent <= 85 ? 'bg-sky-50 border-sky-300 hover:bg-sky-100/70' : (getHoursConsumption().percent <= 100 ? 'bg-amber-50 border-amber-300 hover:bg-amber-100/70' : 'bg-rose-50 border-rose-300 hover:bg-rose-100/70')"
              title="Consumo de Horas: Horas executadas (Azure) divididas pelas horas firmadas com o cliente.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight block truncate"
                  [ngClass]="getHoursConsumption().percent <= 85 ? 'text-sky-900' : (getHoursConsumption().percent <= 100 ? 'text-amber-900' : 'text-rose-900')">
                  ⏱️ Horas
                </span>
                <span class="text-[9px] opacity-70">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black block mt-0.5"
                [ngClass]="getHoursConsumption().percent <= 85 ? 'text-sky-700' : (getHoursConsumption().percent <= 100 ? 'text-amber-700' : 'text-rose-700')">
                {{ getHoursConsumption().percent }}%
              </span>
              <span class="text-[9px] sm:text-[10px] font-semibold block truncate mt-0.5"
                [ngClass]="getHoursConsumption().percent <= 85 ? 'text-sky-800' : (getHoursConsumption().percent <= 100 ? 'text-amber-800' : 'text-rose-800')">
                {{ formatHours(getHoursConsumption().executed) }}h / {{ formatHours(getHoursConsumption().agreed) }}h
              </span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-60 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-sky-300 mb-0.5 block">⏱️ Consumo de Horas (Esforço)</span>
                <span class="text-slate-300 font-normal block">Mede o volume de horas executadas no Azure em relação às horas firmadas comercialmente.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> (Total Horas Executadas ÷ Total Horas Firmadas Cliente) × 100%.
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 5. No Prazo -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100/70 rounded-xl border border-emerald-300 text-center shadow-2xs transition cursor-help"
              title="No Prazo: Projetos ativos fluindo rigorosamente dentro das datas pactuadas.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-emerald-900 uppercase tracking-tight block truncate">🟢 No Prazo</span>
                <span class="text-[9px] text-emerald-600">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-emerald-700 block mt-0.5">{{ getOnTrackCount() }}</span>
              <span class="text-[9px] sm:text-[10px] text-emerald-800 font-semibold block truncate mt-0.5">{{ getPercent(getOnTrackCount(), getActiveCount()) }}% ativos</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-emerald-300 mb-0.5 block">🟢 Projetos no Prazo</span>
                <span class="text-slate-300 font-normal block">Iniciativas cujo cronograma e entregas estão ocorrendo sem atrasos.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Projetos com status 'Ativo' e farol de saúde Verde (ragStatus = 'green').
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 6. Em Atenção -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-amber-50 hover:bg-amber-100/70 rounded-xl border border-amber-300 text-center shadow-2xs transition cursor-help"
              title="Em Atenção: Projetos com risco moderado, entrega iminente (-1d a +1d) ou atraso tolerado de 1 dia.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase tracking-tight block truncate">🟡 Atenção</span>
                <span class="text-[9px] text-amber-600">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-amber-700 block mt-0.5">{{ getAttentionCount() }}</span>
              <span class="text-[9px] sm:text-[10px] text-amber-800 font-semibold block truncate mt-0.5">risco moderado</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-amber-300 mb-0.5 block">🟡 Projetos em Atenção</span>
                <span class="text-slate-300 font-normal block">Projetos com riscos moderados, margem curta de entrega (-1d a +1d) ou atraso operacional leve de 1 dia.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Projetos ativos com farol Amarelo (atividades na EAP com entrega iminente -1d/+1d ou variância de 1 dia).
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 7. Com Desvio -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-rose-50 hover:bg-rose-100/70 rounded-xl border border-rose-300 text-center shadow-2xs transition cursor-help"
              title="Com Desvio: Projetos com desvio crítico (atraso ≥ 2 dias na EAP ou variância de prazo ≥ 2 dias).">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-rose-900 uppercase tracking-tight block truncate">🔴 Desvio</span>
                <span class="text-[9px] text-rose-600">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-rose-700 block mt-0.5">{{ getCriticalCount() }}</span>
              <span class="text-[9px] sm:text-[10px] text-rose-800 font-semibold block truncate mt-0.5">desvio crítico</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-rose-300 mb-0.5 block">🔴 Projetos com Desvio</span>
                <span class="text-slate-300 font-normal block">Projetos com atraso crítico acumulado (≥ 2 dias) em relação aos marcos da EAP ou datas pactuadas.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Projetos com status 'Ativo' e farol Vermelho (atraso na EAP ≥ 2 dias ou variância geral ≥ 2 dias).
                </span>
                <div class="absolute top-full right-4 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>
          </div>

          <!-- Linha 2: Prazos, Governança & Pipeline Estratégico (6 Indicadores) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">

            <!-- 8. Desvio Médio em Dias -->
            <div class="group relative px-2 py-2 sm:py-2.5 rounded-xl border text-center shadow-2xs transition cursor-help"
              [ngClass]="getAverageVarianceDays().delayedCount > 0 ? 'bg-rose-50 border-rose-300 hover:bg-rose-100/70' : 'bg-slate-100 border-slate-300 hover:bg-slate-200/70'"
              title="Desvio Médio: Média de dias de atraso entre a data acordada e a previsão nos projetos em desvio.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight block truncate"
                  [ngClass]="getAverageVarianceDays().delayedCount > 0 ? 'text-rose-900' : 'text-slate-700'">
                  ⏳ Desvio Médio
                </span>
                <span class="text-[9px] opacity-70">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black block mt-0.5"
                [ngClass]="getAverageVarianceDays().delayedCount > 0 ? 'text-rose-700' : 'text-slate-700'">
                +{{ getAverageVarianceDays().avgDays }}d
              </span>
              <span class="text-[9px] sm:text-[10px] font-semibold block truncate mt-0.5"
                [ngClass]="getAverageVarianceDays().delayedCount > 0 ? 'text-rose-800' : 'text-slate-600'">
                {{ getAverageVarianceDays().delayedCount > 0 ? (getAverageVarianceDays().delayedCount + ' projeto(s)') : 'sem atrasos' }}
              </span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col items-start w-64 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-amber-300 mb-0.5 block">⏳ Desvio Médio de Prazo</span>
                <span class="text-slate-300 font-normal block">Média de dias de atraso calculada dinamicamente sobre todos os projetos ativos da esteira com entregas em desvio.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Soma dos dias de desvio dos projetos ativos ÷ Quantidade de Projetos com Desvio.
                </span>
                <div class="absolute top-full left-4 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 9. Entregas no Mês -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100/70 rounded-xl border border-emerald-300 text-center shadow-2xs transition cursor-help"
              title="Entregas no Mês: Projetos ativos com data prevista de término ou go-live no mês corrente.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-emerald-900 uppercase tracking-tight block truncate">🎯 Entregas</span>
                <span class="text-[9px] text-emerald-600">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-emerald-700 block mt-0.5">{{ getDeliveriesThisMonthCount() }}</span>
              <span class="text-[9px] sm:text-[10px] text-emerald-800 font-semibold block truncate mt-0.5">em {{ currentMonthName }}</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-60 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-emerald-300 mb-0.5 block">🎯 Entregas no Ciclo Vigente</span>
                <span class="text-slate-300 font-normal block">Quantidade de projetos com marco final de entrega ou go-live previsto para o mês corrente.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Projetos ativos com término/previsão dentro do mês de {{ currentMonthName }}.
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 10. No radar -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-orange-50 hover:bg-orange-100/70 rounded-xl border border-orange-300 text-center shadow-2xs transition cursor-help"
              title="No Radar: Projetos com desvio crítico ou com pontos de atenção abertos pela liderança.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-orange-900 uppercase tracking-tight block truncate">🚨 No radar</span>
                <span class="text-[9px] text-orange-600">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-orange-700 block mt-0.5">{{ topCriticalProjects().length }}</span>
              <span class="text-[9px] sm:text-[10px] text-orange-800 font-semibold block truncate mt-0.5">radar diretoria</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-60 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-orange-300 mb-0.5 block">🚨 Radar da Diretoria</span>
                <span class="text-slate-300 font-normal block">Iniciativas prioritárias com alertas ou desvios que demandam atenção na pauta de hoje.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Projetos com farol vermelho ou com pontos de atenção cadastrados pela gestão.
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 11. Deliberações -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-purple-50 hover:bg-purple-100/70 rounded-xl border border-purple-300 text-center shadow-2xs transition cursor-help"
              title="Deliberações: Pautas, aprovações e decisões estratégicas da reunião de diretoria.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-purple-900 uppercase tracking-tight block truncate">⚖️ Pautas</span>
                <span class="text-[9px] text-purple-600">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-purple-800 block mt-0.5">{{ currentReport()?.boardDecisions?.length || 0 }}</span>
              <span class="text-[9px] sm:text-[10px] text-purple-800 font-semibold block truncate mt-0.5">deliberações</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-purple-300 mb-0.5 block">⚖️ Deliberações Estratégicas</span>
                <span class="text-slate-300 font-normal block">Total de decisões colegiadas e acordos registrados na ata de governança.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Quantidade de itens cadastrados no bloco 'Deliberações & Decisões'.
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 12. Congelados -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-slate-200/80 hover:bg-slate-300/80 rounded-xl border border-slate-300 text-center shadow-2xs transition cursor-help"
              title="Congelados: Projetos temporariamente pausados por decisão estratégica ou do cliente.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-tight block truncate">❄️ Pausa</span>
                <span class="text-[9px] text-slate-500">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-slate-700 block mt-0.5">{{ getFrozenCount() }}</span>
              <span class="text-[9px] sm:text-[10px] text-slate-600 font-medium block truncate mt-0.5">congelados</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-slate-300 mb-0.5 block">❄️ Projetos Congelados</span>
                <span class="text-slate-300 font-normal block">Iniciativas com atividades paralisadas temporariamente pela liderança.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Projetos com status 'Congelado' cadastrados na curadoria.
                </span>
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>

            <!-- 13. Roadmap -->
            <div class="group relative px-2 py-2 sm:py-2.5 bg-blue-50 hover:bg-blue-100/70 rounded-xl border border-blue-300 text-center shadow-2xs transition cursor-help"
              title="Roadmap: Iniciativas planejadas no pipeline futuro de produtos e negócios.">
              <div class="flex items-center justify-center gap-1">
                <span class="text-[9px] sm:text-[10px] font-bold text-blue-900 uppercase tracking-tight block truncate">🔭 Roadmap</span>
                <span class="text-[9px] text-blue-600">ⓘ</span>
              </div>
              <span class="text-xl sm:text-2xl font-black text-blue-700 block mt-0.5">{{ currentReport()?.roadmapProjects?.length || 0 }}</span>
              <span class="text-[9px] sm:text-[10px] text-blue-800 font-semibold block truncate mt-0.5">pipeline futuro</span>

              <!-- Floating Tooltip -->
              <div class="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-start w-56 p-2.5 bg-slate-950/95 text-white text-[10px] leading-snug rounded-xl shadow-2xl z-50 text-left border border-slate-700 backdrop-blur-xs">
                <span class="font-extrabold text-blue-300 mb-0.5 block">🔭 Roadmap Estratégico</span>
                <span class="text-slate-300 font-normal block">Portfólio de demandas futuras estruturadas no radar corporativo.</span>
                <span class="text-[9px] text-emerald-300 mt-1.5 pt-1 border-t border-slate-800 font-medium block">
                  <strong>Cálculo:</strong> Quantidade de iniciativas listadas na seção 'Roadmap Estratégico'.
                </span>
                <div class="absolute top-full right-4 border-4 border-transparent border-t-slate-950/95"></div>
              </div>
            </div>
          </div>

          <!-- Priority Distribution Bar -->
          <div class="mt-4 pt-3.5 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs">🎯</span>
              <span class="text-xs font-black text-slate-950 tracking-tight">Projetos por Prioridade:</span>
              <button
                *ngIf="service.selectedPriority() !== 'Todos'"
                type="button"
                (click)="service.selectedPriority.set('Todos')"
                class="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer">
                (Limpar filtro: {{ service.selectedPriority() }})
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                (click)="togglePriorityFilter('P1')"
                [ngClass]="service.selectedPriority() === 'P1' ? 'ring-2 ring-rose-500 bg-rose-100 border-rose-400' : 'bg-rose-50 hover:bg-rose-100 border-rose-300'"
                class="px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"></span>
                  <div class="flex flex-col">
                    <span class="text-[9px] font-black text-rose-900 uppercase tracking-wider leading-none">P1 • Crítica</span>
                    <span class="text-[9px] text-rose-700 font-semibold mt-0.5 leading-none">Urgência máxima</span>
                  </div>
                </div>
                <span class="text-base font-black text-rose-700 leading-none">{{ getPriorityCount('P1') }}</span>
              </button>

              <button
                type="button"
                (click)="togglePriorityFilter('P2')"
                [ngClass]="service.selectedPriority() === 'P2' ? 'ring-2 ring-amber-500 bg-amber-100 border-amber-400' : 'bg-amber-50 hover:bg-amber-100 border-amber-300'"
                class="px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <div class="flex flex-col">
                    <span class="text-[9px] font-black text-amber-900 uppercase tracking-wider leading-none">P2 • Alta</span>
                    <span class="text-[9px] text-amber-700 font-semibold mt-0.5 leading-none">Impacto direto</span>
                  </div>
                </div>
                <span class="text-base font-black text-amber-800 leading-none">{{ getPriorityCount('P2') }}</span>
              </button>

              <button
                type="button"
                (click)="togglePriorityFilter('P3')"
                [ngClass]="service.selectedPriority() === 'P3' ? 'ring-2 ring-blue-500 bg-blue-100 border-blue-400' : 'bg-blue-50 hover:bg-blue-100 border-blue-300'"
                class="px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  <div class="flex flex-col">
                    <span class="text-[9px] font-black text-blue-900 uppercase tracking-wider leading-none">P3 • Média</span>
                    <span class="text-[9px] text-blue-700 font-semibold mt-0.5 leading-none">Evolução regular</span>
                  </div>
                </div>
                <span class="text-base font-black text-blue-700 leading-none">{{ getPriorityCount('P3') }}</span>
              </button>

              <button
                type="button"
                (click)="togglePriorityFilter('P4')"
                [ngClass]="service.selectedPriority() === 'P4' ? 'ring-2 ring-slate-500 bg-slate-200 border-slate-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300'"
                class="px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"></span>
                  <div class="flex flex-col">
                    <span class="text-[9px] font-black text-slate-800 uppercase tracking-wider leading-none">P4 • Baixa</span>
                    <span class="text-[9px] text-slate-600 font-semibold mt-0.5 leading-none">Demanda rotina</span>
                  </div>
                </div>
                <span class="text-base font-black text-slate-700 leading-none">{{ getPriorityCount('P4') }}</span>
              </button>
            </div>
          </div>

          <!-- Systems Distribution Bar -->
          <div *ngIf="systemMetrics().length > 0"
            class="mt-3.5 pt-3.5 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs">🖥️</span>
              <span class="text-xs font-black text-slate-950 tracking-tight">Projetos por Sistema:</span>
              <button
                *ngIf="service.selectedSystem() !== 'Todos'"
                type="button"
                (click)="service.selectedSystem.set('Todos')"
                class="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer">
                (Limpar filtro: {{ service.selectedSystem() }})
              </button>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2">
              <button
                *ngFor="let s of systemMetrics()"
                type="button"
                (click)="toggleSystemFilter(s.name)"
                [ngClass]="service.selectedSystem() === s.name ? s.activeClass : s.idleClass"
                class="px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-xs shrink-0">{{ s.icon }}</span>
                  <span class="text-[10px] font-black truncate leading-tight" [ngClass]="s.textClass">{{ s.name }}</span>
                </div>
                <span class="text-base font-black leading-none shrink-0" [ngClass]="s.countClass">{{ s.count }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 2. RADAR DE ATENÇÃO IMEDIATA DA DIRETORIA -->
        <div *ngIf="topCriticalProjects().length > 0"
          class="rounded-2xl border-2 border-orange-300 bg-orange-50/70 p-4 sm:p-5 transition-all">
          <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-orange-300">
            <div class="flex items-center gap-2">
              <span class="text-xs">🚨</span>
              <h3 class="text-xs sm:text-sm font-black tracking-tight text-orange-950">
                Radar de Atenção Imediata da Diretoria ({{ topCriticalProjects().length }} Projetos com Desvio ou Ponto de Atenção)
              </h3>
            </div>
            <span class="text-[10px] font-extrabold text-orange-900">Itens prioritários para deliberação na reunião de hoje</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div
              *ngFor="let item of topCriticalProjects()"
              class="p-3.5 rounded-xl border-2 border-orange-200 bg-white text-slate-900 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-1 mb-1.5">
                  <span class="text-[10px] font-black text-slate-700">{{ item.client }}</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    [ngClass]="item.ragStatus === 'red' ? 'bg-rose-100 text-rose-900 border border-rose-300 font-extrabold' : 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'">
                    {{ item.ragStatus === 'red' ? 'Com Desvio' : 'Atenção' }}
                  </span>
                </div>
                <h4 class="text-xs font-black leading-snug truncate text-slate-950" [title]="item.name">{{ item.name }}</h4>
                <p class="text-[11px] text-slate-800 mt-1.5 leading-snug font-medium line-clamp-3">
                  {{ hasAttentionPoints(item) ? item.attentionPoints : (item.ragStatus === 'red' ? 'Projeto com desvio de prazo ou esforço em relação ao acordo firmado.' : 'Atenção gerencial recomendada.') }}
                </p>
              </div>
              <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600">
                <ng-container *ngIf="item.category === 'maintenance'; else regularCritFooter">
                  <span class="font-bold text-purple-800">🛠️ Sustentação Contínua</span>
                  <span class="font-black text-slate-900">{{ formatHours(item.hoursExecuted) }}h no ciclo</span>
                </ng-container>
                <ng-template #regularCritFooter>
                  <span>Meta: <strong class="text-slate-900 font-bold">{{ formatDate(item.targetDelivery) }}</strong></span>
                  <span class="font-black text-slate-900">{{ item.progress }}% concluído</span>
                </ng-template>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. DELIBERAÇÕES & DECISÕES DA DIRETORIA -->
        <div class="rounded-2xl border-2 border-purple-300 bg-purple-50/70 p-4 sm:p-5 transition-all">
          <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-purple-300">
            <div class="flex items-center gap-2">
              <span class="text-xs">⚖️</span>
              <h3 class="text-xs sm:text-sm font-black tracking-tight text-purple-950">
                Deliberações & Decisões Estratégicas ({{ currentReport()?.boardDecisions?.length || 0 }})
              </h3>
            </div>
            <span class="text-[10px] font-extrabold text-purple-900">Decisões tomadas na reunião de diretoria</span>
          </div>

          <div *ngIf="currentReport()?.boardDecisions?.length; else emptyDecisions" class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              *ngFor="let dec of currentReport()?.boardDecisions"
              class="p-3.5 rounded-xl border-2 border-purple-200 bg-white text-slate-900 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 border border-purple-300 text-purple-900">
                    {{ dec.client }}
                  </span>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    [ngClass]="dec.status === 'approved' || dec.status === 'Alinhado' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold' : 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'">
                    {{ dec.status }}
                  </span>
                </div>
                <h4 class="text-xs font-black truncate leading-snug text-slate-950" [title]="dec.title">{{ dec.title }}</h4>
                <p class="text-[10px] leading-snug line-clamp-3 mt-1 text-slate-700 font-medium">{{ dec.impact || dec.description }}</p>
              </div>
              <div class="mt-2.5 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-600">
                <span>Prazo:</span>
                <strong class="text-purple-900 font-bold">{{ dec.deadline }}</strong>
              </div>
            </div>
          </div>
          <ng-template #emptyDecisions>
            <p class="text-xs text-purple-900 italic py-2">Nenhuma deliberação registrada para esta semana.</p>
          </ng-template>
        </div>

        <!-- 4. PROJETOS NO RADAR & ROADMAP ESTRATÉGICO -->
        <div class="rounded-2xl border-2 border-blue-300 bg-blue-50/70 p-4 sm:p-5 transition-all">
          <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-blue-300">
            <div class="flex items-center gap-2">
              <span class="text-xs">🔭</span>
              <h3 class="text-xs sm:text-sm font-black tracking-tight text-blue-950">
                Projetos no Radar & Roadmap Estratégico ({{ currentReport()?.roadmapProjects?.length || 0 }})
              </h3>
            </div>
            <span class="text-[10px] font-extrabold text-blue-900">Pipeline de novas demandas e expansões</span>
          </div>

          <div *ngIf="currentReport()?.roadmapProjects?.length; else emptyRoadmap"
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <div
              *ngFor="let road of currentReport()?.roadmapProjects"
              class="p-3.5 rounded-xl border-2 border-blue-200 bg-white text-slate-900 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 border border-blue-300 text-blue-900">{{ road.client }}</span>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full" [ngClass]="getRoadmapStageClass(road.stage)">{{ road.stage }}</span>
                </div>
                <h4 class="text-xs font-black truncate leading-snug text-slate-950" [title]="road.name">{{ road.name }}</h4>
                <p class="text-[10px] leading-snug line-clamp-2 mt-1 text-slate-700 font-medium">{{ road.description }}</p>
              </div>
              <div class="mt-2.5 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-600">
                <span>Início: <strong class="text-slate-800">{{ road.estimatedStart }}</strong></span>
                <span class="text-[9px] px-2 py-0.5 rounded-full font-black border shadow-2xs"
                  [ngClass]="getStrategicValueBadgeClass(road.strategicValue)">
                  Valor: {{ road.strategicValue }}
                </span>
              </div>
            </div>
          </div>
          <ng-template #emptyRoadmap>
            <p class="text-xs text-blue-900 italic py-2">Nenhum projeto em roadmap nesta edição.</p>
          </ng-template>
        </div>

        <!-- 5. BARRA DE FILTROS & BUSCA DO PORTFÓLIO -->
        <div class="pt-4 sm:pt-6">
          <app-filters [customProjects]="reportNewProjects()"></app-filters>
        </div>

        <!-- 6. CARDS EXECUTIVOS DOS PROJETOS (HIGH CONTRAST) -->
        <div *ngIf="displayedProjects().length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <div
            *ngFor="let p of displayedProjects()"
            class="rounded-2xl border-2 border-slate-300 bg-white p-4 flex flex-col justify-between transition-all hover:shadow-md">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    class="text-[9px] font-black px-1.5 py-0.2 rounded border shadow-2xs shrink-0 cursor-default"
                    [ngClass]="service.getPriorityBadgeClass(p.priority || 'P2')">
                    {{ p.priority || 'P2' }}
                  </span>
                  <img
                    *ngIf="p.clientLogo || service.getClientLogo(p.client)"
                    [src]="p.clientLogo || service.getClientLogo(p.client)"
                    [alt]="p.client"
                    class="h-4 max-w-[50px] object-contain rounded bg-white px-0.5 border border-slate-300 shadow-2xs"
                  />
                  <span
                    *ngIf="!p.clientLogo && !service.getClientLogo(p.client)"
                    class="text-[10px] font-black px-1.5 py-0.2 rounded border bg-slate-100 border-slate-300 text-slate-800">
                    {{ p.client }}
                  </span>
                  <span [ngClass]="service.getMilestoneBadgeClass(p.currentMilestone)" class="px-2 py-0.2 rounded font-bold text-[10px]">
                    {{ p.currentMilestone }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span
                    class="px-2 py-0.2 rounded-full text-[10px] font-extrabold shrink-0"
                    [ngClass]="getRagPillClass(p.ragStatus, p.status)">
                    {{ getRagLabel(p) }}
                  </span>
                </div>
              </div>

              <h4 class="text-xs sm:text-sm font-black tracking-tight truncate leading-snug mb-1 text-slate-950" [title]="p.name">
                {{ p.name }}
              </h4>

              <div *ngIf="p.systems && p.systems.length > 0" class="flex flex-wrap items-center gap-1 mb-2.5">
                <span
                  *ngFor="let sys of p.systems"
                  [ngClass]="service.getSystemBadgeClass(sys)"
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold border shadow-2xs">
                  {{ sys }}
                </span>
              </div>

              <!-- Progresso Físico & Stepper Segmentado da EAP -->
              <div class="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <!-- Progresso Físico -->
                <div class="mb-2">
                  <div class="flex items-center justify-between text-[10px] font-bold mb-1 text-slate-600">
                    <span class="flex items-center gap-1">
                      <span>Progresso:</span>
                      <strong class="text-slate-950 font-black">{{ p.progress }}%</strong>
                    </span>
                    <span *ngIf="p.targetDelivery" class="text-slate-500 font-medium text-[9px]">
                      Meta: <strong class="text-slate-900 font-bold">{{ formatDate(p.targetDelivery) }}</strong>
                    </span>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      [ngClass]="p.status === 'Congelado' ? 'bg-slate-400' : (p.status === 'Finalizado' ? 'bg-emerald-600' : (p.ragStatus === 'red' ? 'bg-rose-500' : (p.ragStatus === 'amber' ? 'bg-amber-500' : 'bg-blue-600')))"
                      [style.width.%]="p.progress">
                    </div>
                  </div>
                </div>

                <!-- Stepper Segmentado EAP (5 Fases) -->
                <div class="pt-2 border-t border-slate-200/80">
                  <div class="flex items-center justify-between text-[9px] font-bold mb-1.5">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">Etapa da EAP:</span>
                      <span class="font-black text-blue-700">{{ p.currentMilestone }}</span>
                    </div>
                    <span class="text-[9px] font-extrabold text-slate-500">
                      {{ getMilestoneStepLabel(p) }}
                    </span>
                  </div>
                  <div class="grid grid-cols-5 gap-1.5 text-center">
                    <div *ngFor="let m of milestones; let idx = index"
                      class="flex flex-col items-center group cursor-default"
                      [title]="(idx + 1) + '. ' + m">
                      <div
                        [ngClass]="getMilestoneStepClass(m, p.currentMilestone, p.status, 'light')"
                        class="w-full h-1.5 rounded-full transition-all">
                      </div>
                      <span
                        [ngClass]="getMilestoneLabelClass(m, p.currentMilestone, p.status, 'light')"
                        class="text-[8px] truncate w-full font-bold mt-0.5"
                        [title]="m">
                        {{ milestoneShortLabels[m] || m }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Attention Point / Frozen banner -->
              <div *ngIf="p.status === 'Congelado'"
                class="p-2.5 rounded-xl text-[10px] leading-snug mb-3 bg-slate-200 border-2 border-slate-300 text-slate-900 shadow-2xs font-medium">
                <strong>⏸️ Projeto Congelado:</strong> {{ hasAttentionPoints(p) ? p.attentionPoints : 'Atividades temporariamente pausadas pela gestão.' }}
              </div>
              <div *ngIf="p.status !== 'Congelado' && hasAttentionPoints(p)"
                class="p-2.5 rounded-xl text-[10px] leading-snug mb-3 shadow-2xs font-medium"
                [ngClass]="getAttentionBoxClass(p, 'light')">
                <strong>⚠️ Ponto de Atenção:</strong> {{ p.attentionPoints }}
              </div>

              <!-- Status Reports: Anterior & Atual (High Contrast) -->
              <div class="space-y-2 mb-2.5">
                <div class="p-2.5 rounded-xl bg-slate-100 border border-slate-300">
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">Status report anterior</span>
                  </div>
                  <p class="text-[11px] leading-relaxed text-slate-800 font-medium">
                    {{ p.previousStatusReport || 'Sem reporte anterior registrado.' }}
                  </p>
                </div>

                <div class="p-2.5 rounded-xl bg-blue-100/70 border-2 border-blue-300">
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="text-[9px] font-black text-blue-950 uppercase tracking-wider">Status report atual</span>
                  </div>
                  <p class="text-[11px] leading-relaxed text-blue-950 font-semibold">
                    {{ p.statusReport || 'Nenhum reporte registrado para este ciclo.' }}
                  </p>
                </div>
              </div>

              <!-- Equipe Alocada -->
              <div *ngIf="getAllTeamMembers(p).length > 0" class="mt-2.5 pt-2 border-t border-slate-200">
                <div class="flex items-center gap-1 mb-1.5">
                  <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <span>👥</span> Equipe Alocada
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    *ngIf="p.teamLeader || p.team?.leader"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
                    <span>⭐</span> {{ p.teamLeader || p.team?.leader }}
                  </span>
                  <span
                    *ngFor="let member of getNonLeaderMembers(p)"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                    {{ member }}
                  </span>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 mt-3">
              <span>Meta: <strong class="text-slate-900 font-bold">{{ formatDate(p.targetDelivery) }}</strong></span>
              <button
                (click)="service.openEapForProject(p.projectId)"
                class="text-blue-600 font-bold hover:underline cursor-pointer">
                Ver EAP →
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="displayedProjects().length === 0"
          class="py-12 bg-white rounded-2xl border-2 border-slate-300 text-center text-slate-500 text-xs shadow-2xs">
          Nenhum projeto encontrado para os filtros selecionados.
        </div>

        <!-- 5. SUSTENTAÇÃO -->
        <div class="pt-8 sm:pt-10">
          <div class="rounded-3xl border-2 border-purple-300/90 bg-gradient-to-b from-purple-50/70 via-white to-purple-50/30 p-4 sm:p-6 transition-all shadow-xs space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-purple-200 gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
              🛠️
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base sm:text-lg font-black tracking-tight text-purple-950">
                  Sustentação
                </h3>
                <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900 border border-purple-300 shadow-2xs">
                  {{ currentReport()?.maintenanceSection?.projects?.length || 0 }} sistemas mantidos
                </span>
              </div>
              <p class="text-[11px] text-purple-900/80 font-medium mt-0.5">
                Acompanhamento contínuo de suporte N2/N3, estabilização de plataformas e melhorias operacionais • {{ currentReport()?.maintenanceSection?.periodLabel || currentReport()?.period }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 self-start sm:self-auto">
            <span class="text-xs font-black px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
              ⏱️ {{ formatHours(currentReport()?.maintenanceSection?.totalHours) }}h executadas no ciclo
            </span>
          </div>
        </div>

        <!-- TOP KPI STRIP FOR SUSTENTAÇÃO -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <!-- KPI 1: Esforço em Sustentação -->
          <div class="p-3.5 rounded-2xl bg-white border border-purple-200/90 shadow-2xs">
            <span class="text-[10px] font-extrabold text-purple-900 uppercase tracking-wider block">Esforço em Suporte</span>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-2xl font-black text-purple-950">
                {{ formatHours(currentReport()?.maintenanceSection?.totalHours) }}
              </span>
              <span class="text-xs font-bold text-purple-700">horas</span>
            </div>
            <div class="mt-2 w-full bg-purple-100 rounded-full h-1.5 overflow-hidden">
              <div class="bg-purple-600 h-full rounded-full" [style.width.%]="currentReport()?.maintenanceSection?.maintenancePercent || 0"></div>
            </div>
            <span class="text-[9px] text-purple-800/80 font-semibold block mt-1">
              {{ currentReport()?.maintenanceSection?.maintenancePercent || 0 }}% da capacidade total no ciclo ({{ formatHours(currentReport()?.maintenanceSection?.totalPeriodHours) }}h)
            </span>
          </div>

          <!-- KPI 2: Novos Projetos vs Sustentação -->
          <div class="p-3.5 rounded-2xl bg-white border border-purple-200/90 shadow-2xs">
            <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Divisão de Capacidade</span>
            <div class="flex items-baseline justify-between mt-1">
              <span class="text-xs font-black text-blue-700">🚀 {{ currentReport()?.maintenanceSection?.newProjectPercent ?? 100 }}% Novos</span>
              <span class="text-xs font-black text-purple-700">🛠️ {{ currentReport()?.maintenanceSection?.maintenancePercent ?? 0 }}% Sust.</span>
            </div>
            <div class="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
              <div class="bg-blue-600 h-full" [style.width.%]="currentReport()?.maintenanceSection?.newProjectPercent ?? 100"></div>
              <div class="bg-purple-600 h-full" [style.width.%]="currentReport()?.maintenanceSection?.maintenancePercent ?? 0"></div>
            </div>
            <span class="text-[9px] text-slate-500 font-medium block mt-1">
              {{ formatHours(currentReport()?.maintenanceSection?.newProjectHours) }}h Novos vs {{ formatHours(currentReport()?.maintenanceSection?.totalHours) }}h Sust.
            </span>
          </div>

          <!-- KPI 3: Sistemas em Sustentação -->
          <div class="p-3.5 rounded-2xl bg-white border border-purple-200/90 shadow-2xs">
            <span class="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block">Sistemas Mantidos</span>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-2xl font-black text-emerald-950">
                {{ currentReport()?.maintenanceSection?.projects?.length || 4 }}
              </span>
              <span class="text-xs font-bold text-emerald-700">aplicações</span>
            </div>
            <span class="text-[9px] text-emerald-800 font-semibold block mt-3">
              {{ currentReport()?.maintenanceSection?.activeSystemsCount || 0 }} com esforço apontado no ciclo
            </span>
          </div>

          <!-- KPI 4: Equipe Alocada -->
          <div class="p-3.5 rounded-2xl bg-white border border-purple-200/90 shadow-2xs">
            <span class="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">Equipe Alocada</span>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-2xl font-black text-slate-900">
                {{ getMaintenanceTeamMembersCount() }}
              </span>
              <span class="text-xs font-bold text-slate-600">profissionais</span>
            </div>
            <span class="text-[9px] text-slate-500 font-medium block mt-3">
              Atuando em sustentação no período
            </span>
          </div>

        </div>

        <!-- 2 ANALYTICAL CHARTS (ESFORÇO POR SISTEMA & HISTÓRICO MENSAL) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          <!-- Chart 1: Distribuição de Esforço por Sistema Mantido (Col 6) -->
          <div class="lg:col-span-6 bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                <span class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊</span> Esforço por Sistema de Sustentação
                </span>
                <span class="text-[10px] font-bold text-slate-500">
                  Total no ciclo: {{ formatHours(getMaintenanceTotalHours()) }}h
                </span>
              </div>

              <!-- Systems Horizontal Bars -->
              <div class="space-y-2.5">
                <div *ngFor="let mp of currentReport()?.maintenanceSection?.projects" class="text-xs">
                  <div class="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span class="truncate max-w-[200px]" [title]="mp.name">{{ mp.name }}</span>
                    <div class="text-right shrink-0">
                      <span class="font-black text-purple-950">{{ formatHours(mp.hoursExecuted) }}h</span>
                      <span class="text-purple-700 font-extrabold text-[10px] ml-1">({{ getProjectMaintenanceShare(mp.hoursExecuted) }}%)</span>
                    </div>
                  </div>
                  <div class="w-full bg-purple-50 rounded-full h-2 overflow-hidden border border-purple-100">
                    <div
                      class="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                      [style.width.%]="getProjectMaintenanceShare(mp.hoursExecuted)">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p class="text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
              Horas executadas por sistema no ciclo do relatório ({{ currentReport()?.period }}).
            </p>
          </div>

          <!-- Chart 2: Histórico de Esforço Mensal (Col 6) -->
          <div class="lg:col-span-6 bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                <span class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📈</span> Histórico de Esforço Mensal (2026)
                </span>
                <span class="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Sustentação Contínua
                </span>
              </div>

              <!-- Compact Monthly Mini Bar Chart -->
              <div class="h-28 flex items-end justify-between gap-1 pt-4 pb-1">
                <div *ngFor="let m of (service.maintenanceMetrics()?.monthlyHistory || []).slice(0, 10)"
                  class="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                  
                  <!-- Tooltip -->
                  <div class="absolute -top-7 opacity-0 group-hover:opacity-100 transition pointer-events-none z-20 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                    {{ m.label }}: {{ formatHours(m.maintenanceHours) }}h ({{ m.maintenancePercent }}%)
                  </div>

                  <!-- Bar -->
                  <div class="w-full bg-purple-100/80 rounded-t-md hover:bg-purple-200 transition-all flex flex-col justify-end overflow-hidden h-20">
                    <div
                      class="w-full bg-purple-600 rounded-t-md group-hover:bg-purple-700 transition-all"
                      [style.height.%]="getMonthlyBarHeight(m.maintenanceHours)">
                    </div>
                  </div>

                  <!-- Month label -->
                  <span class="text-[8px] font-bold text-slate-500 mt-1 uppercase">
                    {{ m.label.split('/')[0] }}
                  </span>
                </div>
              </div>
            </div>

            <p class="text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Volumetria mensal de horas em sustentação ao longo de 2026.</span>
              <span class="font-bold text-purple-800">10 meses consolidados</span>
            </p>
          </div>

        </div>

        <!-- Maintenance Projects Grid -->
        <div *ngIf="currentReport()?.maintenanceSection?.projects && currentReport()!.maintenanceSection!.projects.length > 0; else emptyMaintenance"
          class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          <div
            *ngFor="let mp of currentReport()!.maintenanceSection!.projects"
            class="p-4 sm:p-5 rounded-2xl border-2 border-purple-200/90 bg-white text-slate-900 shadow-xs flex flex-col justify-between hover:border-purple-400 transition-all">
            
            <div class="space-y-3">
              <!-- Top bar with Client, Project Name and Status -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                    {{ mp.client }}
                  </span>
                  <h4 class="text-sm font-black truncate text-slate-900 leading-snug" [title]="mp.name">
                    {{ mp.name }}
                  </h4>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span
                    class="text-[9px] font-extrabold px-2 py-0.5 rounded-full"
                    [ngClass]="mp.ragStatus === 'red' ? 'bg-rose-100 text-rose-800 border border-rose-300' : (mp.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')">
                    {{ mp.ragStatus === 'red' ? '⚠️ Desvio' : (mp.ragStatus === 'amber' ? '⚠️ Atenção' : '✓ No Prazo') }}
                  </span>
                  <span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200" [title]="'Total acumulado histórico: ' + formatHours(mp.lifetimeHoursExecuted) + 'h'">
                    {{ formatHours(mp.hoursExecuted) }}h no ciclo
                  </span>
                </div>
              </div>

              <!-- Ponto de Atenção -->
              <div *ngIf="hasAttentionPoints(mp)"
                class="p-2.5 rounded-xl text-[10px] leading-snug shadow-2xs font-medium"
                [ngClass]="getAttentionBoxClass(mp, 'light')">
                <strong>⚠️ Ponto de Atenção:</strong> {{ mp.attentionPoints }}
              </div>

              <!-- Status Reports: Anterior & Atual -->
              <div class="space-y-2">
                <!-- Status Report Anterior -->
                <div class="p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs">
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">Status report anterior</span>
                  </div>
                  <p class="text-[11px] leading-relaxed text-slate-800 font-medium">
                    {{ mp.previousStatusReport || 'Sem reporte anterior registrado.' }}
                  </p>
                </div>

                <!-- Status Report Atual -->
                <div class="p-2.5 rounded-xl bg-purple-100/70 border-2 border-purple-300 text-xs">
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="text-[9px] font-black text-purple-950 uppercase tracking-wider">Status report atual</span>
                  </div>
                  <p class="text-[11px] leading-relaxed text-purple-950 font-semibold">
                    {{ mp.statusReport || mp.summary || 'Sustentação contínua e acompanhamento regular.' }}
                  </p>
                </div>
              </div>

              <!-- Equipe Alocada por Projeto -->
              <div *ngIf="getAllTeamMembers(mp).length > 0" class="pt-2 border-t border-slate-100">
                <div class="flex items-center gap-1 mb-1.5">
                  <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <span>👥</span> Equipe Alocada
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    *ngIf="mp.teamLeader || mp.team?.leader"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                    <span>⭐</span> {{ mp.teamLeader || mp.team?.leader }}
                  </span>
                  <span
                    *ngFor="let member of getNonLeaderMembers(mp)"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                    {{ member }}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        <ng-template #emptyMaintenance>
          <div class="py-6 px-4 rounded-xl border border-dashed border-purple-200 bg-white text-center">
            <span class="text-xl mb-1 block">🛠️</span>
            <p class="text-xs text-slate-600 font-medium">
              Nenhum projeto categorizado como Sustentação neste ciclo.
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Para incluir projetos nesta seção, acesse a Curadoria e selecione a natureza "🛠️ Sustentação".
            </p>
          </div>
        </ng-template>

        </div>
      </div>
    </div>

      <!-- ======================================================== -->
      <!-- INTERACTIVE PPT PRESENTER MODAL (SCREEN FULLSCREEN 16:9) -->
      <!-- ======================================================== -->
      <div *ngIf="isPresenterOpen()" class="interactive-presenter-modal fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 text-white animate-fade-in print:hidden">
        
        <!-- Top Navigation Bar -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
          <div class="flex items-center gap-2.5">
            <span class="text-lg">🖥️</span>
            <div>
              <h2 class="text-xs sm:text-sm font-black tracking-tight text-white leading-none">
                Apresentação Executiva • Status Report
              </h2>
              <p class="text-[10px] text-slate-400 mt-0.5 font-medium">
                Edição {{ service.formatEditionTitle(currentReport()) }} • Modo Paisagem (16:9)
              </p>
            </div>
          </div>

          <!-- Slide Controls -->
          <div class="flex items-center gap-2">
            <button
              (click)="prevSlide()"
              [disabled]="currentSlideIndex() === 0"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white transition flex items-center gap-1 cursor-pointer">
              <span>◀</span> Anterior
            </button>

            <!-- Slide indicator pill -->
            <span class="text-xs font-black px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-blue-400">
              Slide {{ currentSlideIndex() + 1 }} de {{ totalSlides() }}
            </span>

            <button
              (click)="nextSlide()"
              [disabled]="currentSlideIndex() === totalSlides() - 1"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white transition flex items-center gap-1 cursor-pointer">
              Próximo <span>▶</span>
            </button>

            <!-- Quick Slide Dots / Pills -->
            <div class="hidden lg:flex items-center gap-1 ml-2 pl-2 border-l border-slate-800">
              <button
                *ngFor="let s of [].constructor(totalSlides()); let idx = index"
                (click)="goToSlide(idx)"
                class="w-6 h-6 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-center"
                [ngClass]="currentSlideIndex() === idx ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'">
                {{ idx + 1 }}
              </button>
            </div>
          </div>

          <!-- Actions: Theme Toggle, Download Landscape PDF & Exit -->
          <div class="flex items-center gap-2">
            <!-- Theme toggle inside presenter -->
            <button
              (click)="togglePresentationTheme()"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
              title="Alternar tema da apresentação">
              <span>{{ presentationTheme() === 'dark' ? '🌙 Escuro' : '☀️ Claro' }}</span>
            </button>

            <button
              (click)="printReport()"
              [disabled]="isDownloadingPdf()"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Baixar esta apresentação em PDF Paisagem">
              <span>{{ isDownloadingPdf() ? '⏳ Gerando PDF...' : '📥 Baixar PDF Paisagem' }}</span>
            </button>

            <button
              (click)="closePresenter()"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer"
              title="Fechar apresentação (Esc)">
              ✕ Sair
            </button>
          </div>
        </div>

        <!-- Center Stage: 16:9 Landscape Canvas -->
        <div class="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div
            class="aspect-[16/9] w-full max-w-[1260px] max-h-[82vh] rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden transition-all"
            [ngClass]="presentationTheme() === 'dark' ? 'bg-[#090d16] text-white border border-slate-800' : 'bg-slate-200/90 text-slate-900 border-2 border-slate-400'">
            
            <!-- Slide 0: Cover / Macro Executive Dashboard -->
            <ng-container *ngIf="currentSlideIndex() === 0">
              <ng-container [ngTemplateOutlet]="slide1Tpl"></ng-container>
            </ng-container>

            <!-- Slides 1..N: Project Chunks (2 cards per slide) -->
            <ng-container *ngIf="currentSlideIndex() >= 1 && currentSlideIndex() <= projectChunks().length">
              <ng-container
                [ngTemplateOutlet]="projectSlideTpl"
                [ngTemplateOutletContext]="{ chunk: projectChunks()[currentSlideIndex() - 1], chunkIdx: currentSlideIndex() - 1 }">
              </ng-container>
            </ng-container>

            <!-- Slide Sustentação (if exists) -->
            <ng-container *ngIf="hasMaintenance() && currentSlideIndex() === getMaintenanceSlideIndex()">
              <ng-container [ngTemplateOutlet]="maintenanceSlideTpl"></ng-container>
            </ng-container>

            <!-- Slides Roadmap Estratégico (paginated in chunks of 15 cards: 3 rows x 5 cols) -->
            <ng-container *ngIf="hasRoadmap() && currentSlideIndex() >= getRoadmapStartSlideIndex() && currentSlideIndex() < totalSlides()">
              <ng-container
                [ngTemplateOutlet]="roadmapSlideTpl"
                [ngTemplateOutletContext]="{
                  chunk: roadmapChunks()[currentSlideIndex() - getRoadmapStartSlideIndex()],
                  chunkIdx: currentSlideIndex() - getRoadmapStartSlideIndex()
                }">
              </ng-container>
            </ng-container>

          </div>
        </div>

        <!-- Bottom Keyboard Help Hint -->
        <div class="text-center text-[11px] text-slate-400 py-1 border-t border-slate-800/80">
          <span>💡 Dica: Navegue com as setas <strong>◀</strong> <strong>▶</strong> do teclado ou <strong>Barra de Espaço</strong> • Pressione <strong>Esc</strong> para sair.</span>
        </div>

      </div>

      <!-- ======================================================== -->
      <!-- PPT SLIDES PRINT CONTAINER (VISIBLE EXCLUSIVELY ON PRINT) -->
      <!-- ======================================================== -->
      <div class="ppt-slides-print-container">
        
        <!-- Slide 1: Visão Consolidada & Indicadores Executivos -->
        <div class="ppt-slide" [ngClass]="presentationTheme() === 'dark' ? 'theme-dark' : 'theme-light'">
          <ng-container [ngTemplateOutlet]="slide1Tpl"></ng-container>
        </div>

        <!-- Slides 2..N: Projetos em Execução (2 por página paisagem) -->
        <div class="ppt-slide" [ngClass]="presentationTheme() === 'dark' ? 'theme-dark' : 'theme-light'" *ngFor="let chunk of projectChunks(); let chunkIdx = index">
          <ng-container
            [ngTemplateOutlet]="projectSlideTpl"
            [ngTemplateOutletContext]="{ chunk: chunk, chunkIdx: chunkIdx }">
          </ng-container>
        </div>

        <!-- Slide Sustentação: Indicadores, Gráficos e Sistemas Mantidos -->
        <div class="ppt-slide" [ngClass]="presentationTheme() === 'dark' ? 'theme-dark' : 'theme-light'" *ngIf="hasMaintenance()">
          <ng-container [ngTemplateOutlet]="maintenanceSlideTpl"></ng-container>
        </div>

        <!-- Slides Finais: Roadmap Estratégico & Pipeline Futuro (15 por página paisagem) -->
        <div class="ppt-slide" [ngClass]="presentationTheme() === 'dark' ? 'theme-dark' : 'theme-light'" *ngFor="let rChunk of roadmapChunks(); let rChunkIdx = index">
          <ng-container
            [ngTemplateOutlet]="roadmapSlideTpl"
            [ngTemplateOutletContext]="{ chunk: rChunk, chunkIdx: rChunkIdx }">
          </ng-container>
        </div>

      </div>

      <!-- ======================================================== -->
      <!-- REUSABLE SLIDE TEMPLATES (SHARED BY SCREEN AND PRINT)     -->
      <!-- ======================================================== -->

      <!-- TEMPLATE 1: CAPA & VISÃO CONSOLIDADA (TODOS OS 13 INDICADORES + PRIORIDADES + SISTEMAS) -->
      <ng-template #slide1Tpl>
        <div class="h-full flex flex-col justify-between">
          <!-- Slide Header (Executive High-Contrast Header Bar) -->
          <div class="flex items-center justify-between px-3.5 py-2 rounded-xl border mb-1.5 bg-slate-900 border-slate-800 text-white shadow-xs">
            <div class="flex items-center gap-3">
              <img src="/assets/logos/ilc.png" alt="ILC Logística" class="h-7 w-auto object-contain bg-white rounded p-0.5 border border-slate-300 shadow-2xs" onerror="this.style.display='none'" />
              <div *ngIf="service.selectedClient() !== 'Todos' && service.getClientLogo(service.selectedClient())" class="flex items-center gap-2">
                <span class="text-slate-600 font-light">|</span>
                <img [src]="service.getClientLogo(service.selectedClient())" [alt]="service.selectedClient()" class="h-7 max-w-[80px] object-contain rounded bg-white p-0.5 border border-slate-300 shadow-2xs" />
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-black tracking-wider uppercase text-white leading-none">STATUS REPORT EXECUTIVO</span>
                <span class="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">Portfólio de Projetos Estratégicos & Operações</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                📅 {{ currentReport()?.period }}
              </span>
              <span class="text-[9px] font-black px-2.5 py-1 rounded-md bg-blue-900/90 text-blue-200 border border-blue-700">
                Edição {{ service.formatEditionTitle(currentReport()) }}
              </span>
              <span class="text-[9px] font-bold px-2.5 py-1 rounded-md bg-emerald-900/90 text-emerald-200 border border-emerald-700">
                Reunião: {{ formatDate(currentReport()?.meetingDate) }}
              </span>
            </div>
          </div>

          <!-- Slide Body -->
          <div class="flex-1 flex flex-col justify-between gap-2 overflow-hidden my-0.5">
            <!-- Top Row: Resumo Executivo (col-span-4) + Todos os 13 Indicadores Executivos (col-span-8) -->
            <div class="grid grid-cols-12 gap-2.5 h-[54%]">
              
              <!-- Resumo Executivo + Sistemas -->
              <div
                class="col-span-4 p-2.5 rounded-xl flex flex-col justify-between shadow-xs border"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900/95 border-blue-500/40 text-slate-200' : 'bg-white border-2 border-blue-300 text-slate-900'">
                <div>
                  <div class="flex items-center gap-1.5 mb-1">
                    <span class="text-xs">📌</span>
                    <h3 class="text-[11px] font-black uppercase tracking-tight"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-blue-400' : 'text-blue-950'">
                      Síntese Executiva do Ciclo
                    </h3>
                  </div>
                  <p class="text-[10px] leading-snug font-medium line-clamp-6"
                    [ngClass]="presentationTheme() === 'dark' ? 'text-slate-200' : 'text-slate-800'">
                    {{ currentReport()?.executiveSummary || 'Acompanhamento semanal de entregas e alinhamento dos marcos operacionais com a diretoria.' }}
                  </p>
                </div>

                <!-- Distribuição por Sistemas -->
                <div *ngIf="systemMetrics().length > 0" class="pt-1.5 border-t"
                  [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800' : 'border-blue-200'">
                  <span class="text-[8px] font-black uppercase tracking-wider block mb-1"
                    [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                    🖥️ Projetos por Sistema:
                  </span>
                  <div class="flex flex-wrap gap-1">
                    <span *ngFor="let s of systemMetrics()"
                      class="px-1.5 py-0.5 rounded text-[8px] font-black border flex items-center gap-1"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'">
                      <span>{{ s.icon }} {{ s.name }}:</span>
                      <strong class="text-blue-500">{{ s.count }}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Todos os 13 Indicadores Executivos + Prioridades -->
              <div
                class="col-span-8 p-3 rounded-xl flex flex-col justify-between shadow-xs border h-full"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white border-2 border-slate-300 text-slate-900'">
                
                <!-- Card Header -->
                <div class="flex items-center justify-between shrink-0">
                  <h3 class="text-xs font-black uppercase tracking-tight flex items-center gap-1.5"
                    [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'">
                    <span>📊</span> Painel de Indicadores Executivos (13 KPIs)
                  </h3>
                  <span class="text-[9px] font-bold"
                    [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                    Snapshot Oficial da Edição {{ service.formatEditionTitle(currentReport()) }}
                  </span>
                </div>

                <!-- Grid de Indicadores (Ocupando 100% da altura livre do card) -->
                <div class="flex-1 grid grid-rows-2 gap-2 my-2 min-h-0">
                  <!-- Linha 1: 7 Indicadores Principais -->
                  <div class="grid grid-cols-7 gap-2 h-full">
                    <!-- 1. Ativos -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full text-slate-400">⚡ Ativos</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getActiveCount() }}</span>
                      <span class="text-[8px] font-semibold block truncate w-full text-slate-400">em andamento</span>
                    </div>
                    <!-- 2. Saúde -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-teal-950/70 border-teal-600/70 text-teal-300' : 'bg-emerald-50 border border-emerald-300 text-emerald-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">💚 Saúde</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getPortfolioHealth() }}%</span>
                      <span class="text-[8px] block truncate w-full font-bold">do portfólio</span>
                    </div>
                    <!-- 3. Avanço -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-blue-950/70 border-blue-600/70 text-blue-300' : 'bg-blue-50 border border-blue-300 text-blue-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">📈 Avanço</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getAverageProgress() }}%</span>
                      <span class="text-[8px] block truncate w-full font-bold">conclusão física</span>
                    </div>
                    <!-- 4. Horas -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-sky-950/70 border-sky-600/70 text-sky-300' : 'bg-sky-50 border border-sky-300 text-sky-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">⏱️ Horas</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getHoursConsumption().percent }}%</span>
                      <span class="text-[7.5px] block truncate w-full font-bold">{{ formatHours(getHoursConsumption().executed) }}h/{{ formatHours(getHoursConsumption().agreed) }}h</span>
                    </div>
                    <!-- 5. No Prazo -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300' : 'bg-emerald-50 border border-emerald-300 text-emerald-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">🟢 No Prazo</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getOnTrackCount() }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">{{ getPercent(getOnTrackCount(), getActiveCount()) }}% ativos</span>
                    </div>
                    <!-- 6. Atenção -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-amber-950/70 border-amber-600/70 text-amber-300' : 'bg-amber-50 border border-amber-300 text-amber-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">🟡 Atenção</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getAttentionCount() }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">risco moderado</span>
                    </div>
                    <!-- 7. Desvio -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-rose-950/70 border-rose-600/70 text-rose-300' : 'bg-rose-50 border border-rose-300 text-rose-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">🔴 Desvio</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getCriticalCount() }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">desvio crítico</span>
                    </div>
                  </div>

                  <!-- Linha 2: 6 Indicadores de Prazos, Governança e Pipeline -->
                  <div class="grid grid-cols-6 gap-2 h-full">
                    <!-- 8. Desvio Médio -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="getAverageVarianceDays().delayedCount > 0 ? (presentationTheme() === 'dark' ? 'bg-rose-950/70 border-rose-600/70 text-rose-300' : 'bg-rose-50 border border-rose-300 text-rose-950') : (presentationTheme() === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border border-slate-300 text-slate-800')">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">⏳ Desvio Médio</span>
                      <span class="text-xl font-black block leading-none my-1">+{{ getAverageVarianceDays().avgDays }}d</span>
                      <span class="text-[8px] block truncate w-full font-bold">{{ getAverageVarianceDays().delayedCount > 0 ? (getAverageVarianceDays().delayedCount + ' projeto(s)') : 'sem atrasos' }}</span>
                    </div>
                    <!-- 9. Entregas -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300' : 'bg-emerald-50 border border-emerald-300 text-emerald-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">🎯 Entregas</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getDeliveriesThisMonthCount() }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">em {{ currentMonthName }}</span>
                    </div>
                    <!-- 10. No Radar -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-orange-950/70 border-orange-600/70 text-orange-300' : 'bg-orange-50 border border-orange-300 text-orange-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">🚨 No radar</span>
                      <span class="text-xl font-black block leading-none my-1">{{ topCriticalProjects().length }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">radar diretoria</span>
                    </div>
                    <!-- 11. Deliberações -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-purple-950/70 border-purple-600/70 text-purple-300' : 'bg-purple-50 border border-purple-300 text-purple-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">⚖️ Pautas</span>
                      <span class="text-xl font-black block leading-none my-1">{{ currentReport()?.boardDecisions?.length || 0 }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">deliberações</span>
                    </div>
                    <!-- 12. Congelados -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-200 border border-slate-300 text-slate-800'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">❄️ Pausa</span>
                      <span class="text-xl font-black block leading-none my-1">{{ getFrozenCount() }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">congelados</span>
                    </div>
                    <!-- 13. Roadmap -->
                    <div class="h-full px-1.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-blue-950/70 border-blue-600/70 text-blue-300' : 'bg-blue-50 border border-blue-300 text-blue-950'">
                      <span class="text-[8.5px] font-extrabold uppercase block truncate w-full">🔭 Roadmap</span>
                      <span class="text-xl font-black block leading-none my-1">{{ currentReport()?.roadmapProjects?.length || 0 }}</span>
                      <span class="text-[8px] block truncate w-full font-bold">pipeline futuro</span>
                    </div>
                  </div>
                </div>

                <!-- Priority Row -->
                <div class="pt-2 border-t flex items-center justify-between text-[10px] shrink-0"
                  [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800' : 'border-slate-200'">
                  <span class="font-extrabold" [ngClass]="presentationTheme() === 'dark' ? 'text-slate-300' : 'text-slate-700'">🎯 Projetos por Prioridade:</span>
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-lg font-black text-[9px]"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-rose-950/80 text-rose-200 border border-rose-700' : 'bg-rose-100 text-rose-900 border border-rose-300'">
                      P1 Crítica: {{ getPriorityCount('P1') }}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-lg font-black text-[9px]"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-amber-950/80 text-amber-200 border border-amber-700' : 'bg-amber-100 text-amber-900 border border-amber-300'">
                      P2 Alta: {{ getPriorityCount('P2') }}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-lg font-black text-[9px]"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-blue-950/80 text-blue-200 border border-blue-700' : 'bg-blue-100 text-blue-900 border border-blue-300'">
                      P3 Média: {{ getPriorityCount('P3') }}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-lg font-black text-[9px]"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-800 border border-slate-300'">
                      P4 Baixa: {{ getPriorityCount('P4') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Row: Radar de Atenção (50%) + Deliberações da Diretoria (50%) -->
            <div class="grid grid-cols-2 gap-2.5 h-[44%]">
              
              <!-- Radar de Atenção -->
              <div
                class="p-3 rounded-xl flex flex-col justify-between shadow-xs overflow-hidden border"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-orange-950/30 border-orange-500/40 text-slate-200' : 'bg-white border-2 border-orange-300 text-slate-900'">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-xs font-black uppercase tracking-tight flex items-center gap-1.5"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-orange-400' : 'text-orange-950'">
                      <span>🚨</span> Radar de Atenção da Diretoria ({{ topCriticalProjects().length }})
                    </h3>
                    <span class="text-[9px] font-bold" [ngClass]="presentationTheme() === 'dark' ? 'text-orange-300' : 'text-orange-900'">
                      Desvios & Ações Mitigatórias
                    </span>
                  </div>
                  <div *ngIf="topCriticalProjects().length > 0; else noCritical"
                    class="grid gap-1.5 overflow-hidden"
                    [ngClass]="topCriticalProjects().length > 2 ? 'grid-cols-2' : 'grid-cols-1'">
                    <div *ngFor="let item of topCriticalProjects()"
                      class="p-1.5 rounded-lg border shadow-2xs flex flex-col justify-between"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-orange-500/40 text-slate-200' : 'bg-orange-50/70 border-2 border-orange-200 text-slate-900'">
                      <div class="flex items-center justify-between gap-1 mb-0.5">
                        <span class="text-[9px] font-black truncate"
                          [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'">
                          {{ item.client }} • {{ item.name }}
                        </span>
                        <span class="text-[8px] font-black px-1.5 py-0.2 rounded-full shrink-0"
                          [ngClass]="item.ragStatus === 'red' ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-300'">
                          {{ item.ragStatus === 'red' ? 'Desvio' : 'Atenção' }}
                        </span>
                      </div>
                      <p class="text-[8px] leading-tight line-clamp-2"
                        [ngClass]="presentationTheme() === 'dark' ? 'text-slate-300' : 'text-slate-800'">
                        {{ hasAttentionPoints(item) ? item.attentionPoints : (item.ragStatus === 'red' ? 'Projeto com desvio de prazo ou esforço.' : 'Atenção gerencial.') }}
                      </p>
                    </div>
                  </div>
                  <ng-template #noCritical>
                    <p class="text-xs italic py-4 text-center text-slate-400">Nenhum projeto em desvio crítico nesta edição.</p>
                  </ng-template>
                </div>
                <span class="text-[9px] font-bold block pt-1 border-t"
                  [ngClass]="presentationTheme() === 'dark' ? 'border-orange-500/30 text-orange-400' : 'border-orange-200 text-orange-900'">
                  Acompanhamento prioritário pelo comitê executivo
                </span>
              </div>

              <!-- Deliberações da Diretoria -->
              <div
                class="p-3 rounded-xl flex flex-col justify-between shadow-xs overflow-hidden border"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-purple-950/30 border-purple-500/40 text-slate-200' : 'bg-white border-2 border-purple-300 text-slate-900'">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-xs font-black uppercase tracking-tight flex items-center gap-1.5"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-purple-400' : 'text-purple-950'">
                      <span>⚖️</span> Deliberações & Decisões Estratégicas ({{ currentReport()?.boardDecisions?.length || 0 }})
                    </h3>
                    <span class="text-[9px] font-bold" [ngClass]="presentationTheme() === 'dark' ? 'text-purple-300' : 'text-purple-900'">
                      Pautas da Reunião
                    </span>
                  </div>
                  <div *ngIf="currentReport()?.boardDecisions?.length; else noDecisions" class="space-y-1.5 overflow-hidden">
                    <div *ngFor="let dec of currentReport()?.boardDecisions?.slice(0, 2)"
                      class="p-2 rounded-lg border shadow-2xs"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-purple-500/40 text-slate-200' : 'bg-purple-50/70 border-2 border-purple-200 text-slate-900'">
                      <div class="flex items-center justify-between gap-1 mb-0.5">
                        <span class="text-[10px] font-black truncate"
                          [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'">
                          {{ dec.title }}
                        </span>
                        <span class="text-[8px] font-bold px-1.5 py-0.2 rounded shrink-0"
                          [ngClass]="presentationTheme() === 'dark' ? 'bg-purple-950 text-purple-300 border border-purple-700' : 'bg-purple-100 text-purple-900 border border-purple-300'">
                          Prazo: {{ dec.deadline }}
                        </span>
                      </div>
                      <p class="text-[10px] leading-snug line-clamp-2"
                        [ngClass]="presentationTheme() === 'dark' ? 'text-slate-300' : 'text-slate-800'">
                        {{ dec.impact || dec.description }}
                      </p>
                    </div>
                  </div>
                  <ng-template #noDecisions>
                    <p class="text-xs italic py-4 text-center text-slate-400">Nenhuma deliberação registrada nesta edição.</p>
                  </ng-template>
                </div>
                <span class="text-[9px] font-bold block pt-1 border-t"
                  [ngClass]="presentationTheme() === 'dark' ? 'border-purple-500/30 text-purple-400' : 'border-purple-200 text-purple-900'">
                  Alinhamento de responsabilidades e datas de entrega
                </span>
              </div>
            </div>
          </div>

          <!-- Slide Footer -->
          <div class="flex items-center justify-between pt-1.5 mt-1 border-t text-[9px] font-semibold"
            [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'">
            <span>ILC - Integrator Logistics Company • Governança & Gestão de Projetos</span>
            <span class="text-slate-500">Relatório Executivo de Diretoria</span>
            <span class="font-extrabold" [ngClass]="presentationTheme() === 'dark' ? 'text-slate-200' : 'text-slate-900'">
              Slide 1 de {{ totalSlides() }}
            </span>
          </div>
        </div>
      </ng-template>

      <!-- TEMPLATE 2: PROJETOS EM EXECUÇÃO (2 CARDS EM PAISAGEM) -->
      <ng-template #projectSlideTpl let-chunk="chunk" let-chunkIdx="chunkIdx">
        <div class="h-full flex flex-col justify-between">
          <!-- Slide Header (Executive High-Contrast Header Bar) -->
          <div class="flex items-center justify-between px-3.5 py-2 rounded-xl border mb-2 bg-slate-900 border-slate-800 text-white shadow-xs">
            <div class="flex items-center gap-3">
              <img src="/assets/logos/ilc.png" alt="ILC Logística" class="h-7 w-auto object-contain bg-white rounded p-0.5 border border-slate-300 shadow-2xs" onerror="this.style.display='none'" />
              <div class="flex flex-col">
                <span class="text-xs font-black tracking-wider uppercase text-white leading-none">STATUS REPORT EXECUTIVO • PROJETOS EM EXECUÇÃO</span>
                <span class="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">
                  Projetos {{ chunkIdx * 2 + 1 }} a {{ getChunkEnd(chunkIdx) }} de {{ displayedProjects().length }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-black px-2.5 py-1 rounded-md bg-blue-900/90 text-blue-200 border border-blue-700">
                Edição {{ service.formatEditionTitle(currentReport()) }}
              </span>
              <span class="text-[9px] font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Período: {{ currentReport()?.period }}
              </span>
            </div>
          </div>

          <!-- 2 Project Cards Grid (Landscape 2 columns) -->
          <div class="grid grid-cols-2 gap-4 flex-1 overflow-hidden my-1">
            <div *ngFor="let p of chunk"
              class="p-3.5 rounded-xl flex flex-col justify-between shadow-xs overflow-hidden border"
              [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-2 border-slate-300 text-slate-900'">
              <div>
                <!-- Card Top Bar: Priority + Client Logo + Milestone + Status -->
                <div class="flex items-center justify-between gap-1.5 mb-1.5">
                  <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span class="text-[9px] font-black px-1.5 py-0.2 rounded border shadow-2xs shrink-0 cursor-default"
                      [ngClass]="service.getPriorityBadgeClass(p.priority || 'P2')">
                      {{ p.priority || 'P2' }}
                    </span>
                    <img *ngIf="p.clientLogo || service.getClientLogo(p.client)"
                      [src]="p.clientLogo || service.getClientLogo(p.client)"
                      [alt]="p.client"
                      class="h-4 max-w-[50px] object-contain rounded bg-white px-0.5 border border-slate-300 shadow-2xs" />
                    <span *ngIf="!p.clientLogo && !service.getClientLogo(p.client)"
                      class="text-[9px] font-black px-1.5 py-0.2 rounded border"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'">
                      {{ p.client }}
                    </span>
                    <span [ngClass]="service.getMilestoneBadgeClass(p.currentMilestone)" class="px-1.5 py-0.2 rounded font-bold text-[9px]">
                      {{ p.currentMilestone }}
                    </span>
                  </div>
                  <span class="px-2 py-0.2 rounded-full text-[9px] font-black shrink-0"
                    [ngClass]="getRagPillClass(p.ragStatus, p.status)">
                    {{ getRagLabel(p) }}
                  </span>
                </div>

                <!-- Project Name -->
                <h4 class="text-xs font-black tracking-tight leading-snug truncate mb-1"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'"
                  [title]="p.name">
                  {{ p.name }}
                </h4>

                <!-- Systems -->
                <div *ngIf="p.systems && p.systems.length > 0" class="flex flex-wrap items-center gap-1 mb-1.5">
                  <span *ngFor="let sys of p.systems" [ngClass]="service.getSystemBadgeClass(sys)" class="px-1 py-0.2 rounded text-[8px] font-bold border">
                    {{ sys }}
                  </span>
                </div>

                <!-- Progress & EAP Stepper Box (High Contrast) -->
                <div class="mb-2 p-2 rounded-lg border"
                  [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border border-slate-200'">
                  <!-- Progress Bar -->
                  <div class="mb-1.5">
                    <div class="flex items-center justify-between text-[9px] font-bold mb-0.5"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                      <span>Progresso: <strong [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'">{{ p.progress }}%</strong></span>
                      <span *ngIf="p.targetDelivery">Meta: <strong [ngClass]="presentationTheme() === 'dark' ? 'text-slate-200' : 'text-slate-900'">{{ formatDate(p.targetDelivery) }}</strong></span>
                    </div>
                    <div class="w-full rounded-full h-1.5 overflow-hidden"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-200 border border-slate-300'">
                      <div class="h-full rounded-full"
                        [ngClass]="p.status === 'Congelado' ? 'bg-slate-400' : (p.status === 'Finalizado' ? 'bg-emerald-600' : (p.ragStatus === 'red' ? 'bg-rose-500' : (p.ragStatus === 'amber' ? 'bg-amber-500' : 'bg-blue-600')))"
                        [style.width.%]="p.progress">
                      </div>
                    </div>
                  </div>

                  <!-- Stepper EAP (5 Fases) -->
                  <div class="pt-1.5 border-t"
                    [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800/80' : 'border-slate-200/80'">
                    <div class="flex items-center justify-between text-[8px] font-bold mb-1"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                      <div class="flex items-center gap-1.5">
                        <span class="uppercase tracking-wider text-[8px] font-black"
                          [ngClass]="presentationTheme() === 'dark' ? 'text-slate-500' : 'text-slate-400'">
                          Etapa da EAP:
                        </span>
                        <span class="font-black"
                          [ngClass]="presentationTheme() === 'dark' ? 'text-blue-300' : 'text-blue-700'">
                          {{ p.currentMilestone }}
                        </span>
                      </div>
                      <span class="font-extrabold"
                        [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-500'">
                        {{ getMilestoneStepLabel(p) }}
                      </span>
                    </div>
                    <div class="grid grid-cols-5 gap-1.5 text-center">
                      <div *ngFor="let m of milestones; let idx = index"
                        class="flex flex-col items-center group cursor-default"
                        [title]="(idx + 1) + '. ' + m">
                        <div
                          [ngClass]="getMilestoneStepClass(m, p.currentMilestone, p.status, presentationTheme())"
                          class="w-full h-1.5 rounded-full transition-all">
                        </div>
                        <span
                          [ngClass]="getMilestoneLabelClass(m, p.currentMilestone, p.status, presentationTheme())"
                          class="text-[8px] truncate w-full font-bold mt-0.5"
                          [title]="m">
                          {{ milestoneShortLabels[m] || m }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Callout Banner if Frozen or Attention -->
                <div *ngIf="p.status === 'Congelado'"
                  class="p-1.5 rounded-lg text-[9px] leading-snug mb-1.5 border font-semibold"
                  [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-200 border-2 border-slate-300 text-slate-900'">
                  <strong>⏸️ Congelado:</strong> {{ hasAttentionPoints(p) ? p.attentionPoints : 'Pausado temporariamente pela gestão.' }}
                </div>
                <div *ngIf="p.status !== 'Congelado' && hasAttentionPoints(p)"
                  class="p-1.5 rounded-lg text-[9px] leading-snug mb-1.5 border font-medium"
                  [ngClass]="getAttentionBoxClass(p, presentationTheme())">
                  <strong>⚠️ Ponto de Atenção:</strong> {{ p.attentionPoints }}
                </div>

                <!-- Status Reports Boxes (High Contrast) -->
                <div class="space-y-1.5">
                  <!-- Anterior -->
                  <div class="p-1.5 rounded-lg border"
                    [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950/90 border-slate-800 text-slate-300' : 'bg-slate-100 border border-slate-300 text-slate-800'">
                    <div class="flex items-center justify-between text-[8px] font-black mb-0.5 uppercase tracking-wider"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                      <span>Reporte Anterior</span>
                    </div>
                    <p class="text-[9px] leading-snug line-clamp-3">
                      {{ p.previousStatusReport || 'Sem reporte anterior registrado.' }}
                    </p>
                  </div>
                  <!-- Atual -->
                  <div class="p-1.5 rounded-lg border"
                    [ngClass]="presentationTheme() === 'dark' ? 'bg-blue-950/60 border-blue-600/70 text-blue-100' : 'bg-blue-100/70 border-2 border-blue-300 text-blue-950'">
                    <div class="flex items-center justify-between text-[8px] font-black mb-0.5 uppercase tracking-wider"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-blue-300' : 'text-blue-900'">
                      <span>Reporte Atual</span>
                    </div>
                    <p class="text-[9px] leading-snug font-semibold line-clamp-3">
                      {{ p.statusReport || 'Nenhum reporte registrado para este ciclo.' }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Card Footer: Equipe -->
              <div class="pt-1.5 mt-1.5 border-t text-[8px] flex items-center justify-between"
                [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'">
                <span class="truncate">
                  <strong [ngClass]="presentationTheme() === 'dark' ? 'text-slate-300' : 'text-slate-800'">👥 Líder:</strong> {{ p.teamLeader || p.team?.leader || 'Não informado' }}
                </span>
                <span *ngIf="getNonLeaderMembers(p).length > 0" class="truncate ml-1 font-semibold"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-500'">
                  +{{ getNonLeaderMembers(p).length }} equipe
                </span>
              </div>
            </div>
          </div>

          <!-- Slide Footer -->
          <div class="flex items-center justify-between pt-1.5 mt-1 border-t text-[9px] font-semibold"
            [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'">
            <span>ILC • Status Report Executivo de Projetos</span>
            <span class="text-slate-500">Acompanhamento Semanal</span>
            <span class="font-extrabold" [ngClass]="presentationTheme() === 'dark' ? 'text-slate-200' : 'text-slate-900'">
              Slide {{ chunkIdx + 2 }} de {{ totalSlides() }}
            </span>
          </div>
        </div>
      </ng-template>

      <!-- TEMPLATE 2.5: SUSTENTAÇÃO (INDICADORES, GRÁFICOS & SISTEMAS MANTIDOS) -->
      <ng-template #maintenanceSlideTpl>
        <div class="h-full flex flex-col justify-between">
          <!-- Slide Header -->
          <div class="flex items-center justify-between px-3.5 py-2 rounded-xl border mb-1.5 bg-slate-900 border-slate-800 text-white shadow-xs">
            <div class="flex items-center gap-3">
              <img src="/assets/logos/ilc.png" alt="ILC Logística" class="h-7 w-auto object-contain bg-white rounded p-0.5 border border-slate-300 shadow-2xs" onerror="this.style.display='none'" />
              <div class="flex flex-col">
                <span class="text-xs font-black tracking-wider uppercase text-white leading-none">SUSTENTAÇÃO • OPERAÇÕES & SUPORTE N2/N3</span>
                <span class="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">
                  {{ currentReport()?.maintenanceSection?.projects?.length || 0 }} sistemas mantidos • {{ formatHours(currentReport()?.maintenanceSection?.totalHours) }}h executadas no ciclo
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-black px-2.5 py-1 rounded-md bg-purple-900/90 text-purple-200 border border-purple-700">
                Edição {{ service.formatEditionTitle(currentReport()) }}
              </span>
              <span class="text-[9px] font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Período: {{ currentReport()?.period }}
              </span>
            </div>
          </div>

          <!-- Slide Body: 4 KPIs de Sustentação + 4 Cards de Sistemas Mantidos -->
          <div class="flex-1 flex flex-col justify-between gap-2 overflow-hidden my-0.5">
            <!-- Top KPI Strip (4 Indicadores de Sustentação) -->
            <div class="grid grid-cols-4 gap-2.5">
              <!-- KPI 1: Esforço em Suporte -->
              <div class="p-2.5 rounded-xl border shadow-2xs"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-purple-500/40 text-white' : 'bg-white border-2 border-purple-300 text-slate-900'">
                <span class="text-[8px] font-extrabold uppercase tracking-wider block"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-purple-300' : 'text-purple-900'">
                  ⏱️ Esforço em Suporte
                </span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-lg font-black" [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-purple-950'">
                    {{ formatHours(currentReport()?.maintenanceSection?.totalHours) }}
                  </span>
                  <span class="text-[9px] font-bold" [ngClass]="presentationTheme() === 'dark' ? 'text-purple-300' : 'text-purple-700'">horas</span>
                </div>
                <span class="text-[8px] font-semibold block mt-0.5 truncate"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-purple-800'">
                  {{ currentReport()?.maintenanceSection?.maintenancePercent || 0 }}% da capacidade no ciclo ({{ formatHours(currentReport()?.maintenanceSection?.totalPeriodHours) }}h)
                </span>
              </div>

              <!-- KPI 2: Divisão de Capacidade -->
              <div class="p-2.5 rounded-xl border shadow-2xs"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-purple-500/40 text-white' : 'bg-white border-2 border-purple-300 text-slate-900'">
                <span class="text-[8px] font-extrabold uppercase tracking-wider block"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                  ⚖️ Divisão de Capacidade
                </span>
                <div class="flex items-baseline justify-between mt-1">
                  <span class="text-[10px] font-black" [ngClass]="presentationTheme() === 'dark' ? 'text-blue-400' : 'text-blue-700'">
                    🚀 {{ currentReport()?.maintenanceSection?.newProjectPercent ?? 100 }}% Novos
                  </span>
                  <span class="text-[10px] font-black" [ngClass]="presentationTheme() === 'dark' ? 'text-purple-400' : 'text-purple-700'">
                    🛠️ {{ currentReport()?.maintenanceSection?.maintenancePercent ?? 0 }}% Sust.
                  </span>
                </div>
                <span class="text-[8px] font-medium block mt-1 truncate"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                  {{ formatHours(currentReport()?.maintenanceSection?.newProjectHours) }}h Novos vs {{ formatHours(currentReport()?.maintenanceSection?.totalHours) }}h Sust.
                </span>
              </div>

              <!-- KPI 3: Sistemas Mantidos -->
              <div class="p-2.5 rounded-xl border shadow-2xs"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-purple-500/40 text-white' : 'bg-white border-2 border-purple-300 text-slate-900'">
                <span class="text-[8px] font-extrabold uppercase tracking-wider block"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-emerald-300' : 'text-emerald-900'">
                  🖥️ Sistemas Mantidos
                </span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-lg font-black" [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-emerald-950'">
                    {{ currentReport()?.maintenanceSection?.projects?.length || 4 }}
                  </span>
                  <span class="text-[9px] font-bold" [ngClass]="presentationTheme() === 'dark' ? 'text-emerald-300' : 'text-emerald-700'">aplicações</span>
                </div>
                <span class="text-[8px] font-semibold block mt-0.5 truncate"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-emerald-800'">
                  {{ currentReport()?.maintenanceSection?.activeSystemsCount || 0 }} com esforço apontado no ciclo
                </span>
              </div>

              <!-- KPI 4: Equipe Alocada -->
              <div class="p-2.5 rounded-xl border shadow-2xs"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-purple-500/40 text-white' : 'bg-white border-2 border-purple-300 text-slate-900'">
                <span class="text-[8px] font-extrabold uppercase tracking-wider block"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                  👥 Equipe Alocada
                </span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-lg font-black" [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-900'">
                    {{ getMaintenanceTeamMembersCount() }}
                  </span>
                  <span class="text-[9px] font-bold" [ngClass]="presentationTheme() === 'dark' ? 'text-slate-300' : 'text-slate-600'">profissionais</span>
                </div>
                <span class="text-[8px] font-medium block mt-0.5 truncate"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-500'">
                  Atuando em sustentação no período
                </span>
              </div>
            </div>

            <!-- 4 Maintenance Systems Grid (2x2 in Landscape) -->
            <div class="grid grid-cols-2 gap-2.5 flex-1 overflow-hidden">
              <div *ngFor="let mp of currentReport()?.maintenanceSection?.projects"
                class="p-2.5 rounded-xl border flex flex-col justify-between overflow-hidden shadow-2xs"
                [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900/95 border-purple-500/40 text-slate-100' : 'bg-white border-2 border-purple-200 text-slate-900'">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="text-[8px] font-black px-1.5 py-0.2 rounded border shrink-0"
                        [ngClass]="presentationTheme() === 'dark' ? 'bg-purple-950 text-purple-200 border-purple-700' : 'bg-purple-100 text-purple-900 border-purple-200'">
                        {{ mp.client }}
                      </span>
                      <h4 class="text-xs font-black truncate leading-tight"
                        [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'">
                        {{ mp.name }}
                      </h4>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full"
                        [ngClass]="mp.ragStatus === 'red' ? 'bg-rose-100 text-rose-800 border border-rose-300' : (mp.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')">
                        {{ mp.ragStatus === 'red' ? '⚠️ Desvio' : (mp.ragStatus === 'amber' ? '⚠️ Atenção' : '✓ No Prazo') }}
                      </span>
                      <span class="text-[8px] font-black px-1.5 py-0.2 rounded-full border"
                        [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950 text-purple-300 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300'">
                        {{ formatHours(mp.hoursExecuted) }}h ({{ getProjectMaintenanceShare(mp.hoursExecuted) }}%)
                      </span>
                    </div>
                  </div>

                  <!-- Ponto de Atenção -->
                  <div *ngIf="hasAttentionPoints(mp)"
                    class="p-1.5 rounded-lg border text-[8px] leading-snug font-semibold line-clamp-2"
                    [ngClass]="getAttentionBoxClass(mp, presentationTheme())">
                    <strong>⚠️ Ponto de Atenção:</strong> {{ mp.attentionPoints }}
                  </div>

                  <!-- Status Reports Anterior & Atual -->
                  <div class="grid grid-cols-2 gap-1.5">
                    <div class="p-1.5 rounded-lg border"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-950/90 border-slate-800 text-slate-300' : 'bg-slate-100 border border-slate-300 text-slate-800'">
                      <span class="text-[7px] font-black uppercase tracking-wider block mb-0.5"
                        [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                        Status report anterior
                      </span>
                      <p class="text-[8px] leading-snug line-clamp-2">
                        {{ mp.previousStatusReport || 'Sem reporte anterior registrado.' }}
                      </p>
                    </div>
                    <div class="p-1.5 rounded-lg border"
                      [ngClass]="presentationTheme() === 'dark' ? 'bg-purple-950/60 border-purple-600/70 text-purple-100' : 'bg-purple-100/70 border border-purple-300 text-purple-950'">
                      <span class="text-[7px] font-black uppercase tracking-wider block mb-0.5"
                        [ngClass]="presentationTheme() === 'dark' ? 'text-purple-300' : 'text-purple-900'">
                        Status report atual
                      </span>
                      <p class="text-[8px] leading-snug font-semibold line-clamp-2">
                        {{ mp.statusReport || mp.summary || 'Sustentação contínua e acompanhamento regular.' }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Footer: Equipe -->
                <div class="pt-1 mt-1 border-t text-[8px] flex items-center justify-between"
                  [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'">
                  <span class="truncate">
                    <strong [ngClass]="presentationTheme() === 'dark' ? 'text-slate-300' : 'text-slate-800'">👥 Equipe:</strong> {{ getAllTeamMembers(mp).join(', ') || 'Equipe de Sustentação' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Slide Footer -->
          <div class="flex items-center justify-between pt-1.5 mt-1 border-t text-[9px] font-semibold"
            [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'">
            <span>ILC • Governança de Sustentação & Suporte N2/N3</span>
            <span class="text-slate-500">Operações Contínuas</span>
            <span class="font-extrabold" [ngClass]="presentationTheme() === 'dark' ? 'text-slate-200' : 'text-slate-900'">
              Slide {{ getMaintenanceSlideIndex() + 1 }} de {{ totalSlides() }}
            </span>
          </div>
        </div>
      </ng-template>

      <!-- TEMPLATE 3: ROADMAP ESTRATÉGICO (PAGINADO EM ATÉ 15 CARDS POR SLIDE: 3 FILEIRAS X 5 COLUNAS) -->
      <ng-template #roadmapSlideTpl let-chunk="chunk" let-chunkIdx="chunkIdx">
        <div class="h-full flex flex-col justify-between">
          <!-- Slide Header (Executive High-Contrast Header Bar) -->
          <div class="flex items-center justify-between px-3.5 py-2 rounded-xl border mb-2 bg-slate-900 border-slate-800 text-white shadow-xs">
            <div class="flex items-center gap-3">
              <img src="/assets/logos/ilc.png" alt="ILC Logística" class="h-7 w-auto object-contain bg-white rounded p-0.5 border border-slate-300 shadow-2xs" onerror="this.style.display='none'" />
              <div class="flex flex-col">
                <span class="text-xs font-black tracking-wider uppercase text-white leading-none">ROADMAP ESTRATÉGICO & PIPELINE DE OPORTUNIDADES</span>
                <span class="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">
                  Iniciativas {{ chunkIdx * roadmapChunkSize + 1 }} a {{ getRoadmapChunkEnd(chunkIdx) }} de {{ currentReport()?.roadmapProjects?.length || 0 }} • Visão de Médio e Longo Prazo
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span *ngIf="roadmapChunks().length > 1" class="text-[9px] font-black px-2.5 py-1 rounded-md bg-indigo-900/90 text-indigo-200 border border-indigo-700">
                Página {{ chunkIdx + 1 }}/{{ roadmapChunks().length }} do Roadmap
              </span>
              <span class="text-[9px] font-black px-2.5 py-1 rounded-md bg-blue-900/90 text-blue-200 border border-blue-700">
                Edição {{ service.formatEditionTitle(currentReport()) }}
              </span>
              <span class="text-[9px] font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Planejamento Futuro
              </span>
            </div>
          </div>

          <!-- Roadmap Cards Grid & Governança -->
          <div class="flex-1 flex flex-col justify-between gap-2.5 overflow-hidden my-0.5">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-xs font-black uppercase tracking-tight flex items-center gap-1.5"
                  [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'">
                  <span>🔭</span> Projetos no Radar & Expansões Planejadas ({{ currentReport()?.roadmapProjects?.length || 0 }})
                </h3>
                <span class="text-[9px] font-extrabold" [ngClass]="presentationTheme() === 'dark' ? 'text-blue-400' : 'text-blue-800'">
                  Exibindo {{ chunkIdx * roadmapChunkSize + 1 }}–{{ getRoadmapChunkEnd(chunkIdx) }} de {{ currentReport()?.roadmapProjects?.length || 0 }}
                </span>
              </div>
              <div class="grid grid-cols-5 gap-2.5">
                <div *ngFor="let road of chunk"
                  class="p-2.5 rounded-xl border shadow-xs flex flex-col justify-between"
                  [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-blue-800/60 text-slate-200' : 'bg-white border-2 border-blue-200 text-slate-900'">
                  <div>
                    <div class="flex items-center justify-between gap-1 mb-1">
                      <span class="text-[8px] font-black px-1.5 py-0.2 rounded border"
                        [ngClass]="presentationTheme() === 'dark' ? 'bg-blue-950 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-900 border-blue-300'">
                        {{ road.client }}
                      </span>
                      <span class="text-[8px] font-bold px-1.5 py-0.2 rounded-full" [ngClass]="getRoadmapStageClass(road.stage)">
                        {{ road.stage }}
                      </span>
                    </div>
                    <h4 class="text-[11px] font-black truncate leading-snug"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'"
                      [title]="road.name">
                      {{ road.name }}
                    </h4>
                    <p class="text-[9px] leading-snug line-clamp-3 mt-1 font-medium"
                      [ngClass]="presentationTheme() === 'dark' ? 'text-slate-300' : 'text-slate-700'">
                      {{ road.description }}
                    </p>
                  </div>
                  <div class="mt-2 pt-1 border-t flex items-center justify-between text-[8px]"
                    [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'">
                    <span>Início: <strong [ngClass]="presentationTheme() === 'dark' ? 'text-slate-200' : 'text-slate-800'">{{ road.estimatedStart }}</strong></span>
                    <span class="text-[8px] px-1.5 py-0.2 rounded-full font-black border"
                      [ngClass]="getStrategicValueBadgeClass(road.strategicValue, presentationTheme())">
                      Valor: {{ road.strategicValue }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Governança & Próximos Passos (Exibido na última página do Roadmap quando há espaço confortável) -->
            <div *ngIf="chunkIdx === roadmapChunks().length - 1 && chunk.length <= 10"
              class="p-2.5 rounded-xl border flex items-center justify-between gap-4 shadow-xs"
              [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-2 border-slate-300 text-slate-800'">
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                  🗓️
                </div>
                <div>
                  <h4 class="text-[11px] font-black" [ngClass]="presentationTheme() === 'dark' ? 'text-white' : 'text-slate-950'">
                    Calendário de Governança & Próximos Passos
                  </h4>
                  <p class="text-[9px] mt-0.5" [ngClass]="presentationTheme() === 'dark' ? 'text-slate-400' : 'text-slate-600'">
                    Acompanhamento semanal às sextas-feiras com a diretoria executiva de tecnologia e operações.
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[8px] font-bold px-2.5 py-1 rounded-lg border shadow-2xs"
                  [ngClass]="presentationTheme() === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'">
                  PMO ILC • Governança Ágil
                </span>
              </div>
            </div>
          </div>

          <!-- Slide Footer -->
          <div class="flex items-center justify-between pt-1.5 mt-1 border-t text-[9px] font-semibold"
            [ngClass]="presentationTheme() === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'">
            <span>ILC • Planejamento Estratégico & Pipeline Futuro</span>
            <span class="text-slate-500">Roadmap Corporativo ({{ chunkIdx + 1 }}/{{ roadmapChunks().length }})</span>
            <span class="font-extrabold" [ngClass]="presentationTheme() === 'dark' ? 'text-slate-200' : 'text-slate-900'">
              Slide {{ getRoadmapStartSlideIndex() + chunkIdx + 1 }} de {{ totalSlides() }}
            </span>
          </div>
        </div>
      </ng-template>

    </div>
  `
})
export class ExecutiveReportComponent implements OnInit {
  service = inject(ProjectService);
  Math = Math;

  // Theme signal: default to 'dark' for supreme executive contrast
  presentationTheme = signal<'dark' | 'light'>('dark');

  // Interactive Presenter signals
  isPresenterOpen = signal<boolean>(false);
  currentSlideIndex = signal<number>(0);
  isDownloadingPdf = signal<boolean>(false);

  get currentMonthName(): string {
    const meetingDate = this.currentReport()?.meetingDate;
    const refDate = meetingDate ? new Date(meetingDate + 'T12:00:00') : new Date();
    const validDate = !isNaN(refDate.getTime()) ? refDate : new Date();
    return validDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
  }

  ngOnInit() {
    this.service.sortBy.set('targetDelivery');
  }

  togglePresentationTheme(): void {
    this.presentationTheme.update(t => t === 'dark' ? 'light' : 'dark');
  }

  currentReport = computed(() => this.service.currentWeeklyReport());

  // Projects strictly for new initiatives (excludes maintenance projects)
  reportNewProjects = computed(() => {
    const list = this.currentReport()?.activeProjects || [];
    return list.filter(p => (p as any).category !== 'maintenance');
  });

  displayedProjects = computed(() => {
    const report = this.currentReport();
    if (!report || !report.activeProjects) return [];

    const status = this.service.selectedStatus();
    const client = this.service.selectedClient();
    const priority = this.service.selectedPriority();
    const system = this.service.selectedSystem();
    const query = (this.service.searchQuery() || '').toLowerCase().trim();
    const sort = this.service.sortBy();

    let list = this.reportNewProjects().slice();

    // 1. Status Tab Filter (from FiltersComponent)
    if (status !== 'Todos') {
      list = list.filter(p => (p.status || 'Ativo') === status);
    }

    // 2. Client Dropdown Filter (from FiltersComponent)
    if (client !== 'Todos') {
      list = list.filter(p => p.client.toLowerCase() === client.toLowerCase());
    }

    // 3. Priority Dropdown Filter (from FiltersComponent)
    if (priority !== 'Todos') {
      list = list.filter(p => (p.priority || 'P2') === priority);
    }

    // 4. System Dropdown Filter (from FiltersComponent)
    if (system !== 'Todos') {
      list = list.filter(p => (p.systems || []).includes(system));
    }

    // 5. Search Input (from FiltersComponent)
    if (query) {
      list = list.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(query);
        const clientMatch = (p.client || '').toLowerCase().includes(query);
        const leaderMatch = (p.teamLeader || '').toLowerCase().includes(query);
        const membersMatch = (p.teamMembers || p.team?.members || []).some(m => m.toLowerCase().includes(query));
        const systemMatch = (p.systems || []).some(s => s.toLowerCase().includes(query));
        const milestoneMatch = (p.currentMilestone || '').toLowerCase().includes(query);
        const statusReportMatch = (p.statusReport || '').toLowerCase().includes(query);
        const previousStatusReportMatch = (p.previousStatusReport || '').toLowerCase().includes(query);
        const attentionMatch = (p.attentionPoints || '').toLowerCase().includes(query);
        return nameMatch || clientMatch || leaderMatch || membersMatch || systemMatch || milestoneMatch || statusReportMatch || previousStatusReportMatch || attentionMatch;
      });
    }

    // 6. Sort Dropdown (from FiltersComponent)
    if (sort === 'priority') {
      const priorityOrder: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
      list.sort((a, b) => {
        const pA = priorityOrder[a.priority || 'P2'] || 99;
        const pB = priorityOrder[b.priority || 'P2'] || 99;
        if (pA !== pB) return pA - pB;
        return this.compareByTargetDelivery(a, b);
      });
    } else if (sort === 'progress') {
      list.sort((a, b) => {
        const progDiff = (b.progress || 0) - (a.progress || 0);
        if (progDiff !== 0) return progDiff;
        return this.compareByTargetDelivery(a, b);
      });
    } else if (sort === 'client') {
      list.sort((a, b) => {
        const cDiff = (a.client || '').localeCompare(b.client || '', 'pt-BR', { sensitivity: 'base' });
        if (cDiff !== 0) return cDiff;
        return this.compareByTargetDelivery(a, b);
      });
    } else {
      list.sort((a, b) => this.compareByTargetDelivery(a, b));
    }

    return list;
  });

  // Milestones da EAP para os Steppers dos Cards
  milestones: string[] = [
    'Planejamento',
    'Desenvolvimento',
    'Homologação',
    'Treinamento',
    'Operação Assistida'
  ];

  milestoneShortLabels: Record<string, string> = {
    'Planejamento': 'Plan',
    'Desenvolvimento': 'Dev',
    'Homologação': 'Homolog',
    'Treinamento': 'Trein',
    'Operação Assistida': 'Op. Assist'
  };

  getMilestoneIndex(mName?: string): number {
    if (!mName) return 0;
    const clean = mName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const idx = this.milestones.findIndex(m => 
      m.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === clean
    );
    return idx >= 0 ? idx : 0;
  }

  getMilestoneStepLabel(p: WeeklyReportProject): string {
    if (p.status === 'Finalizado') {
      return 'Concluído (5/5)';
    }
    const idx = this.getMilestoneIndex(p.currentMilestone);
    return `Etapa ${idx + 1} de 5`;
  }

  getMilestoneStepClass(m: string, currentMilestone?: string, status?: string, theme: 'dark' | 'light' = 'light'): string {
    if (status === 'Finalizado') {
      return 'bg-emerald-500 shadow-2xs';
    }
    const currentIdx = this.getMilestoneIndex(currentMilestone);
    const mIdx = this.milestones.indexOf(m);

    if (mIdx < currentIdx) {
      return 'bg-emerald-500 shadow-2xs';
    }
    if (mIdx === currentIdx) {
      if (status === 'Congelado') {
        return theme === 'dark' ? 'bg-slate-500 ring-2 ring-slate-400' : 'bg-slate-400 ring-2 ring-slate-300';
      }
      return theme === 'dark' ? 'bg-blue-500 ring-2 ring-blue-400/70 shadow-xs' : 'bg-blue-600 ring-2 ring-blue-300 shadow-xs';
    }
    return theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200';
  }

  getMilestoneLabelClass(m: string, currentMilestone?: string, status?: string, theme: 'dark' | 'light' = 'light'): string {
    if (status === 'Finalizado') {
      return theme === 'dark' ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold';
    }
    const currentIdx = this.getMilestoneIndex(currentMilestone);
    const mIdx = this.milestones.indexOf(m);

    if (mIdx < currentIdx) {
      return theme === 'dark' ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold';
    }
    if (mIdx === currentIdx) {
      if (status === 'Congelado') {
        return theme === 'dark' ? 'text-slate-300 font-black' : 'text-slate-700 font-black';
      }
      return theme === 'dark' ? 'text-blue-300 font-black' : 'text-blue-700 font-black';
    }
    return theme === 'dark' ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium';
  }

  // Project chunks: 2 projects per slide in landscape orientation
  projectChunks = computed<WeeklyReportProject[][]>(() => {
    const list = this.displayedProjects();
    const chunkSize = 2;
    const chunks: WeeklyReportProject[][] = [];
    for (let i = 0; i < list.length; i += chunkSize) {
      chunks.push(list.slice(i, i + chunkSize));
    }
    return chunks;
  });

  // Roadmap chunks: 15 items per slide (3 rows x 5 columns) so no row is ever clipped in landscape
  readonly roadmapChunkSize = 15;

  roadmapChunks = computed<RoadmapProject[][]>(() => {
    const list = this.currentReport()?.roadmapProjects || [];
    const chunks: RoadmapProject[][] = [];
    for (let i = 0; i < list.length; i += this.roadmapChunkSize) {
      chunks.push(list.slice(i, i + this.roadmapChunkSize));
    }
    return chunks;
  });

  hasMaintenance = computed<boolean>(() => {
    return (this.currentReport()?.maintenanceSection?.projects?.length || 0) > 0;
  });

  hasRoadmap = computed<boolean>(() => {
    return this.roadmapChunks().length > 0;
  });

  getMaintenanceSlideIndex(): number {
    return 1 + this.projectChunks().length;
  }

  getRoadmapStartSlideIndex(): number {
    return 1 + this.projectChunks().length + (this.hasMaintenance() ? 1 : 0);
  }

  getRoadmapChunkEnd(chunkIdx: number): number {
    const total = this.currentReport()?.roadmapProjects?.length || 0;
    return Math.min((chunkIdx + 1) * this.roadmapChunkSize, total);
  }

  totalSlides = computed<number>(() => {
    // Slide 1 (Capa & Visão Consolidada) + N project slides + 1 maintenance slide (if exists) + M roadmap slides
    return 1 + this.projectChunks().length + (this.hasMaintenance() ? 1 : 0) + this.roadmapChunks().length;
  });

  getChunkEnd(chunkIdx: number): number {
    return Math.min((chunkIdx + 1) * 2, this.displayedProjects().length);
  }

  openPresenter(): void {
    this.currentSlideIndex.set(0);
    this.isPresenterOpen.set(true);
  }

  closePresenter(): void {
    this.isPresenterOpen.set(false);
  }

  nextSlide(): void {
    if (this.currentSlideIndex() < this.totalSlides() - 1) {
      this.currentSlideIndex.update(i => i + 1);
    }
  }

  prevSlide(): void {
    if (this.currentSlideIndex() > 0) {
      this.currentSlideIndex.update(i => i - 1);
    }
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.totalSlides()) {
      this.currentSlideIndex.set(index);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isPresenterOpen()) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ' || event.key === 'PageDown') {
      event.preventDefault();
      this.nextSlide();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      this.prevSlide();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closePresenter();
    }
  }

  topCriticalProjects = computed(() => {
    const list = this.reportNewProjects();

    return list
      .filter(p => p.ragStatus === 'red' || p.ragStatus === 'amber' || this.hasAttentionPoints(p))
      .sort((a, b) => {
        // Red first, then Amber, then Green with attention points
        const score = (proj: WeeklyReportProject) => {
          if (proj.ragStatus === 'red') return 0;
          if (proj.ragStatus === 'amber') return 1;
          return 2;
        };
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      });
  });

  compareByTargetDelivery(a: WeeklyReportProject, b: WeeklyReportProject): number {
    const dateA = a.targetDelivery || '9999-12-31';
    const dateB = b.targetDelivery || '9999-12-31';
    const dateDiff = dateA.localeCompare(dateB);
    if (dateDiff !== 0) return dateDiff;
    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  }

  getActiveCount(): number {
    const list = this.reportNewProjects();
    return list.filter(p => (p.status || 'Ativo') === 'Ativo').length;
  }

  getOnTrackCount(): number {
    const list = this.reportNewProjects();
    return list.filter(p => (p.status || 'Ativo') === 'Ativo' && p.ragStatus === 'green').length;
  }

  getAttentionCount(): number {
    const list = this.reportNewProjects();
    return list.filter(p => (p.status || 'Ativo') === 'Ativo' && p.ragStatus === 'amber').length;
  }

  getCriticalCount(): number {
    const list = this.reportNewProjects();
    return list.filter(p => (p.status || 'Ativo') === 'Ativo' && p.ragStatus === 'red').length;
  }

  getCompletedCount(): number {
    const list = this.reportNewProjects();
    return list.filter(p => p.status === 'Finalizado').length;
  }

  getFrozenCount(): number {
    const list = this.reportNewProjects();
    return list.filter(p => p.status === 'Congelado').length;
  }

  getPortfolioHealth(): number {
    const list = this.reportNewProjects();
    const activeList = list.filter(p => (p.status || 'Ativo') === 'Ativo');
    if (activeList.length === 0) return 100;

    let totalScore = 0;
    for (const p of activeList) {
      if (p.ragStatus === 'red') {
        totalScore += 25;
      } else if (p.ragStatus === 'amber') {
        totalScore += 75;
      } else {
        totalScore += 100;
      }
    }
    return Math.round(totalScore / activeList.length);
  }

  getAverageProgress(): number {
    const list = this.reportNewProjects();
    const activeList = list.filter(p => (p.status || 'Ativo') === 'Ativo');
    if (activeList.length === 0) return this.currentReport()?.statusPulse?.averageProgress || 0;
    const total = activeList.reduce((acc, p) => acc + (p.progress || 0), 0);
    return Math.round(total / activeList.length);
  }

  getPercent(count?: number, total?: number): number {
    if (!count || !total || total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  formatHours(val?: number | null): string {
    return this.service.formatHours(val);
  }

  getHoursConsumption(): { percent: number; executed: number; agreed: number } {
    const list = this.reportNewProjects();
    const activeList = list.filter(p => (p.status || 'Ativo') === 'Ativo');
    const allProjects = this.service.projects() || [];
    let totalExec = 0;
    let totalAgreed = 0;

    for (const p of activeList) {
      const origProj = allProjects.find(x => x.id === p.projectId);
      const agreedH = p.hoursAgreed ?? origProj?.agreedHours ?? (origProj as any)?.hours?.agreed ?? p.hoursPlanned ?? 0;
      const execH = p.hoursExecuted || 0;
      totalExec += Number(execH) || 0;
      totalAgreed += Number(agreedH) || 0;
    }

    const percent = totalAgreed > 0 ? Math.round((totalExec / totalAgreed) * 100) : 0;
    return {
      percent,
      executed: Math.round(totalExec * 10) / 10,
      agreed: Math.round(totalAgreed * 10) / 10
    };
  }

  getAverageVarianceDays(): { avgDays: number; delayedCount: number } {
    const list = this.reportNewProjects();
    const meetingDate = this.currentReport()?.meetingDate;
    const refDate = meetingDate ? new Date(meetingDate + 'T00:00:00') : new Date();
    const validRef = !isNaN(refDate.getTime()) ? refDate : new Date();
    validRef.setHours(0, 0, 0, 0);

    let totalVariance = 0;
    let delayedCount = 0;

    for (const p of list) {
      // Analisar sempre todos os projetos ativos da esteira (desconsiderando projetos concluídos 100% ou finalizados)
      const isFinished = p.status === 'Finalizado' || (p.progress || 0) >= 100;
      if (isFinished || (p.status || 'Ativo') !== 'Ativo') continue;

      let days = p.varianceDays || 0;
      if (days === 0 && p.agreedDelivery && (p.progress || 0) < 100) {
        const agreed = new Date(p.agreedDelivery + 'T00:00:00');
        if (!isNaN(agreed.getTime()) && agreed < validRef) {
          days = Math.max(0, Math.ceil((validRef.getTime() - agreed.getTime()) / (1000 * 3600 * 24)));
        }
      }
      if (days > 0) {
        totalVariance += days;
        delayedCount++;
      }
    }

    const avgDays = delayedCount > 0 ? Math.round(totalVariance / delayedCount) : 0;
    return { avgDays, delayedCount };
  }

  getDeliveriesThisMonthCount(): number {
    const list = this.reportNewProjects();
    const meetingDate = this.currentReport()?.meetingDate;
    const refDate = meetingDate ? new Date(meetingDate + 'T12:00:00') : new Date();
    const validRef = !isNaN(refDate.getTime()) ? refDate : new Date();
    const curMonth = validRef.getMonth();
    const curYear = validRef.getFullYear();

    return list.filter(p => {
      if (p.status === 'Congelado') return false;
      const target = p.targetDelivery || p.agreedDelivery;
      if (!target) return false;
      const d = new Date(target + 'T00:00:00');
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    }).length;
  }

  getPriorityCount(priority: string): number {
    const list = this.reportNewProjects();
    return list.filter(p => ((p.priority || 'P2').trim().toUpperCase()) === priority.toUpperCase()).length;
  }

  togglePriorityFilter(priority: string): void {
    if (this.service.selectedPriority() === priority) {
      this.service.selectedPriority.set('Todos');
    } else {
      this.service.selectedPriority.set(priority);
    }
  }

  systemMetrics = computed(() => {
    const list = this.reportNewProjects();
    const map = new Map<string, number>();

    for (const p of list) {
      for (const sys of (p.systems || [])) {
        if (sys) {
          map.set(sys, (map.get(sys) || 0) + 1);
        }
      }
    }

    const systemMeta: Record<string, { icon: string; activeClass: string; idleClass: string; textClass: string; countClass: string }> = {
      'Portal Integrator': {
        icon: '🌐',
        activeClass: 'ring-2 ring-indigo-500 bg-indigo-100 border-indigo-400',
        idleClass: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-300',
        textClass: 'text-indigo-950 font-black',
        countClass: 'text-indigo-800 font-black'
      },
      'App ILC': {
        icon: '🚚',
        activeClass: 'ring-2 ring-cyan-500 bg-cyan-100 border-cyan-400',
        idleClass: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300',
        textClass: 'text-cyan-950 font-black',
        countClass: 'text-cyan-800 font-black'
      },
      'App Smart Tracking': {
        icon: '📱',
        activeClass: 'ring-2 ring-emerald-500 bg-emerald-100 border-emerald-400',
        idleClass: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300',
        textClass: 'text-emerald-950 font-black',
        countClass: 'text-emerald-800 font-black'
      },
      'Smart X': {
        icon: '📋',
        activeClass: 'ring-2 ring-purple-500 bg-purple-100 border-purple-400',
        idleClass: 'bg-purple-50 hover:bg-purple-100 border-purple-300',
        textClass: 'text-purple-950 font-black',
        countClass: 'text-purple-800 font-black'
      },
      'Infraestrutura': {
        icon: '🏗️',
        activeClass: 'ring-2 ring-sky-500 bg-sky-100 border-sky-400',
        idleClass: 'bg-sky-50 hover:bg-sky-100 border-sky-300',
        textClass: 'text-sky-950 font-black',
        countClass: 'text-sky-800 font-black'
      }
    };

    const order = ['Portal Integrator', 'App ILC', 'App Smart Tracking', 'Smart X', 'Infraestrutura'];
    const systems = Array.from(map.keys()).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (map.get(b) || 0) - (map.get(a) || 0);
    });

    return systems.map(sys => {
      const meta = systemMeta[sys] || {
        icon: '⚙️',
        activeClass: 'ring-2 ring-slate-500 bg-slate-200 border-slate-400',
        idleClass: 'bg-slate-100 hover:bg-slate-200 border-slate-300',
        textClass: 'text-slate-900 font-black',
        countClass: 'text-slate-800 font-black'
      };
      return {
        name: sys,
        count: map.get(sys) || 0,
        ...meta
      };
    });
  });

  toggleSystemFilter(systemName: string): void {
    if (this.service.selectedSystem() === systemName) {
      this.service.selectedSystem.set('Todos');
    } else {
      this.service.selectedSystem.set(systemName);
    }
  }

  getTeamMembers(p: WeeklyReportProject): string[] {
    let members = p.team?.members || p.teamMembers || [];
    if (!members || members.length === 0) {
      const proj = this.service.projects().find(x => x.id === p.projectId || x.name === p.name);
      members = proj?.team?.members || [];
    }
    return members;
  }

  getAllTeamMembers(p: WeeklyReportProject | any): string[] {
    const list: string[] = [];
    const leader = (p.teamLeader || p.team?.leader || '').trim();
    if (leader) list.push(leader);

    const members = this.getTeamMembers(p);
    for (const m of members) {
      const trimmed = m.trim();
      if (trimmed && !list.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    }
    return list;
  }

  getNonLeaderMembers(p: WeeklyReportProject | any): string[] {
    const leader = (p.teamLeader || p.team?.leader || '').trim().toLowerCase();
    const all = this.getAllTeamMembers(p);
    return all.filter(m => m.trim().toLowerCase() !== leader);
  }

  onSelectReport(reportId: string) {
    this.service.loadWeeklyReport(reportId);
  }

  getRagLabel(p: WeeklyReportProject): string {
    if (p.status === 'Congelado') return 'Congelado';
    if (p.status === 'Finalizado') return 'Finalizado';
    if (p.ragStatus === 'red') {
      return (p.varianceDays && p.varianceDays > 0) ? `+${p.varianceDays}d Desvio` : 'Desvio';
    }
    if (p.ragStatus === 'amber') return 'Atenção';
    return 'No Prazo';
  }

  getRagPillClass(rag: string, status?: string) {
    if (status === 'Congelado') return 'bg-slate-200 text-slate-800 border border-slate-400 font-extrabold';
    if (status === 'Finalizado') return 'bg-blue-100 text-blue-900 border border-blue-300 font-extrabold';
    if (rag === 'red') return 'bg-rose-100 text-rose-900 border border-rose-300 font-extrabold';
    if (rag === 'amber') return 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold';
    return 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold';
  }

  getRoadmapStageClass(stage: string) {
    const s = (stage || '').toLowerCase();
    if (s.includes('proposta')) return 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-extrabold';
    if (s.includes('negociação') || s.includes('negociacao')) return 'bg-orange-100 text-orange-900 border border-orange-300 font-extrabold';
    if (s.includes('discovery')) return 'bg-sky-100 text-sky-900 border border-sky-300 font-extrabold';
    if (s.includes('arquitetura')) return 'bg-blue-100 text-blue-900 border border-blue-300 font-extrabold';
    if (s.includes('escopo')) return 'bg-teal-100 text-teal-900 border border-teal-300 font-extrabold';
    if (s.includes('kick-off') || s.includes('início')) return 'bg-emerald-200 text-emerald-950 border border-emerald-400 font-extrabold';
    if (s.includes('contrato')) return 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold';
    if (s.includes('budget') || s.includes('orçamento')) return 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold';
    if (s.includes('viabilidade')) return 'bg-teal-100 text-teal-900 border border-teal-300 font-extrabold';
    if (s.includes('ideação') || s.includes('ideacao')) return 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300 font-extrabold';
    if (s.includes('prospecção') || s.includes('prospeccao')) return 'bg-violet-100 text-violet-900 border border-violet-300 font-extrabold';
    if (s.includes('priorização') || s.includes('priorizacao')) return 'bg-lime-100 text-lime-900 border border-lime-300 font-extrabold';
    if (s.includes('espera') || s.includes('pausado')) return 'bg-slate-200 text-slate-800 border border-slate-400 font-extrabold';
    if (s.includes('cancelado')) return 'bg-rose-100 text-rose-900 border border-rose-300 font-extrabold';
    return 'bg-blue-100 text-blue-900 border border-blue-300 font-extrabold';
  }

  getStrategicValueBadgeClass(val: string, theme: 'dark' | 'light' = 'light'): string {
    const v = (val || '').toLowerCase();
    if (v.includes('muito alto') || v.includes('crítico')) {
      return theme === 'dark' 
        ? 'bg-purple-950/80 text-purple-200 border border-purple-700' 
        : 'bg-purple-100 text-purple-900 border border-purple-300';
    }
    if (v.includes('alto') || v.includes('estratégico')) {
      return theme === 'dark' 
        ? 'bg-blue-950/80 text-blue-200 border border-blue-700' 
        : 'bg-blue-100 text-blue-900 border border-blue-300';
    }
    if (v.includes('médio')) {
      return theme === 'dark' 
        ? 'bg-amber-950/80 text-amber-200 border border-amber-700' 
        : 'bg-amber-100 text-amber-900 border border-amber-300';
    }
    return theme === 'dark' 
      ? 'bg-slate-800 text-slate-300 border border-slate-700 font-semibold' 
      : 'bg-slate-100 text-slate-800 border border-slate-300 font-semibold';
  }

  hasAttentionPoints(p?: WeeklyReportProject | any | null): boolean {
    if (!p || !p.attentionPoints) return false;
    const text = p.attentionPoints.trim();
    if (!text) return false;
    const lower = text.toLowerCase();
    if (lower === 'execução fluindo dentro dos marcos acordados.' ||
        lower === 'execucao fluindo dentro dos marcos acordados.' ||
        lower === 'sem registro.' ||
        lower === 'sem pontos de atenção.' ||
        lower === 'sem pontos de atencao.' ||
        lower === 'nenhum' ||
        lower === 'n/a' ||
        lower === '-') {
      return false;
    }
    return true;
  }

  getAttentionBoxClass(p: WeeklyReportProject | any, theme: 'dark' | 'light' = 'light'): string {
    if (theme === 'dark') {
      if (p.ragStatus === 'red') {
        return 'bg-rose-950/80 border-rose-700 text-rose-200';
      }
      return 'bg-amber-950/80 border-amber-700 text-amber-200';
    }
    if (p.ragStatus === 'red') {
      return 'bg-rose-100 border-2 border-rose-300 text-rose-950';
    }
    return 'bg-amber-100 border-2 border-amber-300 text-amber-950';
  }

  formatDate(dateStr?: string | null) {
    if (!dateStr) return 'Não definida';
    try {
      const [y, m, d] = dateStr.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  getCurrentReportDate(p?: WeeklyReportProject | any): string {
    if (p?.statusReportDate) return this.formatDate(p.statusReportDate);
    const meetingDate = this.currentReport()?.meetingDate;
    if (meetingDate) return this.formatDate(meetingDate);
    return '16/10/2026';
  }

  getPreviousReportDate(p?: WeeklyReportProject | any): string {
    if (p?.previousStatusReportDate) return this.formatDate(p.previousStatusReportDate);
    const current = this.currentReport();
    const summaries = this.service.weeklyReports();
    if (current && summaries.length > 0) {
      const prev = summaries.find(s => s.id !== current.id && (s.weekNumber < current.weekNumber || s.id < current.id));
      if (prev?.meetingDate) return this.formatDate(prev.meetingDate);
    }
    return '06/10/2026';
  }

  getMaintenanceTeamMembersCount(): number {
    const sec = this.currentReport()?.maintenanceSection;
    if (sec?.teamMembersCount !== undefined) {
      return sec.teamMembersCount;
    }
    if (sec?.teamMembers && sec.teamMembers.length > 0) {
      return sec.teamMembers.length;
    }
    return 0;
  }

  getMaintenanceTotalHours(): number {
    const sec = this.currentReport()?.maintenanceSection;
    if (sec?.totalHours !== undefined) return sec.totalHours;
    return 0;
  }

  getProjectMaintenanceShare(hoursExecuted: number): number {
    const total = this.getMaintenanceTotalHours();
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((hoursExecuted / total) * 100));
  }

  getMonthlyBarHeight(hours: number): number {
    const list = this.service.maintenanceMetrics()?.monthlyHistory || [];
    let max = 0;
    for (const m of list) {
      if (m.maintenanceHours > max) max = m.maintenanceHours;
    }
    if (!max || max <= 0) return 10;
    return Math.max(10, Math.min(100, Math.round((hours / max) * 100)));
  }

  private loadExternalScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  async printReport() {
    if (this.isDownloadingPdf()) return;
    this.isDownloadingPdf.set(true);

    const edition = this.currentReport()?.id || 'Semana';
    const themeName = this.presentationTheme() === 'dark' ? 'Escuro' : 'Claro';
    const fileName = `Status_Report_Executivo_${edition}_ILC_Paisagem_${themeName}.pdf`;

    try {
      const container = document.querySelector('.ppt-slides-print-container') as HTMLElement | null;
      if (container) {
        // 1. Try native headless browser PDF export on local machine
        if (this.service.isLocalEnvironment()) {
          const styleNodes = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
          const stylesHtml = styleNodes.map(n => n.outerHTML).join('\n');

          const res = await fetch('/api/public/export-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              html: container.outerHTML,
              styles: stylesHtml,
              filename: fileName
            })
          });

          if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
            return;
          }
        }

        // 2. Client-side A4 Landscape PDF generator (for Vercel / Online Read-Only View)
        await Promise.all([
          this.loadExternalScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js'),
          this.loadExternalScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
        ]);

        const htmlToImage = (window as any).htmlToImage;
        const jsPDF = (window as any).jspdf?.jsPDF;

        if (htmlToImage && jsPDF) {
          const prevDisplay = container.style.display;
          const prevPosition = container.style.position;
          const prevLeft = container.style.left;
          const prevTop = container.style.top;
          const prevWidth = container.style.width;
          const prevZIndex = container.style.zIndex;

          container.style.display = 'block';
          container.style.position = 'fixed';
          container.style.left = '-9999px';
          container.style.top = '0';
          container.style.width = '1122px';
          container.style.zIndex = '-1';

          try {
            const slides = Array.from(container.querySelectorAll('.ppt-slide')) as HTMLElement[];
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

            for (let i = 0; i < slides.length; i++) {
              const slide = slides[i];
              slide.style.width = '1122px';
              slide.style.height = '793px';
              slide.style.maxHeight = '793px';
              slide.style.minHeight = '793px';
              slide.style.display = 'flex';
              slide.style.flexDirection = 'column';
              slide.style.justifyContent = 'space-between';
              slide.style.padding = '20px 26px';
              slide.style.boxSizing = 'border-box';
              slide.style.backgroundColor = this.presentationTheme() === 'dark' ? '#090d16' : '#e2e8f0';
              slide.style.color = this.presentationTheme() === 'dark' ? '#f8fafc' : '#0f172a';

              const dataUrl = await htmlToImage.toJpeg(slide, {
                quality: 0.95,
                pixelRatio: 2,
                width: 1122,
                height: 793,
                backgroundColor: this.presentationTheme() === 'dark' ? '#090d16' : '#e2e8f0'
              });

              if (i > 0) pdf.addPage('a4', 'landscape');
              pdf.addImage(dataUrl, 'JPEG', 0, 0, 297, 210);
            }

            pdf.save(fileName);
            return;
          } finally {
            container.style.display = prevDisplay;
            container.style.position = prevPosition;
            container.style.left = prevLeft;
            container.style.top = prevTop;
            container.style.width = prevWidth;
            container.style.zIndex = prevZIndex;
          }
        }
      }
    } catch (err) {
      console.error('Erro ao gerar PDF direto, abrindo diálogo de impressão:', err);
    } finally {
      this.isDownloadingPdf.set(false);
    }

    // Fallback to browser print if needed
    const prevTitle = document.title;
    document.title = fileName.replace(/\.pdf$/i, '');
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1500);
  }
}
