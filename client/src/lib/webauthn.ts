// WebAuthn Browser Helper for Platform Authenticators (Windows Hello, Touch ID, Face ID, Android Biometrics)

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export async function createPasskeyCredential(challengeData: any) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn biometrics are not supported on this browser/device');
  }

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToBuffer(challengeData.challenge),
    rp: challengeData.rp,
    user: {
      id: base64UrlToBuffer(challengeData.user.id),
      name: challengeData.user.name,
      displayName: challengeData.user.displayName,
    },
    pubKeyCredParams: challengeData.pubKeyCredParams || [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    authenticatorSelection: challengeData.authenticatorSelection || {
      userVerification: 'preferred',
    },
    timeout: challengeData.timeout || 60000,
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Biometric passkey registration was cancelled or failed');
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  
  // Extract public key or rawId
  const credentialId = bufferToBase64Url(credential.rawId);
  const publicKey = response.getPublicKey ? bufferToBase64Url(response.getPublicKey()!) : credentialId;

  return {
    credentialId,
    publicKey,
    transports: response.getTransports ? response.getTransports() : [],
  };
}

export async function getPasskeyAssertion(challengeData: any) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn biometrics are not supported on this browser/device');
  }

  const allowCredentials = (challengeData.allowCredentials || []).map((cred: any) => ({
    id: base64UrlToBuffer(cred.id),
    type: 'public-key' as const,
    transports: cred.transports,
  }));

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(challengeData.challenge),
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
    timeout: challengeData.timeout || 60000,
  };

  const credential = (await navigator.credentials.get({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Biometric authentication was cancelled or failed');
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    credentialId: bufferToBase64Url(credential.rawId),
    authenticatorData: bufferToBase64Url(response.authenticatorData),
    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    signature: bufferToBase64Url(response.signature),
  };
}
