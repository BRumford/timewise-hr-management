// Email configuration for system alerts
export const emailConfig = {
  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  
  // Email settings
  from: process.env.SMTP_FROM || 'noreply@hrpayroll.com',
  
  // Admin email addresses for error alerts
  adminEmails: process.env.ADMIN_EMAILS?.split(',') || [],
  
  // Error alert configuration
  alerts: {
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    
    // Rate limiting for error alerts (to prevent spam)
    rateLimit: {
      maxAlertsPerHour: 10,
      maxAlertsPerError: 3 // Max alerts for same error type
    },
    
    // Error severity levels
    severity: {
      critical: {
        color: '#dc3545',
        priority: 'high',
        immediateAlert: true
      },
      high: {
        color: '#fd7e14',
        priority: 'medium',
        immediateAlert: true
      },
      medium: {
        color: '#ffc107',
        priority: 'low',
        immediateAlert: false
      },
      low: {
        color: '#28a745',
        priority: 'low',
        immediateAlert: false
      }
    }
  }
};

// Environment variables needed for email alerts
export const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_USER', 
  'SMTP_PASS',
  'ADMIN_EMAILS'
];

// Check if all required environment variables are set
export const isEmailConfigured = (): boolean => {
  return requiredEnvVars.every(envVar => process.env[envVar]);
};

// Get missing environment variables
export const getMissingEnvVars = (): string[] => {
  return requiredEnvVars.filter(envVar => !process.env[envVar]);
};