import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth';
import { NavbarComponent } from './components/layout/navbar/navbar';
import { FooterComponent } from './components/layout/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent, FooterComponent],
  template: `
    <div class="d-flex flex-column min-vh-100">
      <app-navbar *ngIf="loggedIn"></app-navbar>
      <main class="flex-grow-1">
        <router-outlet />
      </main>
      <app-footer *ngIf="loggedIn"></app-footer>
    </div>
  `
})
export class App implements OnInit {
  loggedIn = false;

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.loggedIn = this.auth.isLoggedIn();
    this.auth.currentUser$.subscribe((user: any) => {
      this.loggedIn = !!user;
    });
  }
} 