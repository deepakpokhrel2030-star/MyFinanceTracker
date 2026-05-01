import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  user: any = null;

  navItems = [
    { path: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
    { path: '/accounts', icon: 'bi-bank', label: 'Accounts' },
    { path: '/transactions', icon: 'bi-arrow-left-right', label: 'Transactions' },
    { path: '/budgets', icon: 'bi-pie-chart', label: 'Budgets' },
    { path: '/investments', icon: 'bi-graph-up-arrow', label: 'Investments' },
    { path: '/savings', icon: 'bi-piggy-bank', label: 'Savings' },
    { path: '/analytics', icon: 'bi-bar-chart-line', label: 'Analytics' }
  ];

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.auth.currentUser$.subscribe((u: any) => {
      this.user = u;
    });
  }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  isAdmin() {
    return this.auth.isAdmin();
  }

  logout() {
    this.auth.logout();
  }
}