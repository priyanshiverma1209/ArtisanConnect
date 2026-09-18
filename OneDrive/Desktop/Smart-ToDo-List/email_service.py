import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

def get_smtp_config():
    """
    Retrieves SMTP settings from environment variables with hot reloading.
    """
    if load_dotenv:
        load_dotenv(override=True)
        
    return {
        'server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
        'port': int(os.environ.get('SMTP_PORT', 587)),
        'email': os.environ.get('SMTP_EMAIL', os.environ.get('MAIL_USERNAME', '')).strip(),
        'password': os.environ.get('SMTP_PASSWORD', os.environ.get('MAIL_PASSWORD', '')).strip(),
        'use_tls': os.environ.get('SMTP_USE_TLS', 'true').lower() in ('true', '1', 'yes'),
        'sender_name': os.environ.get('SMTP_SENDER_NAME', 'Smart Task Manager AI')
    }

def send_otp_email(to_email, otp_code, recipient_name="User"):
    """
    Sends a 6-digit OTP verification code to the recipient's email address.
    Returns (success: bool, message: str).
    """
    config = get_smtp_config()
    sender_email = config['email']
    sender_password = config['password']
    smtp_server = config['server']
    smtp_port = config['port']
    sender_name = config['sender_name']

    # If no SMTP credentials configured, log OTP in console for local dev/testing
    if not sender_email or not sender_password:
        print("\n" + "=" * 60)
        print(f"[DEVELOPMENT MODE] Email credentials not configured in .env.")
        print(f"[OTP NOTIFICATION] To: {to_email}")
        print(f"[OTP CODE] ---> {otp_code} <--- (Valid for 10 minutes)")
        print("=" * 60 + "\n")
        return True, "DEV_SIMULATION"

    try:
        # Create multipart message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Password Reset Code: {otp_code} - Smart Task Manager"
        msg['From'] = f"{sender_name} <{sender_email}>"
        msg['To'] = to_email

        # Plain-text version
        plain_text = f"""Hello {recipient_name},

We received a request to reset your password for your Smart Task Manager account.

Your One-Time Password (OTP) is:
{otp_code}

This code will expire in 10 minutes. If you did not request this password reset, please ignore this email and your account will remain secure.

Best regards,
The Smart Task Manager Team
"""

        # HTML version with modern aesthetic styling
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #e2e8f0;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 520px;
            margin: 0 auto;
            background: #1e293b;
            border-radius: 16px;
            border: 1px solid #334155;
            padding: 36px 28px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }}
        .header {{
            text-align: center;
            margin-bottom: 24px;
        }}
        .logo {{
            font-size: 36px;
            margin-bottom: 8px;
            display: inline-block;
        }}
        .title {{
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 6px 0;
        }}
        .subtitle {{
            font-size: 14px;
            color: #94a3b8;
            margin: 0;
        }}
        .content {{
            margin-bottom: 28px;
            line-height: 1.6;
            font-size: 15px;
            color: #cbd5e1;
        }}
        .otp-container {{
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(79, 70, 229, 0.15));
            border: 2px dashed #3b82f6;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
        }}
        .otp-label {{
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #60a5fa;
            margin-bottom: 8px;
        }}
        .otp-code {{
            font-family: 'Courier New', Courier, monospace;
            font-size: 34px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #ffffff;
            margin: 0;
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }}
        .expire-note {{
            font-size: 13px;
            color: #f59e0b;
            margin-top: 10px;
            margin-bottom: 0;
        }}
        .footer {{
            border-top: 1px solid #334155;
            padding-top: 20px;
            font-size: 12px;
            color: #64748b;
            text-align: center;
            line-height: 1.5;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚀</div>
            <h1 class="title">Reset Your Password</h1>
            <p class="subtitle">Smart Task Manager AI</p>
        </div>
        
        <div class="content">
            <p>Hello <strong>{recipient_name}</strong>,</p>
            <p>We received a request to reset your password. Use the verification code below to complete your password reset:</p>
            
            <div class="otp-container">
                <div class="otp-label">Your One-Time Password</div>
                <div class="otp-code">{otp_code}</div>
                <p class="expire-note">⏱️ This code will expire in <strong>10 minutes</strong>.</p>
            </div>
            
            <p style="font-size: 13px; color: #94a3b8;">If you did not request this code, you can safely ignore this email. No changes will be made to your account without this code.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated security email from Smart Task Manager.<br>Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
"""

        msg.attach(MIMEText(plain_text, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))

        # Send via SMTP
        if config['use_tls']:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
                server.starttls(context=context)
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15) as server:
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, to_email, msg.as_string())

        return True, "OTP email sent successfully."
    except Exception as e:
        error_str = str(e)
        print(f"[EMAIL ERROR] Failed to send email to {to_email}: {error_str}")
        print(f"[OTP FALLBACK] OTP for {to_email} is: {otp_code}")
        return False, f"Failed to send email: {error_str}"
