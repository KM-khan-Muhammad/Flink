import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { VerifyEmailComponent } from './verify-email.component';

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let httpMock: HttpTestingController;
  let activatedRouteStub: Partial<ActivatedRoute>;

  beforeEach(async () => {
    activatedRouteStub = {
      queryParams: of({ token: 'test-token-123' })
    };

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set successMessage on successful verification', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/verify-email?token=test-token-123');
    expect(req.request.method).toBe('GET');
    req.flush('Email verified successfully');

    expect(component.successMessage).toBe('Email verified successfully');
    expect(component.loading).toBeFalse();
  });

  it('should set errorMessage on verification failure', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/verify-email?token=test-token-123');
    req.flush('Invalid or expired token', { status: 400, statusText: 'Bad Request' });

    expect(component.errorMessage).toBe('Invalid or expired token');
    expect(component.loading).toBeFalse();
  });

  it('should set errorMessage when no token is provided', () => {
    activatedRouteStub.queryParams = of({});
    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    expect(component.errorMessage).toBe('No verification token provided.');
    expect(component.loading).toBeFalse();
  });
});
