import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService, AuthResponse } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    it('should POST to /auth/register', () => {
      const user = { firstName: 'John', lastName: 'Doe', email: 'john@test.com', password: 'Password123' };
      const mockResponse: AuthResponse = { success: true, message: 'Registration successful', token: 'jwt' };

      service.register(user).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('https://localhost:7030/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(user);
      req.flush(mockResponse);
    });
  });

  describe('login', () => {
    it('should POST to /auth/login and store token on success', () => {
      const credentials = { email: 'test@test.com', password: 'password' };
      const mockResponse: AuthResponse = { success: true, message: 'Login successful', token: 'jwt-token' };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('token')).toBe('jwt-token');
      });

      const req = httpMock.expectOne('https://localhost:7030/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should not store token on failed login', () => {
      const credentials = { email: 'test@test.com', password: 'wrong' };
      const mockResponse: AuthResponse = { success: false, message: 'Invalid credentials' };

      service.login(credentials).subscribe(response => {
        expect(response.success).toBeFalse();
        expect(localStorage.getItem('token')).toBeNull();
      });

      const req = httpMock.expectOne('https://localhost:7030/api/auth/login');
      req.flush(mockResponse);
    });
  });

  describe('verifyEmail', () => {
    it('should GET /auth/verify-email with token query param', () => {
      const token = 'abc123';
      const responseText = 'Email verified successfully';

      service.verifyEmail(token).subscribe(response => {
        expect(response).toBe(responseText);
      });

      const req = httpMock.expectOne(`https://localhost:7030/api/auth/verify-email?token=${token}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('text');
      req.flush(responseText);
    });
  });

  describe('logout', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('token', 'some-token');
      service.logout();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('token', 'some-token');
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should return false when token does not exist', () => {
      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  describe('getToken', () => {
    it('should return the token from localStorage', () => {
      localStorage.setItem('token', 'my-token');
      expect(service.getToken()).toBe('my-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });
  });
});
