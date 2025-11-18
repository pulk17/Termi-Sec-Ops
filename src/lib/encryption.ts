// Consolidated encryption utilities - merges security.ts, client-encryption.ts, and secure-token-manager.ts

export class Encryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: iv },
      key,
      dataBuffer
    );

    return { encrypted, iv };
  }

  static async decrypt(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: iv as BufferSource },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }
}

// Token Manager
export class TokenManager {
  private static readonly TOKEN_KEY = 'secure_tokens';
  private static readonly ROTATION_INTERVAL = 24 * 60 * 60 * 1000;
  private static encryptionKey: CryptoKey | null = null;

  static async initialize(): Promise<void> {
    const storedKey = localStorage.getItem('encryption_key');
    
    if (storedKey) {
      try {
        const keyData = new Uint8Array(JSON.parse(storedKey));
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          keyData.buffer,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.warn('Failed to load encryption key, generating new one');
        await this.generateNewKey();
      }
    } else {
      await this.generateNewKey();
    }
  }

  private static async generateNewKey(): Promise<void> {
    this.encryptionKey = await Encryption.generateKey();
    const keyData = await crypto.subtle.exportKey('raw', this.encryptionKey);
    const keyArray = Array.from(new Uint8Array(keyData));
    localStorage.setItem('encryption_key', JSON.stringify(keyArray));
  }

  static async storeToken(name: string, token: string, expiresIn?: number): Promise<void> {
    if (!this.encryptionKey) await this.initialize();

    const expirationTime = Date.now() + (expiresIn || this.ROTATION_INTERVAL);
    const tokenData = {
      token,
      expiresAt: expirationTime,
      createdAt: Date.now(),
    };

    const { encrypted, iv } = await Encryption.encrypt(
      JSON.stringify(tokenData),
      this.encryptionKey!
    );

    const storedData = {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
    };

    const tokens = this.getStoredTokens();
    tokens[name] = storedData;
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokens));
  }

  static async getToken(name: string): Promise<string | null> {
    if (!this.encryptionKey) await this.initialize();

    const tokens = this.getStoredTokens();
    const tokenData = tokens[name];

    if (!tokenData) return null;

    try {
      const encrypted = new Uint8Array(tokenData.encrypted).buffer;
      const iv = new Uint8Array(tokenData.iv);

      const decryptedData = await Encryption.decrypt(
        encrypted,
        this.encryptionKey!,
        iv
      );

      const parsedData = JSON.parse(decryptedData);

      if (Date.now() > parsedData.expiresAt) {
        this.removeToken(name);
        return null;
      }

      return parsedData.token;
    } catch (error) {
      console.error('Failed to decrypt token:', error);
      this.removeToken(name);
      return null;
    }
  }

  static removeToken(name: string): void {
    const tokens = this.getStoredTokens();
    delete tokens[name];
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokens));
  }

  static clearAllTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('encryption_key');
    this.encryptionKey = null;
  }

  private static getStoredTokens(): Record<string, any> {
    const stored = localStorage.getItem(this.TOKEN_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  static async getTokenInfo(name: string): Promise<{ expiresAt: number; createdAt: number } | null> {
    if (!this.encryptionKey) await this.initialize();

    const tokens = this.getStoredTokens();
    const tokenData = tokens[name];

    if (!tokenData) return null;

    try {
      const encrypted = new Uint8Array(tokenData.encrypted).buffer;
      const iv = new Uint8Array(tokenData.iv);

      const decryptedData = await Encryption.decrypt(
        encrypted,
        this.encryptionKey!,
        iv
      );

      const parsedData = JSON.parse(decryptedData);
      return {
        expiresAt: parsedData.expiresAt,
        createdAt: parsedData.createdAt
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      return null;
    }
  }
}

// Export singleton instance for backward compatibility
export const encryption = Encryption;
export const secureTokenManager = TokenManager;
