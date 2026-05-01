import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loading = false;
  error = '';
  success = '';

  form = {
    email: '',
    password: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.success = 'Registration successful. Please login.';

        // Strip ?registered=true from the URL so a page refresh doesn't re-show the message
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });

        setTimeout(() => {
          this.success = '';
          this.cdr.detectChanges();
        }, 4000);
      }
    });
  }

  login() {
    this.error = '';
    this.success = '';

    if (!this.form.email || !this.form.password) {
      this.error = 'Please enter your email and password';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.http.post<any>('http://localhost:5000/auth/login', this.form).subscribe({
      next: (res: any) => {
        const token = res.token || res.access_token || res.data?.token;
        const user = res.user || res.data?.user || res.data || {};

        if (token) {
          // Save under both keys — the interceptor reads 'token', other parts read 'access_token'
          localStorage.setItem('token', token);
          localStorage.setItem('access_token', token);
        }

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('currentUser', JSON.stringify(user));

        if (this.auth.currentUser$) {
          this.auth.currentUser$.next(user);
        }

        this.loading = false;
        this.cdr.detectChanges();

        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.error = err.error?.error || err.error?.message || 'Login failed. Please check your details.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}