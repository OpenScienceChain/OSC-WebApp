import { getApiBaseUrl } from './api-base-url';
import { environment } from '../../environments/environment';

declare const expect: any;

describe('getApiBaseUrl', () => {
  const originalApiUrl = environment.apiUrl;

  const clearRuntimeConfig = () => {
    if ((window as any).__RUNTIME_CONFIG__) {
      delete (window as any).__RUNTIME_CONFIG__;
    }
  };

  const setRuntimeConfig = (apiUrl: string) => {
    Object.defineProperty(window as any, '__RUNTIME_CONFIG__', {
      value: { API_BASE_URL: apiUrl },
      configurable: true,
    });
  };

  beforeEach(() => {
    clearRuntimeConfig();
    localStorage.clear();
  });

  afterEach(() => {
    (environment as any).apiUrl = originalApiUrl;
    clearRuntimeConfig();
    localStorage.clear();
  });

  it('returns runtime config API_BASE_URL when set', () => {
    setRuntimeConfig(' https://runtime.example/api ');
    expect(getApiBaseUrl()).toBe('https://runtime.example/api');
  });

  it('returns localStorage API_BASE_URL when runtime config missing', () => {
    localStorage.setItem('API_BASE_URL', ' https://ls.example/api ');
    expect(getApiBaseUrl()).toBe('https://ls.example/api');
  });

  it('prefers runtime config over localStorage', () => {
    setRuntimeConfig('https://runtime.example/api');
    localStorage.setItem('API_BASE_URL', 'https://ls.example/api');
    expect(getApiBaseUrl()).toBe('https://runtime.example/api');
  });

  it('returns env apiUrl when staging flag is true and env apiUrl set', () => {
    localStorage.setItem('USE_STAGING_API', 'TRUE');
    (environment as any).apiUrl = 'https://env.example/api';
    expect(getApiBaseUrl()).toBe('https://env.example/api');
  });

  it('falls back to default when staging flag true and env apiUrl empty', () => {
    localStorage.setItem('USE_STAGING_API', 'true');
    (environment as any).apiUrl = '';
    const warnSpy = spyOn(console, 'warn');
    expect(getApiBaseUrl()).toBe('http://localhost:3000/api/v1');
    expect(warnSpy).toHaveBeenCalledWith(
      'API_BASE_URL not provided; falling back to http://localhost:3000/api/v1',
    );
  });

  it('returns env apiUrl when no overrides are set', () => {
    (environment as any).apiUrl = 'https://env.example/api';
    expect(getApiBaseUrl()).toBe('https://env.example/api');
  });

  it('falls back to default when env apiUrl empty and no overrides', () => {
    (environment as any).apiUrl = '';
    const warnSpy = spyOn(console, 'warn');
    expect(getApiBaseUrl()).toBe('http://localhost:3000/api/v1');
    expect(warnSpy).toHaveBeenCalledWith(
      'environment.apiUrl is empty; falling back to http://localhost:3000/api/v1',
    );
  });

  it('handles localStorage access errors and falls back to env', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'API_BASE_URL') throw new Error('denied');
      return null;
    });
    (environment as any).apiUrl = 'https://env.example/api';
    expect(getApiBaseUrl()).toBe('https://env.example/api');
  });

  it('handles staging localStorage access errors and falls back to env', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'USE_STAGING_API') throw new Error('denied');
      return null;
    });
    (environment as any).apiUrl = 'https://env.example/api';
    expect(getApiBaseUrl()).toBe('https://env.example/api');
  });
});
