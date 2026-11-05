import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: {
    class: 'block'
  },
  template: `
    <div class="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md mb-6 space-y-3 text-white">
      <!-- Top Row: Status Tabs & Search -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Status Tabs -->
        <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            *ngFor="let s of ['Todos', 'Ativo', 'Finalizado', 'Congelado']"
            (click)="service.selectedStatus.set(s)"
            [ngClass]="service.selectedStatus() === s ? 'bg-blue-600 text-white shadow-xs font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
            <span>{{ s === 'Ativo' ? 'Ativos' : (s === 'Finalizado' ? 'Finalizados' : (s === 'Congelado' ? 'Congelados' : s)) }}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full"
              [ngClass]="service.selectedStatus() === s ? 'bg-white/20 text-white font-bold' : 'bg-slate-700/90 text-slate-300'">
              {{ getCountByStatus(s) }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [ngModel]="service.searchQuery()"
            (ngModelChange)="service.searchQuery.set($event)"
            placeholder="Buscar por projeto, líder, sistema..."
            class="w-full bg-slate-800/90 border border-slate-700 text-white text-xs rounded-xl pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium">
          <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <button
            *ngIf="service.searchQuery()"
            (click)="service.searchQuery.set('')"
            class="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer">
            ×
          </button>
        </div>
      </div>

      <!-- Bottom Row: Filters (Cliente, Prioridade, Sistema, Ordenação) -->
      <div class="flex items-center flex-wrap gap-2.5 pt-2 border-t border-slate-800 text-xs">
        
        <!-- Client Filter Dropdown -->
        <div *ngIf="!service.isClientPortalMode()" class="flex items-center space-x-1.5">
          <label class="text-[11px] font-bold text-slate-400 whitespace-nowrap">Cliente:</label>
          <select
            [ngModel]="service.selectedClient()"
            (ngModelChange)="service.selectedClient.set($event)"
            class="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer">
            <option value="Todos" class="bg-slate-800 text-white">Todos os Clientes</option>
            <option *ngFor="let c of service.clients()" [value]="c.name" class="bg-slate-800 text-white">
              {{ c.name }} ({{ getCountByClient(c.name) }})
            </option>
          </select>
        </div>

        <div *ngIf="service.isClientPortalMode()" class="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-bold">
          <span>🏢</span>
          <span>Parceiro: {{ service.selectedClient() }}</span>
        </div>

        <!-- Priority Filter Dropdown -->
        <div class="flex items-center space-x-1.5">
          <label class="text-[11px] font-bold text-slate-400 whitespace-nowrap">Prioridade:</label>
          <select
            [ngModel]="service.selectedPriority()"
            (ngModelChange)="service.selectedPriority.set($event)"
            class="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer">
            <option value="Todos" class="bg-slate-800 text-white">Todas as Prioridades</option>
            <option value="P1" class="bg-slate-800 text-white">🚨 P1 - Crítica ({{ getCountByPriority('P1') }})</option>
            <option value="P2" class="bg-slate-800 text-white">⚡ P2 - Alta ({{ getCountByPriority('P2') }})</option>
            <option value="P3" class="bg-slate-800 text-white">🔷 P3 - Média ({{ getCountByPriority('P3') }})</option>
            <option value="P4" class="bg-slate-800 text-white">⚪ P4 - Baixa ({{ getCountByPriority('P4') }})</option>
          </select>
        </div>

        <!-- System Filter Dropdown -->
        <div class="flex items-center space-x-1.5">
          <label class="text-[11px] font-bold text-slate-400 whitespace-nowrap">Sistema:</label>
          <select
            [ngModel]="service.selectedSystem()"
            (ngModelChange)="service.selectedSystem.set($event)"
            class="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer">
            <option value="Todos" class="bg-slate-800 text-white">Todos os Sistemas</option>
            <option value="Portal Integrator" class="bg-slate-800 text-white">🌐 Portal Integrator ({{ getCountBySystem('Portal Integrator') }})</option>
            <option value="App Smart Tracking" class="bg-slate-800 text-white">📱 App Smart Tracking ({{ getCountBySystem('App Smart Tracking') }})</option>
            <option value="Smart X" class="bg-slate-800 text-white">📋 Smart X ({{ getCountBySystem('Smart X') }})</option>
            <option value="App ILC" class="bg-slate-800 text-white">🚚 App ILC ({{ getCountBySystem('App ILC') }})</option>
            <option value="Infraestrutura" class="bg-slate-800 text-white">🏗️ Infraestrutura ({{ getCountBySystem('Infraestrutura') }})</option>
          </select>
        </div>

        <!-- Sort By Dropdown -->
        <div class="flex items-center space-x-1.5">
          <label class="text-[11px] font-bold text-slate-400 whitespace-nowrap">Ordenar por:</label>
          <select
            [ngModel]="service.sortBy()"
            (ngModelChange)="service.sortBy.set($event)"
            class="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer">
            <option value="targetDelivery" class="bg-slate-800 text-white">📅 Meta (Mais próxima)</option>
            <option value="client" class="bg-slate-800 text-white">Cliente (A-Z)</option>
            <option value="priority" class="bg-slate-800 text-white">Prioridade (P1 → P4)</option>
            <option value="progress" class="bg-slate-800 text-white">Maior Progresso</option>
          </select>
        </div>

        <!-- Clear filters button if any active -->
        <button
          *ngIf="hasActiveFilters()"
          (click)="clearFilters()"
          class="ml-auto text-[11px] text-rose-400 hover:text-rose-300 font-extrabold flex items-center gap-1 cursor-pointer transition">
          <span>✕ Limpar Filtros</span>
        </button>

      </div>
    </div>
  `
})
export class FiltersComponent {
  service = inject(ProjectService);
  @Input() customProjects?: any[] | null = null;

  private get sourceProjects(): any[] {
    return this.customProjects ?? this.service.projects();
  }

  getCountByStatus(status: string) {
    const list = this.sourceProjects;
    if (status === 'Todos') return list.length;
    return list.filter(p => (p.status || 'Ativo') === status).length;
  }

  getCountByClient(client: string) {
    return this.sourceProjects.filter(p => p.client === client).length;
  }

  getCountByPriority(priority: string) {
    return this.sourceProjects.filter(p => (p.priority || 'P2') === priority).length;
  }

  getCountBySystem(system: string) {
    return this.sourceProjects.filter(p => (p.systems || []).includes(system)).length;
  }

  hasActiveFilters(): boolean {
    return this.service.selectedClient() !== 'Todos' ||
      this.service.selectedPriority() !== 'Todos' ||
      this.service.selectedSystem() !== 'Todos' ||
      this.service.selectedStatus() !== 'Todos' ||
      this.service.sortBy() !== 'targetDelivery' ||
      !!this.service.searchQuery();
  }

  clearFilters(): void {
    this.service.selectedClient.set('Todos');
    this.service.selectedPriority.set('Todos');
    this.service.selectedSystem.set('Todos');
    this.service.selectedStatus.set('Todos');
    this.service.sortBy.set('targetDelivery');
    this.service.searchQuery.set('');
  }
}
