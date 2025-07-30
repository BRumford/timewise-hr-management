import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

interface OpenEnrollmentEmailParams {
  employeeEmail: string;
  employeeName: string;
  classification: string;
  campaignName: string;
  planYear: string;
  documents: Array<{
    id: number;
    title: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
  customMessage?: string;
  senderEmail: string;
  senderName: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await sgMail.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendOpenEnrollmentEmail(params: OpenEnrollmentEmailParams): Promise<boolean> {
  try {
    const htmlContent = generateOpenEnrollmentHTML(params);
    const textContent = generateOpenEnrollmentText(params);

    // Prepare attachments from document URLs
    const attachments = await Promise.all(
      params.documents.map(async (doc) => {
        try {
          // In a real implementation, you would fetch the file content from the URL
          // For now, we'll create a placeholder attachment
          return {
            content: Buffer.from(`Document: ${doc.title}`).toString('base64'),
            filename: doc.fileName,
            type: 'application/pdf',
            disposition: 'attachment' as const
          };
        } catch (error) {
          console.error(`Error preparing attachment for ${doc.fileName}:`, error);
          return null;
        }
      })
    );

    const validAttachments = attachments.filter((att): att is NonNullable<typeof att> => att !== null);

    await sgMail.send({
      to: params.employeeEmail,
      from: {
        email: params.senderEmail,
        name: params.senderName
      },
      subject: `Open Enrollment ${params.planYear} - Benefits Information for ${params.classification} Employees`,
      text: textContent,
      html: htmlContent,
      attachments: validAttachments,
    });

    return true;
  } catch (error) {
    console.error('Open enrollment email error:', error);
    return false;
  }
}

function generateOpenEnrollmentHTML(params: OpenEnrollmentEmailParams): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Open Enrollment ${params.planYear}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .document-list { background-color: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .document-item { margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
        .btn { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Open Enrollment ${params.planYear}</h1>
          <p>${params.campaignName}</p>
        </div>
        
        <div class="content">
          <h2>Dear ${params.employeeName},</h2>
          
          <p>It's time for Open Enrollment! As a <strong>${params.classification}</strong> employee, we've prepared your specific benefits information and cost sheets.</p>
          
          ${params.customMessage ? `<p>${params.customMessage}</p>` : ''}
          
          <h3>Your Benefits Documents</h3>
          <div class="document-list">
            ${params.documents.map(doc => `
              <div class="document-item">
                <strong>${doc.title}</strong><br>
                <small>File: ${doc.fileName} (${formatFileSize(doc.fileSize)})</small>
              </div>
            `).join('')}
          </div>
          
          <p><strong>Important:</strong> Please review all attached documents carefully. Your enrollment decisions will affect your benefits for the entire plan year.</p>
          
          <h3>Next Steps</h3>
          <ul>
            <li>Review all attached cost sheets and plan information</li>
            <li>Compare plan options for your classification level</li>
            <li>Complete your enrollment by the deadline</li>
            <li>Contact HR if you have questions</li>
          </ul>
          
          <p>If you have any questions about your benefits or need assistance with enrollment, please don't hesitate to contact our HR department.</p>
          
          <p>Best regards,<br>
          <strong>${params.senderName}</strong><br>
          Human Resources Department</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message regarding your employee benefits. Please do not reply to this email.</p>
          <p>Contact HR at ${params.senderEmail} for questions or assistance.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOpenEnrollmentText(params: OpenEnrollmentEmailParams): string {
  return `
Open Enrollment ${params.planYear}
${params.campaignName}

Dear ${params.employeeName},

It's time for Open Enrollment! As a ${params.classification} employee, we've prepared your specific benefits information and cost sheets.

${params.customMessage || ''}

Your Benefits Documents:
${params.documents.map(doc => `- ${doc.title} (${doc.fileName})`).join('\n')}

Important: Please review all attached documents carefully. Your enrollment decisions will affect your benefits for the entire plan year.

Next Steps:
- Review all attached cost sheets and plan information
- Compare plan options for your classification level
- Complete your enrollment by the deadline
- Contact HR if you have questions

If you have any questions about your benefits or need assistance with enrollment, please don't hesitate to contact our HR department.

Best regards,
${params.senderName}
Human Resources Department

---
This is an automated message regarding your employee benefits. Please do not reply to this email.
Contact HR at ${params.senderEmail} for questions or assistance.
  `;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}