import nodemailer from 'nodemailer';

interface EmailAlert {
  to: string[];
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

class EmailAlerts {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    try {
      // In a production environment, you would configure this with actual SMTP settings
      // For now, we'll use a mock configuration
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'test@example.com',
          pass: process.env.SMTP_PASS || 'test-password'
        }
      });
      
      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to setup email transporter:', error);
      this.isConfigured = false;
    }
  }

  async sendSystemError(error: Error, context?: string) {
    if (!this.isConfigured) {
      console.log('Email alerts not configured or no admin emails provided');
      return;
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (adminEmails.length === 0) {
      console.log('No admin emails configured for alerts');
      return;
    }

    const emailContent = {
      to: adminEmails,
      subject: `[CRITICAL] System Error - HR Management System`,
      message: `
        A critical system error has occurred:
        
        Error: ${error.message}
        Stack: ${error.stack}
        Context: ${context || 'No additional context'}
        Timestamp: ${new Date().toISOString()}
        
        Please investigate immediately.
      `,
      priority: 'critical' as const
    };

    try {
      await this.sendAlert(emailContent);
    } catch (emailError) {
      console.error('Failed to send error alert email:', emailError);
    }
  }

  async sendAuthenticationError(error: Error, userId: string) {
    await this.sendSecurityAlert('authentication_error', 'high', `Authentication failed for user: ${userId}`, { error: error.message });
  }

  async sendSecurityAlert(eventType: string, severity: string, description: string, metadata?: any) {
    if (!this.isConfigured) {
      console.log('Email alerts not configured');
      return;
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (adminEmails.length === 0) {
      return;
    }

    const emailContent = {
      to: adminEmails,
      subject: `[${severity.toUpperCase()}] Security Alert - ${eventType}`,
      message: `
        Security Event Detected:
        
        Type: ${eventType}
        Severity: ${severity}
        Description: ${description}
        Timestamp: ${new Date().toISOString()}
        
        ${metadata ? `Additional Details: ${JSON.stringify(metadata, null, 2)}` : ''}
        
        Please review and take appropriate action.
      `,
      priority: severity as 'low' | 'medium' | 'high' | 'critical'
    };

    try {
      await this.sendAlert(emailContent);
    } catch (emailError) {
      console.error('Failed to send security alert email:', emailError);
    }
  }

  private async sendAlert(alert: EmailAlert) {
    if (!this.transporter) {
      throw new Error('Email transporter not configured');
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@hrmanagement.com',
      to: alert.to.join(','),
      subject: alert.subject,
      text: alert.message,
      html: `<pre>${alert.message}</pre>`
    };

    // For development/demo purposes, we'll just log the email instead of sending
    console.log('Email Alert (would be sent in production):');
    console.log('To:', alert.to.join(','));
    console.log('Subject:', alert.subject);
    console.log('Message:', alert.message);
    console.log('Priority:', alert.priority);
    
    // In production, uncomment this line:
    // await this.transporter.sendMail(mailOptions);
  }
}

export const emailAlerts = new EmailAlerts();