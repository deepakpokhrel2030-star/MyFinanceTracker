import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from './services/auth';
import { SidebarComponent } from './components/layout/sidebar/sidebar';
import { FooterComponent } from './components/layout/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, FooterComponent],
  template: `
    <!-- Authenticated users get the sidebar layout; login/register use the bare publicLayout -->
    <div
      class="app-layout"
      [class.sidebar-collapsed]="sidebarCollapsed"
      *ngIf="loggedIn; else publicLayout">

      <app-sidebar
        [collapsed]="sidebarCollapsed"
        (collapsedChange)="setSidebarCollapsed($event)">
      </app-sidebar>

      <div class="main-content">
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>

        <app-footer></app-footer>
      </div>
    </div>

    <ng-template #publicLayout>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      background: #eef4ff;
    }

    .main-content {
      min-height: 100vh;
      margin-left: 260px;
      display: flex;
      flex-direction: column;
      min-width: 0;
      transition: margin-left 0.3s ease;
      background:
        radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 32%),
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.12), transparent 28%),
        #eef4ff;
    }

    .app-layout.sidebar-collapsed .main-content {
      margin-left: 72px;
    }

    .content-area {
      flex: 1;
      min-width: 0;
      padding: 28px;
    }

    @media (max-width: 768px) {
      .main-content {
        margin-left: 72px;
      }

      .content-area {
        padding: 18px;
      }
    }
  `]
})
export class App implements OnInit {
  loggedIn = false;
  sidebarCollapsed = false;

  constructor(private auth: AuthService) {}

  ngOnInit() {
    // Restore sidebar state from localStorage so it persists across page reloads
    this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    this.loggedIn = this.auth.isLoggedIn();

    this.auth.currentUser$.subscribe((user: any) => {
      this.loggedIn = !!user;
      this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    });
  }

  setSidebarCollapsed(value: boolean) {
    this.sidebarCollapsed = value;
    localStorage.setItem('sidebarCollapsed', String(value));
  }
}