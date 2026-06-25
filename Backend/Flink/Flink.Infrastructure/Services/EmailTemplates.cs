namespace Flink.Infrastructure.Services
{
    public static class EmailTemplates
    {
        private const string LogoSvg = @"<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 100 100'>
  <defs>
    <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='#00d4ff'/>
      <stop offset='100%' stop-color='#7b2ff7'/>
    </linearGradient>
  </defs>
  <rect width='100' height='100' rx='22' fill='url(#g)'/>
  <path d='M30 35 L50 25 L70 35 L70 55 L50 75 L30 55Z' fill='none' stroke='white' stroke-width='4' stroke-linejoin='round'/>
  <circle cx='50' cy='48' r='6' fill='white'/>
</svg>";

        public static string GetOtpEmailHtml(string otp, string recipientEmail, string clientUrl)
        {
            var previewUrl = $"{clientUrl}/api/emailpreview/otp?otp={otp}&email={recipientEmail}";
            return $@"<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='margin:0;padding:0;background:#f0f2f5;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0f2f5;padding:40px 20px;'>
<tr><td align='center'>
<table width='500' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:20px;border:1px solid rgba(0,0,0,0.08);overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);'>
  <tr><td style='padding:40px 40px 20px;text-align:center;'>
    <div style='margin:0 auto 20px;'>{LogoSvg}</div>
    <h1 style='margin:0;color:#1a1a2e;font-size:28px;font-weight:700;letter-spacing:1px;'>FLINK</h1>
    <p style='margin:6px 0 0;color:#64748b;font-size:13px;letter-spacing:3px;text-transform:uppercase;'>FastLink Messenger</p>
  </td></tr>
  <tr><td style='padding:0 40px;'>
    <div style='height:1px;background:linear-gradient(90deg,transparent,#00b4d4,#7b2ff7,transparent);'></div>
  </td></tr>
  <tr><td style='padding:30px 40px;text-align:center;'>
    <p style='color:#4a5568;font-size:15px;margin:0 0 8px;'>Hello,</p>
    <p style='color:#4a5568;font-size:15px;margin:0 0 25px;'>Use the following code to verify your email address:</p>
    <div style='background:linear-gradient(135deg,rgba(0,180,212,0.08),rgba(120,0,200,0.06));border:2px dashed #00b4d4;border-radius:16px;padding:25px 20px;margin:0 auto;display:inline-block;'>
      <p style='margin:0 0 8px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:3px;'>Your Verification Code</p>
      <p style='margin:0;color:#1a1a2e;font-size:42px;font-weight:800;letter-spacing:12px;font-family:Courier New,monospace;'>{otp}</p>
    </div>
    <div style='margin-top:30px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 20px;'>
      <p style='margin:0;color:#dc2626;font-size:13px;'>This code expires in <strong>2 minutes</strong>. Do not share it with anyone.</p>
    </div>
    <div style='margin-top:24px;'>
      <a href='{previewUrl}' style='color:#64748b;font-size:12px;text-decoration:underline;'>View in browser (auto dark/light mode)</a>
    </div>
  </td></tr>
  <tr><td style='padding:0 40px;'>
    <div style='height:1px;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.06),transparent);'></div>
  </td></tr>
  <tr><td style='padding:25px 40px 35px;text-align:center;'>
    <p style='margin:0 0 6px;color:#64748b;font-size:12px;'>Sent to <strong style='color:#00b4d4;'>{recipientEmail}</strong></p>
    <p style='margin:0;color:#94a3b8;font-size:11px;'>If you did not request this, please ignore this email.</p>
    <p style='margin:15px 0 0;color:#94a3b8;font-size:11px;'>&copy; 2026 Flink Messenger. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>";
        }

        public static string GetVerificationEmailHtml(string verifyUrl, string recipientEmail, string clientUrl)
        {
            var previewUrl = $"{clientUrl}/api/emailpreview/verify?token=sample&email={recipientEmail}";
            return $@"<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='margin:0;padding:0;background:#f0f2f5;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0f2f5;padding:40px 20px;'>
<tr><td align='center'>
<table width='500' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:20px;border:1px solid rgba(0,0,0,0.08);overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);'>
  <tr><td style='padding:40px 40px 20px;text-align:center;'>
    <div style='margin:0 auto 20px;'>{LogoSvg}</div>
    <h1 style='margin:0;color:#1a1a2e;font-size:28px;font-weight:700;letter-spacing:1px;'>FLINK</h1>
    <p style='margin:6px 0 0;color:#64748b;font-size:13px;letter-spacing:3px;text-transform:uppercase;'>FastLink Messenger</p>
  </td></tr>
  <tr><td style='padding:0 40px;'>
    <div style='height:1px;background:linear-gradient(90deg,transparent,#00b4d4,#7b2ff7,transparent);'></div>
  </td></tr>
  <tr><td style='padding:30px 40px;text-align:center;'>
    <p style='color:#4a5568;font-size:15px;margin:0 0 8px;'>Welcome to <strong style='color:#00b4d4;'>Flink Messenger</strong>!</p>
    <p style='color:#4a5568;font-size:15px;margin:0 0 30px;'>Click the button below to verify your email and activate your account.</p>
    <a href='{verifyUrl}' style='display:inline-block;background:linear-gradient(135deg,#00b4d4,#7b2ff7);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 50px;border-radius:12px;letter-spacing:1px;box-shadow:0 4px 20px rgba(0,180,212,0.3);'>Verify My Email</a>
    <div style='margin-top:30px;background:rgba(0,180,212,0.06);border:1px solid rgba(0,180,212,0.15);border-radius:10px;padding:14px 20px;'>
      <p style='margin:0;color:#64748b;font-size:12px;'>This link expires in <strong style='color:#4a5568;'>24 hours</strong>. If you did not create an account, please ignore this email.</p>
    </div>
    <div style='margin-top:20px;'>
      <a href='{previewUrl}' style='color:#64748b;font-size:12px;text-decoration:underline;'>View in browser (auto dark/light mode)</a>
    </div>
  </td></tr>
  <tr><td style='padding:0 40px;'>
    <div style='height:1px;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.06),transparent);'></div>
  </td></tr>
  <tr><td style='padding:25px 40px 35px;text-align:center;'>
    <p style='margin:0 0 6px;color:#64748b;font-size:12px;'>Sent to <strong style='color:#00b4d4;'>{recipientEmail}</strong></p>
    <p style='margin:0;color:#94a3b8;font-size:11px;'>&copy; 2026 Flink Messenger. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>";
        }
    }
}
