function getHostname(): string {
  return window.location.hostname;
}

function getProtocol(): string {
  return window.location.protocol;
}

function isLocalhost(): boolean {
  const host = getHostname();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
}

function getApiBaseUrl(): string {
  if (isLocalhost()) {
    return 'https://localhost:7030';
  }
  return `${getProtocol()}//${getHostname()}:5223`;
}

function getBackendLocalUrl(): string {
  return 'https://localhost:7030';
}

function getBackendLanUrl(): string {
  return `http://${getHostname()}:5223`;
}

function getSignalRUrl(): string {
  return getApiBaseUrl() + '/hubs/call';
}

export const environment = {
  production: false,
  apiUrl: getApiBaseUrl() + '/api',
  hubUrl: getSignalRUrl(),
  backendLocalUrl: getBackendLocalUrl(),
  backendLanUrl: getBackendLanUrl(),
  isLocalhost: isLocalhost(),
  hostname: getHostname(),
};
