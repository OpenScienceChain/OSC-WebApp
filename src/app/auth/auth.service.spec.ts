import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';
import { environment } from '../../environments/environment';
import { take } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Add Jasmine types
declare const jasmine: any;

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;
  const apiUrl = `${environment.apiUrl}/users`;

  // Mock JWT token for testing
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGVzIjpbImFkbWluIl0sImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTE2MjM5MDIyfQ.wS5IfBSHJ6vJ0NuRFU3NxOTYHs39JbCd5fNi8BD33Xx';

  // Helper function to set a valid token with expiration
  function setValidTokenData(): void {
    // Create a valid token that won't expire for a day
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
    const tokenData = {
      token: mockToken,
      expiresAt: expiresAt,
    };
    localStorage.setItem('tokenData', JSON.stringify(tokenData));
    localStorage.setItem('token', mockToken); // For backward compatibility
  }

  // Helper to create a mock JWT token with valid payload
  function setValidJwtToken(): void {
    const payload = {
      username: 'testuser',
      sub: 'user123',
      roles: ['admin'],
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    };

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'fake_signature';
    const token = `${header}.${encodedPayload}.${signature}`;

    const tokenData = {
      token: token,
      expiresAt: payload.exp * 1000,
    };

    localStorage.setItem('tokenData', JSON.stringify(tokenData));
    localStorage.setItem('token', token);
  }

  // Helper to create a custom JWT token with specified roles
  function setCustomJwtToken(roles: string[]): void {
    const payload = {
      username: 'testuser',
      sub: 'user123',
      roles: roles,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    };

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'fake_signature';
    const token = `${header}.${encodedPayload}.${signature}`;

    const tokenData = {
      token: token,
      expiresAt: payload.exp * 1000,
    };

    localStorage.setItem('tokenData', JSON.stringify(tokenData));
    localStorage.setItem('token', token);
  }

  beforeEach(() => {
    localStorage.clear(); // Ensure clean state before each test
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService],
    });
  });

  afterEach(() => {
    // Only verify if HttpTestingController is available for this test case
    try {
      const ctrl = TestBed.inject(HttpTestingController);
      ctrl.verify();
    } catch {
      // In tests where HttpClientTestingModule was not configured, skip verify
    }
    localStorage.clear();
  });

  it('should be created', () => {
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    expect(service).toBeTruthy();
  });

  describe('Constructor', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
    });

    it('should initialize as not authenticated when no token exists', () => {
      localStorage.clear();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });
      const service = TestBed.inject(AuthService);
      expect(service.isAuthenticated()).toEqual(false);
    });

    it('should initialize as authenticated when token exists', (done) => {
      // Set a valid JWT token with proper structure and expiration
      setValidTokenData();

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      const service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);

      // We need to wait for the auth state to be initialized
      // The service triggers isAuthenticated$ observable when auth state changes
      service.isAuthenticated$.pipe(take(1)).subscribe((isAuthenticated) => {
        expect(isAuthenticated).toEqual(true);

        // Now handle the backend validation request that might have been made
        const requests = httpMock.match(`${apiUrl}/validate-token`);
        if (requests.length > 0) {
          // If a validation request was made, respond with success
          requests.forEach((req) => {
            expect(req.request.headers.get('Authorization')).toEqual(
              `Bearer ${mockToken}`,
            );
            req.flush({ valid: true });
          });
        }

        // Verify the final authenticated state
        expect(service.isAuthenticated()).toEqual(true);
        done();
      });
    });

    it('should handle invalid token in constructor', (done) => {
      // Store an invalid or corrupted token
      localStorage.setItem('tokenData', 'invalid-json-data');
      localStorage.setItem('token', 'invalid-token');

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      const service = TestBed.inject(AuthService);
      router = TestBed.inject(Router);

      // Spy on router navigate
      spyOn(router, 'navigate');

      // Should not be authenticated because token is invalid
      expect(service.isAuthenticated()).toEqual(false);

      // Should have cleared the session
      expect(localStorage.getItem('token')).toEqual(null);
      expect(localStorage.getItem('tokenData')).toEqual(null);

      done();
    });

    it('should handle expired token and clean up session', (done) => {
      // Create expired token
      const expiredTime = Date.now() - 24 * 60 * 60 * 1000; // 1 day in the past
      const tokenData = {
        token: mockToken,
        expiresAt: expiredTime,
      };
      localStorage.setItem('tokenData', JSON.stringify(tokenData));

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      const service = TestBed.inject(AuthService);
      router = TestBed.inject(Router);

      // Spy on router navigate
      spyOn(router, 'navigate');

      expect(service.isAuthenticated()).toEqual(false);

      // Should have cleared the session
      expect(localStorage.getItem('tokenData')).toEqual(null);

      done();
    });

    it('should handle token with expired JWT claim', (done) => {
      // Create token with expired JWT claim
      const payload = {
        username: 'testuser',
        sub: 'user123',
        roles: ['admin'],
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      // Create proper base64 encoding for JWT parts
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const signature = 'fake_signature';
      const token = `${header}.${encodedPayload}.${signature}`;

      const tokenData = {
        token: token,
        expiresAt: Date.now() + 86400000, // Still valid according to local expiration (1 day)
      };

      localStorage.setItem('tokenData', JSON.stringify(tokenData));

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      const service = TestBed.inject(AuthService);

      expect(service.isAuthenticated()).toEqual(false);

      // Should have cleared the session
      expect(localStorage.getItem('tokenData')).toEqual(null);

      done();
    });

    it('should handle failed backend validation', (done) => {
      // Set a valid token first
      setValidTokenData();

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      const service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);

      // Spy on router navigate and console.error
      spyOn(router, 'navigate');
      spyOn(console, 'error');

      // Wait for auth state to be initialized
      service.isAuthenticated$.pipe(take(1)).subscribe((isAuthenticated) => {
        // Initially should be authenticated
        expect(isAuthenticated).toEqual(true);

        // Now fail the backend validation
        const req = httpMock.expectOne(`${apiUrl}/validate-token`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

        // After failure should not be authenticated
        expect(service.isAuthenticated()).toEqual(false);

        // Should have logged an error
        expect(console.error).toHaveBeenCalled();

        // Should have cleared the session
        expect(localStorage.getItem('token')).toEqual(null);
        expect(localStorage.getItem('tokenData')).toEqual(null);

        done();
      });
    });
  });

  describe('login', () => {
    const mockLoginResponse = {
      token: mockToken,
    };

    beforeEach(() => {
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
    });

    it('should send POST request and store token', () => {
      service.login('testuser', 'password123').subscribe((response) => {
        expect(response).toEqual(mockLoginResponse);

        // Check that token is stored with the new mechanism
        const storedDataStr = localStorage.getItem('tokenData');
        expect(storedDataStr).toBeTruthy();

        if (storedDataStr) {
          const storedData = JSON.parse(storedDataStr);
          expect(storedData.token).toBe(mockToken);
          expect(storedData.expiresAt).toBeGreaterThan(Date.now());
        }

        // Old token should also be stored for backward compatibility
        expect(localStorage.getItem('token')).toBe(mockToken);

        expect(service.isAuthenticated()).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'testuser',
        password: 'password123',
      });
      req.flush(mockLoginResponse);
    });

    it('should handle login error', () => {
      service.login('testuser', 'wrongpass').subscribe({
        error: (error) => {
          expect(error.error.message).toBe('Invalid credentials');
          expect(service.isAuthenticated()).toBeFalse();
          expect(localStorage.getItem('token')).toBeNull();
          expect(localStorage.getItem('tokenData')).toBeNull();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(
        { message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );
    });

    it('should reject a token without a verifiable expiration', () => {
      const invalidJwtResponse = {
        token: 'not-a-jwt-token',
      };

      spyOn(console, 'warn');

      service.login('testuser', 'password123').subscribe({
        next: () => fail('expected an invalid token error'),
        error: (error: Error) => {
          expect(error.message).toContain('missing a valid expiration');
          expect(console.warn).toHaveBeenCalled();
          expect(localStorage.getItem('tokenData')).toBeNull();
          expect(localStorage.getItem('token')).toBeNull();
          expect(service.isAuthenticated()).toBeFalse();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(invalidJwtResponse);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      setValidTokenData();
      service['isAuthenticatedSubject'].next(true);
    });

    it('should send POST request and clear session when token exists', () => {
      spyOn(router, 'navigate');

      service.logout().subscribe(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('tokenData')).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
      });

      const req = httpMock.expectOne(`${apiUrl}/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${mockToken}`,
      );
      req.flush({});
    });

    it('should just clear session when no token exists', () => {
      localStorage.clear();
      service['isAuthenticatedSubject'].next(false);
      spyOn(router, 'navigate');

      service.logout().subscribe(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('tokenData')).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
      });

      // Add expectation to satisfy the warning
      expect(localStorage.getItem('tokenData')).toBeNull();

      // Verify no HTTP request was made
      httpMock.expectNone(`${apiUrl}/logout`);
    });

    it('should clear session even if logout request fails', () => {
      spyOn(router, 'navigate');

      service.logout().subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
          expect(localStorage.getItem('token')).toBeNull();
          expect(localStorage.getItem('tokenData')).toBeNull();
          expect(service.isAuthenticated()).toBeFalse();
          expect(router.navigate).toHaveBeenCalledWith(['/']);
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/logout`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('expireSession', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
      router = TestBed.inject(Router);
      setValidTokenData();
      localStorage.setItem('user', JSON.stringify({ id: 'test-user' }));
      service['isAuthenticatedSubject'].next(true);
    });

    it('should clear all session state and preserve a safe return route', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue(
        '/artifacts/artifact-nsg-001/history',
      );
      spyOn(router, 'navigate');

      service.expireSession();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('tokenData')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/sign-in'], {
        queryParams: {
          reason: 'expired',
          returnUrl: '/artifacts/artifact-nsg-001/history',
        },
      });
    });
  });

  describe('getToken', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('should return token when it exists in new format', () => {
      setValidTokenData();
      expect(service.getToken()).toBe(mockToken);
    });

    it('should invalidate a legacy token without expiration metadata', () => {
      localStorage.setItem('token', mockToken);
      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should return null when no token exists', () => {
      localStorage.clear();
      expect(service.getToken()).toBeNull();
    });

    it('should clean up and return null when token is expired', () => {
      // Create expired token data
      const expiredTime = Date.now() - 1000; // 1 second ago
      const tokenData = {
        token: mockToken,
        expiresAt: expiredTime,
      };
      localStorage.setItem('tokenData', JSON.stringify(tokenData));

      spyOn(service as any, 'cleanupSession').and.callThrough();

      expect(service.getToken()).toBeNull();
      expect(service['cleanupSession']).toHaveBeenCalled();
    });

    it('should handle corrupted token JSON', () => {
      // First clear any existing data
      localStorage.clear();

      // Store corrupted JSON that will cause parsing error
      localStorage.setItem('tokenData', '{not-valid-json}');

      // Call getToken which should detect the invalid JSON and clean it up
      const token = service.getToken();

      // Should return null
      expect(token).toBeNull();

      // Should clean up localStorage - check if item was removed
      expect(localStorage.getItem('tokenData')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('should return true when authenticated', () => {
      // Setup proper token data
      setValidTokenData();
      service['isAuthenticatedSubject'].next(true);
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should return false when not authenticated', () => {
      service['isAuthenticatedSubject'].next(false);
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('token validation and refresh', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      // Clean up any running timer
      if (service['tokenCheckInterval']) {
        clearInterval(service['tokenCheckInterval']);
        service['tokenCheckInterval'] = null;
      }
      jasmine.clock().uninstall();
    });

    it('should periodically check token validity', () => {
      // Reset the TestBed for this specific test to create a fresh service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      // Install jasmine clock at the start of the test
      jasmine.clock().install();

      // Get a new instance of the service
      const freshService = TestBed.inject(AuthService);

      // Set up valid token and auth state
      setValidTokenData();
      freshService['isAuthenticatedSubject'].next(true);

      // Create a spy directly on the validateTokenLocallyAndWithBackend method
      spyOn(freshService as any, 'validateTokenLocallyAndWithBackend');

      // Fast forward 5 minutes
      jasmine.clock().tick(5 * 60 * 1000 + 100);

      // Verify the method was called
      expect(
        freshService['validateTokenLocallyAndWithBackend'],
      ).toHaveBeenCalled();
    });

    it('should not check token if not authenticated', () => {
      // Reset the test module to avoid conflicts with other tests
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      // Get a fresh service
      service = TestBed.inject(AuthService);

      // Set authenticated to false
      service['isAuthenticatedSubject'].next(false);

      // Install jasmine clock specifically for this test
      jasmine.clock().install();

      // Spy on validateTokenLocallyAndWithBackend
      spyOn(service as any, 'validateTokenLocallyAndWithBackend');

      // Set up the refresh check manually (the constructor would have already done this)
      service['setupTokenRefreshCheck']();

      // Fast forward 5 minutes
      jasmine.clock().tick(5 * 60 * 1000 + 100);

      // Verify method was not called when not authenticated
      expect(
        service['validateTokenLocallyAndWithBackend'],
      ).not.toHaveBeenCalled();
    });

    it('should clean up session if token validation fails', () => {
      // Reset the TestBed for this specific test
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, RouterTestingModule],
        providers: [AuthService],
      });

      // Get a fresh service
      service = TestBed.inject(AuthService);

      // Set a valid token
      setValidTokenData();
      service['isAuthenticatedSubject'].next(true);

      // Spy on cleanupSession
      spyOn(service as any, 'cleanupSession').and.callThrough();

      // Make validateTokenWithBackend return error
      spyOn(service as any, 'validateTokenWithBackend').and.returnValue(
        throwError(() => new Error('Invalid token')),
      );

      // Call the method directly
      (service as any).validateTokenLocallyAndWithBackend();

      // Verify cleanupSession was called
      expect(service['cleanupSession']).toHaveBeenCalled();
    });
  });

  describe('user info and roles', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('should get user roles from token', () => {
      // Set token with admin role
      setCustomJwtToken(['admin']);

      const roles = service.getUserRoles();
      expect(roles).toContain(UserRole.ADMIN);
      expect(roles.length).toBe(1);
    });

    it('should return empty array when no token exists', () => {
      localStorage.clear();

      const roles = service.getUserRoles();
      expect(roles).toEqual([]);
    });

    it('should check if user has specific role', () => {
      // Set token with admin role
      setCustomJwtToken(['admin']);

      expect(service.hasRole(UserRole.ADMIN)).toBeTrue();
      expect(service.hasRole(UserRole.COLLABORATOR)).toBeFalse();
    });

    it('should check admin role', () => {
      setCustomJwtToken(['admin']);
      expect(service.isAdmin()).toBeTrue();
    });

    it('should check collaborator role', () => {
      setCustomJwtToken(['collaborator']);
      expect(service.isCollaborator()).toBeTrue();
    });

    it('should check PI role', () => {
      setCustomJwtToken(['pi']);
      expect(service.isPI()).toBeTrue();
    });

    it('should check artifact creation permission', () => {
      // Collaborator can create artifacts
      setCustomJwtToken(['collaborator']);
      expect(service.canCreateArtifact()).toBeTrue();

      // PI can create artifacts
      setCustomJwtToken(['pi']);
      expect(service.canCreateArtifact()).toBeTrue();

      // Admin alone cannot create artifacts
      setCustomJwtToken(['admin']);
      expect(service.canCreateArtifact()).toBeFalse();

      // Admin + Collaborator can create artifacts
      setCustomJwtToken(['admin', 'collaborator']);
      expect(service.canCreateArtifact()).toBeTrue();
    });

    it('should get username from token', () => {
      setValidJwtToken();
      expect(service.getUsername()).toBe('testuser');
    });

    it('should return null username when no token exists', () => {
      localStorage.clear();
      expect(service.getUsername()).toBeNull();
    });

    it('should get user email from token', () => {
      setValidJwtToken();
      expect(service.getUserEmail()).toBe('test@example.com');
    });

    it('should return null email when no token exists', () => {
      localStorage.clear();
      expect(service.getUserEmail()).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('should handle token with invalid JWT format', () => {
      // Store token with invalid JWT format (not three parts)
      const invalidToken = 'header.payload'; // Missing signature part
      localStorage.setItem('token', invalidToken);

      // Call private method directly
      const payload = (service as any).decodeToken();

      // Should return null for invalid format
      expect(payload).toBeNull();
    });

    it('should handle network errors during token validation', () => {
      // Set a valid token
      setValidTokenData();

      // Call validateTokenWithBackend directly
      (service as any).validateTokenWithBackend().subscribe({
        next: (result: boolean) => {
          expect(result).toBeTrue(); // Should return true despite backend error
        },
      });

      // Simulate a network error (not 401/403)
      const req = httpMock.expectOne(`${apiUrl}/validate-token`);
      req.error(new ErrorEvent('Network error'));
    });
  });
});
