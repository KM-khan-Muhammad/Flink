import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AuthResponse {
  token?: string;
  message: string;
  success: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <section class="auth-shell auth-shell-login">
        <aside class="auth-visual">
          <div class="auth-dot-grid"></div>
          <div class="auth-avatar avatar-one"><span>KM</span></div>
          <div class="auth-avatar avatar-two"><span>SA</span></div>
          <div class="auth-avatar avatar-three"><span>AR</span></div>
          <div class="auth-avatar avatar-four"><span>MH</span></div>
          <div class="auth-mini-icon icon-video"><i class="fa-solid fa-video"></i></div>
          <div class="auth-mini-icon icon-mic"><i class="fa-solid fa-microphone"></i></div>
          <div class="auth-mini-icon icon-call"><i class="fa-solid fa-phone"></i></div>
          <div class="auth-mini-icon icon-more"><i class="fa-solid fa-ellipsis"></i></div>
          <div class="auth-chat-mark"><span></span><span></span><span></span></div>
          <div class="auth-brand">
            <h1>Flink</h1>
            <strong>Connect. Chat. Share.</strong>
            <p>Stay in touch with friends and family anytime, anywhere.</p>
            <div class="auth-dots"><span></span><span></span><span></span></div>
          </div>
        </aside>

        <main class="auth-form-panel">
          <div class="auth-form-header">
            <h2>Welcome back</h2>
            <p>Log in to continue your conversations.</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="auth-form">
            <div class="auth-field">
              <i class="fa-regular fa-user"></i>
              <input type="text" name="email" id="login-email" [(ngModel)]="credentials.email" required placeholder="Phone number, username, or email" autocomplete="email">
            </div>

            <div class="auth-field">
              <i class="fa-solid fa-lock"></i>
              <input type="password" name="password" id="login-password" [(ngModel)]="credentials.password" required placeholder="Password" autocomplete="current-password">
            </div>

            @if (errorMessage) {
              <p class="auth-message error">{{ errorMessage }}</p>
            }

            @if (showEmailVerification) {
              <div class="auth-verify-box">
                <p>Verify this email here, then login will continue automatically.</p>
                @if (!emailOtpSent) {
                  <button type="button" class="auth-secondary" (click)="sendLoginEmailOtp()" [disabled]="loading || !credentials.email">
                    Send verification OTP
                  </button>
                } @else {
                  <div class="auth-inline">
                    <div class="auth-field">
                      <i class="fa-solid fa-key"></i>
                      <input type="text" name="loginEmailOtp" [(ngModel)]="emailOtp" maxlength="6" inputmode="numeric" placeholder="OTP code">
                    </div>
                    <button type="button" class="auth-secondary compact filled" (click)="verifyLoginEmailOtp()" [disabled]="loading || !emailOtp">
                      Verify
                    </button>
                  </div>
                }
              </div>
            }

            <button type="submit" class="auth-primary" [disabled]="loading || !credentials.email || !credentials.password">
              @if (loading) {
                <div class="auth-spinner"></div>
              } @else {
                <span>Log in</span>
                <i class="fa-solid fa-arrow-right"></i>
              }
            </button>
          </form>

          <a href="#" class="auth-forgot">Forgot password?</a>

          <div class="auth-footer">
            <span>Don't have an account?</span>
            <a routerLink="/register">Sign up</a>
          </div>
        </main>
      </section>
    </div>
  `
})
export class LoginComponent {
  credentials = { email: '', password: '' };
  errorMessage = '';
  showEmailVerification = false;
  emailOtpSent = false;
  emailOtp = '';
  loading = false;
  environment = environment;

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    const loginPayload = {
      ...this.credentials,
      email: this.credentials.email.trim()
    };

    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, loginPayload).subscribe({
      next: (response: AuthResponse) => {
        this.loading = false;
        if (response.success && response.token) {
          localStorage.setItem('token', response.token);
          this.router.navigate(['/dashboard']);
        } else {
          this.handleLoginFailure(response.message);
        }
      },
      error: (err: { error: AuthResponse }) => {
        this.loading = false;
        this.handleLoginFailure(err.error?.message || 'Login failed. Please check your credentials.');
      }
    });
  }

  sendLoginEmailOtp() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/send-otp`, { target: this.credentials.email.trim() }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.emailOtpSent = true;
          this.errorMessage = '';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err: { error: AuthResponse }) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to send verification OTP.';
      }
    });
  }

  verifyLoginEmailOtp() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/verify-otp`, {
      target: this.credentials.email.trim(),
      otp: this.emailOtp.trim()
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.showEmailVerification = false;
          this.emailOtpSent = false;
          this.emailOtp = '';
          this.onSubmit();
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err: { error: AuthResponse }) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid verification OTP.';
      }
    });
  }

  private handleLoginFailure(message: string) {
    this.errorMessage = message;
    this.showEmailVerification = message.toLowerCase().includes('verify your email');
    if (!this.showEmailVerification) {
      this.emailOtpSent = false;
      this.emailOtp = '';
    }
  }
}
