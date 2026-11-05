export interface WeeklyReportSummary {
  id: string;
  weekNumber: number;
  year: number;
  title: string;
  period: string;
  meetingDate: string;
  executiveSummary: string;
  statusPulse: {
    totalActive: number;
    onTrack: number;
    attention: number;
    critical: number;
    averageProgress: number;
  };
  activeProjectsCount: number;
  roadmapCount: number;
}

export interface WeeklyReportProject {
  projectId: string;
  name: string;
  client: string;
  clientLogo?: string | null;
  status?: 'Ativo' | 'Finalizado' | 'Congelado';
  currentMilestone: string;
  progress: number;
  ragStatus: 'green' | 'amber' | 'red';
  agreedDelivery: string | null;
  targetDelivery: string | null;
  varianceDays: number;
  statusReport: string;
  statusReportDate?: string;
  previousStatusReport?: string;
  previousStatusReportDate?: string;
  attentionPoints: string;
  hoursExecuted?: number;
  hoursPlanned?: number;
  hoursAgreed?: number;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  category?: 'new_project' | 'maintenance';
  systems?: string[];
  teamLeader?: string;
  teamMembers?: string[];
  team?: {
    leader?: string;
    members?: string[];
  };
}

export interface RoadmapProject {
  id: string;
  name: string;
  client: string;
  estimatedStart: string;
  stage: string;
  strategicValue: string;
  description: string;
  responsible: string;
}

export interface BoardDecision {
  id: string;
  title: string;
  client: string;
  impact: string;
  status: string;
  deadline: string;
  description?: string;
  responsible?: string;
}

export interface WeeklyReport {
  id: string;
  weekNumber: number;
  year: number;
  title: string;
  period: string;
  meetingDate: string;
  executiveSummary: string;
  statusPulse: {
    totalActive: number;
    onTrack: number;
    attention: number;
    critical: number;
    averageProgress: number;
  };
  activeProjects: WeeklyReportProject[];
  roadmapProjects: RoadmapProject[];
  boardDecisions: BoardDecision[];
  maintenanceSection?: WeeklyReportMaintenanceSection;
}

export interface WeeklyReportMaintenanceActivity {
  id?: string | number;
  title: string;
  targetDate?: string | null;
  hours?: number;
  status?: string;
  assignedTo?: string | null;
}

export interface WeeklyReportMaintenanceProject {
  id: string;
  projectId?: string;
  name: string;
  client: string;
  status: string;
  ragStatus: string;
  hoursExecuted: number;
  hoursPlanned: number;
  hoursAgreed?: number;
  hoursExecutedInPeriod?: number;
  lifetimeHoursExecuted?: number;
  attentionPoints?: string;
  statusReport?: string;
  statusReportDate?: string;
  previousStatusReport?: string;
  previousStatusReportDate?: string;
  teamLeader?: string;
  teamMembers?: string[];
  periodTeamMembers?: string[];
  team?: {
    leader?: string;
    members?: string[];
  };
  recentActivities: WeeklyReportMaintenanceActivity[];
  summary?: string;
}

export interface WeeklyReportMaintenanceSection {
  totalProjects: number;
  totalHours: number;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  newProjectHours?: number;
  totalPeriodHours?: number;
  maintenancePercent?: number;
  newProjectPercent?: number;
  activeSystemsCount?: number;
  teamMembersCount?: number;
  teamMembers?: string[];
  projects: WeeklyReportMaintenanceProject[];
}
