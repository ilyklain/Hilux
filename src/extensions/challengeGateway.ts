/**
 * Hilux Challenge Gateway
 * 
 * When a request is classified as "suspicious" (not blocked),
 * this module can serve an HTML challenge page instead of
 * allowing the request through. Supports Cloudflare Turnstile,
 * hCaptcha, and a built-in JavaScript proof-of-work challenge.
 */

export interface ChallengeConfig {
  enabled: boolean;
  provider: "turnstile" | "hcaptcha" | "pow";
  siteKey?: string;
  secretKey?: string;
  powDifficulty?: number;
  sessionTtlSeconds: number;
  bypassCookieName: string;
}

const DEFAULT_CHALLENGE_CONFIG: ChallengeConfig = {
  enabled: false,
  provider: "pow",
  powDifficulty: 4,
  sessionTtlSeconds: 3600,
  bypassCookieName: "hilux_verified",
};

export function buildChallengeConfig(overrides?: Partial<ChallengeConfig>): ChallengeConfig {
  return { ...DEFAULT_CHALLENGE_CONFIG, ...overrides };
}

export function generateChallengeToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function getTurnstileHtml(siteKey: string, verifyEndpoint: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e5e5e5; }
    .container { text-align: center; padding: 3rem; border: 1px solid #262626; border-radius: 1.5rem; background: #111; max-width: 420px; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #a3a3a3; margin-bottom: 2rem; line-height: 1.6; }
    .cf-turnstile { display: flex; justify-content: center; margin-bottom: 1.5rem; }
    .footer { font-size: 0.7rem; color: #525252; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verification Required</h1>
    <p>Please complete the security challenge to continue.</p>
    <form method="POST" action="${verifyEndpoint}">
      <div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="onSuccess"></div>
      <input type="hidden" name="redirect" value="">
    </form>
    <div class="footer">Protected by Hilux</div>
  </div>
  <script>
    document.querySelector('input[name="redirect"]').value = window.location.href;
    function onSuccess() { document.querySelector('form').submit(); }
  </script>
</body>
</html>`;
}

function getHCaptchaHtml(siteKey: string, verifyEndpoint: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification</title>
  <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e5e5e5; }
    .container { text-align: center; padding: 3rem; border: 1px solid #262626; border-radius: 1.5rem; background: #111; max-width: 420px; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #a3a3a3; margin-bottom: 2rem; line-height: 1.6; }
    .footer { font-size: 0.7rem; color: #525252; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verification Required</h1>
    <p>Please complete the security challenge to continue.</p>
    <form method="POST" action="${verifyEndpoint}">
      <div class="h-captcha" data-sitekey="${siteKey}" data-callback="onSuccess"></div>
      <input type="hidden" name="redirect" value="">
    </form>
    <div class="footer">Protected by Hilux</div>
  </div>
  <script>
    document.querySelector('input[name="redirect"]').value = window.location.href;
    function onSuccess() { document.querySelector('form').submit(); }
  </script>
</body>
</html>`;
}

function getPowHtml(difficulty: number, verifyEndpoint: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e5e5e5; }
    .container { text-align: center; padding: 3rem; border: 1px solid #262626; border-radius: 1.5rem; background: #111; max-width: 420px; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #a3a3a3; margin-bottom: 2rem; line-height: 1.6; }
    .spinner { width: 32px; height: 32px; border: 3px solid #262626; border-top-color: #e5e5e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { font-size: 0.8rem; color: #737373; font-family: monospace; }
    .footer { font-size: 0.7rem; color: #525252; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verifying your connection</h1>
    <p>This is an automatic security check. Please wait.</p>
    <div class="spinner"></div>
    <div class="status" id="status">Computing challenge...</div>
    <div class="footer">Protected by Hilux</div>
  </div>
  <script>
    (async () => {
      const target = "${"0".repeat(difficulty)}";
      const challenge = Date.now().toString(36) + Math.random().toString(36).slice(2);
      let nonce = 0;
      const statusEl = document.getElementById("status");

      while (true) {
        const data = challenge + nonce;
        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

        if (hashHex.startsWith(target)) {
          statusEl.textContent = "Verified. Redirecting...";

          const form = document.createElement("form");
          form.method = "POST";
          form.action = "${verifyEndpoint}";
          
          const fields = { challenge, nonce: nonce.toString(), hash: hashHex, redirect: window.location.href };
          for (const [k, v] of Object.entries(fields)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = k;
            input.value = v;
            form.appendChild(input);
          }
          
          document.body.appendChild(form);
          form.submit();
          return;
        }

        nonce++;
        if (nonce % 5000 === 0) {
          statusEl.textContent = "Computing... " + nonce.toLocaleString() + " iterations";
          await new Promise(r => setTimeout(r, 0));
        }
      }
    })();
  </script>
</body>
</html>`;
}

export function getChallengeHtml(config: ChallengeConfig, verifyEndpoint: string): string {
  switch (config.provider) {
    case "turnstile":
      return getTurnstileHtml(config.siteKey || "", verifyEndpoint);
    case "hcaptcha":
      return getHCaptchaHtml(config.siteKey || "", verifyEndpoint);
    case "pow":
    default:
      return getPowHtml(config.powDifficulty || 4, verifyEndpoint);
  }
}

export async function verifyTurnstileToken(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const data: any = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function verifyHCaptchaToken(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const data: any = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export function verifyPowSolution(challenge: string, nonce: string, hash: string, difficulty: number): boolean {
  const target = "0".repeat(difficulty);
  return hash.startsWith(target);
}
