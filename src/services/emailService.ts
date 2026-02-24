/**
 * Email service using Resend
 */

import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

const FROM_EMAIL = import.meta.env.EMAIL_FROM || 'noreply@example.com';
const APP_URL = import.meta.env.PUBLIC_APP_URL || 'http://localhost:4321';
const APP_NAME = 'Spend Tracker';

/**
 * Send a magic link email for login
 */
export async function sendMagicLink(email: string, token: string): Promise<{ success: boolean; error?: string }> {
  const magicLink = `${APP_URL}/api/auth/verify?token=${token}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Sign in to ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <h2 style="color: #111827; margin-top: 0;">Sign in to your account</h2>
              <p>Click the button below to sign in. This link will expire in 15 minutes.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600;">
                  Sign In
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${magicLink}" style="color: #6366f1; word-break: break-all;">${magicLink}</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send magic link email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send an invite email to a new user
 */
export async function sendInviteEmail(
  email: string,
  token: string,
  inviterName?: string
): Promise<{ success: boolean; error?: string }> {
  const inviteLink = `${APP_URL}/api/auth/verify?token=${token}`;
  const invitedBy = inviterName || 'Someone';

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been invited to ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <h2 style="color: #111827; margin-top: 0;">You're invited!</h2>
              <p>${invitedBy} has invited you to join ${APP_NAME} - a simple way to track and categorize your spending.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                This invitation will expire in 48 hours. If you didn't expect this email, you can safely ignore it.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteLink}" style="color: #6366f1; word-break: break-all;">${inviteLink}</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send invite email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
