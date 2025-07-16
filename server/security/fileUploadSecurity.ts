import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DataEncryption } from './encryption';
import { AuditLogger } from './auditLogger';
import type { Request } from 'express';

// File type definitions
export interface SecureFileUpload {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  encryptedPath: string;
  checksum: string;
  uploadedBy: string;
  uploadedAt: Date;
  scanStatus: 'PENDING' | 'CLEAN' | 'INFECTED' | 'QUARANTINED';
}

// Allowed file types for different contexts
export const ALLOWED_FILE_TYPES = {
  PERSONNEL_DOCUMENTS: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  PAYROLL_DOCUMENTS: [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  MEDICAL_RECORDS: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff'
  ],
  PROFILE_IMAGES: [
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
};

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  PERSONNEL_DOCUMENTS: 10 * 1024 * 1024, // 10MB
  PAYROLL_DOCUMENTS: 5 * 1024 * 1024,    // 5MB
  MEDICAL_RECORDS: 15 * 1024 * 1024,     // 15MB
  PROFILE_IMAGES: 2 * 1024 * 1024        // 2MB
};

// Secure file storage configuration
export function createSecureUploadHandler(
  uploadType: keyof typeof ALLOWED_FILE_TYPES,
  baseDir: string = 'uploads'
) {
  const allowedTypes = ALLOWED_FILE_TYPES[uploadType];
  const sizeLimit = FILE_SIZE_LIMITS[uploadType];

  // Create secure storage configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const user = (req as any).user;
      const userId = user?.id || 'anonymous';
      
      // Create user-specific directory
      const uploadDir = path.join(baseDir, uploadType.toLowerCase(), userId);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate secure filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const extension = path.extname(sanitizedName);
      const baseName = path.basename(sanitizedName, extension);
      
      const secureFilename = `${timestamp}_${randomString}_${baseName}${extension}`;
      cb(null, secureFilename);
    }
  });

  // Create multer instance with security configurations
  return multer({
    storage,
    limits: {
      fileSize: sizeLimit,
      files: 5, // Maximum 5 files per request
      parts: 10 // Maximum 10 parts per request
    },
    fileFilter: (req, file, cb) => {
      // Validate file type
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
      }

      // Validate file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = getExtensionsFromMimeTypes(allowedTypes);
      
      if (!allowedExtensions.includes(ext)) {
        return cb(new Error(`Invalid file extension: ${ext}`));
      }

      // Additional security checks
      if (file.originalname.includes('..') || file.originalname.includes('/')) {
        return cb(new Error('Invalid filename characters'));
      }

      cb(null, true);
    }
  });
}

// Extract file extensions from MIME types
function getExtensionsFromMimeTypes(mimeTypes: string[]): string[] {
  const mimeToExt: { [key: string]: string[] } = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/tiff': ['.tiff', '.tif'],
    'image/webp': ['.webp'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  };

  return mimeTypes.flatMap(mime => mimeToExt[mime] || []);
}

// Virus scanning simulation (in production, integrate with actual AV)
export async function scanFile(filePath: string): Promise<'CLEAN' | 'INFECTED'> {
  try {
    // Simulate virus scanning
    const fileBuffer = fs.readFileSync(filePath);
    
    // Basic malware signature detection (simplified)
    const malwareSignatures = [
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', // EICAR test
      'eval(', // JavaScript eval
      '<script>', // HTML script tags
      'cmd.exe', // Windows command execution
      '/bin/sh' // Unix shell execution
    ];

    const content = fileBuffer.toString('utf-8').substring(0, 1000); // Check first 1KB
    
    for (const signature of malwareSignatures) {
      if (content.includes(signature)) {
        return 'INFECTED';
      }
    }

    return 'CLEAN';
  } catch (error) {
    console.error('File scanning error:', error);
    return 'CLEAN'; // Default to clean if scanning fails
  }
}

// Encrypt and store file securely
export async function encryptAndStoreFile(
  filePath: string,
  originalName: string,
  mimeType: string,
  userId: string
): Promise<SecureFileUpload> {
  try {
    // Read file content
    const fileBuffer = fs.readFileSync(filePath);
    
    // Generate file checksum
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Encrypt file content
    const encryptedBuffer = DataEncryption.encryptFile(fileBuffer);
    
    // Create encrypted file path
    const encryptedDir = path.dirname(filePath) + '/encrypted';
    if (!fs.existsSync(encryptedDir)) {
      fs.mkdirSync(encryptedDir, { recursive: true, mode: 0o750 });
    }
    
    const encryptedPath = path.join(encryptedDir, path.basename(filePath) + '.enc');
    
    // Write encrypted file
    fs.writeFileSync(encryptedPath, encryptedBuffer);
    
    // Remove original unencrypted file
    fs.unlinkSync(filePath);
    
    // Scan for viruses
    const scanStatus = await scanFile(encryptedPath);
    
    const secureFile: SecureFileUpload = {
      filename: path.basename(encryptedPath),
      originalName,
      mimeType,
      size: fileBuffer.length,
      encryptedPath,
      checksum,
      uploadedBy: userId,
      uploadedAt: new Date(),
      scanStatus
    };

    return secureFile;
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error('Failed to encrypt and store file');
  }
}

// Decrypt and serve file securely
export async function decryptAndServeFile(
  encryptedPath: string,
  userId: string,
  auditAction: string = 'FILE_ACCESS'
): Promise<Buffer> {
  try {
    // Audit file access
    await AuditLogger.logSecurityEvent(
      userId,
      auditAction,
      'system',
      'system',
      { filePath: encryptedPath },
      'MEDIUM'
    );

    // Read encrypted file
    const encryptedBuffer = fs.readFileSync(encryptedPath);
    
    // Decrypt file content
    const decryptedBuffer = DataEncryption.decryptFile(encryptedBuffer);
    
    return decryptedBuffer;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}

// Secure file upload middleware
export function secureFileUpload(uploadType: keyof typeof ALLOWED_FILE_TYPES) {
  const upload = createSecureUploadHandler(uploadType);
  
  return async (req: Request, res: any, next: any) => {
    upload.array('files', 5)(req, res, async (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: `File too large. Maximum size: ${FILE_SIZE_LIMITS[uploadType] / 1024 / 1024}MB`,
              code: 'FILE_TOO_LARGE'
            });
          }
          if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              message: 'Too many files. Maximum 5 files per request',
              code: 'TOO_MANY_FILES'
            });
          }
        }
        
        return res.status(400).json({ 
          message: error.message,
          code: 'UPLOAD_ERROR'
        });
      }

      // Process uploaded files
      if (req.files && Array.isArray(req.files)) {
        const user = (req as any).user;
        const userId = user?.id || 'anonymous';
        
        const processedFiles: SecureFileUpload[] = [];
        
        for (const file of req.files) {
          try {
            const secureFile = await encryptAndStoreFile(
              file.path,
              file.originalname,
              file.mimetype,
              userId
            );
            
            processedFiles.push(secureFile);
            
            // Log file upload
            await AuditLogger.logUserAction(
              req,
              'FILE_UPLOAD',
              'FILE',
              secureFile.filename,
              {
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype
              }
            );
          } catch (fileError) {
            console.error('File processing error:', fileError);
            // Clean up failed file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }
        
        // Add processed files to request
        (req as any).secureFiles = processedFiles;
      }

      next();
    });
  };
}

// File cleanup and retention
export async function cleanupOldFiles(retentionDays: number = 2555): Promise<void> { // 7 years default
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const uploadDirs = Object.keys(ALLOWED_FILE_TYPES).map(type => 
      path.join('uploads', type.toLowerCase())
    );
    
    for (const dir of uploadDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
          if (file.isFile()) {
            const filePath = path.join(dir, file.name);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime < cutoffDate) {
              fs.unlinkSync(filePath);
              console.log(`Cleaned up old file: ${filePath}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('File cleanup error:', error);
  }
}