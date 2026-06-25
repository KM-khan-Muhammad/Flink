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
    <div class="min-h-screen flex flex-col items-center justify-center theme-bg theme-text p-4" style="font-family: 'Inter', sans-serif;">
      <div class="w-full max-w-[350px] flex flex-col gap-2.5">

        <!-- Main Card -->
        <div class="w-full border theme-border theme-bg px-10 pt-12 pb-6 flex flex-col items-center">

          <!-- Logo -->
          <h1 class="text-[3rem] theme-text mb-6" style="font-family: 'Grand Hotel', cursive; font-weight: 400;">Flink</h1>

          <!-- Form -->
          <form (ngSubmit)="onSubmit()" class="w-full flex flex-col gap-[6px]">

            <!-- Email Input -->
            <div class="relative w-full">
              <input type="email" name="email" id="login-email"
                class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                [(ngModel)]="credentials.email" required placeholder=" " autocomplete="email">
              <label for="login-email"
                class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                  peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                  peer-focus:text-[10px] peer-focus:top-[6px]
                  peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                  text-[10px] top-[6px]">
                Phone number, username, or email
              </label>
            </div>

            <!-- Password Input -->
            <div class="relative w-full">
              <input type="password" name="password" id="login-password"
                class="peer w-full theme-bg-elevated border theme-border rounded-[3px] h-[38px] px-2 pt-[14px] pb-[2px] text-[12px] theme-text outline-none focus:border-[#a8a8a8] transition-colors"
                [(ngModel)]="credentials.password" required placeholder=" " autocomplete="current-password">
              <label for="login-password"
                class="absolute left-[9px] theme-text-secondary transition-all duration-100 ease-linear pointer-events-none
                  peer-placeholder-shown:text-[12px] peer-placeholder-shown:top-[11px]
                  peer-focus:text-[10px] peer-focus:top-[6px]
                  peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:top-[6px]
                  text-[10px] top-[6px]">
                Password
              </label>
            </div>

            @if (errorMessage) {
              <p class="text-[#ed4956] text-[13px] text-center mt-2 leading-tight">{{ errorMessage }}</p>
            }

            <!-- Login Button -->
            <button type="submit"
              class="w-full bg-[#0095f6] text-white font-semibold text-[14px] h-[32px] rounded-lg mt-2 transition-colors hover:bg-[#1877f2] disabled:bg-[#0095f6]/30 disabled:cursor-default flex items-center justify-center"
              [disabled]="loading || !credentials.email || !credentials.password">
              @if (loading) {
                <div class="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              } @else {
                Log in
              }
            </button>
          </form>

          <!-- OR divider -->
          <div class="flex items-center w-full gap-[18px] my-5">
            <div class="h-[1px] theme-border flex-1"></div>
            <span class="theme-text-secondary text-[13px] font-semibold uppercase tracking-wide">or</span>
            <div class="h-[1px] theme-border flex-1"></div>
          </div>

          <!-- Forgot Password -->
          <a href="#" class="text-[12px] text-[#e0f1ff] hover:opacity-80 transition-colors">Forgot password?</a>
        </div>

        <!-- Sign up Card -->
        <div class="w-full border theme-border theme-bg py-[25px] flex justify-center items-center gap-[5px] text-[14px]">
          <span class="theme-text">Don't have an account?</span>
          <a routerLink="/register" class="text-[#0095f6] font-semibold hover:opacity-80 transition-colors cursor-pointer">Sign up</a>
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
export class LoginComponent {
  credentials = { email: '', password: '' };
  errorMessage = '';
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, this.credentials).subscribe({
      next: (response: AuthResponse) => {
        this.loading = false;
        if (response.success && response.token) {
          localStorage.setItem('token', response.token);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (err: { error: AuthResponse }) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
