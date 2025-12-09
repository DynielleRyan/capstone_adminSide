import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY!;

if (!apiKey) {
  console.error('Warning: SENDGRID_API_KEY is not set');
} else {
  sgMail.setApiKey(apiKey);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using SendGrid
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
    const fromName = process.env.SENDGRID_FROM_NAME || 'Capstone Pharmacy';

    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL is not configured');
    }

    console.log('Sending email via SendGrid...');
    console.log('FROM:', fromEmail);
    console.log('TO:', options.to);
    console.log('SUBJECT:', options.subject);

    const msg = {
      to: options.to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: options.subject,
      text: options.text || '',
      html: options.html,
    };

    const result = await sgMail.send(msg);

    console.log('✅ SendGrid email sent successfully');
    return {
      success: true,
      messageId: result[0].headers['x-message-id']
    };
  } catch (error: any) {
    console.error('❌ SendGrid ERROR:', error);

    if (error.response) {
      console.error('Error body:', error.response.body);
    }

    return {
      success: false,
      error: error.message,
      details: error.response?.body || null
    };
  }
}

/**
 * Send verification email to new user
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationLink: string
) {
  const subject = 'Verify Your Email - Capstone Pharmacy';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Capstone Pharmacy</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Thank you for registering with Capstone Pharmacy Admin Portal. To complete your registration and access the system, please verify your email address by clicking the button below:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;
                    font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
          ${verificationLink}
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #999;">
          This verification link will expire in 24 hours. If you didn't create an account with Capstone Pharmacy, please ignore this email.
        </p>
        
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          <strong>Need help?</strong> Contact our support team at 
          <a href="mailto:${process.env.SENDGRID_FROM_EMAIL}" style="color: #667eea;">${process.env.SENDGRID_FROM_EMAIL}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Capstone Pharmacy!

Hello ${name},

Thank you for registering with Capstone Pharmacy Admin Portal. To complete your registration and access the system, please verify your email address by visiting this link:

${verificationLink}

This verification link will expire in 24 hours. If you didn't create an account with Capstone Pharmacy, please ignore this email.

Need help? Contact our support team at ${process.env.SENDGRID_FROM_EMAIL}

© ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
) {
  const subject = 'Reset Your Password - Capstone Pharmacy';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          We received a request to reset your password for your Capstone Pharmacy account. Click the button below to set a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;
                    font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
          ${resetLink}
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #999;">
          This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        </p>
        
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          <strong>Need help?</strong> Contact our support team at 
          <a href="mailto:${process.env.SENDGRID_FROM_EMAIL}" style="color: #667eea;">${process.env.SENDGRID_FROM_EMAIL}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Hello ${name},

We received a request to reset your password for your Capstone Pharmacy account. Visit this link to set a new password:

${resetLink}

This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Need help? Contact our support team at ${process.env.SENDGRID_FROM_EMAIL}

© ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string
) {
  const subject = 'Welcome to Capstone Pharmacy - Account Verified!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Account Verified!</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Your email has been successfully verified! You now have full access to the Capstone Pharmacy Admin Portal as a <strong>${role}</strong>.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;
                    font-size: 16px;">
            Login to Dashboard
          </a>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">What's Next?</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 10px;">Login to your account using your credentials</li>
            <li style="margin-bottom: 10px;">Explore the dashboard and familiarize yourself with the system</li>
            <li style="margin-bottom: 10px;">Update your profile information if needed</li>
            ${role === 'Pharmacist' ? '<li style="margin-bottom: 10px;">Start managing inventory and processing orders</li>' : ''}
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          <strong>Need help?</strong> Contact our support team at 
          <a href="mailto:${process.env.SENDGRID_FROM_EMAIL}" style="color: #667eea;">${process.env.SENDGRID_FROM_EMAIL}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Account Verified!

Hello ${name},

Your email has been successfully verified! You now have full access to the Capstone Pharmacy Admin Portal as a ${role}.

Login to your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

What's Next?
- Login to your account using your credentials
- Explore the dashboard and familiarize yourself with the system
- Update your profile information if needed
${role === 'Pharmacist' ? '- Start managing inventory and processing orders' : ''}

Need help? Contact our support team at ${process.env.SENDGRID_FROM_EMAIL}

© ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Send OTP email for device verification
 */
export async function sendOTPEmail(
  email: string,
  name: string,
  otp: string
) {
  const subject = 'Your One-Time Password - Capstone Pharmacy';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OTP Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Device Verification</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          We detected a login from a new device or browser. To ensure the security of your account, please verify your identity using the One-Time Password (OTP) below:
        </p>
        
        <div style="text-align: center; margin: 30px 0; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="font-size: 14px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
          <div style="font-size: 48px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${otp}
          </div>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            <strong>⚠️ Important:</strong> This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0; font-size: 16px;">🛡️ Security Tips</h3>
          <ul style="padding-left: 20px; font-size: 14px; color: #666;">
            <li style="margin-bottom: 8px;">Only enter this code on the official Capstone Pharmacy login page</li>
            <li style="margin-bottom: 8px;">If you didn't attempt to log in, change your password immediately</li>
            <li style="margin-bottom: 8px;">Never share your OTP with anyone, including support staff</li>
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #999;">
          If you didn't request this code, please ignore this email or contact support if you're concerned about unauthorized access to your account.
        </p>
        
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          <strong>Need help?</strong> Contact our support team at 
          <a href="mailto:${process.env.SENDGRID_FROM_EMAIL}" style="color: #667eea;">${process.env.SENDGRID_FROM_EMAIL}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Device Verification - One-Time Password

Hello ${name},

We detected a login from a new device or browser. To ensure the security of your account, please verify your identity using the One-Time Password (OTP) below:

YOUR OTP CODE: ${otp}

⚠️ IMPORTANT: This code will expire in 10 minutes. Do not share this code with anyone.

Security Tips:
- Only enter this code on the official Capstone Pharmacy login page
- If you didn't attempt to log in, change your password immediately
- Never share your OTP with anyone, including support staff

If you didn't request this code, please ignore this email or contact support if you're concerned about unauthorized access to your account.

Need help? Contact our support team at ${process.env.SENDGRID_FROM_EMAIL}

© ${new Date().getFullYear()} Capstone Pharmacy. All rights reserved.
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

