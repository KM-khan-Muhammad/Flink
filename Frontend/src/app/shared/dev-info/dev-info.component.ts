import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dev-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner()) {
      <div class="dev-info-banner" (click)="$event.stopPropagation()">
        <div class="dev-info-header">
          <div class="dev-info-title">
            <span class="dev-badge">DEV</span>
            <span>LAN Testing URLs</span>
          </div>
          <button class="dev-info-close" (click)="showBanner.set(false)" title="Dismiss">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="dev-info-content">
          <!-- URLs -->
          <div class="dev-url-group">
            <div class="dev-url-item">
              <div class="dev-url-label">
                <i class="fa-solid fa-desktop"></i>
                <span>Frontend (Local)</span>
              </div>
              <div class="dev-url-row">
                <code class="dev-url-text">{{ frontendLocal }}</code>
                <button class="dev-btn-sm" (click)="copyUrl(frontendLocal)" title="Copy">
                  <i class="fa-solid fa-copy"></i>
                </button>
              </div>
            </div>

            <div class="dev-url-item">
              <div class="dev-url-label">
                <i class="fa-solid fa-mobile-screen"></i>
                <span>Frontend (Mobile)</span>
              </div>
              <div class="dev-url-row">
                <code class="dev-url-text highlight">{{ frontendLan }}</code>
                <button class="dev-btn-sm" (click)="copyUrl(frontendLan)" title="Copy">
                  <i class="fa-solid fa-copy"></i>
                </button>
              </div>
            </div>

            <div class="dev-url-item">
              <div class="dev-url-label">
                <i class="fa-solid fa-server"></i>
                <span>Backend API (Local)</span>
              </div>
              <div class="dev-url-row">
                <code class="dev-url-text">{{ backendLocal }}</code>
                <button class="dev-btn-sm" (click)="copyUrl(backendLocal)" title="Copy">
                  <i class="fa-solid fa-copy"></i>
                </button>
              </div>
            </div>

            <div class="dev-url-item">
              <div class="dev-url-label">
                <i class="fa-solid fa-tower-broadcast"></i>
                <span>Backend API (LAN)</span>
              </div>
              <div class="dev-url-row">
                <code class="dev-url-text">{{ backendLan }}</code>
                <button class="dev-btn-sm" (click)="copyUrl(backendLan)" title="Copy">
                  <i class="fa-solid fa-copy"></i>
                </button>
              </div>
            </div>

            <div class="dev-url-item">
              <div class="dev-url-label">
                <i class="fa-solid fa-link"></i>
                <span>SignalR Hub</span>
              </div>
              <div class="dev-url-row">
                <code class="dev-url-text">{{ signalRUrl }}</code>
                <button class="dev-btn-sm" (click)="copyUrl(signalRUrl)" title="Copy">
                  <i class="fa-solid fa-copy"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- QR Code -->
          <div class="dev-qr-section">
            <div class="dev-qr-label">Scan to open on phone</div>
            <div class="dev-qr-container">
              @if (qrDataUrl()) {
                <img [src]="qrDataUrl()" alt="QR Code" class="dev-qr-image" />
              } @else {
                <div class="dev-qr-loading">
                  <div class="dev-spinner"></div>
                </div>
              }
            </div>
            <div class="dev-qr-hint">Scan with your phone's camera</div>
          </div>

          <!-- Action Buttons -->
          <div class="dev-actions">
            <button class="dev-btn dev-btn-primary" (click)="openInBrowser()">
              <i class="fa-solid fa-up-right-from-square"></i>
              Open on this device
            </button>
            <button class="dev-btn dev-btn-secondary" (click)="copyUrl(frontendLan)">
              <i class="fa-solid fa-copy"></i>
              {{ copied() ? 'Copied!' : 'Copy Mobile URL' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Floating toggle button -->
    @if (!showBanner()) {
      <button class="dev-toggle-btn" (click)="showBanner.set(true)" title="Show LAN Testing Info">
        <span class="dev-badge-sm">DEV</span>
        <i class="fa-solid fa-qrcode"></i>
      </button>
    }
  `,
  styles: [`
    .dev-info-banner {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 9999;
      width: calc(100vw - 24px);
      max-width: 380px;
      max-height: calc(100vh - 24px);
      overflow-y: auto;
      background: #1a1a2e;
      border: 1px solid rgba(124, 92, 191, 0.4);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(124, 92, 191, 0.15);
      font-family: 'Inter', -apple-system, sans-serif;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .dev-info-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .dev-info-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e0e0e0;
      font-size: 14px;
      font-weight: 600;
    }

    .dev-badge {
      background: linear-gradient(135deg, #7c5cbf, #e040fb);
      color: white;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .dev-info-close {
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      padding: 4px;
      font-size: 14px;
      transition: color 0.2s;
    }
    .dev-info-close:hover { color: #fff; }

    .dev-info-content {
      padding: 14px 16px;
    }

    .dev-url-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .dev-url-item {
      background: rgba(255,255,255,0.04);
      border-radius: 8px;
      padding: 8px 10px;
    }

    .dev-url-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #999;
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .dev-url-label i { font-size: 10px; width: 14px; text-align: center; }

    .dev-url-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dev-url-text {
      flex: 1;
      font-size: 12px;
      color: #b0b0b0;
      font-family: 'SF Mono', 'Fira Code', monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dev-url-text.highlight { color: #7c5cbf; font-weight: 600; }

    .dev-btn-sm {
      background: rgba(124, 92, 191, 0.15);
      border: 1px solid rgba(124, 92, 191, 0.3);
      color: #b39ddb;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .dev-btn-sm:hover {
      background: rgba(124, 92, 191, 0.3);
      color: #e0d4f7;
    }

    .dev-qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;
      margin-bottom: 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .dev-qr-label {
      font-size: 11px;
      color: #888;
      font-weight: 500;
      margin-bottom: 10px;
    }

    .dev-qr-container {
      width: 160px;
      height: 160px;
      background: white;
      border-radius: 12px;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dev-qr-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .dev-qr-loading {
      width: 40px;
      height: 40px;
    }

    .dev-spinner {
      width: 100%;
      height: 100%;
      border: 3px solid #eee;
      border-top-color: #7c5cbf;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .dev-qr-hint {
      font-size: 10px;
      color: #666;
      margin-top: 8px;
    }

    .dev-actions {
      display: flex;
      gap: 8px;
    }

    .dev-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .dev-btn-primary {
      background: linear-gradient(135deg, #7c5cbf, #9c7cd8);
      color: white;
    }
    .dev-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }

    .dev-btn-secondary {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: #ccc;
    }
    .dev-btn-secondary:hover { background: rgba(255,255,255,0.1); }

    .dev-toggle-btn {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 9998;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #1a1a2e;
      border: 1px solid rgba(124, 92, 191, 0.4);
      color: #b39ddb;
      padding: 8px 14px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.2s;
      max-width: calc(100vw - 24px);
    }
    .dev-toggle-btn:hover {
      background: #252545;
      transform: translateY(-1px);
    }

    .dev-badge-sm {
      background: linear-gradient(135deg, #7c5cbf, #e040fb);
      color: white;
      font-size: 8px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }
  `]
})
export class DevInfoComponent implements OnInit {
  showBanner = signal(true);
  copied = signal(false);
  qrDataUrl = signal('');

  frontendLocal = '';
  frontendLan = '';
  backendLocal = '';
  backendLan = '';
  signalRUrl = '';

  private hostname = environment.hostname;
  private isLocalhost = environment.isLocalhost;

  ngOnInit() {
    this.frontendLocal = 'http://localhost:4200';
    this.frontendLan = this.isLocalhost
      ? 'http://localhost:4200'
      : `http://${this.hostname}:4200`;
    this.backendLocal = environment.backendLocalUrl;
    this.backendLan = environment.backendLanUrl;
    this.signalRUrl = environment.hubUrl;

    this.generateQr();
  }

  private async generateQr() {
    try {
      const url = this.isLocalhost
        ? this.frontendLocal
        : this.frontendLan;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 160,
        margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' }
      });
      this.qrDataUrl.set(dataUrl);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }

  copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  openInBrowser() {
    window.open(this.frontendLan, '_blank');
  }
}
