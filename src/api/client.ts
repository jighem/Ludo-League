let authToken: string | null = localStorage.getItem('ludo_auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('ludo_auth_token', token);
  } else {
    localStorage.removeItem('ludo_auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new Error(
      response.ok
        ? 'Received non-JSON response from server'
        : `Server Error (${response.status}): ${text.substring(0, 100) || response.statusText}`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected error occurred');
  }

  return data as T;
}
