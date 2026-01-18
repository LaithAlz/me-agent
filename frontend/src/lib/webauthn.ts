/**
 * WebAuthn Utilities for Me-Agent
 * Handles real passkey registration and authentication using the Web Authentication API
 */

const API_BASE = 'http://localhost:8000/api';

// ============================================================
// Types
// ============================================================

export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject?: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
  };
  type: 'public-key';
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Convert base64url string to ArrayBuffer
 */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64url string
 */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Check if WebAuthn is supported by the browser
 */
export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Check if platform authenticator (fingerprint, Face ID, Windows Hello) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ============================================================
// Registration (Create Passkey)
// ============================================================

export interface RegisterResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Register a new passkey for a user (new account)
 * This triggers the actual biometric prompt (Windows Hello, Touch ID, etc.)
 */
export async function registerPasskey(username: string, displayName?: string): Promise<RegisterResult> {
  try {
    // Step 1: Get registration options from server
    const optionsResponse = await fetch(`${API_BASE}/auth/register/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, displayName }),
    });

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return { success: false, error: error.detail || 'Failed to get registration options' };
    }

    const options = await optionsResponse.json();
    return await performWebAuthnRegistration(options, username);
  } catch (error) {
    console.error('Passkey registration error:', error);
    
    // Handle specific WebAuthn errors
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric verification was cancelled or timed out' };
      }
      if (error.name === 'InvalidStateError') {
        return { success: false, error: 'A passkey already exists for this account' };
      }
      if (error.name === 'NotSupportedError') {
        return { success: false, error: 'Passkeys are not supported on this device' };
      }
    }
    
    return { success: false, error: 'Failed to create passkey' };
  }
}

/**
 * Register an additional passkey for an existing authenticated user
 * Requires the user to already have a valid session
 */
export async function registerAdditionalPasskey(displayName?: string): Promise<RegisterResult> {
  try {
    // Step 1: Get registration options for additional passkey
    const optionsResponse = await fetch(`${API_BASE}/auth/register-additional/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: 'user', displayName }),
    });

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return { success: false, error: error.detail || 'Failed to get registration options' };
    }

    const options = await optionsResponse.json();

    // Step 2: Create credential using WebAuthn API
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64urlToBuffer(options.challenge),
      rp: {
        id: options.rp.id,
        name: options.rp.name,
      },
      user: {
        id: base64urlToBuffer(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: 'No credential created' };
    }

    // Step 3: Send credential to server for verification
    const attestationResponse = credential.response as AuthenticatorAttestationResponse;
    
    const verifyResponse = await fetch(`${API_BASE}/auth/register-additional/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: 'user',
        credential: {
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          response: {
            clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
            attestationObject: bufferToBase64url(attestationResponse.attestationObject),
          },
          type: credential.type,
        },
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      return { success: false, error: error.detail || 'Failed to verify credential' };
    }

    const result = await verifyResponse.json();
    return { success: true, userId: result.userId };

  } catch (error) {
    console.error('Additional passkey registration error:', error);
    
    // Handle specific WebAuthn errors
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric verification was cancelled or timed out' };
      }
      if (error.name === 'InvalidStateError') {
        return { success: false, error: 'A passkey already exists for this device' };
      }
      if (error.name === 'NotSupportedError') {
        return { success: false, error: 'Passkeys are not supported on this device' };
      }
      if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error - check your connection' };
      }
    }
    
    return { success: false, error: 'Failed to register additional passkey' };
  }
}

/**
 * Shared WebAuthn registration logic
 */
async function performWebAuthnRegistration(options: any, username: string): Promise<RegisterResult> {
  try {
    // Step 2: Create credential using WebAuthn API
    // This is where the browser shows the biometric prompt!
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64urlToBuffer(options.challenge),
      rp: {
        id: options.rp.id,
        name: options.rp.name,
      },
      user: {
        id: base64urlToBuffer(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: 'No credential created' };
    }

    // Step 3: Send credential to server for verification
    const attestationResponse = credential.response as AuthenticatorAttestationResponse;
    
    const verifyResponse = await fetch(`${API_BASE}/auth/register/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username,
        credential: {
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          response: {
            clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
            attestationObject: bufferToBase64url(attestationResponse.attestationObject),
          },
          type: credential.type,
        },
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      return { success: false, error: error.detail || 'Failed to verify credential' };
    }

    const result = await verifyResponse.json();
    return { success: true, userId: result.userId };

  } catch (error) {
    console.error('Passkey registration error:', error);
    
    // Handle specific WebAuthn errors
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric verification was cancelled or timed out' };
      }
      if (error.name === 'InvalidStateError') {
        return { success: false, error: 'A passkey already exists for this account' };
      }
      if (error.name === 'NotSupportedError') {
        return { success: false, error: 'Passkeys are not supported on this device' };
      }
    }
    
    return { success: false, error: 'Failed to create passkey' };
  }
}

// ============================================================
// Authentication (Use Passkey)
// ============================================================

export interface AuthResult {
  success: boolean;
  userId?: string;
  username?: string;
  error?: string;
}

/**
 * Authenticate with an existing passkey
 * This triggers the actual biometric prompt (Windows Hello, Touch ID, etc.)
 */
export async function authenticatePasskey(username?: string): Promise<AuthResult> {
  try {
    // Step 1: Get authentication options from server
    const optionsResponse = await fetch(`${API_BASE}/auth/login/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: username || '' }),
    });

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return { success: false, error: error.detail || 'Failed to get login options' };
    }

    const options = await optionsResponse.json();

    // Step 2: Get credential using WebAuthn API
    // This is where the browser shows the biometric prompt!
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64urlToBuffer(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification,
      allowCredentials: options.allowCredentials?.map((cred: { id: string; type: string; transports?: string[] }) => ({
        id: base64urlToBuffer(cred.id),
        type: cred.type,
        transports: cred.transports,
      })),
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: 'No credential selected' };
    }

    // Step 3: Send credential to server for verification
    const assertionResponse = credential.response as AuthenticatorAssertionResponse;
    
    const verifyResponse = await fetch(`${API_BASE}/auth/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: username || options.username,
        credential: {
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          response: {
            clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
            authenticatorData: bufferToBase64url(assertionResponse.authenticatorData),
            signature: bufferToBase64url(assertionResponse.signature),
            userHandle: assertionResponse.userHandle 
              ? bufferToBase64url(assertionResponse.userHandle) 
              : null,
          },
          type: credential.type,
        },
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      return { success: false, error: error.detail || 'Failed to verify credential' };
    }

    const result = await verifyResponse.json();
    return { success: true, userId: result.userId, username: result.username };

  } catch (error) {
    console.error('Passkey authentication error:', error);
    
    // Handle specific WebAuthn errors
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric verification was cancelled or timed out' };
      }
      if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error - check that you\'re on a secure connection' };
      }
    }
    
    return { success: false, error: 'Failed to authenticate with passkey' };
  }
}

// ============================================================
// Consent Flow (Per-Action Authorization)
// ============================================================

/**
 * Authorize a specific action with passkey consent
 * This is used for the Me-Agent flow where each action requires biometric confirmation
 */
export async function authorizeActionWithPasskey(action: string): Promise<AuthResult> {
  try {
    // Check if platform authenticator is available
    const hasPlatformAuth = await isPlatformAuthenticatorAvailable();
    
    if (!hasPlatformAuth) {
      console.log('Platform authenticator not available');
      return { success: false, error: 'Biometric authentication not available on this device' };
    }

    console.log('Platform authenticator available, checking for registered passkey...');

    // Check if we have a session (user already registered)
    const sessionResponse = await fetch(`${API_BASE}/auth/session`, {
      credentials: 'include',
    });
    
    if (sessionResponse.ok) {
      const session = await sessionResponse.json();
      if (session.authenticated && session.username) {
        // User is registered, trigger real WebAuthn authentication
        console.log('Found registered user, triggering Windows Hello/biometric prompt...');
        const result = await authenticatePasskey(session.username);
        return result;
      }
    }
    
    // No registered user - must register first
    console.log('No registered passkey found. User must register first.');
    return { success: false, error: 'No passkey registered. Please register in Settings first.' };
    
  } catch (error) {
    console.error('Action authorization error:', error);
    
    // Handle user cancellation
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric verification was cancelled' };
      }
      if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error - check that you\'re on a secure connection' };
      }
      if (error.name === 'TimeoutError') {
        return { success: false, error: 'Biometric verification timed out' };
      }
    }
    
    return { success: false, error: error instanceof Error ? error.message : 'Failed to authorize action' };
  }
}
