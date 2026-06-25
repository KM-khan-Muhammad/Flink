import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card glass-panel" style="text-align: center;">
        <div class="logo-container">
          <img src="assets/logo.svg" alt="FLINK" class="app-logo">
          <div style="margin-top: 4px;">
            <h1 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">FLINK</h1>
          </div>
        </div>
        
        <h2 style="margin-top: 0.5rem; font-size: 1.15rem; font-weight: 600;">Email Verification</h2>
        
        @if (loading) {
          <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 0;">
            <div class="typing-indicator" style="padding: 0;"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">Verifying your email address...</p>
          </div>
        }
        
        @if (!loading && successMessage) {
          <div class="success-message" style="font-size: 0.92rem; margin-bottom: 1rem;">{{ successMessage }}</div>
        }
        
        @if (!loading && errorMessage) {
          <div class="error-message" style="font-size: 0.92rem; margin-bottom: 1rem;">{{ errorMessage }}</div>
        }
        
        @if (!loading) {
          <a routerLink="/login" class="btn-primary" style="display: inline-block; padding: 0.85rem 2rem; text-decoration: none; margin-top: 0.5rem;">Go to Login</a>
        }
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  loading = true;
  successMessage = '';
  errorMessage = '';

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.http.get(`${environment.apiUrl}/auth/verify-email?token=${token}`, { responseType: 'text' }).subscribe({
          next: (msg: string) => {
            this.successMessage = msg;
            this.loading = false;
          },
          error: (err: { error: string }) => {
            this.errorMessage = err.error || 'Verification failed. The link might be invalid or expired.';
            this.loading = false;
          }
        });
      } else {
        this.errorMessage = 'No verification token provided.';
        this.loading = false;
      }
    });
  }
}
