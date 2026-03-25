import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login',        loadComponent: () => import('./components/auth/login/login').then(m => m.LoginComponent) },
  { path: 'register',     loadComponent: () => import('./components/auth/register/register').then(m => m.RegisterComponent) },
  { path: 'dashboard',    canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
  { path: 'accounts',     canActivate: [authGuard], loadComponent: () => import('./components/accounts/accounts').then(m => m.AccountsComponent) },
  { path: 'transactions', canActivate: [authGuard], loadComponent: () => import('./components/transactions/transactions').then(m => m.TransactionsComponent) },
  { path: 'budgets',      canActivate: [authGuard], loadComponent: () => import('./components/budgets/budgets').then(m => m.BudgetsComponent) },
  { path: 'investments',  canActivate: [authGuard], loadComponent: () => import('./components/investments/investments').then(m => m.InvestmentsComponent) },
  { path: 'savings',      canActivate: [authGuard], loadComponent: () => import('./components/savings/savings').then(m => m.SavingsComponent) },
  { path: 'profile',      canActivate: [authGuard], loadComponent: () => import('./components/profile/profile').then(m => m.ProfileComponent) },
  { path: 'admin',        canActivate: [authGuard, adminGuard], loadComponent: () => import('./components/admin/admin').then(m => m.AdminComponent) },
  { path: '**', redirectTo: 'dashboard' }
];