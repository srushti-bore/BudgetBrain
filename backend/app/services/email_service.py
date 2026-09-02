"""
BudgetBrain — Email Dispatch Service

Handles sending transactional emails (OTP Verification, Password Reset, Welcome)
via direct Resend HTTPS REST API (for cloud hosting like Render/Vercel) OR
standard asynchronous/synchronous SMTP (e.g. Gmail SMTP, SendGrid, Amazon SES).
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import requests

from app.config import get_settings

logger = logging.getLogger("budgetbrain.email")


class EmailService:
    def __init__(self):
        self.settings = get_settings()

    def _dispatch_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """
        Robust dual-mode email dispatcher:
        1. If Resend API Key is detected (re_...), uses Resend's high-speed HTTPS REST API (bypasses all cloud firewall/port 587 blocks).
        2. Otherwise, uses standard SMTP (e.g. Gmail, SendGrid, AWS SES).
        """
        from_name = getattr(self.settings, "SMTP_FROM_NAME", "") or "BudgetBrain Security"
        from_email = (
            getattr(self.settings, "SMTP_FROM_EMAIL", None)
            or (self.settings.SMTP_USER if "@" in getattr(self.settings, "SMTP_USER", "") else None)
            or "onboarding@resend.dev"
        )
        if not from_email or not from_email.strip():
            from_email = "onboarding@resend.dev"

        from_header = f"{from_name} <{from_email}>"

        smtp_password = (getattr(self.settings, "SMTP_PASSWORD", "") or "").strip()
        smtp_host = (getattr(self.settings, "SMTP_HOST", "") or "").strip()

        is_resend = smtp_password.startswith("re_") or "resend" in smtp_host.lower()
        print(f"[EMAIL DISPATCH] Sending to {to_email} | Method: {'Resend REST API' if is_resend else 'SMTP'} | From: {from_header}")

        # ── Mode 1: Direct Resend HTTPS REST API (Recommended & Port-Proof) ──
        if is_resend and smtp_password:
            try:
                payload = {
                    "from": from_header,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                }
                headers = {
                    "Authorization": f"Bearer {smtp_password}",
                    "Content-Type": "application/json",
                }
                response = requests.post(
                    "https://api.resend.com/emails",
                    json=payload,
                    headers=headers,
                    timeout=10,
                )
                if response.status_code in (200, 201):
                    msg_id = response.json().get("id", "unknown")
                    print(f"[RESEND SUCCESS] OTP Email dispatched to {to_email} (ID: {msg_id})")
                    logger.info(f"[RESEND SUCCESS] Email dispatched to {to_email} (ID: {msg_id})")
                    return True
                else:
                    err_msg = f"[RESEND API ERROR] HTTP {response.status_code}: {response.text}"
                    print(err_msg)
                    logger.error(err_msg)
            except Exception as resend_err:
                err_msg = f"[RESEND REST EXCEPTION] {str(resend_err)}"
                print(err_msg)
                logger.warning(err_msg)

        # ── Mode 2: Standard SMTP Transport (Gmail, SES, SendGrid, Resend SMTP) ──
        if not self.settings.SMTP_HOST or not self.settings.SMTP_USER:
            logger.warning(f"[EMAIL NOTICE] SMTP is not configured. Email to {to_email} logged only.")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            port = int(self.settings.SMTP_PORT)
            if port == 465:
                server = smtplib.SMTP_SSL(self.settings.SMTP_HOST, port, timeout=12)
            else:
                server = smtplib.SMTP(self.settings.SMTP_HOST, port, timeout=12)
                if getattr(self.settings, "SMTP_TLS", True):
                    server.starttls()

            server.login(self.settings.SMTP_USER, self.settings.SMTP_PASSWORD)
            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Email successfully sent to {to_email} via SMTP")
            return True
        except Exception as exc:
            logger.error(f"Failed to send email to {to_email} via SMTP: {str(exc)}")
            return False

    def send_password_reset_email(self, to_email: str, reset_token: str) -> bool:
        """
        Send a beautifully formatted HTML password reset email.
        """
        frontend_base = "http://localhost:3000"
        if hasattr(self.settings, "FRONTEND_URL") and self.settings.FRONTEND_URL:
            raw_url = self.settings.FRONTEND_URL.rstrip("/")
            if "localhost" in raw_url or "127.0.0.1" in raw_url:
                frontend_base = raw_url
            elif getattr(self.settings, "APP_ENV", "") == "production" and not getattr(self.settings, "APP_DEBUG", True):
                frontend_base = raw_url

        reset_link = f"{frontend_base}/reset-password?token={reset_token}"

        # Print link to console in development mode for instant convenience
        if getattr(self.settings, "APP_DEBUG", True) or getattr(self.settings, "APP_ENV", "development") != "production":
            print(f"\n==========================================")
            print(f"[PASSWORD RESET LINK] For: {to_email}")
            print(f"URL: {reset_link}")
            print(f"==========================================\n")

        subject = "Reset Your BudgetBrain Password"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }}
            .container {{ max-width: 540px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .logo {{ font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 24px; display: inline-block; }}
            .title {{ font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
            .btn {{ display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff !important; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 14px; margin-bottom: 24px; }}
            .footer {{ font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; line-height: 1.5; }}
            .token-box {{ word-break: break-all; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; font-size: 12px; color: #334155; font-family: monospace; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🧠 BudgetBrain</div>
            <div class="title">Password Reset Request</div>
            <p class="text">
              Hello,<br><br>
              We received a request to reset the password for your BudgetBrain account (<strong>{to_email}</strong>). Click the button below to choose a new password:
            </p>
            <div style="text-align: center;">
              <a href="{reset_link}" class="btn" target="_blank">Reset My Password</a>
            </div>
            <p class="text" style="font-size: 12px; color: #64748b;">
              Or copy and paste this secure URL directly into your browser:<br>
              <div class="token-box">{reset_link}</div>
            </p>
            <p class="text" style="font-size: 12px; color: #64748b;">
              ⏱️ This link is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
            </p>
            <div class="footer">
              &copy; BudgetBrain — AI-Powered Personal Finance & Budget Management.<br>
              This is an automated security email. Please do not reply directly.
            </div>
          </div>
        </body>
        </html>
        """

        return self._dispatch_email(to_email=to_email, subject=subject, html_content=html_content)

    def send_verification_email(self, to_email: str, token: str, full_name: str | None = None) -> bool:
        """
        Send a beautifully formatted HTML account activation / email verification email.
        """
        frontend_base = "http://localhost:3000"
        if hasattr(self.settings, "FRONTEND_URL") and self.settings.FRONTEND_URL:
            raw_url = self.settings.FRONTEND_URL.rstrip("/")
            if "localhost" in raw_url or "127.0.0.1" in raw_url:
                frontend_base = raw_url
            elif getattr(self.settings, "APP_ENV", "") == "production" and not getattr(self.settings, "APP_DEBUG", True):
                frontend_base = raw_url

        verify_link = f"{frontend_base}/verify-email?token={token}"
        greeting_name = full_name if full_name else "there"

        # Print link to console in development mode for instant convenience
        if getattr(self.settings, "APP_DEBUG", True) or getattr(self.settings, "APP_ENV", "development") != "production":
            print(f"\n==========================================")
            print(f"[EMAIL VERIFICATION LINK] For: {to_email}")
            print(f"URL: {verify_link}")
            print(f"==========================================\n")

        subject = "Verify Your BudgetBrain Account"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }}
            .container {{ max-width: 540px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .logo {{ font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 24px; display: inline-block; }}
            .title {{ font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
            .btn {{ display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff !important; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 14px; margin-bottom: 24px; }}
            .footer {{ font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; line-height: 1.5; }}
            .token-box {{ word-break: break-all; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; font-size: 12px; color: #334155; font-family: monospace; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🧠 BudgetBrain</div>
            <div class="title">Welcome! Please Verify Your Email</div>
            <p class="text">
              Hi {greeting_name},<br><br>
              Thank you for creating your BudgetBrain account. To complete your registration and activate your personal finance dashboard, please verify your email address (<strong>{to_email}</strong>) by clicking the button below:
            </p>
            <div style="text-align: center;">
              <a href="{verify_link}" class="btn" target="_blank">Verify My Account</a>
            </div>
            <p class="text" style="font-size: 12px; color: #64748b;">
              Or copy and paste this verification URL directly into your browser:<br>
              <div class="token-box">{verify_link}</div>
            </p>
            <p class="text" style="font-size: 12px; color: #64748b;">
              ⏱️ This link is valid for <strong>24 hours</strong>. If you didn't create a BudgetBrain account, please disregard this email.
            </p>
            <div class="footer">
              &copy; BudgetBrain — AI-Powered Personal Finance & Budget Management.<br>
              This is an automated security email. Please do not reply directly.
            </div>
          </div>
        </body>
        </html>
        """

        return self._dispatch_email(to_email=to_email, subject=subject, html_content=html_content)

    def send_verification_otp_email(
        self,
        to_email: str,
        otp: str,
        full_name: str | None = None,
        token: str | None = None,
    ) -> bool:
        """
        Send a high-conversion, beautifully formatted HTML email containing a 6-digit OTP.
        Includes a 10-minute validity notice and direct magic link fallback.
        """
        frontend_base = "http://localhost:3000"
        if hasattr(self.settings, "FRONTEND_URL") and self.settings.FRONTEND_URL:
            raw_url = self.settings.FRONTEND_URL.rstrip("/")
            if "localhost" in raw_url or "127.0.0.1" in raw_url:
                frontend_base = raw_url
            elif getattr(self.settings, "APP_ENV", "") == "production" and not getattr(self.settings, "APP_DEBUG", True):
                frontend_base = raw_url

        verify_link = f"{frontend_base}/verify-email?token={token}" if token else ""
        greeting_name = full_name if full_name else "there"

        # Print prominent OTP console banner in development mode for instant local testing
        if getattr(self.settings, "APP_DEBUG", True) or getattr(self.settings, "APP_ENV", "development") != "production":
            print(f"\n=======================================================")
            print(f"[OTP VERIFICATION CODE] For: {to_email}")
            print(f"OTP CODE:  >>  {otp}  <<  (Valid for 10 minutes)")
            if verify_link:
                print(f"Direct Link Fallback: {verify_link}")
            print(f"=======================================================\n")

        subject = f"{otp} is your BudgetBrain verification code"

        # Build 6 individual digit cells for 100% email client compatibility (Gmail, Apple Mail, Outlook)
        digit_cells = "".join([
            f'<td align="center" valign="middle" style="padding: 0 4px;">'
            f'<div style="width: 46px; height: 56px; line-height: 56px; background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; font-size: 28px; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #065f46; text-align: center; box-shadow: 0 2px 4px rgba(16,185,129,0.1);">'
            f'{digit}'
            f'</div>'
            f'</td>'
            for digit in list(otp)
        ])

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); overflow: hidden;">
                  
                  <!-- Header Banner -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%); padding: 32px 24px; text-align: center;">
                      <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                        🧠 BudgetBrain
                      </div>
                      <div style="font-size: 13px; color: #a7f3d0; margin-top: 6px; font-weight: 500;">
                        Secure Account Verification
                      </div>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 36px 32px; text-align: center;">
                      <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
                        Verification Code
                      </h1>
                      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 28px 0;">
                        Hi {greeting_name},<br>
                        Please use the 6-digit security code below to activate your BudgetBrain vault:
                      </p>

                      <!-- 6-Box Segmented OTP Table -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 24px auto;">
                        <tr>
                          {digit_cells}
                        </tr>
                      </table>

                      <!-- Expiry & Security Badge -->
                      <div style="margin-bottom: 28px;">
                        <span style="display: inline-block; background-color: #fef3c7; border: 1px solid #fde68a; color: #92400e; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 9999px;">
                          ⏱️ Code expires in 10 minutes
                        </span>
                      </div>

                      {f'''
                      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px;">
                        <p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0;">
                          Prefer a 1-click login?
                        </p>
                        <a href="{verify_link}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff !important; padding: 10px 24px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none;">
                          Verify via Direct Link &rarr;
                        </a>
                      </div>
                      ''' if verify_link else ''}

                      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 28px 0 0 0;">
                        If you did not request this verification code, please ignore this email. No changes will be made to your account.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 24px; text-align: center;">
                      <div style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
                        &copy; BudgetBrain — AI-Powered Personal Finance & Budget Management.<br>
                        This is an automated security transmission. Please do not reply directly.
                      </div>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        return self._dispatch_email(to_email=to_email, subject=subject, html_content=html_content)
