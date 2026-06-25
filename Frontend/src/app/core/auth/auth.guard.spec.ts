import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ]
    });
  });

  it('should return true if user is logged in', () => {
    authServiceMock.isLoggedIn.and.returnValue(true);
    const guard = TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/dashboard' } as any));
    expect(guard).toBeTrue();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to login if user is not logged in', () => {
    authServiceMock.isLoggedIn.and.returnValue(false);
    const guard = TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/dashboard' } as any));
    expect(guard).toBeFalse();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/dashboard' } });
  });
});
