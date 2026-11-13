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
      // Check for Microsoft OAuth2 redirect callback (#access_token=... or #error=...)
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        const search = window.location.search || '';

        if (hash.includes('access_token=') || hash.includes('id_token=')) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
          const msToken = hashParams.get('access_token') || '';
          const msIdToken = hashParams.get('id_token') || '';
          if (msToken || msIdToken) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            this.service.loginWithMicrosoft(msToken, msIdToken).then(res => {
              if (!res.success) {
                this.service.ssoErrorMessage.set(res.message || 'Falha ao autenticar com a Microsoft.');
              }
            });
          }
        } else if (hash.includes('error=') || search.includes('error=')) {
          const raw = hash.includes('error=') ? hash.replace(/^#/, '') : search.replace(/^\?/, '');
          const errorParams = new URLSearchParams(raw);
          const errCode = errorParams.get('error') || 'erro_sso';
          const errDesc = errorParams.get('error_description') || errCode;
          window.history.replaceState({}, document.title, window.location.pathname);
          const firstLine = decodeURIComponent(errDesc).split('\r')[0].split('\n')[0];
          console.error('[Microsoft SSO Error]', errCode, firstLine);
          this.service.ssoErrorMessage.set(`Microsoft SSO: ${firstLine}`);
        }
      }

      // Check for custom multi-project selection link (independent of client)
      const customParam = params.get('projects') || params.get('p');
      if (customParam) {
        const ids = customParam.split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length > 0) {
          this.service.setCustomView(ids);
        }
      }

      // Normal Dashboard mode
      const viewParam = params.get('view');
      if (viewParam === 'report' || viewParam === 'maintenance' || viewParam === 'macro' || viewParam === 'cards' || viewParam === 'table' || viewParam === 'eap-gantt' || viewParam === 'team') {
        this.service.activeView.set(viewParam as any);
      }
      const clientParam = params.get('cliente');
      if (clientParam && !customParam) {
        this.service.selectedClient.set(clientParam);
      }
      this.service.loadPublicData();
    }
  }
}
