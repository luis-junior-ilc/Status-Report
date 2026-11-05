import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from './services/project.service';
import { HeaderComponent } from './components/header/header.component';
import { KpiSummaryComponent } from './components/kpi-summary/kpi-summary.component';
import { FiltersComponent } from './components/filters/filters.component';
import { PortfolioMacroComponent } from './components/portfolio-macro/portfolio-macro.component';
import { EapGanttComponent } from './components/eap-gantt/eap-gantt.component';
import { ProjectCardsComponent } from './components/project-cards/project-cards.component';
import { ProjectTableComponent } from './components/project-table/project-table.component';
import { CuratorModalComponent } from './components/curator-modal/curator-modal.component';
import { ExecutiveReportComponent } from './components/executive-report/executive-report.component';
import { MaintenanceDashboardComponent } from './components/maintenance-dashboard/maintenance-dashboard.component';
import { TeamAllocationComponent } from './components/team-allocation/team-allocation.component';
import { LoginCardComponent } from './components/login-card/login-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    KpiSummaryComponent,
    FiltersComponent,
    PortfolioMacroComponent,
    EapGanttComponent,
    ProjectCardsComponent,
    ProjectTableComponent,
    CuratorModalComponent,
    ExecutiveReportComponent,
    MaintenanceDashboardComponent,
    TeamAllocationComponent,
    LoginCardComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  service = inject(ProjectService);

  ngOnInit() {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    let clientSlug: string | null = null;
    if (pathname.includes('/cliente/')) {
      const parts = pathname.split('/cliente/')[1].split('/');
      clientSlug = parts[0]?.trim() || null;
    } else if (params.get('cliente')) {
      clientSlug = params.get('cliente')!.trim();
    }

    if (clientSlug && token) {
      // Enter Client Portal mode with token validation
      this.service.loadClientPortal(clientSlug, token);
    } else {
      // Check for custom multi-project selection link (independent of client)
      const customParam = params.get('projects') || params.get('p');
      if (customParam) {
        const ids = customParam.split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length > 0) {
          this.service.setCustomView(ids);
        }
      }

      // Normal Dashboard mode
      const clientParam = params.get('cliente');
      if (clientParam && !customParam) {
        this.service.selectedClient.set(clientParam);
      }
      this.service.loadPublicData();
    }
  }
}
