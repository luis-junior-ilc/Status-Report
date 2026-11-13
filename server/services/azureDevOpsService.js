const config = require('../config');

const OFFICIAL_EAP_PHASES = [
  'Planejamento',
  'Desenvolvimento',
  'Homologação',
  'Treinamento',
  'Operação Assistida'
];

class AzureDevOpsService {
  constructor() {
    this.orgUrl = config.azureDevOps.orgUrl.replace(/\/+$/, '');
    this.authHeader = 'Basic ' + Buffer.from(':' + config.azureDevOps.pat).toString('base64');
  }

  setPat(newPat) {
    config.azureDevOps.pat = newPat;
    this.authHeader = 'Basic ' + Buffer.from(':' + newPat).toString('base64');
  }

  async testConnection() {
    try {
      const data = await this.getAllProjects();
      return { success: true, projectCount: data.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  roundHours(val) {
    if (val === null || val === undefined || isNaN(val)) return 0;
    return Math.round(Number(val) * 10) / 10;
  }

  async fetchApi(endpoint, options = {}) {
    const url = `${this.orgUrl}/${endpoint.replace(/^\//, '')}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Azure API Error ${res.status} (${res.statusText}): ${errText.slice(0, 300)}`);
    }
    return res.json();
  }

  async getAllProjects() {
    const data = await this.fetchApi('_apis/projects?api-version=7.0');
    return data.value || [];
  }

  async getProjectIterations(projectId, teamName) {
    try {
      const team = teamName ? encodeURIComponent(teamName) : '';
      const endpoint = team
        ? `${projectId}/${team}/_apis/work/teamsettings/iterations?api-version=7.0`
        : `${projectId}/_apis/work/teamsettings/iterations?api-version=7.0`;
      const data = await this.fetchApi(endpoint);
      return data.value || [];
    } catch (err) {
      return [];
    }
  }

  async getProjectTeams(projectId) {
    try {
      const data = await this.fetchApi(`_apis/projects/${projectId}/teams?api-version=7.0`);
      return data.value || [];
    } catch (err) {
      return [];
    }
  }

  // Classify work item into one of the 5 official EAP phases
  classifyWorkItemToEap(title = '', tags = '', iteration = '') {
    const text = `${title} ${tags} ${iteration}`.toLowerCase();

    if (text.includes('ideacao') || text.includes('ideação') || text.includes('discovery') || text.includes('requisito') || text.includes('especificacao') || text.includes('especificação') || text.includes('concepcao') || text.includes('concepção') || text.includes('prototipo') || text.includes('protótipo') || text.includes('fase 1') || text.includes('planejamento')) {
      return 'Planejamento';
    }
    if (text.includes('treinamento') || text.includes('treino') || text.includes('capacitacao') || text.includes('capacitação') || text.includes('capacitar') || text.includes('onboarding') || text.includes('workshop')) {
      return 'Treinamento';
    }
    if (text.includes('operacao-assistida') || text.includes('operação assistida') || text.includes('operacao assistida') || text.includes('go-live') || text.includes('golive') || text.includes('sustentacao') || text.includes('sustentação') || text.includes('fechamento') || text.includes('tep')) {
      return 'Operação Assistida';
    }
    if (text.includes('qa') || text.includes('qualidade') || text.includes('uat') || text.includes('e2e') || text.includes('teste') || text.includes('homologacao') || text.includes('homologação') || text.includes('fase 4') || text.includes('validacao') || text.includes('validação')) {
      return 'Homologação';
    }
    // Default to Desenvolvimento
    return 'Desenvolvimento';
  }

  // Determine timeline month for Gantt (e.g. 'AGO / 26', 'SET / 26', 'OUT / 26', 'NOV / 26', 'DEZ / 26', 'JAN / 27')
  getMonthSlot(startDate, targetDate, iterationName = '') {
    const dateStr = targetDate || startDate;
    if (dateStr) {
      const d = new Date(dateStr);
      const m = d.getMonth();
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const yr = String(d.getFullYear()).slice(2);
      return `${months[m]} / ${yr}`;
    }
    // Try to guess from iteration string like (Set26), (Out26), (Nov26)
    const it = iterationName.toUpperCase();
    if (it.includes('JUL26') || it.includes('JUL')) return 'JUL / 26';
    if (it.includes('AGO26') || it.includes('AGO')) return 'AGO / 26';
    if (it.includes('SET26') || it.includes('SET')) return 'SET / 26';
    if (it.includes('OUT26') || it.includes('OUT')) return 'OUT / 26';
    if (it.includes('NOV26') || it.includes('NOV')) return 'NOV / 26';
    if (it.includes('DEZ26') || it.includes('DEZ')) return 'DEZ / 26';
    if (it.includes('JAN27') || it.includes('JAN')) return 'JAN / 27';
    return 'OUT / 26';
  }

  // Helper to count business days (Monday-Friday) between two dates
  getBusinessDaysDiff(startDate, endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (end < start) return Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
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

  // Extract only explicit planned/target dates (without ActivatedDate or iteration fallback)
  extractExplicitDates(fields = {}) {
    const rawStart = fields['Custom.PlannedStartDate']
      || fields['Custom.PlannedStartDateUS']
      || fields['Custom.USPlannedStartDate']
      || fields['Microsoft.VSTS.Scheduling.StartDate']
      || null;

    const rawTarget = fields['Microsoft.VSTS.Scheduling.TargetDate']
      || fields['Custom.TargetDateUS']
      || fields['Microsoft.VSTS.Scheduling.FinishDate']
      || fields['Microsoft.VSTS.CMMI.TargetResolveDate']
      || null;

    return {
      startDate: rawStart ? String(rawStart).split('T')[0] : null,
      targetDate: rawTarget ? String(rawTarget).split('T')[0] : null
    };
  }

  // Extract dates from all standard and custom Azure DevOps fields
  extractWorkItemDates(fields = {}, iterMap = {}, iterName = '') {
    const explicit = this.extractExplicitDates(fields);
    const activatedDate = fields['Microsoft.VSTS.Common.ActivatedDate']
      ? String(fields['Microsoft.VSTS.Common.ActivatedDate']).split('T')[0]
      : null;

    let startDate = explicit.startDate || activatedDate || null;
    let targetDate = explicit.targetDate || null;

    // Iteration fallback if dates still missing
    const iterKey = (iterName || fields['System.IterationPath'] || '').toLowerCase();
    const iterAttr = iterMap[iterKey] || iterMap[iterKey.split('\\').pop() || ''];
    if (!startDate && iterAttr?.startDate) {
      startDate = iterAttr.startDate.split('T')[0];
    }
    if (!targetDate && iterAttr?.finishDate) {
      targetDate = iterAttr.finishDate.split('T')[0];
    }

    return { startDate, targetDate };
  }

  // Resolve dates with priority: item explicit dates -> child tasks rollup -> item fallback (ActivatedDate/Iteration)
  resolveDatesWithChildren(fields = {}, childTasks = [], iterMap = {}, iterName = '') {
    const explicit = this.extractExplicitDates(fields);
    const fallback = this.extractWorkItemDates(fields, iterMap, iterName);
    const validStarts = childTasks.map(t => t.startDate).filter(Boolean).sort();
    const validEnds = childTasks.map(t => t.targetDate).filter(Boolean).sort();

    return {
      startDate: explicit.startDate || validStarts[0] || fallback.startDate || null,
      targetDate: explicit.targetDate || validEnds[validEnds.length - 1] || fallback.targetDate || null
    };
  }

  // Compute delay and tight-margin flags from targetDate and activity status
  computeScheduleFlags(targetDate, cardStatus, today) {
    let isDelayed = false;
    let isTightMargin = false;

    if (targetDate && cardStatus !== 'completed') {
      const tDate = new Date(targetDate + 'T12:00:00');
      tDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((tDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      // Regra calibrada: desvio a partir de 2 dias de atraso; atenção entre -1 e 1 dia de atraso
      if (diffDays <= -2) {
        // Atraso crítico a partir de 2 dias (atraso >= 2d)
        isDelayed = true;
      } else if (diffDays >= -1 && diffDays <= 1) {
        // Atenção entre -1 e 1 dia de atraso (entrega iminente hoje/amanhã ou atraso tolerado de 1d)
        isTightMargin = true;
      }
    }

    return { isDelayed, isTightMargin };
  }

  // Extract parent ID from item (from System.Parent field or relations)
  extractParentId(item) {
    if (item.fields?.['System.Parent']) {
      const p = Number(item.fields['System.Parent']);
      if (!isNaN(p) && p > 0) return p;
    }
    if (item.relations && Array.isArray(item.relations)) {
      const parentRel = item.relations.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse');
      if (parentRel && parentRel.url) {
        const parts = parentRel.url.split('/');
        const p = Number(parts[parts.length - 1]);
        if (!isNaN(p) && p > 0) return p;
      }
    }
    return null;
  }

  mapStatus(azureState) {
    const state = (azureState || '').toLowerCase();
    if (['closed', 'done', 'resolved', 'finalizado', 'concluído'].includes(state)) {
      return 'completed';
    }
    if (['active', 'in progress', 'doing', 'em andamento', 'qa'].includes(state)) {
      return 'in-progress';
    }
    return 'planned';
  }

  async getProjectDetails(project) {
    const pName = project.name;
    const pEnc = encodeURIComponent(pName);

    const teams = await this.getProjectTeams(project.id);
    const defaultTeam = teams[0]?.name || pName;
    const iterations = await this.getProjectIterations(project.id, defaultTeam);

    const datedIterations = iterations
      .filter(it => it.attributes?.startDate && it.attributes?.finishDate)
      .sort((a, b) => new Date(a.attributes.startDate) - new Date(b.attributes.startDate));

    let detectedStartDate = null;
    let detectedFinishDate = null;
    let currentIterationName = null;

    if (datedIterations.length > 0) {
      detectedStartDate = datedIterations[0].attributes.startDate.split('T')[0];
      detectedFinishDate = datedIterations[datedIterations.length - 1].attributes.finishDate.split('T')[0];
      const now = new Date();
      const current = datedIterations.find(it => {
        const s = new Date(it.attributes.startDate);
        const f = new Date(it.attributes.finishDate);
        return now >= s && now <= f;
      }) || datedIterations.find(it => it.attributes.timeFrame === 'current');
      if (current) currentIterationName = current.name;
    }

    // Iteration date map for fallback
    const iterMap = {};
    for (const it of iterations) {
      if (it.name) iterMap[it.name.toLowerCase()] = it.attributes;
      if (it.path) iterMap[it.path.toLowerCase()] = it.attributes;
    }

    // 1. Query Tasks & Bugs to collect planned and executed hours with relations
    let totalTaskOriginalEstimate = 0;
    let totalTaskCompletedWork = 0;
    const parentToTasksMap = {}; // parentId -> [ taskObj, ... ]
    const childToParentMap = {}; // childId -> parentId
    const allCollectedTasks = [];

    try {
      const taskWiql = {
        query: `SELECT [System.Id], [System.Parent], [System.WorkItemType], [Microsoft.VSTS.Scheduling.OriginalEstimate], [Microsoft.VSTS.Scheduling.CompletedWork] FROM WorkItems WHERE [System.TeamProject] = '${pName.replace(/'/g, "''")}' AND [System.WorkItemType] IN ('Task', 'Bug')`
      };
      const taskRes = await this.fetchApi(`${pEnc}/_apis/wit/wiql?api-version=7.0`, {
        method: 'POST',
        body: JSON.stringify(taskWiql)
      });
      const taskItems = taskRes.workItems || [];

      if (taskItems.length > 0) {
        // Fetch tasks in chunks of 100 with relations
        for (let i = 0; i < taskItems.length; i += 100) {
          const chunkIds = taskItems.slice(i, i + 100).map(t => t.id).join(',');
          const chunkRes = await this.fetchApi(`_apis/wit/workitems?ids=${chunkIds}&$expand=relations&api-version=7.0`);
          for (const item of (chunkRes.value || [])) {
            const est = this.roundHours(Number(item.fields?.['Microsoft.VSTS.Scheduling.OriginalEstimate']) || 0);
            const comp = this.roundHours(Number(item.fields?.['Microsoft.VSTS.Scheduling.CompletedWork']) || 0);
            const parentId = this.extractParentId(item);
            const taskDates = this.extractWorkItemDates(item.fields, iterMap, item.fields?.['System.IterationPath']);

            totalTaskOriginalEstimate = this.roundHours(totalTaskOriginalEstimate + est);
            totalTaskCompletedWork = this.roundHours(totalTaskCompletedWork + comp);

            const taskObj = {
              id: item.id,
              title: item.fields?.['System.Title'] || 'Tarefa',
              type: item.fields?.['System.WorkItemType'] || 'Task',
              state: item.fields?.['System.State'],
              assignedTo: item.fields?.['System.AssignedTo']?.displayName || null,
              originalEstimate: est,
              completedWork: comp,
              startDate: taskDates.startDate,
              targetDate: taskDates.targetDate
            };
            allCollectedTasks.push(taskObj);

            if (parentId) {
              childToParentMap[item.id] = parentId;
              if (!parentToTasksMap[parentId]) parentToTasksMap[parentId] = [];
              parentToTasksMap[parentId].push(taskObj);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[AzureSync] Could not fetch tasks for ${pName}:`, e.message);
    }

    // 1.5. Query intermediate items (User Stories, PBIs, Requirements) to connect Tasks -> Stories -> Features/Epics
    const storiesMap = {}; // storyId -> { id, title, parentId }
    try {
      const storyHierarchyWiql = {
        query: `SELECT [System.Id], [System.Parent], [System.Title], [System.WorkItemType] FROM WorkItems WHERE [System.TeamProject] = '${pName.replace(/'/g, "''")}' AND [System.WorkItemType] IN ('User Story', 'Product Backlog Item', 'Requirement')`
      };
      const storyHierarchyRes = await this.fetchApi(`${pEnc}/_apis/wit/wiql?api-version=7.0`, {
        method: 'POST',
        body: JSON.stringify(storyHierarchyWiql)
      });
      const storyHierarchyItems = storyHierarchyRes.workItems || [];

      if (storyHierarchyItems.length > 0) {
        for (let i = 0; i < storyHierarchyItems.length; i += 100) {
          const chunkIds = storyHierarchyItems.slice(i, i + 100).map(s => s.id).join(',');
          const chunkRes = await this.fetchApi(`_apis/wit/workitems?ids=${chunkIds}&$expand=relations&api-version=7.0`);
          for (const item of (chunkRes.value || [])) {
            const parentId = this.extractParentId(item);
            const fields = item.fields || {};
            storiesMap[item.id] = {
              id: item.id,
              title: fields['System.Title'] || '',
              state: fields['System.State'] || 'Active',
              assignedTo: fields['System.AssignedTo']?.displayName || null,
              iterationName: fields['System.IterationPath'] || '',
              tags: fields['System.Tags'] || '',
              fields,
              parentId: parentId
            };
            if (parentId) {
              childToParentMap[item.id] = parentId;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[AzureSync] Could not fetch intermediate stories for ${pName}:`, e.message);
    }

    // 2. Query Hierarchy: Epics & Features -> Fallback to User Stories -> Fallback to Tasks
    let rawWorkItems = [];
    try {
      // Query Epics and Features
      const epicFeatureWiql = {
        query: `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.IterationPath], [System.Tags] FROM WorkItems WHERE [System.TeamProject] = '${pName.replace(/'/g, "''")}' AND [System.WorkItemType] IN ('Epic', 'Feature') ORDER BY [System.WorkItemType] ASC, [System.ChangedDate] DESC`
      };
      const efRes = await this.fetchApi(`${pEnc}/_apis/wit/wiql?api-version=7.0`, {
        method: 'POST',
        body: JSON.stringify(epicFeatureWiql)
      });
      rawWorkItems = efRes.workItems || [];

      // Fallback 1: If 0 Epics/Features, query User Stories / Product Backlog Items / Requirements
      if (rawWorkItems.length === 0) {
        const storyWiql = {
          query: `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.IterationPath], [System.Tags] FROM WorkItems WHERE [System.TeamProject] = '${pName.replace(/'/g, "''")}' AND [System.WorkItemType] IN ('User Story', 'Product Backlog Item', 'Requirement') ORDER BY [System.ChangedDate] DESC`
        };
        const storyRes = await this.fetchApi(`${pEnc}/_apis/wit/wiql?api-version=7.0`, {
          method: 'POST',
          body: JSON.stringify(storyWiql)
        });
        rawWorkItems = storyRes.workItems || [];
      }

      // Fallback 2: If 0 Stories, query Tasks/Bugs
      if (rawWorkItems.length === 0) {
        const taskDirectWiql = {
          query: `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.IterationPath], [System.Tags] FROM WorkItems WHERE [System.TeamProject] = '${pName.replace(/'/g, "''")}' AND [System.WorkItemType] IN ('Task', 'Bug') ORDER BY [System.ChangedDate] DESC`
        };
        const directRes = await this.fetchApi(`${pEnc}/_apis/wit/wiql?api-version=7.0`, {
          method: 'POST',
          body: JSON.stringify(taskDirectWiql)
        });
        rawWorkItems = directRes.workItems || [];
      }
    } catch (e) {
      console.warn(`[AzureSync] Could not fetch work items for ${pName}:`, e.message);
    }

    // 3. Process Work Items into EAP Gantt Activities
    let activities = [];
    if (rawWorkItems.length > 0) {
      const topIds = rawWorkItems.slice(0, 40).map(w => w.id).join(',');
      const detRes = await this.fetchApi(`_apis/wit/workitems?ids=${topIds}&$expand=relations&api-version=7.0`);
      const itemsList = detRes.value || [];

      // Also record parent relations for intermediate levels (e.g. Stories under Features/Epics)
      for (const item of itemsList) {
        const pId = this.extractParentId(item);
        if (pId) childToParentMap[item.id] = pId;
      }

      // Connect unparented stories to matching Feature/Epic by title similarity
      for (const [sId, sObj] of Object.entries(storiesMap)) {
        if (!sObj.parentId) {
          const sTitle = (sObj.title || '').trim().toLowerCase();
          const match = itemsList.find(act => {
            const aTitle = (act.fields?.['System.Title'] || '').trim().toLowerCase();
            return aTitle === sTitle || aTitle.includes(sTitle) || sTitle.includes(aTitle);
          });
          if (match) {
            childToParentMap[Number(sId)] = match.id;
          }
        }
      }

      // Helper function to recursively collect all descendant tasks for an activity
      const getTasksForItem = (itemId) => {
        const result = [];
        const visited = new Set();
        const queue = [itemId];
        while (queue.length > 0) {
          const cur = queue.shift();
          if (visited.has(cur)) continue;
          visited.add(cur);
          if (parentToTasksMap[cur]) {
            result.push(...parentToTasksMap[cur]);
          }
          for (const [chId, pId] of Object.entries(childToParentMap)) {
            if (pId === cur && !visited.has(Number(chId))) {
              queue.push(Number(chId));
            }
          }
        }
        return result;
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      activities = itemsList.map(item => {
        const id = item.id;
        const title = item.fields?.['System.Title'] || 'Item sem título';
        const type = item.fields?.['System.WorkItemType'] || 'Feature';
        const state = item.fields?.['System.State'] || 'New';
        const iterationPath = item.fields?.['System.IterationPath'] || '';
        const iterationName = iterationPath.split('\\').pop() || '';
        const tags = item.fields?.['System.Tags'] || '';

        // Collect all descendant tasks
        const childTasks = getTasksForItem(id);

        // Extract explicit item dates first, falling back to child tasks rollup, then ActivatedDate/Iteration
        const { startDate, targetDate } = this.resolveDatesWithChildren(item.fields, childTasks, iterMap, iterationName);

        const eapPhase = this.classifyWorkItemToEap(title, tags, iterationName);
        const monthSlot = this.getMonthSlot(startDate, targetDate, iterationName);
        const cardStatus = this.mapStatus(state);

        // Hours rollup from descendant tasks or item itself if it's a task
        let ilcHours = this.roundHours(childTasks.reduce((s, t) => s + (t.completedWork || 0), 0));
        let ilcHoursTotal = this.roundHours(childTasks.reduce((s, t) => s + (t.originalEstimate || 0), 0));

        if (childTasks.length === 0 && ['task', 'bug'].includes(type.toLowerCase())) {
          ilcHours = this.roundHours(Number(item.fields?.['Microsoft.VSTS.Scheduling.CompletedWork']) || 0);
          ilcHoursTotal = this.roundHours(Number(item.fields?.['Microsoft.VSTS.Scheduling.OriginalEstimate']) || 0);
        }

        if (ilcHoursTotal === 0 && cardStatus === 'completed') {
          ilcHoursTotal = ilcHours;
        }

        const { isDelayed, isTightMargin } = this.computeScheduleFlags(targetDate, cardStatus, today);

        const assignedTo = item.fields?.['System.AssignedTo']?.displayName || null;

        return {
          id: String(id),
          azureId: id,
          title: this.cleanActivityTitle(title),
          fullTitle: `#${id} ${title}`,
          rawTitle: title,
          type,
          state,
          assignedTo,
          eapPhase,
          month: monthSlot,
          startDate,
          targetDate,
          dateStr: targetDate ? new Date(targetDate + 'T12:00:00').toLocaleDateString('pt-BR') : (iterationName || monthSlot),
          ilcHours,
          ilcHoursTotal,
          clientHours: 0,
          status: cardStatus,
          isDelayed,
          isTightMargin,
          linkedTasks: childTasks
        };
      });

      // Capture unparented User Stories and standalone tasks that have recorded hours
      const capturedTaskIds = new Set();
      activities.forEach(a => (a.linkedTasks || []).forEach(t => capturedTaskIds.add(t.id)));

      const uncapturedTasks = allCollectedTasks.filter(t => !capturedTaskIds.has(t.id) && (t.completedWork > 0 || t.originalEstimate > 0));

      if (uncapturedTasks.length > 0) {
        const byStory = new Map();
        const standaloneTasks = [];

        for (const t of uncapturedTasks) {
          const pId = childToParentMap[t.id];
          if (pId && storiesMap[pId]) {
            if (!byStory.has(pId)) byStory.set(pId, []);
            byStory.get(pId).push(t);
          } else {
            standaloneTasks.push(t);
          }
        }

        // Add activity for each unparented User Story with effort
        byStory.forEach((tasks, sId) => {
          const s = storiesMap[sId];
          const sTitle = s?.title || `Demanda #${sId}`;
          const { startDate, targetDate } = this.resolveDatesWithChildren(s?.fields || {}, tasks, iterMap, s?.iterationName || '');
          const eapPhase = this.classifyWorkItemToEap(sTitle, s?.tags || '', s?.iterationName || '');
          const monthSlot = this.getMonthSlot(startDate, targetDate, s?.iterationName || '');
          const ilcHours = this.roundHours(tasks.reduce((sum, t) => sum + (t.completedWork || 0), 0));
          const ilcHoursTotal = this.roundHours(tasks.reduce((sum, t) => sum + (t.originalEstimate || 0), 0));
          const cardStatus = this.mapStatus(s?.state || 'Active');
          const { isDelayed, isTightMargin } = this.computeScheduleFlags(targetDate, cardStatus, today);

          activities.push({
            id: String(sId),
            azureId: Number(sId),
            title: this.cleanActivityTitle(sTitle),
            fullTitle: `#${sId} ${sTitle}`,
            rawTitle: sTitle,
            type: 'User Story',
            state: s?.state || 'Active',
            assignedTo: s?.assignedTo || (tasks[0] ? tasks[0].assignedTo : null),
            eapPhase,
            month: monthSlot,
            startDate,
            targetDate,
            dateStr: targetDate ? new Date(targetDate + 'T12:00:00').toLocaleDateString('pt-BR') : monthSlot,
            ilcHours,
            ilcHoursTotal: ilcHoursTotal || ilcHours,
            clientHours: 0,
            status: cardStatus,
            isDelayed,
            isTightMargin,
            linkedTasks: tasks
          });
        });

        // Add grouped activity for standalone tasks with hours (avoid cluttering EAP)
        if (standaloneTasks.length > 0) {
          const validStarts = standaloneTasks.map(t => t.startDate).filter(Boolean).sort();
          const validEnds = standaloneTasks.map(t => t.targetDate).filter(Boolean).sort();
          const startDate = validStarts[0] || null;
          const targetDate = validEnds[validEnds.length - 1] || null;
          const ilcHours = this.roundHours(standaloneTasks.reduce((sum, t) => sum + (t.completedWork || 0), 0));
          const ilcHoursTotal = this.roundHours(standaloneTasks.reduce((sum, t) => sum + (t.originalEstimate || 0), 0));
          const monthSlot = this.getMonthSlot(startDate, targetDate, '');

          activities.push({
            id: `${pName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-operacional`,
            azureId: null,
            title: 'Atividades Operacionais & Suporte',
            fullTitle: 'Atividades Operacionais & Suporte',
            rawTitle: 'Atividades Operacionais & Suporte',
            type: 'TaskGroup',
            state: 'Active',
            assignedTo: 'Equipe de Sustentação',
            eapPhase: 'Operação Assistida',
            month: monthSlot,
            startDate,
            targetDate,
            dateStr: targetDate ? new Date(targetDate + 'T12:00:00').toLocaleDateString('pt-BR') : monthSlot,
            ilcHours,
            ilcHoursTotal: ilcHoursTotal || ilcHours,
            clientHours: 0,
            status: 'in_progress',
            isDelayed: false,
            isTightMargin: false,
            linkedTasks: standaloneTasks
          });
        }
      }
    }

    // Progress percentage: Deliverables & Tasks Completion (Earned Value / Scope Completion)
    const isStateClosed = (s) => ['closed', 'done', 'resolved', 'finalizado', 'concluído', 'completed'].includes((s || '').toLowerCase());
    const isStateActive = (s) => ['active', 'in progress', 'doing', 'em andamento', 'qa', 'in-progress'].includes((s || '').toLowerCase());

    let progress = 0;
    const closedTasks = allCollectedTasks.filter(t => isStateClosed(t.state));
    const allTasksCompleted = allCollectedTasks.length > 0 && closedTasks.length === allCollectedTasks.length;
    const allActivitiesCompleted = activities.length > 0 && activities.every(a => a.status === 'completed' || isStateClosed(a.state));

    if (allTasksCompleted || allActivitiesCompleted) {
      progress = 100;
    } else if (allCollectedTasks.length > 0) {
      let totalWeight = 0;
      let earnedValue = 0;
      for (const t of allCollectedTasks) {
        const weight = t.originalEstimate > 0 ? t.originalEstimate : (t.completedWork > 0 ? t.completedWork : 1);
        totalWeight += weight;
        if (isStateClosed(t.state)) {
          earnedValue += weight;
        } else if (isStateActive(t.state)) {
          const partial = t.originalEstimate > 0 ? Math.min(weight * 0.8, t.completedWork || (weight * 0.5)) : (weight * 0.5);
          earnedValue += partial;
        }
      }
      progress = totalWeight > 0 ? Math.min(99, Math.round((earnedValue / totalWeight) * 100)) : 0;
    } else if (activities.length > 0) {
      const closed = activities.filter(a => a.status === 'completed' || isStateClosed(a.state)).length;
      progress = Math.round((closed / activities.length) * 100);
    }

    // Auto-detect current milestone from the earliest unfinished EAP phase
    const phaseOrder = ['Planejamento', 'Desenvolvimento', 'Homologação', 'Treinamento', 'Operação Assistida'];
    let currentMilestone = 'Desenvolvimento';
    for (const ph of phaseOrder) {
      const phActs = activities.filter(a => a.eapPhase === ph);
      if (phActs.length > 0 && phActs.some(a => a.status !== 'completed')) {
        currentMilestone = ph;
        break;
      }
    }
    if (activities.length > 0 && activities.every(a => a.status === 'completed')) {
      currentMilestone = 'Operação Assistida';
    }

    // Expand detected dates using activity dates if activities span beyond iterations
    const validEnds = activities.map(a => a.targetDate).filter(Boolean).sort();
    if (validEnds.length > 0 && (!detectedFinishDate || validEnds[validEnds.length - 1] > detectedFinishDate)) {
      detectedFinishDate = validEnds[validEnds.length - 1];
    }
    const validStarts = activities.map(a => a.startDate).filter(Boolean).sort();
    if (validStarts.length > 0 && (!detectedStartDate || validStarts[0] < detectedStartDate)) {
      detectedStartDate = validStarts[0];
    }

    return {
      azureId: project.id,
      name: project.name,
      description: project.description || '',
      detectedStartDate,
      detectedFinishDate,
      currentIterationName,
      currentMilestone,
      iterationsCount: iterations.length,
      progress,
      activities,
      taskHours: {
        totalPlanned: this.roundHours(totalTaskOriginalEstimate),
        totalExecuted: this.roundHours(totalTaskCompletedWork)
      },
      azureLastUpdated: new Date().toISOString()
    };
  }

  // Full Work Items Audit Extrato for a project
  async getProjectFullAudit(projectName) {
    const pEnc = encodeURIComponent(projectName);
    const wiql = {
      query: `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AssignedTo], [System.Parent], [System.IterationPath], [Microsoft.VSTS.Scheduling.StartDate], [Microsoft.VSTS.Scheduling.TargetDate], [Microsoft.VSTS.Scheduling.OriginalEstimate], [Microsoft.VSTS.Scheduling.CompletedWork] FROM WorkItems WHERE [System.TeamProject] = '${projectName.replace(/'/g, "''")}' ORDER BY [System.WorkItemType] ASC, [System.Id] ASC`
    };

    let rawItems = [];
    try {
      const res = await this.fetchApi(`${pEnc}/_apis/wit/wiql?api-version=7.0`, {
        method: 'POST',
        body: JSON.stringify(wiql)
      });
      rawItems = res.workItems || [];
    } catch (e) {
      console.warn(`[AzureAudit] Error executing WIQL for ${projectName}:`, e.message);
      return {
        projectName,
        totalItems: 0,
        completeItems: 0,
        incompleteItems: 0,
        complianceScore: 0,
        summary: { epics: { total: 0, complete: 0 }, features: { total: 0, complete: 0 }, stories: { total: 0, complete: 0 }, tasks: { total: 0, complete: 0 } },
        items: []
      };
    }

    const allItems = [];
    const summary = {
      epics: { total: 0, complete: 0 },
      features: { total: 0, complete: 0 },
      stories: { total: 0, complete: 0 },
      tasks: { total: 0, complete: 0 }
    };

    // Fetch details in chunks of 100
    for (let i = 0; i < rawItems.length; i += 100) {
      const chunkIds = rawItems.slice(i, i + 100).map(w => w.id).join(',');
      const detRes = await this.fetchApi(`_apis/wit/workitems?ids=${chunkIds}&$expand=relations&api-version=7.0`);
      for (const item of (detRes.value || [])) {
        const id = item.id;
        const type = item.fields?.['System.WorkItemType'] || 'Item';
        const title = item.fields?.['System.Title'] || 'Sem título';
        const state = item.fields?.['System.State'] || 'New';
        const assignedTo = item.fields?.['System.AssignedTo']?.displayName || null;
        const parentId = this.extractParentId(item);
        const iterationPath = item.fields?.['System.IterationPath'] || '';

        const { startDate, targetDate } = this.extractWorkItemDates(item.fields, {}, iterationPath);

        const originalEstimate = item.fields?.['Microsoft.VSTS.Scheduling.OriginalEstimate'] !== undefined 
          ? this.roundHours(item.fields['Microsoft.VSTS.Scheduling.OriginalEstimate']) 
          : null;
        const completedWork = item.fields?.['Microsoft.VSTS.Scheduling.CompletedWork'] !== undefined 
          ? this.roundHours(item.fields['Microsoft.VSTS.Scheduling.CompletedWork']) 
          : null;

        const lowerType = type.toLowerCase();
        let category = 'Outro';
        if (lowerType === 'epic' || lowerType === 'épico') {
          category = 'Épico';
          summary.epics.total++;
        } else if (lowerType === 'feature') {
          category = 'Feature';
          summary.features.total++;
        } else if (['user story', 'product backlog item', 'requirement', 'história'].includes(lowerType)) {
          category = 'US / PBI';
          summary.stories.total++;
        } else if (['task', 'bug', 'tarefa', 'defeito'].includes(lowerType)) {
          category = 'Task / Bug';
          summary.tasks.total++;
        }

        // Completeness evaluation
        const missingFields = [];
        if (!startDate) missingFields.push('Data de Início (Planned Start Date)');
        if (!targetDate) missingFields.push('Data de Fim (Target Date)');
        if (!assignedTo) missingFields.push('Responsável');

        if (category === 'Task / Bug') {
          if (originalEstimate === null || originalEstimate === 0) {
            missingFields.push('Horas Planejadas (Original Estimate)');
          }
        }

        const isComplete = missingFields.length === 0;

        if (category === 'Épico' && isComplete) summary.epics.complete++;
        if (category === 'Feature' && isComplete) summary.features.complete++;
        if (category === 'US / PBI' && isComplete) summary.stories.complete++;
        if (category === 'Task / Bug' && isComplete) summary.tasks.complete++;

        allItems.push({
          id,
          title,
          type,
          category,
          state,
          assignedTo,
          startDate,
          targetDate,
          originalEstimate,
          completedWork,
          parentId,
          iterationPath,
          isComplete,
          missingFields
        });
      }
    }

    const totalItems = allItems.length;
    const completeItems = allItems.filter(it => it.isComplete).length;
    const incompleteItems = totalItems - completeItems;
    const complianceScore = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 100;

    return {
      projectName,
      totalItems,
      completeItems,
      incompleteItems,
      complianceScore,
      summary,
      items: allItems
    };
  }

  cleanActivityTitle(rawTitle) {
    if (!rawTitle) return '';
    let t = rawTitle.trim();
    // 1. Remove leading #1234
    t = t.replace(/^#\d+[\s:–—-]*/, '');
    // 2. Remove leading emojis/symbols before brackets
    t = t.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s]+/u, '');
    // 3. Remove bracket tags like [Épico 1], [JD-PROMISS], [Promessa MVP], [Frete Expresso]
    while (/^\[[^\]]+\][\s:–—-]*/.test(t) || /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s]*\[[^\]]+\][\s:–—-]*/u.test(t)) {
      t = t.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s]*\[[^\]]+\][\s:–—-]*/u, '');
    }
    // 4. Remove leading #1234 if any
    t = t.replace(/^#\d+[\s:–—-]*/, '');
    // 5. Remove unbracketed type prefix like 'Épico 1 - ', 'Feature 2: ', 'US 1: '
    t = t.replace(/^(?:Épico|Epico|Feature|US|PBI|História|Historia|Task|Tarefa)\s*\d*[\s:–—-]+/i, '');
    // 6. Remove remaining leading emojis or punctuation (like - or :)
    t = t.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\s:–—-]+/u, '').trim();
    return t || rawTitle;
  }

  getProjectSummary(project) {
    return this.getProjectDetails(project);
  }
}

module.exports = new AzureDevOpsService();
