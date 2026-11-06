import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project, ProjectStats, ClientConfig, EapPhase, AzureConfigStatus, AzureAuditReport } from '../models/project.model';
import { WeeklyReport, WeeklyReportSummary, RoadmapProject, BoardDecision } from '../models/weekly-report.model';
import { MaintenanceMetrics, MaintenancePeriod } from '../models/maintenance.model';
import { TeamMemberConfig, TeamAllocationReport } from '../models/team.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);

  // Core data signals
  projects = signal<Project[]>([]);
  adminProjects = signal<Project[]>([]);
  clients = signal<ClientConfig[]>([]);
  isLoading = signal<boolean>(false);
  isSyncing = signal<boolean>(false);
  lastError = signal<string | null>(null);
  lastSyncTime = signal<string | null>(null);
  azureStatus = signal<AzureConfigStatus | null>(null);

  // Active filters and views
  selectedClient = signal<string>('Todos');
  selectedStatus = signal<string>('Todos'); // 'Todos' | 'Ativo' | 'Finalizado' | 'Congelado'
  selectedPriority = signal<string>('Todos'); // 'Todos' | 'P1' | 'P2' | 'P3' | 'P4'
  selectedSystem = signal<string>('Todos'); // 'Todos' | 'Portal Integrator' | 'App Smart Tracking' | 'Smart X' | 'App ILC'
  sortBy = signal<'targetDelivery' | 'client' | 'priority' | 'progress'>('targetDelivery');
  searchQuery = signal<string>('');
  activeView = signal<'macro' | 'eap-gantt' | 'cards' | 'table' | 'report' | 'maintenance' | 'team'>('macro');

  // Maintenance Dashboard signals
  maintenanceMetrics = signal<MaintenanceMetrics | null>(null);
  isLoadingMaintenance = signal<boolean>(false);
  selectedMaintenancePeriod = signal<MaintenancePeriod>('year_2026');

  // Team Allocation signals
  teamAllocationReport = signal<TeamAllocationReport | null>(null);
  isLoadingTeam = signal<boolean>(false);
  selectedTeamPeriod = signal<MaintenancePeriod>('year_2026');
  adminTeamMembers = signal<TeamMemberConfig[]>([]);
  isLoadingAdminTeam = signal<boolean>(false);

  // Weekly Report signals (for Board Executive Presentation)
  weeklyReports = signal<WeeklyReportSummary[]>([]);
  selectedReportId = signal<string>('latest');
  currentWeeklyReport = signal<WeeklyReport | null>(null);
  isLoadingReport = signal<boolean>(false);
  presentationMode = signal<boolean>(false);

  // Selected project for EAP detail view
  selectedEapProjectId = signal<string | null>(null);

  // Curator / Admin signals
  isAdminOpen = signal<boolean>(false);
  adminPin = signal<string>('admin');
  isAuthenticated = signal<boolean>(false);
  isPublishingOnline = signal<boolean>(false);

  // Environment check: Curadoria and Azure Sync are restricted strictly to the local machine (localhost / 127.0.0.1)
  isLocalEnvironment = signal<boolean>(
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  );

// Client Portal Mode (secure token-gated access)
  isClientPortalMode = signal<boolean>(false);
  clientPortalSlug = signal<string | null>(null);
  clientPortalError = signal<string | null>(null);

  // --- VIEWER AUTHENTICATION & ACCESS CONTROL (100% Free Hybrid System) ---
  viewerUser = signal<any | null>(null);
  viewerSessionToken = signal<string | null>(
    typeof window !== 'undefined' ? (localStorage.getItem('ilc_viewer_session') || null) : null
  );
  authConfig = signal<any | null>(null);
  previewLoginOnLocalhost = signal<boolean>(false);

  isViewerAuthenticated = computed<boolean>(() => {
    return !!this.viewerUser() && !!this.viewerSessionToken();
  });

  requiresViewerLogin = computed<boolean>(() => {
    // Client portal mode handles its own token in the URL
    if (this.isClientPortalMode()) return false;
    
    // In local dev, require login only if previewing or explicitly enabled
    if (this.isLocalEnvironment() && !this.previewLoginOnLocalhost()) {
      return false;
    }
    
    // Online (Vercel): require login if enabled by configuration
    const onlineRequiresAuth = this.authConfig()?.requireAuthOnline !== false;
    if (onlineRequiresAuth && !this.isViewerAuthenticated()) {
      return true;
    }
    return false;
  });

  private getPublicHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.viewerSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (this.previewLoginOnLocalhost()) {
      headers['x-force-auth'] = 'true';
    }
    return headers;
  }

  // Helper to get client logo anywhere
  getClientLogo(clientName: string): string | null {
    if (!clientName) return null;
    const client = this.clients().find(c => c.name.toLowerCase() === clientName.toLowerCase());
    return client?.logoUrl || null;
  }

  // Computed selected client config
  currentClientConfig = computed(() => {
    const sel = this.selectedClient();
    if (sel === 'Todos') return null;
    return this.clients().find(c => c.name.toLowerCase() === sel.toLowerCase()) || null;
  });

  // Custom project view signals (for custom links independent of client)
  customProjectIds = signal<string[] | null>(null);
  isCustomView = signal<boolean>(false);

  // Helper to compare projects: by client (A-Z), then by name (A-Z)
  compareProjects(a: Project, b: Project): number {
    const clientDiff = (a.client || '').localeCompare(b.client || '', 'pt-BR', { sensitivity: 'base' });
    if (clientDiff !== 0) return clientDiff;
    return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
  }

  getMilestoneBadgeClass(milestone?: string): string {
    const m = (milestone || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (m.includes('planejamento')) {
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    }
    if (m.includes('desenvolvimento')) {
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
    if (m.includes('homologacao')) {
      return 'bg-orange-50 text-orange-700 border border-orange-200';
    }
    if (m.includes('treinamento')) {
      return 'bg-teal-50 text-teal-700 border border-teal-200';
    }
    if (m.includes('operacao assistida')) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  }

  // Client-filtered or Custom-filtered list of public projects (strictly excludes maintenance projects)
  clientProjects = computed(() => {
    const list = this.projects().filter(p => p.category !== 'maintenance');
    let result = list;
    if (this.isCustomView() && this.customProjectIds() && this.customProjectIds()!.length > 0) {
      const allowed = new Set(this.customProjectIds()!.map(id => id.trim().toLowerCase()));
      result = list.filter(p => allowed.has(p.id.toLowerCase()));
    } else {
      const client = this.selectedClient();
      if (client !== 'Todos') {
        result = list.filter(p => p.client.toLowerCase() === client.toLowerCase());
      }
    }
    return result.slice().sort((a, b) => this.compareProjects(a, b));
  });

  // Filtered projects (with status, priority, system, search and sort)
  filteredProjects = computed(() => {
    const list = this.clientProjects();
    const status = this.selectedStatus();
    const priority = this.selectedPriority();
    const system = this.selectedSystem();
    const query = this.searchQuery().toLowerCase().trim();
    const sort = this.sortBy();

    const filtered = list.filter(p => {
      if (status !== 'Todos' && p.status !== status) return false;
      if (priority !== 'Todos' && (p.priority || 'P2') !== priority) return false;
      if (system !== 'Todos') {
        const sysList = p.systems || [];
        if (!sysList.includes(system)) return false;
      }
      if (query) {
        const inName = p.name.toLowerCase().includes(query);
        const inClient = p.client.toLowerCase().includes(query);
        const inDesc = (p.description || '').toLowerCase().includes(query);
        const inLeader = (p.team?.leader || '').toLowerCase().includes(query);
        const inSystems = (p.systems || []).some(s => s.toLowerCase().includes(query));
        if (!inName && !inClient && !inDesc && !inLeader && !inSystems) return false;
      }
      return true;
    });

    if (sort === 'priority') {
      const pOrder: Record<string, number> = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 };
      return filtered.slice().sort((a, b) => {
        const pA = pOrder[a.priority || 'P2'] || 99;
        const pB = pOrder[b.priority || 'P2'] || 99;
        if (pA !== pB) return pA - pB;
        return this.compareProjects(a, b);
      });
    }

    if (sort === 'progress') {
      return filtered.slice().sort((a, b) => (b.progress || 0) - (a.progress || 0));
    }

    if (sort === 'client') {
      return filtered.slice().sort((a, b) => this.compareProjects(a, b));
    }

    // Default / 'targetDelivery': Meta da mais próxima para a mais distante
    return filtered.slice().sort((a, b) => {
      const dateA = a.executedDates?.end || a.plannedDates?.end || a.agreedDates?.end || '9999-12-31';
      const dateB = b.executedDates?.end || b.plannedDates?.end || b.agreedDates?.end || '9999-12-31';
      const dateDiff = dateA.localeCompare(dateB);
      if (dateDiff !== 0) return dateDiff;
      return this.compareProjects(a, b);
    });
  });

  getPriorityBadgeClass(priority?: string): string {
    const p = priority || 'P2';
    if (p === 'P1') return 'bg-rose-100 text-rose-800 border border-rose-300 font-black';
    if (p === 'P2') return 'bg-amber-100 text-amber-800 border border-amber-300 font-extrabold';
    if (p === 'P3') return 'bg-blue-100 text-blue-800 border border-blue-300 font-bold';
    return 'bg-slate-100 text-slate-700 border border-slate-300 font-medium';
  }

  getPriorityLabel(priority?: string): string {
    const p = priority || 'P2';
    if (p === 'P1') return 'P1 - Crítica';
    if (p === 'P2') return 'P2 - Alta';
    if (p === 'P3') return 'P3 - Média';
    return 'P4 - Baixa';
  }

  getSystemBadgeClass(system: string): string {
    const s = (system || '').toLowerCase();
    if (s.includes('portal integrator')) return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    if (s.includes('smart tracking')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s.includes('smart x')) return 'bg-purple-50 text-purple-700 border border-purple-200';
    if (s.includes('app ilc')) return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
    if (s.includes('infraestrutura')) return 'bg-sky-50 text-sky-700 border border-sky-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  }

  getTeamTooltip(project: Project | null | undefined): string {
    if (!project || !project.team) return 'Equipe não cadastrada';
    const leader = project.team.leader?.trim() || '';
    const rawMembers = project.team.members || [];

    // Collect all unique team members
    const allMembers: string[] = [];
    if (leader) allMembers.push(leader);
    for (const m of rawMembers) {
      const trimmed = m?.trim();
      if (trimmed && !allMembers.includes(trimmed)) {
        allMembers.push(trimmed);
      }
    }

    if (allMembers.length === 0) return 'Equipe não cadastrada';

    if (leader) {
      return `Líder: ${leader}\nIntegrantes da equipe: ${allMembers.join(', ')}`;
    }
    return `Integrantes da equipe: ${allMembers.join(', ')}`;
  }

  formatEditionTitle(rep: any): string {
    if (!rep) return '';
    const match = (rep.title || '').match(/Semana\s+(\d+)\s*\/\s*(\d+)/i);
    if (match) {
      return `Semana ${match[1]} / ${match[2]}`;
    }
    if (rep.weekNumber && rep.year) {
      return `Semana ${rep.weekNumber} / ${rep.year}`;
    }
    return rep.title || '';
  }

  // Reactive Stats: Strictly ACTIVE projects for RAG indicators!
  // Frozen and Completed projects NEVER count towards onTrack / warning / delayed!
  stats = computed<ProjectStats>(() => {
    const list = this.clientProjects();
    const activeProjects = list.filter(p => p.status === 'Ativo');
    
    const onTrack = activeProjects.filter(p => p.ragStatus === 'green').length;
    const warning = activeProjects.filter(p => p.ragStatus === 'amber').length;
    const delayed = activeProjects.filter(p => p.ragStatus === 'red').length;
    
    const completed = list.filter(p => p.status === 'Finalizado').length;
    const frozen = list.filter(p => p.status === 'Congelado').length;

    let totalPlanned = 0;
    let totalExecuted = 0;
    let agreedHours = 0;
    let clientPlanned = 0;
    let clientExecuted = 0;
    let ilcPlanned = 0;
    let ilcExecuted = 0;

    for (const p of list) {
      if (p.hours) {
        totalPlanned += p.hours.totalPlanned || 0;
        totalExecuted += p.hours.totalExecuted || 0;
        agreedHours += (p.hours.agreed || p.agreedHours || p.hours.totalPlanned || 0);
        clientPlanned += p.hours.clientPlanned || 0;
        clientExecuted += p.hours.clientExecuted || 0;
        ilcPlanned += p.hours.ilcPlanned || 0;
        ilcExecuted += p.hours.ilcExecuted || 0;
      }
    }

    return {
      total: list.length,
      active: activeProjects.length,
      completed,
      frozen,
      onTrack,
      warning,
      delayed,
      lastSync: this.lastSyncTime() || new Date().toISOString(),
      milestones: [
        'Planejamento',
        'Desenvolvimento',
        'Homologação',
        'Treinamento',
        'Operação Assistida'
      ],
      hoursSummary: {
        totalPlanned: Math.round(totalPlanned * 10) / 10,
        totalExecuted: Math.round(totalExecuted * 10) / 10,
        agreedHours: Math.round(agreedHours * 10) / 10,
        clientPlanned: Math.round(clientPlanned * 10) / 10,
        clientExecuted: Math.round(clientExecuted * 10) / 10,
        ilcPlanned: Math.round(ilcPlanned * 10) / 10,
        ilcExecuted: Math.round(ilcExecuted * 10) / 10
      }
    };
  });

  formatHours(val?: number | null): string {
    if (val === null || val === undefined || isNaN(val)) return '0';
    const rounded = Math.round(Number(val) * 10) / 10;
    return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  // Active project for EAP Gantt (searches all projects so maintenance projects are fully supported)
  activeEapProject = computed(() => {
    const selId = this.selectedEapProjectId();
    if (selId) {
      const found = this.projects().find(p => p.id === selId);
      if (found) return found;
    }
    const list = this.filteredProjects();
    // Default to Frete Expresso 2.0 or first project
    const frete = list.find(p => p.name.toLowerCase().includes('frete expresso'));
    return frete || list[0] || this.projects()[0] || null;
  });

  // Projects available in EAP Gantt selector (includes both new developments and maintenance projects)
  eapAvailableProjects = computed(() => {
    let list = this.projects();
    if (this.isCustomView() && this.customProjectIds() && this.customProjectIds()!.length > 0) {
      const allowed = new Set(this.customProjectIds()!.map(id => id.trim().toLowerCase()));
      list = list.filter(p => allowed.has(p.id.toLowerCase()));
    } else {
      const client = this.selectedClient();
      if (client !== 'Todos') {
        list = list.filter(p => p.client.toLowerCase() === client.toLowerCase());
      }
    }
    // Always guarantee that if active project is selected (e.g. from Sustentação view), it is included in the list even if client filter would exclude it
    const active = this.activeEapProject();
    if (active && !list.some(p => p.id === active.id)) {
      list = [active, ...list];
    }
    return list.slice().sort((a, b) => this.compareProjects(a, b));
  });

  async loadPublicData() {
    this.isLoading.set(true);
    this.lastError.set(null);
    try {
      await this.loadAuthConfig();
      if (this.viewerSessionToken() && !this.viewerUser()) {
        await this.verifySavedSession();
      }

      const headers = this.getPublicHeaders();
      const [projRes, clientsRes] = await Promise.all([
        firstValueFrom(this.http.get<{ success: boolean; data: Project[] }>('/api/public/projects', { headers })),
        firstValueFrom(this.http.get<{ success: boolean; data: ClientConfig[] }>('/api/public/clients', { headers }))
      ]);

      if (projRes?.success) {
        this.projects.set(projRes.data);
        if (projRes.data.length > 0 && projRes.data[0].azureLastUpdated) {
          this.lastSyncTime.set(projRes.data[0].azureLastUpdated);
        }
      }
      if (clientsRes?.success) this.clients.set(clientsRes.data);

      // Auto select first project for EAP if none selected
      if (!this.selectedEapProjectId() && projRes?.data?.length) {
        const frete = projRes.data.find(p => p.name.toLowerCase().includes('frete expresso'));
        this.selectedEapProjectId.set(frete ? frete.id : projRes.data[0].id);
      }

      // Load weekly status reports list and current edition
      await Promise.all([
        this.loadWeeklyReports(),
        this.loadWeeklyReport(this.selectedReportId() || 'latest'),
        this.loadMaintenanceMetrics()
      ]);
    } catch (err: any) {
      if (err?.status === 401) {
        console.warn('Dashboard requer autenticação de visualizador.');
      } else {
        this.lastError.set('Falha ao conectar com a API do Dashboard.');
        console.error(err);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadClientPortal(slug: string, token: string) {
    this.isLoading.set(true);
    this.isClientPortalMode.set(true);
    this.clientPortalSlug.set(slug);
    this.clientPortalError.set(null);

    try {
      const [portalRes, clientsRes] = await Promise.all([
        firstValueFrom(this.http.get<{
          success: boolean;
          client: ClientConfig;
          data: Project[];
          stats: ProjectStats;
          message?: string;
        }>(`/api/public/client-portal/${slug}?token=${token}`)),
        firstValueFrom(this.http.get<{ success: boolean; data: ClientConfig[] }>('/api/public/clients')).catch(() => ({ success: false, data: [] }))
      ]);

      if (clientsRes?.success && clientsRes.data) {
        this.clients.set(clientsRes.data);
      }

      if (portalRes?.success) {
        this.projects.set(portalRes.data || []);
        this.selectedClient.set(portalRes.client.name);
        
        // Ensure client config is in clients list
        const currentClients = this.clients();
        if (!currentClients.find(c => c.slug === portalRes.client.slug)) {
          this.clients.set([...currentClients, portalRes.client]);
        }
        
        if (portalRes.data?.length && !this.selectedEapProjectId()) {
          this.selectedEapProjectId.set(portalRes.data[0].id);
        }
      } else {
        this.clientPortalError.set(portalRes?.message || 'Acesso negado ao portal do cliente.');
      }
    } catch (err: any) {
      this.clientPortalError.set(err?.error?.message || 'Link inválido ou token expirado.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadAdminData() {
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: Project[] }>('/api/admin/projects', {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      if (res?.success) {
        this.adminProjects.set(res.data);
        this.isAuthenticated.set(true);
      }
    } catch (err: any) {
      this.isAuthenticated.set(false);
      throw new Error('PIN incorreto ou não autorizado');
    }
  }

  async updateProject(id: string, updates: Partial<Project>) {
    const res = await firstValueFrom(
      this.http.put<{ success: boolean; data: Project }>(`/api/admin/projects/${id}`, updates, {
        headers: { 'x-admin-pin': this.adminPin() }
      })
    );
    if (res?.success) {
      await this.loadPublicData();
      await this.loadAdminData();
      await this.loadWeeklyReports();
      await this.loadWeeklyReport(this.selectedReportId() || 'latest');
    }
    return res?.data;
  }

  async createManualProject(data: any) {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; data: Project }>('/api/admin/projects', data, {
        headers: { 'x-admin-pin': this.adminPin() }
      })
    );
    if (res?.success) {
      await this.loadPublicData();
      await this.loadAdminData();
      await this.loadWeeklyReports();
      await this.loadWeeklyReport(this.selectedReportId() || 'latest');
    }
    return res?.data;
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.delete<{ success: boolean }>(`/api/admin/projects/${id}`, {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      if (res?.success) {
        await this.loadPublicData();
        await this.loadAdminData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
      return false;
    }
  }

  setCustomView(ids: string[]) {
    this.customProjectIds.set(ids);
    this.isCustomView.set(true);
    const cur = this.selectedEapProjectId();
    if (ids.length > 0 && (!cur || !ids.includes(cur))) {
      this.selectedEapProjectId.set(ids[0]);
    }
  }

  clearCustomView() {
    this.customProjectIds.set(null);
    this.isCustomView.set(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('projects');
    url.searchParams.delete('p');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  }

  async updateClient(slug: string, updates: Partial<ClientConfig>) {
    const res = await firstValueFrom(
      this.http.put<{ success: boolean; data: ClientConfig }>(`/api/admin/clients/${slug}`, updates, {
        headers: { 'x-admin-pin': this.adminPin() }
      })
    );
    if (res?.success) {
      await this.loadPublicData();
    }
    return res?.data;
  }

  async loadAzureStatus() {
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: AzureConfigStatus }>('/api/admin/azure/status', {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      if (res?.success) {
        this.azureStatus.set(res.data);
      }
      return res?.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async testAzureConnection() {
    return firstValueFrom(
      this.http.post<{ success: boolean; projectCount?: number; error?: string }>('/api/admin/azure/test', {}, {
        headers: { 'x-admin-pin': this.adminPin() }
      })
    );
  }

  async updateAzurePat(newPat: string) {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; data: AzureConfigStatus }>('/api/admin/azure/pat', { pat: newPat }, {
        headers: { 'x-admin-pin': this.adminPin() }
      })
    );
    if (res?.success) {
      this.azureStatus.set(res.data);
    }
    return res?.data;
  }

  async uploadClientLogo(slug: string, imageBase64: string) {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; data: ClientConfig }>(`/api/admin/clients/${slug}/logo`, { imageBase64 }, {
        headers: { 'x-admin-pin': this.adminPin() }
      })
    );
    if (res?.success) {
      await this.loadPublicData();
    }
    return res?.data;
  }

  async triggerSync() {
    this.isSyncing.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; count?: number }>('/api/admin/sync', {}, {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      await this.loadPublicData();
      if (this.isAuthenticated()) {
        await this.loadAdminData();
      }
      return res;
    } finally {
      this.isSyncing.set(false);
    }
  }

  async getProjectAzureAudit(projectId: string): Promise<AzureAuditReport | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: AzureAuditReport }>(`/api/admin/projects/${projectId}/azure-audit`, {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      return res?.data || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  openEapForProject(projectId: string) {
    this.selectedEapProjectId.set(projectId);
    this.activeView.set('eap-gantt');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadWeeklyReports() {
    try {
      const headers = this.getPublicHeaders();
      const res = await firstValueFrom(this.http.get<{ success: boolean; data: WeeklyReportSummary[] }>('/api/public/weekly-reports', { headers }));
      if (res?.success) {
        this.weeklyReports.set(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar relatórios semanais:', err);
    }
  }

  async loadWeeklyReport(id: string = 'latest') {
    this.isLoadingReport.set(true);
    this.selectedReportId.set(id);
    try {
      const headers = this.getPublicHeaders();
      const res = await firstValueFrom(this.http.get<{ success: boolean; data: WeeklyReport }>(`/api/public/weekly-reports/${id}`, { headers }));
      if (res?.success) {
        this.currentWeeklyReport.set(res.data);
      }
    } catch (err) {
      console.error(`Erro ao carregar relatório ${id}:`, err);
    } finally {
      this.isLoadingReport.set(false);
    }
  }

  async generateWeeklyReport() {
    this.isLoadingReport.set(true);
    try {
      const res = await firstValueFrom(this.http.post<{ success: boolean; data: WeeklyReport }>(
        '/api/admin/weekly-reports/generate',
        {},
        { headers: { 'x-admin-pin': this.adminPin() } }
      ));
      if (res?.success) {
        this.currentWeeklyReport.set(res.data);
        await this.loadWeeklyReports();
        this.selectedReportId.set(res.data.id);
        return res.data;
      }
    } catch (err: any) {
      console.error('Erro ao gerar relatório semanal:', err);
      alert('Erro ao gerar relatório semanal: ' + (err?.error?.message || err.message));
    } finally {
      this.isLoadingReport.set(false);
    }
    return null;
  }

  async saveWeeklyReport(report: WeeklyReport) {
    try {
      const res = await firstValueFrom(this.http.put<{ success: boolean; data: WeeklyReport }>(
        `/api/admin/weekly-reports/${report.id}`,
        report,
        { headers: { 'x-admin-pin': this.adminPin() } }
      ));
      if (res?.success) {
        this.currentWeeklyReport.set(res.data);
        await this.loadWeeklyReports();
        await this.loadPublicData();
        await this.loadAdminData();
        return true;
      }
    } catch (err: any) {
      console.error('Erro ao salvar relatório semanal:', err);
      alert('Erro ao salvar relatório: ' + (err?.error?.message || err.message));
    }
    return false;
  }

  async deleteWeeklyReport(id: string) {
    if (!confirm('Deseja realmente excluir esta edição do relatório semanal?')) return false;
    try {
      const res = await firstValueFrom(this.http.delete<{ success: boolean }>(
        `/api/admin/weekly-reports/${id}`,
        { headers: { 'x-admin-pin': this.adminPin() } }
      ));
      if (res?.success) {
        await this.loadWeeklyReports();
        await this.loadWeeklyReport('latest');
        return true;
      }
    } catch (err: any) {
      console.error('Erro ao excluir relatório:', err);
      alert('Erro ao excluir relatório: ' + (err?.error?.message || err.message));
    }
    return false;
  }

  async loadMaintenanceMetrics(clientFilter?: string, period?: MaintenancePeriod): Promise<MaintenanceMetrics | null> {
    const p = period || this.selectedMaintenancePeriod();
    const c = clientFilter || this.selectedClient();
    this.isLoadingMaintenance.set(true);
    try {
      const headers = this.getPublicHeaders();
      const url = `/api/public/maintenance-metrics?client=${encodeURIComponent(c)}&period=${encodeURIComponent(p)}`;
      const res = await firstValueFrom(this.http.get<{ success: boolean; data: MaintenanceMetrics }>(url, { headers }));
      if (res?.success && res.data) {
        this.maintenanceMetrics.set(res.data);
        return res.data;
      }
      return null;
    } catch (err) {
      console.error('Erro ao carregar métricas de sustentação:', err);
      return null;
    } finally {
      this.isLoadingMaintenance.set(false);
    }
  }

  async loadTeamAllocation(clientFilter?: string, period?: MaintenancePeriod): Promise<TeamAllocationReport | null> {
    const p = period || this.selectedTeamPeriod();
    const c = clientFilter || this.selectedClient();
    this.isLoadingTeam.set(true);
    try {
      const headers = this.getPublicHeaders();
      const url = `/api/public/team-allocation?client=${encodeURIComponent(c)}&period=${encodeURIComponent(p)}`;
      const res = await firstValueFrom(this.http.get<{ success: boolean; data: TeamAllocationReport }>(url, { headers }));
      if (res?.success && res.data) {
        this.teamAllocationReport.set(res.data);
        return res.data;
      }
      return null;
    } catch (err) {
      console.error('Erro ao carregar relatório de alocação de equipe:', err);
      return null;
    } finally {
      this.isLoadingTeam.set(false);
    }
  }

  async loadAdminTeam(): Promise<TeamMemberConfig[]> {
    this.isLoadingAdminTeam.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: TeamMemberConfig[] }>('/api/admin/team', {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      if (res?.success && res.data) {
        this.adminTeamMembers.set(res.data);
        return res.data;
      }
      return [];
    } catch (err) {
      console.error('Erro ao carregar lista de membros da equipe (admin):', err);
      return [];
    } finally {
      this.isLoadingAdminTeam.set(false);
    }
  }

  async updateAdminTeamMember(name: string, updates: Partial<TeamMemberConfig>): Promise<TeamMemberConfig | null> {
    try {
      const res = await firstValueFrom(
        this.http.put<{ success: boolean; data: TeamMemberConfig }>(
          `/api/admin/team/${encodeURIComponent(name)}`,
          updates,
          { headers: { 'x-admin-pin': this.adminPin() } }
        )
      );
      if (res?.success && res.data) {
        await this.loadAdminTeam();
        await this.loadTeamAllocation();
        await this.loadMaintenanceMetrics();
        return res.data;
      }
      return null;
    } catch (err) {
      console.error(`Erro ao atualizar colaborador "${name}":`, err);
      return null;
    }
  }

  async updateAllAdminTeamMembers(members: TeamMemberConfig[]): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.put<{ success: boolean; data: TeamMemberConfig[] }>(
          '/api/admin/team',
          { members },
          { headers: { 'x-admin-pin': this.adminPin() } }
        )
      );
      if (res?.success) {
        await this.loadAdminTeam();
        await this.loadTeamAllocation();
        await this.loadMaintenanceMetrics();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao salvar colaboradores da equipe:', err);
      return false;
    }
  }

  getProjectCurrentStatusReport(p: Project | null | undefined): string {
    if (!p) return 'Acompanhamento regular sem ocorrências impeditivas reportadas.';
    const rep = this.currentWeeklyReport();
    const summaries = this.weeklyReports();
    const isLatestLoaded = rep && summaries.length > 0 && rep.id === summaries[0].id;
    if (isLatestLoaded && rep) {
      const activeMatch = (rep.activeProjects || []).find(ap => ap.projectId === p.id || ap.name === p.name);
      if (activeMatch && activeMatch.statusReport && activeMatch.statusReport.trim()) {
        return activeMatch.statusReport.trim();
      }
      const maintMatch = (rep.maintenanceSection?.projects || []).find(mp => (mp.projectId === p.id || mp.id === p.id || mp.name === p.name));
      if (maintMatch && maintMatch.statusReport && maintMatch.statusReport.trim()) {
        return maintMatch.statusReport.trim();
      }
    }
    return p.executiveSummary || 'Acompanhamento regular sem ocorrências impeditivas reportadas.';
  }

  togglePresentationMode() {
    this.presentationMode.update(v => !v);
  }

  async publishOnline(): Promise<{ success: boolean; message: string }> {
    if (!this.isLocalEnvironment() || this.isPublishingOnline()) {
      return { success: false, message: 'Operação disponível apenas no ambiente local.' };
    }
    this.isPublishingOnline.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; message: string }>(
          '/api/admin/publish-online',
          {},
          { headers: { 'x-admin-pin': this.adminPin() } }
        )
      );
      return res || { success: true, message: 'Dados publicados com sucesso!' };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message || err?.message || 'Erro ao publicar atualizações no GitHub.'
      };
    } finally {
      this.isPublishingOnline.set(false);
    }
  }

  // --- VIEWER AUTH & ACCESS CONTROL API CALLS ---

  async loadAuthConfig() {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; data: any }>('/api/auth/config'));
      if (res?.success) {
        this.authConfig.set(res.data);
      }
    } catch (e) {
      console.warn('Configuração de autenticação não carregada:', e);
    }
  }

  async verifySavedSession(): Promise<boolean> {
    const token = this.viewerSessionToken();
    if (!token) return false;
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; user: any }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      }));
      if (res?.success && res.user) {
        this.viewerUser.set(res.user);
        return true;
      }
    } catch (_) {
      this.logoutViewer();
    }
    return false;
  }

  private setViewerSession(token: string, user: any) {
    this.viewerSessionToken.set(token);
    this.viewerUser.set(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ilc_viewer_session', token);
      if (user.email) {
        localStorage.setItem('ilc_last_email', user.email);
      }
    }
  }

  logoutViewer() {
    this.viewerSessionToken.set(null);
    this.viewerUser.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ilc_viewer_session');
    }
  }

  togglePreviewLogin() {
    this.previewLoginOnLocalhost.update(v => !v);
  }

  async requestEmailOtp(email: string): Promise<{ success: boolean; challengeToken?: string; message?: string }> {
    try {
      return await firstValueFrom(
        this.http.post<{ success: boolean; challengeToken?: string; message?: string }>('/api/auth/request-otp', { email })
      );
    } catch (err: any) {
      return { success: false, message: err?.error?.message || err.message || 'Erro ao enviar código de acesso por e-mail.' };
    }
  }

  async verifyEmailOtp(email: string, code: string, challengeToken: string): Promise<{ success: boolean; token?: string; sessionToken?: string; user?: any; message?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; token?: string; sessionToken?: string; user: any; message?: string }>('/api/auth/verify-otp', {
          email,
          code,
          challengeToken
        })
      );
      const token = res?.sessionToken || res?.token;
      if (res?.success && token && res.user) {
        this.setViewerSession(token, res.user);
        await this.loadPublicData();
      }
      return { ...res, token };
    } catch (err: any) {
      return { success: false, message: err?.error?.message || err.message || 'Código de acesso incorreto ou expirado.' };
    }
  }

  async loginWithPassword(email: string, password: string): Promise<{
    success: boolean;
    token?: string;
    sessionToken?: string;
    user?: any;
    mustChangePassword?: boolean;
    firstAccessToken?: string;
    message?: string;
  }> {
    try {
      // Check if we have a locally stored password proof for stateless Vercel logins
      const proofKey = `ilc_pwd_proof_${email.toLowerCase().trim()}`;
      const passwordProof = typeof window !== 'undefined' ? (localStorage.getItem(proofKey) || undefined) : undefined;

      const res = await firstValueFrom(
        this.http.post<any>('/api/auth/login-password', {
          email,
          password,
          passwordProof
        })
      );

      if (res?.mustChangePassword) {
        return res;
      }

      const token = res?.sessionToken || res?.token;
      if (res?.success && token && res.user) {
        this.setViewerSession(token, res.user);
        await this.loadPublicData();
      }
      return { ...res, token };
    } catch (err: any) {
      return { success: false, message: err?.error?.message || err.message || 'Credenciais inválidas ou e-mail não autorizado.' };
    }
  }

  async completeFirstPasswordChange(email: string, newPassword: string, firstAccessToken: string): Promise<{
    success: boolean;
    token?: string;
    sessionToken?: string;
    user?: any;
    passwordProof?: string;
    message?: string;
  }> {
    try {
      const res = await firstValueFrom(
        this.http.post<any>('/api/auth/change-first-password', {
          email,
          newPassword,
          firstAccessToken
        })
      );

      if (res?.success) {
        if (res.passwordProof && typeof window !== 'undefined') {
          const proofKey = `ilc_pwd_proof_${email.toLowerCase().trim()}`;
          localStorage.setItem(proofKey, res.passwordProof);
        }
        const token = res?.sessionToken || res?.token;
        if (token && res.user) {
          this.setViewerSession(token, res.user);
          await this.loadPublicData();
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err?.error?.message || err.message || 'Erro ao redefinir senha de primeiro acesso.' };
    }
  }

  async loginWithMicrosoft(accessToken: string): Promise<{ success: boolean; token?: string; sessionToken?: string; user?: any; message?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<any>('/api/auth/microsoft', { accessToken })
      );
      const token = res?.sessionToken || res?.token;
      if (res?.success && token && res.user) {
        this.setViewerSession(token, res.user);
        await this.loadPublicData();
      }
      return { ...res, token };
    } catch (err: any) {
      return { success: false, message: err?.error?.message || err.message || 'Falha na autenticação com Microsoft SSO.' };
    }
  }

  // Admin access control management
  async loadAdminAccessControl(): Promise<any | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: any }>('/api/admin/access-control', {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      return res?.data || null;
    } catch (err) {
      console.error('Erro ao carregar controle de acesso:', err);
      return null;
    }
  }

  async updateAdminAccessSettings(settings: any): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.put<{ success: boolean }>('/api/admin/access-control/settings', settings, {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      return !!res?.success;
    } catch (err) {
      console.error('Erro ao salvar configurações de controle de acesso:', err);
      return false;
    }
  }

  async upsertAdminAccessUser(user: any): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean }>('/api/admin/access-control/users', user, {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      return !!res?.success;
    } catch (err) {
      console.error('Erro ao salvar usuário de acesso:', err);
      return false;
    }
  }

  async deleteAdminAccessUser(userId: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.delete<{ success: boolean }>(`/api/admin/access-control/users/${userId}`, {
          headers: { 'x-admin-pin': this.adminPin() }
        })
      );
      return !!res?.success;
    } catch (err) {
      console.error('Erro ao excluir usuário de acesso:', err);
      return false;
    }
  }

  async sendAccessInvitationEmail(userId: string, dashboardUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; message: string }>(
          `/api/admin/access-control/users/${userId}/invite`,
          { dashboardUrl: dashboardUrl || window.location.origin },
          { headers: { 'x-admin-pin': this.adminPin() } }
        )
      );
      return res;
    } catch (err: any) {
      return { success: false, message: err?.error?.message || err.message || 'Erro ao enviar e-mail de convite.' };
    }
  }
}
