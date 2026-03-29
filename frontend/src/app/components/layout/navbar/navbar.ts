import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class NavbarComponent {
  user: any = null;

  constructor(private auth: AuthService) {
    this.auth.currentUser$.subscribe((u: any) => this.user = u);
  }

  logout() { this.auth.logout(); }
  isAdmin() { return this.auth.isAdmin(); }
}