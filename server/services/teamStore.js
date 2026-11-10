const fs = require('fs');
const path = require('path');
const projectStore = require('./projectStore');

const TEAM_CONFIG_FILE = path.join(__dirname, '../data/team_config.json');

class TeamStore {
  constructor() {
    this.members = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(TEAM_CONFIG_FILE)) {
        const raw = fs.readFileSync(TEAM_CONFIG_FILE, 'utf8');
        this.members = JSON.parse(raw);
      } else {
        this.members = [];
      }
    } catch (e) {
      console.error('[TeamStore] Erro ao carregar team_config.json:', e.message);
      this.members = [];
    }
    this.syncWithProjects();
  }

  persist() {
    try {
      const dir = path.dirname(TEAM_CONFIG_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(TEAM_CONFIG_FILE, JSON.stringify(this.members, null, 2), 'utf8');
    } catch (e) {
      console.error('[TeamStore] Erro ao persistir team_config.json:', e.message);
    }
  }

  syncWithProjects() {
    const allProjects = projectStore.getAllProjects() || [];
    const discovered = new Map(); // name -> Set of project names

    for (const p of allProjects) {
      const pName = p.name;
      if (p.team && Array.isArray(p.team.members)) {
        for (const m of p.team.members) {
          if (m && m.trim()) {
            const clean = m.trim();
            if (!discovered.has(clean)) discovered.set(clean, new Set());
            discovered.get(clean).add(pName);
          }
        }
      }
      if (p.team && p.team.leader && p.team.leader.trim()) {
        const clean = p.team.leader.trim();
        if (!discovered.has(clean)) discovered.set(clean, new Set());
        discovered.get(clean).add(pName);
      }
      for (const a of (p.activities || [])) {
        if (a.assignedTo && a.assignedTo.trim()) {
          const clean = a.assignedTo.trim();
          if (!discovered.has(clean)) discovered.set(clean, new Set());
          discovered.get(clean).add(pName);
        }
        for (const t of (a.linkedTasks || [])) {
          if (t.assignedTo && t.assignedTo.trim()) {
            const clean = t.assignedTo.trim();
            if (!discovered.has(clean)) discovered.set(clean, new Set());
            discovered.get(clean).add(pName);
          }
        }
      }
    }

    const existingMap = new Map();
    for (const m of this.members) {
      existingMap.set(m.name, m);
    }

    const updated = [];
    discovered.forEach((projsSet, name) => {
      const existing = existingMap.get(name);
      const allocatedProjects = existing && Array.isArray(existing.allocatedProjects) && existing.allocatedProjects.length > 0
        ? existing.allocatedProjects
        : Array.from(projsSet);

      updated.push({
        name,
        isVisible: existing ? existing.isVisible !== false : true,
        role: existing?.role || this.inferRole(name),
        allocatedProjects: Array.from(new Set(allocatedProjects))
      });
    });

    // Also preserve any manually configured members
    existingMap.forEach((m, name) => {
      if (!discovered.has(name)) {
        updated.push(m);
      }
    });

    updated.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    this.members = updated;
    this.persist();
  }

  inferRole(name) {
    const n = name.toLowerCase();
    if (n.includes('molaia') || n.includes('mike') || n.includes('luis carlos')) return 'Líder Técnico / Arquiteto';
    if (n.includes('vitor') || n.includes('thiago') || n.includes('saddam')) return 'Engenheiro de Software Sênior';
    if (n.includes('lucas') || n.includes('adriano') || n.includes('anderson')) return 'Engenheiro de Software';
    return 'Especialista de Sistemas';
  }

  getAllMembers() {
    this.syncWithProjects();
    return this.members;
  }

  getVisibleMembers() {
    this.syncWithProjects();
    return this.members.filter(m => m.isVisible !== false);
  }

  isMemberVisible(name) {
    if (!name) return false;
    const m = this.members.find(x => x.name.toLowerCase() === name.toLowerCase());
    return m ? m.isVisible !== false : true;
  }

  updateMember(name, updates) {
    this.syncWithProjects();
    const idx = this.members.findIndex(m => m.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) {
      throw new Error(`Colaborador "${name}" não encontrado.`);
    }
    const cur = this.members[idx];
    if (updates.isVisible !== undefined) cur.isVisible = !!updates.isVisible;
    if (updates.role !== undefined) cur.role = updates.role;
    if (updates.allocatedProjects !== undefined && Array.isArray(updates.allocatedProjects)) {
      cur.allocatedProjects = updates.allocatedProjects;
      this.syncAllocationsToProjects(cur.name, cur.allocatedProjects);
    }
    this.persist();
    return cur;
  }

  updateAllMembers(membersList) {
    if (!Array.isArray(membersList)) throw new Error('Lista de colaboradores inválida.');
    this.syncWithProjects();
    for (const item of membersList) {
      if (!item.name) continue;
      const idx = this.members.findIndex(m => m.name.toLowerCase() === item.name.toLowerCase());
      if (idx !== -1) {
        if (item.isVisible !== undefined) this.members[idx].isVisible = !!item.isVisible;
        if (item.role !== undefined) this.members[idx].role = item.role;
        if (item.allocatedProjects !== undefined && Array.isArray(item.allocatedProjects)) {
          this.members[idx].allocatedProjects = item.allocatedProjects;
          this.syncAllocationsToProjects(this.members[idx].name, item.allocatedProjects);
        }
      }
    }
    this.persist();
    return this.members;
  }

  syncAllocationsToProjects(memberName, allocatedProjects) {
    const allProjects = projectStore.getAllProjects() || [];
    for (const p of allProjects) {
      if (!p.team) p.team = { leader: '', members: [] };
      if (!Array.isArray(p.team.members)) p.team.members = [];
      const hasMember = p.team.members.some(m => m.toLowerCase() === memberName.toLowerCase());
      const shouldHave = allocatedProjects.some(projName => projName.toLowerCase() === p.name.toLowerCase());

      let changed = false;
      if (shouldHave && !hasMember) {
        p.team.members.push(memberName);
        changed = true;
      } else if (!shouldHave && hasMember) {
        p.team.members = p.team.members.filter(m => m.toLowerCase() !== memberName.toLowerCase());
        changed = true;
      }
      if (changed) {
        projectStore.updateProject(p.id, { team: p.team });
      }
    }
  }

  // Comprehensive Team Allocation & Capacity Report
  getTeamAllocationReport(clientFilter = 'Todos', period = 'year_2026', visibleOnly = true) {
    this.syncWithProjects();
    let projs = (projectStore.getAllProjects() || []).filter(p => p.isVisible !== false && p.status !== 'Congelado');
    if (clientFilter && clientFilter !== 'Todos') {
      projs = projs.filter(p => p.client === clientFilter);
    }

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

    const avatarColors = [
      'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600',
      'bg-indigo-600', 'bg-rose-600', 'bg-cyan-600', 'bg-teal-600'
    ];

    const memberStatsMap = new Map();

    const getOrCreate = (name) => {
      if (!name) return null;
      const clean = name.trim();
      if (!clean) return null;
      if (!memberStatsMap.has(clean)) {
        const configItem = this.members.find(m => m.name.toLowerCase() === clean.toLowerCase());
        memberStatsMap.set(clean, {
          name: clean,
          isVisible: configItem ? configItem.isVisible !== false : true,
          role: configItem?.role || this.inferRole(clean),
          allocatedProjects: configItem?.allocatedProjects || [],
          newProjectHours: 0,
          maintenanceHours: 0,
          totalHours: 0,
          maintenancePercent: 0,
          tasksCount: 0,
          tasks: [],
          projectsMap: new Map()
        });
      }
      return memberStatsMap.get(clean);
    };

    // Ensure all configured members are present in the map
    for (const m of this.members) {
      getOrCreate(m.name);
    }

    let totalMaint = 0;
    let totalNew = 0;

    for (const p of projs) {
      const isMaint = p.category === 'maintenance';
      const acts = p.activities || [];

      for (const a of acts) {
        const aType = (a.type || '').toLowerCase();
        const validTasks = (a.linkedTasks || []).filter(t => (Number(t.completedWork) || 0) > 0);

        if (validTasks.length > 0) {
          for (const t of validTasks) {
            const tType = (t.type || '').toLowerCase();
            // Disregard Epic and Feature in maintenance projects
            if (isMaint && (tType.includes('epic') || tType.includes('feature'))) continue;

            const tHours = Math.round((Number(t.completedWork) || 0) * 10) / 10;
            const tDate = t.targetDate || t.startDate || a.targetDate || a.startDate;

            if (isDateInPeriod(tDate)) {
              if (isMaint) totalMaint = Math.round((totalMaint + tHours) * 10) / 10;
              else totalNew = Math.round((totalNew + tHours) * 10) / 10;

              const assigned = t.assignedTo || a.assignedTo;
              if (assigned) {
                const m = getOrCreate(assigned);
                if (m) {
                  m.tasksCount++;
                  if (isMaint) m.maintenanceHours = Math.round((m.maintenanceHours + tHours) * 10) / 10;
                  else m.newProjectHours = Math.round((m.newProjectHours + tHours) * 10) / 10;

                  const pEntry = m.projectsMap.get(p.name) || {
                    projectId: p.id,
                    projectName: p.name,
                    client: p.client,
                    category: isMaint ? 'maintenance' : 'new_project',
                    hours: 0,
                    tasksCount: 0
                  };
                  pEntry.hours = Math.round((pEntry.hours + tHours) * 10) / 10;
                  pEntry.tasksCount++;
                  m.projectsMap.set(p.name, pEntry);

                  m.tasks.push({
                    id: t.id,
                    title: t.title || 'Tarefa sem título',
                    type: t.type || 'Task',
                    state: t.state || 'Active',
                    hours: tHours,
                    projectId: p.id,
                    projectName: p.name,
                    client: p.client,
                    category: isMaint ? 'maintenance' : 'new_project',
                    date: tDate
                  });
                }
              }
            }
          }
        } else {
          // No child tasks
          if (isMaint && (aType.includes('epic') || aType.includes('feature'))) continue;

          const aHours = Math.round((Number(a.ilcHours) || 0) * 10) / 10;
          if (aHours > 0) {
            const aDate = a.targetDate || a.startDate;
            if (isDateInPeriod(aDate)) {
              if (isMaint) totalMaint = Math.round((totalMaint + aHours) * 10) / 10;
              else totalNew = Math.round((totalNew + aHours) * 10) / 10;

              if (a.assignedTo) {
                const m = getOrCreate(a.assignedTo);
                if (m) {
                  m.tasksCount++;
                  if (isMaint) m.maintenanceHours = Math.round((m.maintenanceHours + aHours) * 10) / 10;
                  else m.newProjectHours = Math.round((m.newProjectHours + aHours) * 10) / 10;

                  const pEntry = m.projectsMap.get(p.name) || {
                    projectId: p.id,
                    projectName: p.name,
                    client: p.client,
                    category: isMaint ? 'maintenance' : 'new_project',
                    hours: 0,
                    tasksCount: 0
                  };
                  pEntry.hours = Math.round((pEntry.hours + aHours) * 10) / 10;
                  pEntry.tasksCount++;
                  m.projectsMap.set(p.name, pEntry);

                  m.tasks.push({
                    id: a.id || a.azureId || '',
                    title: a.title || a.fullTitle || a.rawTitle || 'Demanda sem título',
                    type: a.type || 'Activity',
                    state: a.state || 'Active',
                    hours: aHours,
                    projectId: p.id,
                    projectName: p.name,
                    client: p.client,
                    category: isMaint ? 'maintenance' : 'new_project',
                    date: aDate
                  });
                }
              }
            }
          }
        }
      }
    }

    let membersList = Array.from(memberStatsMap.values()).map((m, idx) => {
      m.totalHours = Math.round((m.newProjectHours + m.maintenanceHours) * 10) / 10;
      m.maintenancePercent = m.totalHours > 0 ? Math.round((m.maintenanceHours / m.totalHours) * 100) : 0;
      m.avatarColor = avatarColors[idx % avatarColors.length];
      m.projects = Array.from(m.projectsMap.values()).sort((a, b) => b.hours - a.hours);
      m.tasks.sort((a, b) => b.hours - a.hours);
      delete m.projectsMap;
      return m;
    });

    // List only team members with recorded effort in the filtered period and client
    membersList = membersList.filter(m => m.totalHours > 0);
    membersList.sort((a, b) => b.totalHours - a.totalHours);

    const totalCompanyHours = Math.round((totalMaint + totalNew) * 10) / 10;
    const maintenanceRatio = totalCompanyHours > 0 ? Math.round((totalMaint / totalCompanyHours) * 100) : 0;

    // Project capacity breakdown (only projects with hours in the period)
    const projectBreakdown = projs.map(p => {
      const isMaint = p.category === 'maintenance';
      const allocatedTeam = membersList.filter(m =>
        (m.projects || []).some(pr => pr.projectName.toLowerCase() === p.name.toLowerCase())
      );
      const hours = allocatedTeam.reduce((sum, m) => {
        const pr = (m.projects || []).find(x => x.projectName.toLowerCase() === p.name.toLowerCase());
        return sum + (pr ? pr.hours : 0);
      }, 0);

      return {
        id: p.id,
        name: p.name,
        client: p.client,
        category: isMaint ? 'maintenance' : 'new_project',
        leader: p.team?.leader || '',
        teamMembersCount: allocatedTeam.length,
        teamMembers: allocatedTeam.map(t => ({ name: t.name, role: t.role, hours: (t.projects || []).find(x => x.projectName === p.name)?.hours || 0 })),
        totalHours: Math.round(hours * 10) / 10
      };
    }).filter(p => p.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      period,
      clientFilter,
      totalMembers: membersList.length,
      totalCompanyHours,
      totalNewProjectHours: totalNew,
      totalMaintenanceHours: totalMaint,
      maintenanceRatio,
      coveredProjectsCount: projectBreakdown.filter(p => p.teamMembersCount > 0).length,
      members: membersList,
      projects: projectBreakdown
    };
  }
}

module.exports = new TeamStore();
