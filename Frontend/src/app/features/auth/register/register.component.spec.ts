import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jasmine.createSpy(), events: of(null), createUrlTree: jasmine.createSpy(), serializeUrl: jasmine.createSpy(), url: '/register', navigated: false } as unknown as Router },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at step 1', () => {
    expect(component.currentStep).toBe(1);
  });

  it('should navigate to next step', () => {
    component.nextStep();
    expect(component.currentStep).toBe(2);
  });

  it('should navigate to previous step', () => {
    component.currentStep = 2;
    component.prevStep();
    expect(component.currentStep).toBe(1);
  });

  it('should reset OTP state on email change', () => {
    component.emailOtpSent = true;
    component.emailOtpVerified = true;
    component.emailOtp = '123456';
    component.onEmailChange();
    expect(component.emailOtpSent).toBeFalse();
    expect(component.emailOtpVerified).toBeFalse();
    expect(component.emailOtp).toBe('');
  });

  it('should skip WhatsApp step and submit on skipStep3', () => {
    spyOn(component, 'onSubmit');
    component.skipStep3();
    expect(component.user.whatsappNumber).toBe('');
    expect(component.whatsappOtpVerified).toBeFalse();
    expect(component.onSubmit).toHaveBeenCalled();
  });

  it('should send email OTP', () => {
    component.user.email = 'test@test.com';
    component.sendEmailOtp();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/send-otp');
    expect(req.request.body).toEqual({ target: 'test@test.com' });
    req.flush({ success: true, message: 'OTP sent' });

    expect(component.emailOtpSent).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('should handle email OTP send failure', () => {
    component.user.email = 'test@test.com';
    component.sendEmailOtp();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/send-otp');
    req.flush({ success: false, message: 'Failed to send' });

    expect(component.emailOtpSent).toBeFalse();
    expect(component.errorMessage).toBe('Failed to send');
  });

  it('should verify email OTP', () => {
    component.user.email = 'test@test.com';
    component.emailOtp = '654321';
    component.verifyEmailOtp();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/verify-otp');
    expect(req.request.body).toEqual({ target: 'test@test.com', otp: '654321' });
    req.flush({ success: true, message: 'OTP verified successfully' });

    expect(component.emailOtpVerified).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('should handle email OTP verify failure', () => {
    component.user.email = 'test@test.com';
    component.emailOtp = '000000';
    component.verifyEmailOtp();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/verify-otp');
    req.flush({ success: false, message: 'Invalid OTP' });

    expect(component.emailOtpVerified).toBeFalse();
    expect(component.errorMessage).toBe('Invalid OTP');
  });

  it('should complete registration on submit', () => {
    const mockUser = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2000-01-01',
      email: 'john@test.com',
      password: 'Password123',
      whatsappNumber: '',
      username: ''
    };
    component.user = mockUser;
    component.onSubmit();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/register');
    expect(req.request.body).toEqual(mockUser);
    req.flush({ success: true, message: 'Registration successful' });

    expect(component.successMessage).toBe('Registration successful');
    expect(component.loading).toBeFalse();
  });

  it('should handle registration failure', () => {
    component.onSubmit();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/register');
    req.flush({ success: false, message: 'Email already in use' });

    expect(component.errorMessage).toBe('Email already in use');
    expect(component.loading).toBeFalse();
  });
});
