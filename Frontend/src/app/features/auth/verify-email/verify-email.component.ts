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
    <div class="min-h-screen flex flex-col items-center justify-center theme-bg theme-text p-4" style="font-family: 'Inter', sans-serif;">
      <div class="w-full max-w-[350px] border theme-border theme-bg px-5 sm:px-10 pt-10 sm:pt-12 pb-8 flex flex-col items-center" style="border-radius: 12px;">
        
        <h1 class="text-[2.5rem] sm:text-[3rem] theme-text mb-6" style="font-family: 'Grand Hotel', cursive; font-weight: 400;">Flink</h1>
        
        <h2 class="text-[1.15rem] font-semibold theme-text mb-4">Email Verification</h2>
        
        @if (loading) {
          <div class="flex flex-col items-center gap-3 py-5">
            <div class="w-5 h-5 border-2 theme-border border-t-[var(--accent)] rounded-full animate-spin"></div>
            <p class="theme-text-secondary text-[0.88rem]">Verifying your email address...</p>
          </div>
        }
        
        @if (!loading && successMessage) {
          <p class="text-[#58c322] text-[13px] text-center mb-4 font-medium">{{ successMessage }}</p>
        }
        
        @if (!loading && errorMessage) {
          <p class="text-[#ed4956] text-[13px] text-center mb-4 font-medium leading-tight">{{ errorMessage }}</p>
        }
        
        @if (!loading) {
          <a routerLink="/login" class="w-full bg-[#0095f6] text-white font-semibold text-[14px] h-[32px] rounded-lg mt-2 transition-colors hover:bg-[#1877f2] flex items-center justify-center no-underline">Go to Login</a>
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
