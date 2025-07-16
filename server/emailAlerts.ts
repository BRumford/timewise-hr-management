import nodemailer from "nodemailer";

interface ErrorAlert {
  error: Error;
  context?: string;
  userId?: string;
  endpoint?: string;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
}

class EmailAlertSystem {
  private transporter: nodemailer.Transporter;
  private adminEmails: string[];
  private isEnabled: boolean;

  constructor() {
    this.adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    this.isEnabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    
    if (this.isEnabled) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  async sendErrorAlert(alert: ErrorAlert): Promise<void> {
    if (!this.isEnabled || this.adminEmails.length === 0) {
      console.log('Email alerts not configured or no admin emails provided');
      return;
    }

    const subject = `🚨 HR Payroll System Error - ${alert.severity.toUpperCase()}`;
    const htmlContent = this.generateErrorEmailHTML(alert);

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@hrpayroll.com',
        to: this.adminEmails.join(','),
        subject,
        html: htmlContent
      });
      
      console.log(`Error alert sent to ${this.adminEmails.length} admin(s)`);
    } catch (emailError) {
      console.error('Failed to send error alert email:', emailError);
    }
  }

  private generateErrorEmailHTML(alert: ErrorAlert): string {
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    const severityColor = severityColors[alert.severity];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: ${severityColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .error-details { background-color: #f8f9fa; padding: 15px; border-left: 4px solid ${severityColor}; margin: 15px 0; }
          .metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
          .metadata-item { padding: 10px; background-color: #f8f9fa; border-radius: 4px; }
          .metadata-label { font-weight: bold; color: #6c757d; font-size: 12px; text-transform: uppercase; }
          .metadata-value { color: #212529; margin-top: 5px; }
          .stack-trace { background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto; }
          .footer { background-color: #f8f9fa; padding: 15px; text-align: center; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 System Error Alert</h1>
            <p>Severity: ${alert.severity.toUpperCase()}</p>
          </div>
          
          <div class="content">
            <div class="error-details">
              <h3>Error Message</h3>
              <p><strong>${alert.error.message}</strong></p>
            </div>

            <div class="metadata">
              <div class="metadata-item">
                <div class="metadata-label">Timestamp</div>
                <div class="metadata-value">${alert.timestamp.toLocaleString()}</div>
              </div>
              
              <div class="metadata-item">
                <div class="metadata-label">Severity</div>
                <div class="metadata-value">${alert.severity.toUpperCase()}</div>
              </div>
              
              ${alert.endpoint ? `
              <div class="metadata-item">
                <div class="metadata-label">Endpoint</div>
                <div class="metadata-value">${alert.endpoint}</div>
              </div>
              ` : ''}
              
              ${alert.userId ? `
              <div class="metadata-item">
                <div class="metadata-label">User ID</div>
                <div class="metadata-value">${alert.userId}</div>
              </div>
              ` : ''}
              
              ${alert.context ? `
              <div class="metadata-item">
                <div class="metadata-label">Context</div>
                <div class="metadata-value">${alert.context}</div>
              </div>
              ` : ''}
            </div>

            ${alert.error.stack ? `
            <h3>Stack Trace</h3>
            <div class="stack-trace">${alert.error.stack}</div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>HR Payroll System - Error Monitoring</p>
            <p>This is an automated alert. Please check the system logs for more details.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Convenience methods for different error types
  async sendDatabaseError(error: Error, context?: string): Promise<void> {
    await this.sendErrorAlert({
      error,
      context: context || 'Database operation failed',
      timestamp: new Date(),
      severity: 'critical'
    });
  }

  async sendAuthenticationError(error: Error, userId?: string): Promise<void> {
    await this.sendErrorAlert({
      error,
      context: 'Authentication system error',
      userId,
      timestamp: new Date(),
      severity: 'high'
    });
  }

  async sendAPIError(error: Error, endpoint: string, userId?: string): Promise<void> {
    await this.sendErrorAlert({
      error,
      context: 'API endpoint error',
      endpoint,
      userId,
      timestamp: new Date(),
      severity: 'medium'
    });
  }

  async sendPayrollError(error: Error, context?: string): Promise<void> {
    await this.sendErrorAlert({
      error,
      context: context || 'Payroll processing error',
      timestamp: new Date(),
      severity: 'critical'
    });
  }

  async sendSystemError(error: Error, context?: string): Promise<void> {
    await this.sendErrorAlert({
      error,
      context: context || 'System error',
      timestamp: new Date(),
      severity: 'high'
    });
  }
}

export const emailAlerts = new EmailAlertSystem();