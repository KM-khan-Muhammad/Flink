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
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#262626] theme-text px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-3" style="animation: msgIn 0.3s ease;">
        <i class="fa-solid fa-circle-check text-green-500 text-[1.1rem]"></i>
        <span class="text-[14px] font-semibold">Registration successful! Redirecting...</span>
      </div>
    }

    <div class="min-h-screen flex flex-col items-center justify-center theme-bg theme-text p-4" style="font-family: 'Inter', sans-serif;">
      <div class="w-full max-w-[350px] flex flex-col gap-2.5">

        <!-- Main Card -->
        <div class="w-full border theme-border theme-bg px-10 pt-10 pb-6 flex flex-col items-center">

          <!-- Logo -->
          <h1 class="text-[3rem] theme-text mb-2" style="font-family: 'Grand Hotel', cursive; font-weight: 400;">Flink</h1>
          <p class="theme-text-secondary text-[17px] font-semibold text-center leading-tight mb-4">Sign up to see photos and videos from your friends.</p>

          <!-- Stepper -->
          <div class="flex items-center gap-[6px] mb-5 w-full">
            <div class="h-[3px] flex-1 rounded-full transition-all duration-300" [ngClass]="currentStep >= 1 ? 'bg-[#0095f6]' : 'theme-border'"></div>
            <div class="h-[3px] flex-1 rounded-full transition-all duration-300" [ngClass]="currentStep >= 2 ? 'bg-[#0095f6]' : 'theme-border'"></div>
            <div class="h-[3px] flex-1 rounded-full transition-all duration-300" [ngClass]="currentStep >= 3 ? 'bg-[#0095f6]' : 'theme-border'"></div>
          </div>

          @if (successMessage) {
            <p class="text-[#58c322] text-[13px] text-center mb-3 font-medium">{{ successMessage }}</p>
          }
          @if (errorMessage) {
            <p class="text-[#ed4956] text-[13px] text-center mb-3 font-medium leading-tight">{{ errorMessage }}</p>
          }

          <form (ngSubmit)="currentStep === 3 ? onSubmit() : nextStep()" class="w-full flex flex-col gap-[6px]">

            <!-- Step 1: Basic Info -->
            @if (currentStep === 1) {
              <div class="flex flex-col gap-[6px] w-full" style="animation: msgIn 0.3s ease;">
                <div class="relative w-full">
                  <input type="text" name="firstName" id="reg-fn"
                    class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                    [(ngModel)]="user.firstName" required placeholder=" ">
                  <label for="reg-fn"
                    class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                      peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                      peer-focus:text-[10px] peer-focus:top-[6px]
                      peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                      text-[10px] top-[6px]">
                    First Name
                  </label>
                </div>
                <div class="relative w-full">
                  <input type="text" name="lastName" id="reg-ln"
                    class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                    [(ngModel)]="user.lastName" required placeholder=" ">
                  <label for="reg-ln"
                    class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                      peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                      peer-focus:text-[10px] peer-focus:top-[6px]
                      peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                      text-[10px] top-[6px]">
                    Last Name
                  </label>
                </div>
                <div class="relative w-full">
                  <span class="absolute left-[9px] top-[5px] text-[10px] theme-text-secondary pointer-events-none">Date of Birth</span>
                  <input type="date" name="dateOfBirth"
                    class="w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                    [(ngModel)]="user.dateOfBirth" required>
                </div>
                <button type="submit"
                  class="w-full bg-[#0095f6] text-white font-semibold text-[14px] h-[32px] rounded-lg mt-2 transition-colors hover:bg-[#1877f2] disabled:bg-[#0095f6]/30 disabled:cursor-default flex items-center justify-center"
                  [disabled]="!user.firstName || !user.lastName || !user.dateOfBirth">
                  Next
                </button>
              </div>
            }

            <!-- Step 2: Email & Password -->
            @if (currentStep === 2) {
              <div class="flex flex-col gap-[6px] w-full" style="animation: msgIn 0.3s ease;">
                <div class="flex gap-[6px]">
                  <div class="relative flex-1">
                    <input type="email" name="email" id="reg-email"
                      class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                      [(ngModel)]="user.email" (input)="onEmailChange()" required placeholder=" " [disabled]="emailOtpVerified">
                    <label for="reg-email"
                      class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                        peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                        peer-focus:text-[10px] peer-focus:top-[6px]
                        peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                        text-[10px] top-[6px]">
                      Email address
                    </label>
                  </div>
                  <button type="button"
                    class="h-[38px] px-3 bg-transparent border theme-border rounded-[3px] text-[#0095f6] font-semibold text-[13px] transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
                    (click)="sendEmailOtp()" [disabled]="!user.email || emailOtpVerified || loading">
                    {{ emailOtpSent ? 'Resend' : 'Send OTP' }}
                  </button>
                </div>

                @if (emailOtpSent && !emailOtpVerified) {
                  <div class="flex gap-[6px]">
                    <div class="relative flex-1">
                      <input type="text" name="emailOtp" id="reg-email-otp"
                        class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                        [(ngModel)]="emailOtp" placeholder=" ">
                      <label for="reg-email-otp"
                        class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                          peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                          peer-focus:text-[10px] peer-focus:top-[6px]
                          peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                          text-[10px] top-[6px]">
                        Confirmation code
                      </label>
                    </div>
                    <button type="button"
                      class="h-[38px] px-3 bg-[#0095f6] rounded-[3px] theme-text font-semibold text-[13px] transition-colors hover:bg-[#1877f2] disabled:opacity-40"
                      (click)="verifyEmailOtp()" [disabled]="!emailOtp || loading">
                      Verify
                    </button>
                  </div>
                }

                <div class="relative w-full">
                  <input type="password" name="password" id="reg-pwd"
                    class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                    [(ngModel)]="user.password" required placeholder=" ">
                  <label for="reg-pwd"
                    class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                      peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                      peer-focus:text-[10px] peer-focus:top-[6px]
                      peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                      text-[10px] top-[6px]">
                    Password
                  </label>
                </div>

                <div class="flex gap-[6px] mt-2">
                  <button type="button"
                    class="flex-1 h-[32px] border theme-border theme-text font-semibold text-[14px] rounded-lg transition-colors hover:theme-bg-elevated"
                    (click)="prevStep()">Back</button>
                  <button type="submit"
                    class="flex-[2] h-[32px] bg-[#0095f6] text-white font-semibold text-[14px] rounded-lg transition-colors hover:bg-[#1877f2] disabled:bg-[#0095f6]/30 disabled:cursor-default"
                    [disabled]="!user.email || !user.password || !emailOtpVerified">
                    Next
                  </button>
                </div>
              </div>
            }

            <!-- Step 3: WhatsApp & Final Submit -->
            @if (currentStep === 3) {
              <div class="flex flex-col gap-[6px] w-full" style="animation: msgIn 0.3s ease;">
                <div class="flex gap-[6px]">
                  <div class="relative flex-1">
                    <input type="tel" name="whatsappNumber" id="reg-wa"
                      class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                      [(ngModel)]="user.whatsappNumber" (input)="onWhatsappChange()" placeholder=" " [disabled]="whatsappOtpVerified">
                    <label for="reg-wa"
                      class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                        peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                        peer-focus:text-[10px] peer-focus:top-[6px]
                        peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                        text-[10px] top-[6px]">
                      WhatsApp number (optional)
                    </label>
                  </div>
                  <button type="button"
                    class="h-[38px] px-3 bg-transparent border theme-border rounded-[3px] text-[#0095f6] font-semibold text-[13px] transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
                    (click)="sendWhatsappOtp()" [disabled]="!user.whatsappNumber || whatsappOtpVerified || loading">
                    {{ whatsappOtpSent ? 'Resend' : 'Send OTP' }}
                  </button>
                </div>

                @if (whatsappOtpSent && !whatsappOtpVerified) {
                  <div class="flex gap-[6px]">
                    <div class="relative flex-1">
                      <input type="text" name="whatsappOtp" id="reg-wa-otp"
                        class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                        [(ngModel)]="whatsappOtp" placeholder=" ">
                      <label for="reg-wa-otp"
                        class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                          peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                          peer-focus:text-[10px] peer-focus:top-[6px]
                          peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                          text-[10px] top-[6px]">
                        Confirmation code
                      </label>
                    </div>
                    <button type="button"
                      class="h-[38px] px-3 bg-[#0095f6] rounded-[3px] theme-text font-semibold text-[13px] transition-colors hover:bg-[#1877f2] disabled:opacity-40"
                      (click)="verifyWhatsappOtp()" [disabled]="!whatsappOtp || loading">
                      Verify
                    </button>
                  </div>
                }

                <p class="theme-text-secondary text-[12px] text-center mt-3 leading-relaxed">
                  By signing up, you agree to our <span class="text-[#e0f1ff]">Terms</span>, <span class="text-[#e0f1ff]">Privacy Policy</span> and <span class="text-[#e0f1ff]">Cookies Policy</span>.
                </p>

                <button type="submit"
                  class="w-full bg-[#0095f6] text-white font-semibold text-[14px] h-[32px] rounded-lg mt-2 transition-colors hover:bg-[#1877f2] disabled:bg-[#0095f6]/30 disabled:cursor-default flex items-center justify-center"
                  [disabled]="loading || !whatsappOtpVerified">
                  @if (loading) {
                    <div class="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  } @else {
                    Sign up
                  }
                </button>
                <div class="flex gap-[6px] mt-1">
                  <button type="button"
                    class="flex-1 h-[32px] border theme-border theme-text font-semibold text-[14px] rounded-lg transition-colors hover:theme-bg-elevated"
                    (click)="prevStep()">Back</button>
                  <button type="button"
                    class="flex-1 h-[32px] theme-text-secondary font-semibold text-[14px] rounded-lg transition-colors hover:opacity-80"
                    (click)="skipStep3()">Skip</button>
                </div>
              </div>
            }
          </form>
        </div>

        <!-- Log in Card -->
        <div class="w-full border theme-border theme-bg py-[25px] flex justify-center items-center gap-[5px] text-[14px]">
          <span class="theme-text">Have an account?</span>
          <a routerLink="/login" class="text-[#0095f6] font-semibold hover:opacity-80 transition-colors cursor-pointer">Log in</a>
        </div>

        <!-- Get the app -->
        <div class="w-full flex flex-col items-center mt-2 gap-4">
          <span class="text-[14px] theme-text">Get the app.</span>
          <div class="flex gap-2 justify-center">
            <div class="h-[40px] px-4 theme-bg border theme-border rounded-[5px] flex items-center justify-center cursor-pointer hover:theme-bg-elevated transition-colors gap-2">
              <i class="fa-brands fa-apple text-[1.2rem] theme-text"></i>
              <span class="text-[13px] font-medium theme-text">App Store</span>
            </div>
            <div class="h-[40px] px-4 theme-bg border theme-border rounded-[5px] flex items-center justify-center cursor-pointer hover:theme-bg-elevated transition-colors gap-2">
              <i class="fa-brands fa-google-play text-[1.1rem] theme-text"></i>
              <span class="text-[13px] font-medium theme-text">Google Play</span>
            </div>
          </div>
        </div>
      </div>
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
          alert('OTP sent to WhatsApp! (Check backend console)');
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
