import CryptoJS from 'crypto-js';
import crypto from 'crypto';

// Encryption key management
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // AES block size

export class DataEncryption {
  // Encrypt sensitive data at rest
  static encryptSensitiveData(data: string): string {
    if (!data) return data;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive data
  static decryptSensitiveData(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;
    
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Hash sensitive identifiers (SSN, etc.)
  static hashSensitiveIdentifier(identifier: string): string {
    if (!identifier) return identifier;
    
    const hash = crypto.createHash('sha256');
    hash.update(identifier);
    return hash.digest('hex');
  }

  // Generate secure tokens
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Encrypt files before storage
  static encryptFile(fileBuffer: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  // Decrypt files after retrieval
  static decryptFile(encryptedBuffer: Buffer): Buffer {
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const encryptedData = encryptedBuffer.slice(IV_LENGTH);
    
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    
    return decrypted;
  }

  // Secure data masking for logs
  static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const sensitiveFields = [
      'ssn', 'socialSecurityNumber', 'password', 'passwordHash', 'email',
      'phone', 'address', 'bankAccount', 'routingNumber', 'salary',
      'medicalProvider', 'diagnosisCode', 'witnessContact', 'claimNumber'
    ];
    
    const masked = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in masked) {
        const value = masked[field];
        if (typeof value === 'string' && value.length > 0) {
          masked[field] = value.substring(0, 2) + '*'.repeat(Math.max(0, value.length - 4)) + value.substring(value.length - 2);
        }
      }
    }
    
    return masked;
  }
}

// Field-level encryption utilities
export class FieldEncryption {
  // Encrypt specific PII fields
  static encryptPII(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const piiFields = [
      'ssn', 'socialSecurityNumber', 'bankAccount', 'routingNumber',
      'medicalProvider', 'diagnosisCode', 'witnessContact', 'claimNumber',
      'insuranceProvider', 'doctorContact', 'medicalProviderContact'
    ];
    
    const encrypted = { ...data };
    
    for (const field of piiFields) {
      if (field in encrypted && encrypted[field]) {
        encrypted[field] = DataEncryption.encryptSensitiveData(encrypted[field]);
      }
    }
    
    return encrypted;
  }

  // Decrypt specific PII fields
  static decryptPII(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const piiFields = [
      'ssn', 'socialSecurityNumber', 'bankAccount', 'routingNumber',
      'medicalProvider', 'diagnosisCode', 'witnessContact', 'claimNumber',
      'insuranceProvider', 'doctorContact', 'medicalProviderContact'
    ];
    
    const decrypted = { ...data };
    
    for (const field of piiFields) {
      if (field in decrypted && decrypted[field]) {
        decrypted[field] = DataEncryption.decryptSensitiveData(decrypted[field]);
      }
    }
    
    return decrypted;
  }
}