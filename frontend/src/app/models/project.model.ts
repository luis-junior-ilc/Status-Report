export type ProjectStatus = 'Ativo' | 'Finalizado' | 'Congelado';
export type RagStatus = 'green' | 'amber' | 'red';
export type ProjectPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type IlcSystem = 'Portal Integrator' | 'App Smart Tracking' | 'Smart X' | 'App ILC';

export interface ProjectTeam {
  leader?: string;
  members?: string[];
}

export type EapPhase = 
  | 'Planejamento'
  | 'Desenvolvimento'
  | 'Homologação'
  | 'Treinamento'
  | 'Operação Assistida';

export interface DateRange {
  start: string;
  end: string | null;
}

export interface ProjectMonthlyHours {
  monthKey: string;
  label: string;
  hours: number;
  percent: number;
}

export interface LinkedTask {
  id: number;
  title: string;
  state?: string;
  assignedTo?: string | null;
  originalEstimate?: number | null;
  completedWork?: number | null;
}

export interface ProjectActivity {
  id: string;
  azureId?: number;
  title: string;
  rawTitle?: string;
  type?: string;
  state?: string;
  assignedTo?: string | null;
  eapPhase: EapPhase;
  month: string; // e.g. 'AGO / 26', 'SET / 26', 'OUT / 26'
  startDate?: string | null;
  targetDate?: string | null;
  dateStr?: string;
  ilcHours: number;
  ilcHoursTotal: number;
  clientHours: number;
  status: 'completed' | 'in-progress' | 'planned';
  isDelayed?: boolean;
  isTightMargin?: boolean;
  hasManualEapPhase?: boolean;
  linkedTasks?: LinkedTask[];
}

export interface PhaseDistribution {
  phase: EapPhase;
  planned: number;
  executed: number;
  percentage: number;
  completed?: boolean;
  deliverablesTotal?: number;
  deliverablesCompleted?: number;
}

export interface ProjectHours {
  agreed?: number;
  agreedHours?: number;
  planned?: number;
  executed?: number;
  clientPlanned?: number;
  clientExecuted?: number;
  ilcPlanned?: number;
  ilcExecuted?: number;
  totalPlanned: number;
  totalExecuted: number;
  distribution: PhaseDistribution[];
}

export interface ClientConfig {
  name: string;
  slug: string;
  logoUrl: string;
  token: string;
  description?: string;
}

export interface AzureConfigStatus {
  orgUrl: string;
  patMasked: string;
  expirationDate: string;
  daysRemaining: number;
  monthsRemaining: number;
  isExpired: boolean;
  isWarning: boolean;
  isConnected: boolean;
}

export interface AzureAuditItem {
  id: number;
  title: string;
  type: string;
  category: 'Épico' | 'Feature' | 'US / PBI' | 'Task / Bug' | string;
  state: string;
  assignedTo: string | null;
  startDate: string | null;
  targetDate: string | null;
  originalEstimate: number | null;
  completedWork: number | null;
  parentId?: number | null;
  iterationPath?: string;
  isComplete: boolean;
  missingFields: string[];
}

export interface AzureAuditReport {
  projectName: string;
  totalItems: number;
  completeItems: number;
  incompleteItems: number;
  complianceScore: number;
  summary: {
    epics: { total: number; complete: number };
    features: { total: number; complete: number };
    stories: { total: number; complete: number };
    tasks: { total: number; complete: number };
  };
  items: AzureAuditItem[];
}

export interface Project {
  id: string;
  azureId: string | null;
  isManual?: boolean;
  name: string;
  description: string;
  objective?: string;
  client: string;
  category?: 'new_project' | 'maintenance';
  status: ProjectStatus;
  isVisible: boolean;
  currentMilestone: EapPhase;
  agreedDates: {
    start: string;
    end: string;
  };
  plannedDates: {
    start: string;
    end: string;
  };
  executedDates: DateRange;
  progress: number;
  manualRagStatus?: string;
  ragStatus: RagStatus;
  varianceDays: number;
  executiveSummary: string;
  azureLastUpdated?: string;
  currentIterationName?: string;
  agreedHours?: number;
  hours: ProjectHours;
  priority?: ProjectPriority;
  systems?: string[];
  team?: ProjectTeam;
  activities?: ProjectActivity[];
  monthlyHours?: ProjectMonthlyHours[];
  inconsistencies?: string[];
  lockedFields?: {
    ilcHours: boolean;
    progress: boolean;
    dates: boolean;
  };
  azureOriginal?: any;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  frozen: number;
  onTrack: number;
  warning: number;
  delayed: number;
  lastSync: string;
  milestones: EapPhase[];
  hoursSummary?: {
    totalPlanned: number;
    totalExecuted: number;
    agreedHours?: number;
    clientPlanned?: number;
    clientExecuted?: number;
    ilcPlanned?: number;
    ilcExecuted?: number;
  };
}
