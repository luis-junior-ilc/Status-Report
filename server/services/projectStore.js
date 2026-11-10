const fs = require('fs');
const path = require('path');
const config = require('../config');

const STORE_PATH = path.join(__dirname, '../data/projects.json');
const CLIENTS_PATH = path.join(__dirname, '../data/clients.json');

const OFFICIAL_EAP_PHASES = [
  'Planejamento',
  'Desenvolvimento',
  'Homologação',
  'Treinamento',
  'Operação Assistida'
];

const DEFAULT_CLIENTS = [
  {
    name: 'ILC (Interno)',
    slug: 'ilc',
    logoUrl: '/assets/ilc-logo.png',
    token: 'ilc-interno-2026',
    description: 'Projetos corporativos ILC'
  },
  {
    name: 'Mirassol',
    slug: 'mirassol',
    logoUrl: 'https://mirassol.ind.br/wp-content/themes/mirassol/assets/images/logo.png',
    token: 'mirassol-acesso-2026',
    description: 'Demandas e tecnologia Mirassol'
  },
  {
    name: 'John Deere',
    slug: 'john-deere',
    logoUrl: 'https://www.deere.com.br/assets/images/common/logo-john-deere-black.svg',
    token: 'jd-acesso-2026',
    description: 'Projetos integrados John Deere'
  },
  {
    name: 'Petrobras',
    slug: 'petrobras',
    logoUrl: 'https://petrobras.com.br/themes/custom/petrobras_theme/logo.svg',
    token: 'petrobras-acesso-2026',
    description: 'Iniciativas logísticas Petrobras'
  },
  {
    name: 'Boge Ruber',
    slug: 'boge-ruber',
    logoUrl: 'https://www.boge-rubber-plastics.com/fileadmin/templates/images/logo.svg',
    token: 'boge-acesso-2026',
    description: 'Projetos e integrações Boge Rubber & Plastics'
  }
];

class ProjectStore {
  constructor() {
    this.projects = [];
    this.clients = DEFAULT_CLIENTS;
    this.lastSync = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(CLIENTS_PATH)) {
        this.clients = JSON.parse(fs.readFileSync(CLIENTS_PATH, 'utf8'));
      } else {
        this.saveClients();
      }

      if (fs.existsSync(STORE_PATH)) {
        const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        this.projects = (data.projects || []).map(p => {
          if (!p.priority) p.priority = 'P2';
          if (!p.systems) p.systems = [];
          if (!p.category) p.category = 'new_project';
          if (!p.team) {
            const uniqueAssigned = Array.from(new Set((p.activities || []).map(a => a.assignedTo).filter(Boolean)));
            p.team = {
              leader: uniqueAssigned[0] || '',
              members: uniqueAssigned
            };
          }
          if (p.activities) {
            p.activities.forEach(a => {
              if (a.ilcHours !== undefined) a.ilcHours = this.roundHours(a.ilcHours);
              if (a.ilcHoursTotal !== undefined) a.ilcHoursTotal = this.roundHours(a.ilcHoursTotal);
            });
          }
          p.hours = this.calculateHours(p);
          p.ragStatus = this.calculateRagStatus(p);
          return p;
        });
        this.lastSync = data.lastSync || null;
      }
    } catch (err) {
      console.error('Error loading store:', err);
    }
  }

  save() {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify({
        lastSync: this.lastSync,
        projects: this.projects
      }, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving projects.json:', err);
    }
  }

  saveClients() {
    try {
      const dir = path.dirname(CLIENTS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CLIENTS_PATH, JSON.stringify(this.clients, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving clients.json:', err);
    }
  }

  mapClientName(rawName) {
    if (!rawName) return 'ILC (Interno)';
    const upper = rawName.toUpperCase();
    if (upper.includes('JOHN DEERE')) return 'John Deere';
    if (upper.includes('PETROBRAS')) return 'Petrobras';
    if (upper.includes('BOGE')) return 'Boge Ruber';
    if (upper.includes('MIRASSOL')) return 'Mirassol';
    if (upper.includes('ILC') || upper.includes('SMART') || upper.includes('INTEGRATOR')) return 'ILC (Interno)';
    return 'Mirassol';
  }

  parseLocalDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) {
      const d = new Date(dateInput);
      d.setHours(12, 0, 0, 0);
      return d;
    }
    const str = String(dateInput).split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    }
    const d = new Date(dateInput);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  // Helper to count business days (Monday-Friday) between two dates
  getBusinessDaysDiff(startDate, endDate) {
    const start = this.parseLocalDate(startDate);
    const end = this.parseLocalDate(endDate);
    if (!start || !end) return 0;
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < start) return -Math.round((start.getTime() - end.getTime()) / (1000 * 3600 * 24));
    let count = 0;
    const cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // Recalculates activity flags using the updated rule: tight margin is up to 2 days (business or calendar)
  recalculateActivityFlags(activity, today = new Date()) {
    if (!activity.targetDate || activity.status === 'completed') {
      activity.isDelayed = false;
      activity.isTightMargin = false;
      return activity;
    }
    const t = new Date(activity.targetDate + 'T12:00:00');
    t.setHours(0, 0, 0, 0);
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const diffDays = Math.round((t.getTime() - startOfToday.getTime()) / (1000 * 3600 * 24));

    // Regra calibrada: desvio a partir de 2 dias de atraso; atenção entre -1 e 1 dia de atraso
    if (diffDays <= -2) {
      // Atraso crítico a partir de 2 dias
      activity.isDelayed = true;
      activity.isTightMargin = false;
    } else if (diffDays >= -1 && diffDays <= 1) {
      // Atenção: entrega iminente hoje/amanhã ou atraso tolerado de 1 dia
      activity.isDelayed = false;
      activity.isTightMargin = true;
    } else {
      // No prazo com folga confortável (> 1 dia)
      activity.isDelayed = false;
      activity.isTightMargin = false;
    }
    return activity;
  }

  calculateVariance(agreedEnd, executedEnd, plannedEnd, project = null) {
    if (project) {
      if (project.status === 'Finalizado' || (project.progress || 0) >= 100) {
        return 0;
      }
      if ((project.status || 'Ativo') !== 'Ativo') {
        return 0;
      }
    }

    const targetEnd = executedEnd || plannedEnd || agreedEnd;
    let endVariance = 0;
    if (agreedEnd && targetEnd) {
      const agreedDate = this.parseLocalDate(agreedEnd);
      const actualDate = this.parseLocalDate(targetEnd);
      if (agreedDate && actualDate) {
        const diffTime = actualDate.getTime() - agreedDate.getTime();
        endVariance = Math.round(diffTime / (1000 * 3600 * 24));
      }
    }

    let activityVariance = 0;
    if (project && Array.isArray(project.activities)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const act of project.activities) {
        if (act.status === 'completed' || !act.targetDate) continue;
        const target = this.parseLocalDate(act.targetDate);
        if (!target) continue;
        target.setHours(0, 0, 0, 0);

        if (target < today) {
          const bDays = this.getBusinessDaysDiff(act.targetDate, today);
          const cDays = Math.max(0, Math.round((today.getTime() - target.getTime()) / (1000 * 3600 * 24)));
          const delay = (cDays <= 3) ? cDays : bDays;
          if (delay > activityVariance) {
            activityVariance = delay;
          }
        }
      }
    }

    return Math.max(endVariance, activityVariance, 0);
  }

  calculateRagStatus(project) {
    if (project.manualRagStatus && project.manualRagStatus !== 'auto') {
      return project.manualRagStatus;
    }
    if (project.status === 'Finalizado' || project.progress === 100) return 'green';
    if (project.status === 'Congelado') return 'amber';

    const activities = project.activities || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Atualiza flags de atraso e margem curta nas atividades com a regra calibrada
    activities.forEach(a => this.recalculateActivityFlags(a, today));

    const hasDelayedActivity = activities.some(a => a.isDelayed && a.status !== 'completed');
    const hasTightMarginActivity = activities.some(a => a.isTightMargin && a.status !== 'completed');

    const variance = this.calculateVariance(
      project.agreedDates?.end,
      project.executedDates?.end,
      project.plannedDates?.end,
      project
    );

    // Desvio crítico a partir de 2 dias de atraso ou variância >= 2 dias
    if (variance >= 2 || hasDelayedActivity) return 'red';
    // Atenção: margem curta (-1 a +1 dia) ou variância de 1 dia
    if (variance === 1 || hasTightMarginActivity) return 'amber';
    return 'green';
  }

  // Detects data inconsistencies for executive visibility
  computeInconsistencies(project) {
    const list = [];
    const activities = project.activities || [];

    // 1. Sem itens do Azure
    if (!project.isManual && activities.length === 0) {
      list.push('NO_AZURE_ITEMS');
    }

    // 2. Sem horas cadastradas
    const h = project.hours || {};
    if ((Number(h.totalPlanned) || 0) === 0) {
      list.push('NO_HOURS');
    }

    // 3. Sem datas cadastradas no projeto
    if (!project.agreedDates?.start || !project.agreedDates?.end) {
      list.push('NO_DATES');
    }

    // 4. Entregas atrasadas
    if (activities.some(a => a.isDelayed)) {
      list.push('DELAYED_ITEMS');
    }

    // 5. Atividades sem datas de início/fim
    if (activities.length > 0 && !activities.some(a => a.startDate || a.targetDate)) {
      list.push('NO_ACTIVITIES_WITH_DATES');
    }

    return list;
  }

  roundHours(val) {
    if (val === null || val === undefined || isNaN(val)) return 0;
    return Math.round(Number(val) * 10) / 10;
  }

  // Calculates hours breakdown - Option B: Client hours edited in Curator, ILC hours from Tasks or Curator
  // ZERO mock: If project has no activities and no manual hours, planned hours remain 0!
  calculateHours(project) {
    const activities = project.activities || [];
    let ilcExecuted = 0;
    let ilcPlanned = 0;

    // Volume de Horas Firmado com o Cliente (Acordo Comercial gerenciado na Curadoria)
    let agreedHours = project.hours?.agreed !== undefined ? Number(project.hours.agreed) :
      (project.agreedHours !== undefined ? Number(project.agreedHours) :
      (project.hours?.agreedHours !== undefined ? Number(project.hours.agreedHours) : null));

    const distribution = {
      'Planejamento': { planned: 0, executed: 0 },
      'Desenvolvimento': { planned: 0, executed: 0 },
      'Homologação': { planned: 0, executed: 0 },
      'Treinamento': { planned: 0, executed: 0 },
      'Operação Assistida': { planned: 0, executed: 0 }
    };

    for (const act of activities) {
      const exec = this.roundHours(act.ilcHours);
      const plan = this.roundHours(act.ilcHoursTotal || exec);
      act.ilcHours = exec;
      act.ilcHoursTotal = plan;
      ilcExecuted = this.roundHours(ilcExecuted + exec);
      ilcPlanned = this.roundHours(ilcPlanned + plan);

      if (distribution[act.eapPhase]) {
        distribution[act.eapPhase].executed = this.roundHours(distribution[act.eapPhase].executed + exec);
        distribution[act.eapPhase].planned = this.roundHours(distribution[act.eapPhase].planned + plan);
      }
    }

    // If manual override for hours was explicitly set in Curator AND the field is unlocked
    if (project.lockedFields?.ilcHours === false && project.hasManualIlcHours && project.hours?.ilcPlanned !== undefined) {
      ilcPlanned = this.roundHours(project.hours.ilcPlanned);
      ilcExecuted = this.roundHours(project.hours.ilcExecuted);
    } else if (ilcPlanned === 0 && ilcExecuted === 0) {
      // If activities don't have individual rolled-up hours, fallback to project-level task hours
      if (project.azureOriginal?.ilcPlanned || project.azureOriginal?.ilcExecuted) {
        ilcPlanned = this.roundHours(project.azureOriginal.ilcPlanned);
        ilcExecuted = this.roundHours(project.azureOriginal.ilcExecuted);
      } else if (project.hours?.ilcPlanned || project.hours?.ilcExecuted) {
        ilcPlanned = this.roundHours(project.hours.ilcPlanned);
        ilcExecuted = this.roundHours(project.hours.ilcExecuted);
      }
    }

    const totalPlanned = this.roundHours(ilcPlanned);
    const totalExecuted = this.roundHours(ilcExecuted);

    if (agreedHours === null || isNaN(agreedHours)) {
      agreedHours = totalPlanned;
    } else {
      agreedHours = this.roundHours(agreedHours);
    }

    return {
      agreed: agreedHours,
      agreedHours: agreedHours,
      planned: totalPlanned,
      executed: totalExecuted,
      clientPlanned: 0,
      clientExecuted: 0,
      ilcPlanned: totalPlanned,
      ilcExecuted: totalExecuted,
      totalPlanned,
      totalExecuted,
      distribution: Object.entries(distribution).map(([phase, data]) => {
        const phActs = activities.filter(a => a.eapPhase === phase);
        const allCompleted = phActs.length > 0 && phActs.every(a => a.status === 'completed' || ['closed', 'done', 'resolved', 'finalizado', 'concluído', 'completed'].includes((a.state || '').toLowerCase()));
        return {
          phase,
          planned: this.roundHours(data.planned),
          executed: this.roundHours(data.executed),
          percentage: data.planned > 0 ? Math.round((data.executed / data.planned) * 100) : 0,
          completed: allCompleted,
          deliverablesTotal: phActs.length,
          deliverablesCompleted: phActs.filter(a => a.status === 'completed' || ['closed', 'done', 'resolved', 'finalizado', 'concluído', 'completed'].includes((a.state || '').toLowerCase())).length
        };
      })
    };
  }

  mergeAzureProjects(azureProjectSummaries) {
    this.lastSync = new Date().toISOString();

    for (const azure of azureProjectSummaries) {
      const existing = this.projects.find(p => p.azureId === azure.azureId);

      const client = this.mapClientName(azure.name);
      const defaultPlannedStart = azure.detectedStartDate || '2026-08-01';
      const defaultPlannedEnd = azure.detectedFinishDate || '2027-01-31';

      // ZERO MOCK: Strictly real activities from Azure DevOps
      const realActivities = azure.activities || [];

      if (!existing) {
        const newProj = {
          id: azure.azureId,
          azureId: azure.azureId,
          isManual: false,
          name: azure.name,
          description: azure.description,
          client: client,
          status: 'Ativo',
          isVisible: true,
          currentMilestone: 'Desenvolvimento',
          agreedDates: {
            start: defaultPlannedStart,
            end: defaultPlannedEnd
          },
          plannedDates: {
            start: defaultPlannedStart,
            end: defaultPlannedEnd
          },
          executedDates: {
            start: defaultPlannedStart,
            end: null
          },
          progress: azure.progress || 0,
          manualRagStatus: 'auto',
          executiveSummary: `Projeto sincronizado com o Azure DevOps. Iteração: ${azure.currentIterationName || 'Em andamento'}.`,
          azureLastUpdated: azure.azureLastUpdated,
          currentIterationName: azure.currentIterationName,
          activities: realActivities,
          priority: 'P2',
          systems: [],
          team: {
            leader: realActivities.find(a => a.assignedTo)?.assignedTo || '',
            members: Array.from(new Set(realActivities.map(a => a.assignedTo).filter(Boolean)))
          },
          lockedFields: {
            ilcHours: true,
            progress: true,
            dates: true
          },
          azureOriginal: {
            ilcPlanned: azure.taskHours?.totalPlanned || 0,
            ilcExecuted: azure.taskHours?.totalExecuted || 0,
            progress: azure.progress || 0,
            agreedDates: { start: defaultPlannedStart, end: defaultPlannedEnd },
            plannedDates: { start: defaultPlannedStart, end: defaultPlannedEnd }
          },
          agreedHours: azure.taskHours?.totalPlanned || 0,
          hours: {
            agreed: azure.taskHours?.totalPlanned || 0,
            agreedHours: azure.taskHours?.totalPlanned || 0,
            clientPlanned: 0,
            clientExecuted: 0,
            ilcPlanned: azure.taskHours?.totalPlanned || 0,
            ilcExecuted: azure.taskHours?.totalExecuted || 0
          }
        };
        newProj.hours = this.calculateHours(newProj);
        newProj.ragStatus = this.calculateRagStatus(newProj);
        newProj.varianceDays = this.calculateVariance(newProj.agreedDates.end, newProj.executedDates?.end, newProj.plannedDates?.end, newProj);
        newProj.inconsistencies = this.computeInconsistencies(newProj);
        this.projects.push(newProj);
      } else {
        existing.name = azure.name;
        existing.description = azure.description || existing.description;
        existing.azureLastUpdated = azure.azureLastUpdated;
        existing.currentIterationName = azure.currentIterationName || existing.currentIterationName;

        // Preserve user edited EAP phases on activities if explicitly modified in curator
        if (azure.activities?.length > 0) {
          existing.activities = azure.activities.map(act => {
            const savedAct = (existing.activities || []).find(a => a.id === act.id);
            if (savedAct && savedAct.hasManualEapPhase) {
              return { ...act, eapPhase: savedAct.eapPhase, hasManualEapPhase: true };
            }
            return act;
          });
        } else if (!existing.isManual) {
          // If 0 items in Azure, clear any previous mock data!
          existing.activities = [];
        }

        if (!existing.priority) existing.priority = 'P2';
        if (!existing.systems) existing.systems = [];
        if (!existing.team) {
          existing.team = { leader: '', members: [] };
        }
        if ((!existing.team.members || existing.team.members.length === 0) && azure.activities?.length > 0) {
          const uniqueAssigned = Array.from(new Set(azure.activities.map(a => a.assignedTo).filter(Boolean)));
          existing.team.members = uniqueAssigned;
          if (!existing.team.leader && uniqueAssigned.length > 0) {
            existing.team.leader = uniqueAssigned[0];
          }
        }

        // Store latest Azure original data for quick restoration
        const aStart = azure.detectedStartDate || defaultPlannedStart;
        const aEnd = azure.detectedFinishDate || defaultPlannedEnd;
        existing.azureOriginal = {
          ilcPlanned: azure.taskHours?.totalPlanned || 0,
          ilcExecuted: azure.taskHours?.totalExecuted || 0,
          progress: azure.progress || 0,
          agreedDates: { start: aStart, end: aEnd },
          plannedDates: { start: aStart, end: aEnd }
        };

        if (!existing.lockedFields) {
          existing.lockedFields = { ilcHours: true, progress: true, dates: true };
        }

        // Preserve agreedHours when syncing Azure
        const preservedAgreed = existing.agreedHours ?? existing.hours?.agreed ?? existing.hours?.agreedHours ?? (azure.taskHours?.totalPlanned || 0);
        existing.agreedHours = preservedAgreed;
        if (!existing.hours) existing.hours = {};
        existing.hours.agreed = preservedAgreed;
        existing.hours.agreedHours = preservedAgreed;

        // Overwrite hours from Azure ONLY if field is locked to Azure and not manually overridden
        if (existing.lockedFields.ilcHours !== false && !existing.hasManualIlcHours) {
          existing.hours.ilcPlanned = azure.taskHours?.totalPlanned || 0;
          existing.hours.ilcExecuted = azure.taskHours?.totalExecuted || 0;
          existing.hasManualIlcHours = false;
        }

        // Overwrite progress from Azure ONLY if field is locked to Azure and not manually overridden
        if (existing.lockedFields.progress !== false && !existing.hasManualProgress) {
          const acts = existing.activities || [];
          const allActsClosed = acts.length > 0 && acts.every(a => a.status === 'completed' || ['closed', 'done', 'resolved', 'finalizado', 'concluído', 'completed'].includes((a.state || '').toLowerCase()));
          let allTasksClosed = false;
          let totalTasksCount = 0;
          let closedTasksCount = 0;
          for (const a of acts) {
            for (const t of (a.linkedTasks || [])) {
              totalTasksCount++;
              if (['closed', 'done', 'resolved', 'finalizado', 'concluído', 'completed'].includes((t.state || '').toLowerCase())) {
                closedTasksCount++;
              }
            }
          }
          if (totalTasksCount > 0 && closedTasksCount === totalTasksCount) {
            allTasksClosed = true;
          }

          if (allTasksClosed || allActsClosed || existing.status === 'Finalizado') {
            existing.progress = 100;
          } else {
            existing.progress = azure.progress !== undefined ? azure.progress : (existing.progress || 0);
          }
          existing.hasManualProgress = false;
        }

        if (azure.currentMilestone) {
          existing.currentMilestone = azure.currentMilestone;
        }

        // Only overwrite dates if locked and not manually overridden and Azure provided valid dates
        if (existing.lockedFields.dates !== false && !existing.hasManualAgreedDates && (azure.detectedStartDate || azure.detectedFinishDate)) {
          if (azure.detectedStartDate) {
            existing.plannedDates.start = azure.detectedStartDate;
            if (!existing.hasManualAgreedDates) {
              existing.agreedDates.start = azure.detectedStartDate;
            }
          }
          if (azure.detectedFinishDate) {
            existing.plannedDates.end = azure.detectedFinishDate;
            if (!existing.hasManualAgreedDates) {
              existing.agreedDates.end = azure.detectedFinishDate;
            }
          }
        }

        existing.hours = this.calculateHours(existing);
        existing.ragStatus = this.calculateRagStatus(existing);
        existing.varianceDays = this.calculateVariance(existing.agreedDates?.end, existing.executedDates?.end, existing.plannedDates?.end, existing);
        existing.inconsistencies = this.computeInconsistencies(existing);
      }
    }

    this.save();
    return this.projects;
  }

  createManualProject(data) {
    const id = 'manual-' + Date.now();
    const client = this.mapClientName(data.client);
    const start = data.agreedDates?.start || new Date().toISOString().split('T')[0];
    const end = data.agreedDates?.end || '2027-02-28';

    const newProj = {
      id,
      azureId: null,
      isManual: true,
      name: data.name,
      description: data.description || 'Projeto cadastrado manualmente.',
      client,
      category: data.category || 'new_project',
      status: data.status || 'Ativo',
      isVisible: data.isVisible !== false,
      currentMilestone: data.currentMilestone || 'Planejamento',
      agreedDates: { start, end },
      plannedDates: {
        start: data.plannedDates?.start || start,
        end: data.plannedDates?.end || end
      },
      executedDates: { start, end: null },
      progress: Number(data.progress) || 0,
      manualRagStatus: data.manualRagStatus || 'auto',
      executiveSummary: data.executiveSummary || 'Projeto cadastrado manualmente.',
      activities: data.activities || [],
      priority: data.priority || 'P2',
      systems: Array.isArray(data.systems) ? data.systems : [],
      team: data.team || { leader: '', members: [] },
      lockedFields: {
        ilcHours: false,
        progress: false,
        dates: false
      },
      agreedHours: Number(data.hours?.agreed ?? data.agreedHours ?? data.hours?.planned ?? data.hours?.ilcPlanned ?? 0),
      hours: {
        agreed: Number(data.hours?.agreed ?? data.agreedHours ?? data.hours?.planned ?? data.hours?.ilcPlanned ?? 0),
        agreedHours: Number(data.hours?.agreed ?? data.agreedHours ?? data.hours?.planned ?? data.hours?.ilcPlanned ?? 0),
        clientPlanned: 0,
        clientExecuted: 0,
        ilcPlanned: Number(data.hours?.ilcPlanned ?? data.hours?.planned ?? data.hours?.totalPlanned ?? 0),
        ilcExecuted: Number(data.hours?.ilcExecuted ?? data.hours?.executed ?? data.hours?.totalExecuted ?? 0)
      }
    };

    newProj.hours = this.calculateHours(newProj);
    newProj.ragStatus = this.calculateRagStatus(newProj);
    newProj.varianceDays = this.calculateVariance(newProj.agreedDates.end, newProj.executedDates?.end, newProj.plannedDates?.end, newProj);
    newProj.inconsistencies = this.computeInconsistencies(newProj);

    this.projects.push(newProj);
    this.save();
    return newProj;
  }

  compareProjects(a, b) {
    const clientDiff = (a.client || '').localeCompare(b.client || '', 'pt-BR', { sensitivity: 'base' });
    if (clientDiff !== 0) return clientDiff;
    return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
  }

  getProjectById(id) {
    return this.projects.find(p => p.id === id) || null;
  }

  getPublicProjects(filterClient = null, includeMaintenance = false) {
    let list = this.projects.filter(p => p.isVisible);
    if (!includeMaintenance) {
      list = list.filter(p => p.category !== 'maintenance');
    }
    if (filterClient && filterClient !== 'Todos') {
      list = list.filter(p => p.client.toLowerCase() === filterClient.toLowerCase());
    }
    return list
      .map(p => ({
        ...p,
        hours: this.calculateHours(p),
        ragStatus: this.calculateRagStatus(p),
        varianceDays: this.calculateVariance(p.agreedDates?.end, p.executedDates?.end, p.plannedDates?.end, p),
        inconsistencies: this.computeInconsistencies(p),
        lockedFields: p.lockedFields || { ilcHours: true, progress: true, dates: true }
      }))
      .sort((a, b) => this.compareProjects(a, b));
  }

  getAllProjects() {
    return this.projects
      .map(p => ({
        ...p,
        hours: this.calculateHours(p),
        ragStatus: this.calculateRagStatus(p),
        varianceDays: this.calculateVariance(p.agreedDates?.end, p.executedDates?.end, p.plannedDates?.end, p),
        inconsistencies: this.computeInconsistencies(p),
        lockedFields: p.lockedFields || { ilcHours: true, progress: true, dates: true }
      }))
      .sort((a, b) => this.compareProjects(a, b));
  }

  getClients() {
    return this.clients;
  }

  getClientBySlug(slug) {
    return this.clients.find(c => c.slug.toLowerCase() === slug.toLowerCase()) || null;
  }

  getClientLogo(clientName) {
    if (!clientName) return null;
    const client = this.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    return client?.logoUrl || null;
  }

  updateClient(slug, updates) {
    const idx = this.clients.findIndex(c => c.slug.toLowerCase() === slug.toLowerCase());
    if (idx === -1) return null;
    this.clients[idx] = { ...this.clients[idx], ...updates };
    this.saveClients();
    return this.clients[idx];
  }

  // Save client logo from image base64
  saveClientLogo(slug, imageBase64) {
    const client = this.getClientBySlug(slug);
    if (!client) throw new Error('Cliente não encontrado');
    if (!imageBase64) throw new Error('Dados da imagem inválidos');

    const publicDir = path.join(__dirname, '../public/assets/logos');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${client.slug}.png`;
    const filePath = path.join(publicDir, fileName);
    fs.writeFileSync(filePath, buffer);

    try {
      const fePublic = path.join(__dirname, '../../frontend/public/assets/logos');
      if (!fs.existsSync(fePublic)) fs.mkdirSync(fePublic, { recursive: true });
      fs.writeFileSync(path.join(fePublic, fileName), buffer);

      const feDist = path.join(__dirname, '../../frontend/dist/frontend/browser/assets/logos');
      if (fs.existsSync(path.dirname(feDist))) {
        if (!fs.existsSync(feDist)) fs.mkdirSync(feDist, { recursive: true });
        fs.writeFileSync(path.join(feDist, fileName), buffer);
      }
    } catch (e) {
      console.warn('Could not copy logo to frontend public:', e.message);
    }

    const logoUrl = `/assets/logos/${fileName}?t=${Date.now()}`;
    return this.updateClient(slug, { logoUrl });
  }

  // Azure DevOps PAT status and countdown
  getAzureStatus() {
    const orgUrl = config.azureDevOps.orgUrl;
    const pat = config.azureDevOps.pat || '';
    const maskedPat = pat.length > 8 ? `${pat.slice(0, 4)}...${pat.slice(-4)}` : '****';
    const expirationDate = '2027-10-01'; // Official expiration date

    const expTime = new Date('2027-10-01T23:59:59Z').getTime();
    const nowTime = Date.now();
    const diffMs = expTime - nowTime;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 3600 * 24)));
    const monthsRemaining = Math.max(0, Math.floor(daysRemaining / 30.4));

    return {
      orgUrl,
      patMasked: maskedPat,
      expirationDate,
      daysRemaining,
      monthsRemaining,
      isExpired: daysRemaining <= 0,
      isWarning: daysRemaining <= 60,
      isConnected: true
    };
  }

  // Update Azure PAT token
  updateAzurePat(newPat) {
    if (!newPat || typeof newPat !== 'string') throw new Error('PAT inválido');
    const trimmed = newPat.trim();
    config.azureDevOps.pat = trimmed;

    // Update in azureDevOpsService instance
    const azureService = require('./azureDevOpsService');
    azureService.setPat(trimmed);

    // Persist to .env
    try {
      const envPath = path.join(__dirname, '../.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      if (envContent.includes('AZURE_DEVOPS_PAT=')) {
        envContent = envContent.replace(/AZURE_DEVOPS_PAT=.*/g, `AZURE_DEVOPS_PAT=${trimmed}`);
      } else {
        envContent += `\nAZURE_DEVOPS_PAT=${trimmed}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (e) {
      console.warn('Could not update .env file:', e.message);
    }

    return this.getAzureStatus();
  }

  // STRICT STATS: Health metrics (onTrack, warning, delayed) ONLY count ACTIVE projects!
  // Frozen and Completed projects do NOT pollute warning/onTrack/delayed.
  getStats(filterClient = null) {
    const publicList = this.getPublicProjects(filterClient);
    const total = publicList.length;

    const activeProjects = publicList.filter(p => p.status === 'Ativo');
    const active = activeProjects.length;
    const completed = publicList.filter(p => p.status === 'Finalizado').length;
    const frozen = publicList.filter(p => p.status === 'Congelado').length;

    // Strict health status on Active projects only
    const onTrack = activeProjects.filter(p => p.ragStatus === 'green').length;
    const warning = activeProjects.filter(p => p.ragStatus === 'amber').length;
    const delayed = activeProjects.filter(p => p.ragStatus === 'red').length;

    let totalPlannedHours = 0;
    let totalExecutedHours = 0;
    let agreedHours = 0;
    let clientPlannedHours = 0;
    let clientExecutedHours = 0;
    let ilcPlannedHours = 0;
    let ilcExecutedHours = 0;

    for (const p of publicList) {
      const h = p.hours || this.calculateHours(p);
      totalPlannedHours += h.totalPlanned || 0;
      totalExecutedHours += h.totalExecuted || 0;
      agreedHours += (h.agreed ?? p.agreedHours ?? h.totalPlanned ?? 0);
      clientPlannedHours += h.clientPlanned || 0;
      clientExecutedHours += h.clientExecuted || 0;
      ilcPlannedHours += h.ilcPlanned || 0;
      ilcExecutedHours += h.ilcExecuted || 0;
    }

    return {
      total,
      active,
      completed,
      frozen,
      onTrack,
      warning,
      delayed,
      lastSync: this.lastSync,
      milestones: OFFICIAL_EAP_PHASES,
      hoursSummary: {
        totalPlanned: totalPlannedHours,
        totalExecuted: totalExecutedHours,
        agreedHours,
        clientPlanned: clientPlannedHours,
        clientExecuted: clientExecutedHours,
        ilcPlanned: ilcPlannedHours,
        ilcExecuted: ilcExecutedHours
      }
    };
  }

  updateProject(id, updates) {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    const proj = this.projects[index];

    // Handle restoration of Azure values
    if (updates.restoreAzureValues && proj.azureOriginal) {
      proj.hours.ilcPlanned = proj.azureOriginal.ilcPlanned;
      proj.hours.ilcExecuted = proj.azureOriginal.ilcExecuted;
      proj.progress = proj.azureOriginal.progress;
      proj.agreedDates = { ...proj.azureOriginal.agreedDates };
      proj.plannedDates = { ...proj.azureOriginal.plannedDates };
      proj.hasManualIlcHours = false;
      proj.hasManualProgress = false;
      proj.hasManualAgreedDates = false;
      proj.lockedFields = { ilcHours: true, progress: true, dates: true };
    }

    if (updates.lockedFields) {
      proj.lockedFields = {
        ...proj.lockedFields,
        ...updates.lockedFields
      };
    }

    if (updates.name !== undefined && updates.name.trim()) proj.name = updates.name.trim();
    if (updates.description !== undefined) proj.description = updates.description;
    if (updates.client !== undefined) proj.client = this.mapClientName(updates.client);
    if (updates.category !== undefined) proj.category = updates.category;
    if (updates.status !== undefined) proj.status = updates.status;
    if (updates.isVisible !== undefined) proj.isVisible = !!updates.isVisible;
    if (updates.currentMilestone !== undefined) proj.currentMilestone = updates.currentMilestone;
    if (updates.manualRagStatus !== undefined) proj.manualRagStatus = updates.manualRagStatus;
    if (updates.executiveSummary !== undefined) proj.executiveSummary = updates.executiveSummary;
    if (updates.progress !== undefined) {
      const nextProgress = Number(updates.progress);
      if (proj.progress !== nextProgress || proj.lockedFields?.progress === false || (proj.azureOriginal && nextProgress !== Number(proj.azureOriginal.progress))) {
        proj.hasManualProgress = true;
      }
      proj.progress = nextProgress;
    }

    if (updates.agreedDates) {
      proj.agreedDates = {
        start: updates.agreedDates.start || proj.agreedDates.start,
        end: updates.agreedDates.end || proj.agreedDates.end
      };
      if (proj.lockedFields?.dates === false) {
        proj.hasManualAgreedDates = true;
      }
    }

    if (updates.plannedDates) {
      proj.plannedDates = {
        start: updates.plannedDates.start || proj.plannedDates.start,
        end: updates.plannedDates.end || proj.plannedDates.end
      };
    }

    if (updates.hours) {
      const agreedVal = updates.hours.agreed !== undefined ? Number(updates.hours.agreed) :
        (updates.agreedHours !== undefined ? Number(updates.agreedHours) :
        (updates.hours.agreedHours !== undefined ? Number(updates.hours.agreedHours) : (proj.hours?.agreed ?? proj.agreedHours ?? proj.hours?.totalPlanned ?? 0)));

      proj.agreedHours = agreedVal;
      proj.hours = {
        ...proj.hours,
        agreed: agreedVal,
        agreedHours: agreedVal,
        clientPlanned: 0,
        clientExecuted: 0,
        ilcPlanned: updates.hours.totalPlanned !== undefined ? Number(updates.hours.totalPlanned) : (updates.hours.ilcPlanned !== undefined ? Number(updates.hours.ilcPlanned) : proj.hours.ilcPlanned),
        ilcExecuted: updates.hours.totalExecuted !== undefined ? Number(updates.hours.totalExecuted) : (updates.hours.ilcExecuted !== undefined ? Number(updates.hours.ilcExecuted) : proj.hours.ilcExecuted)
      };
      proj.hasManualIlcHours = true;
    } else if (updates.agreedHours !== undefined) {
      const agreedVal = Number(updates.agreedHours) || 0;
      proj.agreedHours = agreedVal;
      if (proj.hours) {
        proj.hours.agreed = agreedVal;
        proj.hours.agreedHours = agreedVal;
      }
    }

    if (updates.activities) {
      proj.activities = updates.activities;
    }

    if (updates.priority !== undefined) proj.priority = updates.priority;
    if (updates.systems !== undefined) proj.systems = Array.isArray(updates.systems) ? updates.systems : [];
    if (updates.team !== undefined) {
      proj.team = {
        leader: updates.team.leader !== undefined ? updates.team.leader : (proj.team?.leader || ''),
        members: Array.isArray(updates.team.members) ? updates.team.members : (proj.team?.members || [])
      };
    }

    proj.hours = this.calculateHours(proj);
    proj.ragStatus = this.calculateRagStatus(proj);
    proj.varianceDays = this.calculateVariance(proj.agreedDates?.end, proj.executedDates?.end, proj.plannedDates?.end, proj);
    proj.inconsistencies = this.computeInconsistencies(proj);

    this.projects[index] = proj;
    this.save();
    return proj;
  }

  getMaintenanceMetrics(clientFilter = 'Todos', period = 'year_2026') {
    let projs = (this.projects || []).filter(p => p.isVisible !== false && p.status !== 'Congelado');
    if (clientFilter && clientFilter !== 'Todos') {
      projs = projs.filter(p => p.client === clientFilter);
    }

    const maintenanceProjects = projs.filter(p => p.category === 'maintenance');
    const newProjects = projs.filter(p => (p.category || 'new_project') !== 'maintenance');

    const isDateInPeriod = (dateStr) => {
      if (!dateStr) return period === 'all' || period === 'year_2026';
      const d = dateStr.slice(0, 10);
      if (period === 'current_month') {
        return d.startsWith('2026-10');
      } else if (period === 'last_quarter') {
        return d >= '2026-08-01' && d <= '2026-10-31';
      } else if (period === 'year_2026') {
        return d.startsWith('2026');
      }
      return true; // 'all'
    };

    const monthDefs = [
      { key: '2026-01', label: 'Jan/26' },
      { key: '2026-02', label: 'Fev/26' },
      { key: '2026-03', label: 'Mar/26' },
      { key: '2026-04', label: 'Abr/26' },
      { key: '2026-05', label: 'Mai/26' },
      { key: '2026-06', label: 'Jun/26' },
      { key: '2026-07', label: 'Jul/26' },
      { key: '2026-08', label: 'Ago/26' },
      { key: '2026-09', label: 'Set/26' },
      { key: '2026-10', label: 'Out/26' },
      { key: '2026-11', label: 'Nov/26' },
      { key: '2026-12', label: 'Dez/26' }
    ];

    const monthlyMap = {};
    monthDefs.forEach(m => {
      monthlyMap[m.key] = {
        monthKey: m.key,
        label: m.label,
        newProjectHours: 0,
        maintenanceHours: 0,
        totalHours: 0,
        maintenancePercent: 0
      };
    });

    let totalMaintHours = 0;
    let totalNewHours = 0;
    const memberMap = {};

    const getOrCreateMember = (name) => {
      if (!name) return null;
      const cleanName = name.trim();
      if (!cleanName) return null;
      if (!memberMap[cleanName]) {
        memberMap[cleanName] = {
          name: cleanName,
          newProjectHours: 0,
          maintenanceHours: 0,
          totalHours: 0,
          maintenancePercent: 0,
          projectsMap: {}
        };
      }
      return memberMap[cleanName];
    };

    for (const p of projs) {
      const isMaint = p.category === 'maintenance';
      const acts = p.activities || [];

      // Fallback para projetos sem tarefas detalhadas
      if (acts.length === 0 && p.hours && (p.hours.totalExecuted || 0) > 0) {
        const hours = this.roundHours(p.hours.totalExecuted);
        if (isMaint) {
          totalMaintHours = this.roundHours(totalMaintHours + hours);
        } else {
          totalNewHours = this.roundHours(totalNewHours + hours);
        }
      }

      for (const a of acts) {
        const aType = (a.type || '').toLowerCase();
        const validTasks = (a.linkedTasks || []).filter(t => (Number(t.completedWork) || 0) > 0);

        if (validTasks.length > 0) {
          for (const t of validTasks) {
            const tType = (t.type || '').toLowerCase();
            // Nos projetos de sustentação, desconsiderar Epic e Feature (apenas US e Task)
            if (isMaint && (tType.includes('epic') || tType.includes('feature'))) continue;

            const tHours = this.roundHours(t.completedWork || 0);
            if (tHours <= 0) continue;

            const tDate = t.targetDate || t.startDate || a.targetDate || a.startDate;
            const tMonth = tDate ? tDate.slice(0, 7) : null;

            if (tMonth && monthlyMap[tMonth]) {
              if (isMaint) {
                monthlyMap[tMonth].maintenanceHours = this.roundHours(monthlyMap[tMonth].maintenanceHours + tHours);
              } else {
                monthlyMap[tMonth].newProjectHours = this.roundHours(monthlyMap[tMonth].newProjectHours + tHours);
              }
            }

            if (isDateInPeriod(tDate)) {
              if (isMaint) {
                totalMaintHours = this.roundHours(totalMaintHours + tHours);
              } else {
                totalNewHours = this.roundHours(totalNewHours + tHours);
              }

              const assigned = t.assignedTo || a.assignedTo;
              if (assigned) {
                const m = getOrCreateMember(assigned);
                if (m) {
                  if (isMaint) {
                    m.maintenanceHours = this.roundHours(m.maintenanceHours + tHours);
                  } else {
                    m.newProjectHours = this.roundHours(m.newProjectHours + tHours);
                  }
                  m.projectsMap[p.name] = {
                    projectName: p.name,
                    client: p.client,
                    hours: this.roundHours((m.projectsMap[p.name]?.hours || 0) + tHours),
                    category: isMaint ? 'maintenance' : 'new_project'
                  };
                }
              }
            }
          }
        } else {
          // Atividade sem tarefas filhas granulares
          // Nos projetos de sustentação, desconsiderar Epic e Feature
          if (isMaint && (aType.includes('epic') || aType.includes('feature'))) continue;

          const aHours = this.roundHours(a.ilcHours || 0);
          if (aHours <= 0) continue;

          const aDate = a.targetDate || a.startDate;
          const aMonth = aDate ? aDate.slice(0, 7) : null;

          if (aMonth && monthlyMap[aMonth]) {
            if (isMaint) {
              monthlyMap[aMonth].maintenanceHours = this.roundHours(monthlyMap[aMonth].maintenanceHours + aHours);
            } else {
              monthlyMap[aMonth].newProjectHours = this.roundHours(monthlyMap[aMonth].newProjectHours + aHours);
            }
          }

          if (isDateInPeriod(aDate)) {
            if (isMaint) {
              totalMaintHours = this.roundHours(totalMaintHours + aHours);
            } else {
              totalNewHours = this.roundHours(totalNewHours + aHours);
            }

            if (a.assignedTo) {
              const m = getOrCreateMember(a.assignedTo);
              if (m) {
                if (isMaint) {
                  m.maintenanceHours = this.roundHours(m.maintenanceHours + aHours);
                } else {
                  m.newProjectHours = this.roundHours(m.newProjectHours + aHours);
                }
                m.projectsMap[p.name] = {
                  projectName: p.name,
                  client: p.client,
                  hours: this.roundHours((m.projectsMap[p.name]?.hours || 0) + aHours),
                  category: isMaint ? 'maintenance' : 'new_project'
                };
              }
            }
          }
        }
      }
    }

    const monthlyHistory = monthDefs.map(m => {
      const data = monthlyMap[m.key];
      data.totalHours = this.roundHours(data.newProjectHours + data.maintenanceHours);
      data.maintenancePercent = data.totalHours > 0 ? Math.round((data.maintenanceHours / data.totalHours) * 100) : 0;
      return data;
    });

    const totalCompanyHours = this.roundHours(totalMaintHours + totalNewHours);
    const maintenancePercent = totalCompanyHours > 0 ? Math.round((totalMaintHours / totalCompanyHours) * 100) : 0;

    const avatarColors = [
      'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600',
      'bg-indigo-600', 'bg-rose-600', 'bg-cyan-600', 'bg-teal-600'
    ];

    let teamStore = null;
    try {
      teamStore = require('./teamStore');
    } catch (e) {}

    const teamMembers = Object.values(memberMap)
      .map((m, idx) => {
        m.totalHours = this.roundHours(m.newProjectHours + m.maintenanceHours);
        m.maintenancePercent = m.totalHours > 0 ? Math.round((m.maintenanceHours / m.totalHours) * 100) : 0;
        m.avatarColor = avatarColors[idx % avatarColors.length];
        m.topProjects = Object.values(m.projectsMap).sort((a, b) => b.hours - a.hours);
        delete m.projectsMap;
        return m;
      })
      .filter(m => m.totalHours > 0 && (!teamStore || teamStore.isMemberVisible(m.name)))
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      period,
      clientFilter,
      totalMaintenanceHours: totalMaintHours,
      totalNewProjectHours: totalNewHours,
      totalCompanyHours,
      maintenancePercent,
      maintenanceProjectsCount: maintenanceProjects.length,
      activeMaintenanceProjects: maintenanceProjects,
      monthlyHistory,
      teamMembers
    };
  }

  deleteProject(id) {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    const deleted = this.projects.splice(index, 1)[0];
    this.save();
    return deleted;
  }
}

module.exports = new ProjectStore();
