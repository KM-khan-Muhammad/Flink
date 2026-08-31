import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AuthResponse {
  token?: string;
  message: string;
  success: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    @if (showToast) {
      <div class="auth-toast">
        <i class="fa-solid fa-circle-check"></i>
        <span>Registration successful! Redirecting...</span>
      </div>
    }

    <div class="auth-page">
      <section class="auth-shell auth-shell-register">
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
          <div class="auth-chat-mark">
            <span></span><span></span><span></span>
          </div>
          <div class="auth-brand">
            <h1>Flink</h1>
            <strong>Connect. Chat. Share.</strong>
            <p>Stay in touch with friends and family anytime, anywhere.</p>
            <div class="auth-dots"><span></span><span></span><span></span></div>
          </div>
        </aside>

        <main class="auth-form-panel">
          <div class="auth-form-header">
            <h2>Create your account</h2>
            <p>Sign up to see photos and videos from your friends.</p>
          </div>

          <div class="auth-stepper">
            <div class="auth-step" [class.active]="currentStep >= 1">
              <span>1</span>
              <small>Profile</small>
            </div>
            <div class="auth-step-line" [class.active]="currentStep >= 2"></div>
            <div class="auth-step" [class.active]="currentStep >= 2">
              <span>2</span>
              <small>Verify</small>
            </div>
            <div class="auth-step-line" [class.active]="currentStep >= 3"></div>
            <div class="auth-step" [class.active]="currentStep >= 3">
              <span>3</span>
              <small>Complete</small>
            </div>
          </div>

          @if (successMessage) {
            <p class="auth-message success">{{ successMessage }}</p>
          }
          @if (errorMessage) {
            <p class="auth-message error">{{ errorMessage }}</p>
          }

          <form (ngSubmit)="currentStep === 3 ? onSubmit() : nextStep()" class="auth-form">
            @if (currentStep === 1) {
              <div class="auth-step-body">
                <div class="auth-field">
                  <i class="fa-regular fa-user"></i>
                  <input type="text" name="firstName" id="reg-fn" [(ngModel)]="user.firstName" required placeholder="First Name">
                </div>
                <div class="auth-field">
                  <i class="fa-regular fa-user"></i>
                  <input type="text" name="lastName" id="reg-ln" [(ngModel)]="user.lastName" required placeholder="Last Name">
                </div>
                <div class="auth-field">
                  <i class="fa-regular fa-calendar"></i>
                  <input type="date" name="dateOfBirth" [(ngModel)]="user.dateOfBirth" required>
                </div>
                <button type="submit" class="auth-primary" [disabled]="!user.firstName || !user.lastName || !user.dateOfBirth">
                  <span>Next</span>
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            }

            @if (currentStep === 2) {
              <div class="auth-step-body">
                <div class="auth-inline">
                  <div class="auth-field">
                    <i class="fa-regular fa-envelope"></i>
                    <input type="email" name="email" id="reg-email" [(ngModel)]="user.email" (input)="onEmailChange()" required placeholder="Email address" [disabled]="emailOtpVerified">
                  </div>
                  <button type="button" class="auth-secondary compact" (click)="sendEmailOtp()" [disabled]="!user.email || emailOtpVerified || loading">
                    {{ emailOtpSent ? 'Resend' : 'Send OTP' }}
                  </button>
                </div>

                @if (emailOtpSent && !emailOtpVerified) {
                  <div class="auth-inline">
                    <div class="auth-field">
                      <i class="fa-solid fa-key"></i>
                      <input type="text" name="emailOtp" id="reg-email-otp" [(ngModel)]="emailOtp" placeholder="Confirmation code">
                    </div>
                    <button type="button" class="auth-secondary compact filled" (click)="verifyEmailOtp()" [disabled]="!emailOtp || loading">
                      Verify
                    </button>
                  </div>
                }

                <div class="auth-field">
                  <i class="fa-solid fa-lock"></i>
                  <input type="password" name="password" id="reg-pwd" [(ngModel)]="user.password" required placeholder="Password">
                </div>

                <div class="auth-actions">
                  <button type="button" class="auth-secondary" (click)="prevStep()">Back</button>
                  <button type="submit" class="auth-primary" [disabled]="!user.email || !user.password || !emailOtpVerified">
                    <span>Next</span>
                    <i class="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            }

            @if (currentStep === 3) {
              <div class="auth-step-body">
                <div class="auth-inline">
                  <div class="auth-field">
                    <i class="fa-brands fa-whatsapp"></i>
                    <input type="tel" name="whatsappNumber" id="reg-wa" [(ngModel)]="user.whatsappNumber" (input)="onWhatsappChange()" placeholder="WhatsApp number (optional)" [disabled]="whatsappOtpVerified">
                  </div>
                  <button type="button" class="auth-secondary compact" (click)="sendWhatsappOtp()" [disabled]="!user.whatsappNumber || whatsappOtpVerified || loading">
                    {{ whatsappOtpSent ? 'Resend' : 'Send OTP' }}
                  </button>
                </div>

                @if (whatsappOtpSent && !whatsappOtpVerified) {
                  <div class="auth-inline">
                    <div class="auth-field">
                      <i class="fa-solid fa-key"></i>
                      <input type="text" name="whatsappOtp" id="reg-wa-otp" [(ngModel)]="whatsappOtp" placeholder="Confirmation code">
                    </div>
                    <button type="button" class="auth-secondary compact filled" (click)="verifyWhatsappOtp()" [disabled]="!whatsappOtp || loading">
                      Verify
                    </button>
                  </div>
                }

                <p class="auth-terms">
                  By signing up, you agree to our <span>Terms</span>, <span>Privacy Policy</span> and <span>Cookies Policy</span>.
                </p>

                <button type="submit" class="auth-primary" [disabled]="loading || (!!user.whatsappNumber && !whatsappOtpVerified)">
                  @if (loading) {
                    <div class="auth-spinner"></div>
                  } @else {
                    <span>Sign up</span>
                    <i class="fa-solid fa-arrow-right"></i>
                  }
                </button>
                <div class="auth-actions">
                  <button type="button" class="auth-secondary" (click)="prevStep()">Back</button>
                  <button type="button" class="auth-link-button" (click)="skipStep3()">Skip</button>
                </div>
              </div>
            }
          </form>

          <div class="auth-footer">
            <span>Have an account?</span>
            <a routerLink="/login">Log in</a>
          </div>
        </main>
      </section>
    </div>
  `
})
export class RegisterComponent {
  currentStep = 1;

  user = { 
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    username: '', 
    email: '', 
    password: '',
    whatsappNumber: ''
  };

  emailOtp = '';
  whatsappOtp = '';

  emailOtpSent = false;
  emailOtpVerified = false;
  whatsappOtpSent = false;
  whatsappOtpVerified = false;

  errorMessage = '';
  successMessage = '';
  loading = false;
  showToast = false;

  constructor(private http: HttpClient, private router: Router) {}

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
      this.errorMessage = '';
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
    }
  }

  skipStep3() {
    this.user.whatsappNumber = '';
    this.whatsappOtpVerified = false;
    this.onSubmit();
  }

  onEmailChange() {
    this.emailOtpSent = false;
    this.emailOtpVerified = false;
    this.emailOtp = '';
  }

  onWhatsappChange() {
    this.whatsappOtpSent = false;
    this.whatsappOtpVerified = false;
    this.whatsappOtp = '';
  }

  sendEmailOtp() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/send-otp`, { target: this.user.email }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.emailOtpSent = true;
          alert('OTP sent to your email successfully!');
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP.';
      }
    });
  }

  verifyEmailOtp() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/verify-otp`, { target: this.user.email, otp: this.emailOtp }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.emailOtpVerified = true;
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid OTP.';
      }
    });
  }

  sendWhatsappOtp() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/send-otp`, { target: this.user.whatsappNumber }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.whatsappOtpSent = true;
          alert(response.message || 'OTP sent.');
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP.';
      }
    });
  }

  verifyWhatsappOtp() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/verify-otp`, { target: this.user.whatsappNumber, otp: this.whatsappOtp }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.whatsappOtpVerified = true;
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid OTP.';
      }
    });
  }

  onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, this.user).subscribe({
      next: (response: AuthResponse) => {
        this.loading = false;
        if (response.success) {
          this.successMessage = response.message;
          this.errorMessage = '';
          this.showToast = true;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2500);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err: { error: AuthResponse }) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Registration failed.';
      }
    });
  }
}
