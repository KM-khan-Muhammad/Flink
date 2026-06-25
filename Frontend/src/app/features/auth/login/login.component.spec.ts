import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.Spy;

  beforeEach(async () => {
    routerSpy = jasmine.createSpy('navigate');
    const routerStub = {
      navigate: routerSpy,
      events: of(null),
      createUrlTree: jasmine.createSpy('createUrlTree'),
      serializeUrl: jasmine.createSpy('serializeUrl'),
      url: '/login',
      navigated: false,
    } as unknown as Router;

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerStub },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
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

  it('should have empty credentials initially', () => {
    expect(component.credentials.email).toBe('');
    expect(component.credentials.password).toBe('');
  });

  it('should set errorMessage on failed login', () => {
    component.credentials = { email: 'test@test.com', password: 'wrong' };
    component.onSubmit();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/login');
    req.flush({ success: false, message: 'Invalid credentials' });

    expect(component.errorMessage).toBe('Invalid credentials');
    expect(component.loading).toBeFalse();
    expect(routerSpy).not.toHaveBeenCalled();
  });

  it('should store token and navigate to dashboard on successful login', () => {
    component.credentials = { email: 'test@test.com', password: 'correct' };
    component.onSubmit();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/login');
    req.flush({ success: true, message: 'Login successful', token: 'jwt-token' });

    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(routerSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(component.loading).toBeFalse();
  });

  it('should handle HTTP error response', () => {
    component.credentials = { email: 'test@test.com', password: 'wrong' };
    component.onSubmit();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/login');
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage).toBe('Server error');
    expect(component.loading).toBeFalse();
  });

  it('should handle network error', () => {
    component.credentials = { email: 'test@test.com', password: 'wrong' };
    component.onSubmit();

    const req = httpMock.expectOne('https://localhost:7030/api/auth/login');
    req.error(new ProgressEvent('Network error'));

    expect(component.errorMessage).toBe('Login failed. Please check your credentials.');
    expect(component.loading).toBeFalse();
  });
});
