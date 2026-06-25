using Microsoft.AspNetCore.Mvc;

namespace Flink.web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailPreviewController : ControllerBase
    {
        [HttpGet("otp")]
        public IActionResult OtpPreview([FromQuery] string otp, [FromQuery] string email)
        {
            var html = EmailPreviewPages.GetOtpPage(otp ?? "000000", email ?? "user@example.com");
            return Content(html, "text/html");
        }

        [HttpGet("verify")]
        public IActionResult VerifyPreview([FromQuery] string token, [FromQuery] string email)
        {
            var html = EmailPreviewPages.GetVerifyPage(token ?? "sample-token", email ?? "user@example.com");
            return Content(html, "text/html");
        }
    }

    public static class EmailPreviewPages
    {
        private const string BaseStyles = @"
:root {
  --bg: #0a0e1a;
  --card-bg: linear-gradient(145deg, #0f1729, #1a1f3a);
  --card-border: rgba(255,255,255,0.08);
  --title: #ffffff;
  --subtitle: #7b8bb5;
  --text: #c0c8e0;
  --label: #7b8bb5;
  --otp: #ffffff;
  --otp-box-bg: linear-gradient(135deg, rgba(0,212,255,0.08), rgba(123,47,247,0.08));
  --otp-box-border: #00d4ff;
  --warning-bg: rgba(255,107,107,0.08);
  --warning-border: rgba(255,107,107,0.2);
  --warning: #ff6b6b;
  --info-bg: rgba(0,212,255,0.05);
  --info-border: rgba(0,212,255,0.15);
  --info: #7b8bb5;
  --info-strong: #c0c8e0;
  --footer: #5a6488;
  --footer-sub: #3d4566;
  --accent: #00d4ff;
  --divider: linear-gradient(90deg, transparent, #00d4ff, #7b2ff7, transparent);
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f0f2f5;
    --card-bg: #ffffff;
    --card-border: rgba(0,0,0,0.08);
    --title: #1a1a2e;
    --subtitle: #64748b;
    --text: #4a5568;
    --label: #64748b;
    --otp: #1a1a2e;
    --otp-box-bg: linear-gradient(135deg, rgba(0,180,212,0.08), rgba(120,0,200,0.06));
    --otp-box-border: #00b4d4;
    --warning-bg: rgba(239,68,68,0.06);
    --warning-border: rgba(239,68,68,0.2);
    --warning: #dc2626;
    --info-bg: rgba(0,180,212,0.06);
    --info-border: rgba(0,180,212,0.15);
    --info: #64748b;
    --info-strong: #4a5568;
    --footer: #64748b;
    --footer-sub: #94a3b8;
    --accent: #00b4d4;
    --divider: linear-gradient(90deg, transparent, #00b4d4, #7b2ff7, transparent);
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 40px 20px;
  background-image:
    radial-gradient(circle at 15% 50%, rgba(0, 240, 255, 0.06), transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(176, 38, 255, 0.06), transparent 25%);
  transition: background 0.3s, color 0.3s;
}
.card {
  width: 100%; max-width: 500px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.header { padding: 40px 40px 20px; text-align: center; }
.logo { width: 80px; height: 80px; margin: 0 auto 20px; }
.title { margin: 0; color: var(--title); font-size: 28px; font-weight: 700; letter-spacing: 1px; }
.subtitle { margin: 6px 0 0; color: var(--subtitle); font-size: 13px; letter-spacing: 3px; text-transform: uppercase; }
.divider { height: 1px; margin: 0 40px; background: var(--divider); }
.body { padding: 30px 40px; text-align: center; }
.text { color: var(--text); font-size: 15px; margin: 0 0 8px; }
.otp-box {
  background: var(--otp-box-bg);
  border: 2px dashed var(--otp-box-border);
  border-radius: 16px; padding: 25px 20px;
  margin: 20px auto; display: inline-block;
}
.otp-label { margin: 0 0 8px; color: var(--label); font-size: 11px; text-transform: uppercase; letter-spacing: 3px; }
.otp-code { margin: 0; color: var(--otp); font-size: 42px; font-weight: 800; letter-spacing: 12px; font-family: 'Courier New', monospace; }
.warning {
  margin-top: 25px; background: var(--warning-bg); border: 1px solid var(--warning-border);
  border-radius: 10px; padding: 14px 20px;
}
.warning-text { margin: 0; color: var(--warning); font-size: 13px; }
.info-box {
  margin-top: 25px; background: var(--info-bg); border: 1px solid var(--info-border);
  border-radius: 10px; padding: 14px 20px;
}
.info-text { margin: 0; color: var(--info); font-size: 12px; }
.info-text strong { color: var(--info-strong); }
.footer { padding: 25px 40px 35px; text-align: center; }
.footer-main { margin: 0 0 6px; color: var(--footer); font-size: 12px; }
.footer-main strong { color: var(--accent); }
.footer-sub { margin: 0; color: var(--footer-sub); font-size: 11px; }
.footer-copy { margin: 15px 0 0; color: var(--footer-sub); font-size: 11px; }
.btn {
  display: inline-block; background: linear-gradient(135deg, #00d4ff, #7b2ff7);
  color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none;
  padding: 16px 50px; border-radius: 12px; letter-spacing: 1px;
  box-shadow: 0 4px 20px rgba(0,212,255,0.3); margin: 20px 0;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,212,255,0.4); }
";

        private const string LogoSvg = @"<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 100 100'>
  <defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#00d4ff'/><stop offset='100%' stop-color='#7b2ff7'/></linearGradient></defs>
  <rect width='100' height='100' rx='22' fill='url(#g)'/>
  <path d='M30 35 L50 25 L70 35 L70 55 L50 75 L30 55Z' fill='none' stroke='white' stroke-width='4' stroke-linejoin='round'/>
  <circle cx='50' cy='48' r='6' fill='white'/>
</svg>";

        public static string GetOtpPage(string otp, string email)
        {
            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>Flink - Email Verification</title>
<style>{BaseStyles}</style>
</head>
<body>
<div class='card'>
  <div class='header'>
    <div class='logo'>{LogoSvg}</div>
    <h1 class='title'>FLINK</h1>
    <p class='subtitle'>FastLink Messenger</p>
  </div>
  <div class='divider'></div>
  <div class='body'>
    <p class='text'>Hello,</p>
    <p class='text'>Use the following code to verify your email address:</p>
    <div class='otp-box'>
      <p class='otp-label'>Your Verification Code</p>
      <p class='otp-code'>{otp}</p>
    </div>
    <div class='warning'>
      <p class='warning-text'>This code expires in <strong>2 minutes</strong>. Do not share it with anyone.</p>
    </div>
  </div>
  <div class='divider'></div>
  <div class='footer'>
    <p class='footer-main'>Sent to <strong>{email}</strong></p>
    <p class='footer-sub'>If you did not request this, please ignore this email.</p>
    <p class='footer-copy'>&copy; 2026 Flink Messenger. All rights reserved.</p>
  </div>
</div>
</body>
</html>";
        }

        public static string GetVerifyPage(string token, string email)
        {
            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>Flink - Verify Email</title>
<style>{BaseStyles}</style>
</head>
<body>
<div class='card'>
  <div class='header'>
    <div class='logo'>{LogoSvg}</div>
    <h1 class='title'>FLINK</h1>
    <p class='subtitle'>FastLink Messenger</p>
  </div>
  <div class='divider'></div>
  <div class='body'>
    <p class='text'>Welcome to <strong style='color:var(--accent)'>Flink Messenger</strong>!</p>
    <p class='text'>Click the button below to verify your email and activate your account.</p>
    <a href='#' class='btn'>Verify My Email</a>
    <div class='info-box'>
      <p class='info-text'>This link expires in <strong>24 hours</strong>. If you did not create an account, please ignore this email.</p>
    </div>
  </div>
  <div class='divider'></div>
  <div class='footer'>
    <p class='footer-main'>Sent to <strong>{email}</strong></p>
    <p class='footer-copy'>&copy; 2026 Flink Messenger. All rights reserved.</p>
  </div>
</div>
</body>
</html>";
        }
    }
}
