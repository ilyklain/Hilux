export interface WebhookPayload {
  event: "block" | "suspicious" | "ban" | "challenge" | "system";
  ip: string;
  path?: string;
  score?: number;
  reasons?: string[];
  classification?: string;
  timestamp: string;
  meta?: Record<string, any>;
}

export interface WebhookDispatchOptions {
  urls: string[];
  retries?: number;
  timeoutMs?: number;
}

function buildDiscordEmbed(payload: WebhookPayload): object {
  const colorMap: Record<string, number> = {
    block: 0xff3b3b,
    ban: 0xff0000,
    suspicious: 0xffa500,
    challenge: 0xffcc00,
    system: 0x3b82f6,
  };

  return {
    embeds: [{
      title: `Hilux ${payload.event.toUpperCase()} Event`,
      color: colorMap[payload.event] || 0xffffff,
      fields: [
        { name: "IP", value: `\`${payload.ip}\``, inline: true },
        { name: "Score", value: `${payload.score ?? "N/A"}`, inline: true },
        { name: "Classification", value: payload.classification || payload.event, inline: true },
        ...(payload.path ? [{ name: "Path", value: `\`${payload.path}\``, inline: false }] : []),
        ...(payload.reasons?.length ? [{ name: "Reasons", value: payload.reasons.join("\n"), inline: false }] : []),
      ],
      timestamp: payload.timestamp,
      footer: { text: "Hilux Detection Engine" },
    }],
  };
}

function buildSlackPayload(payload: WebhookPayload): object {
  return {
    text: `*Hilux ${payload.event.toUpperCase()}* | IP: \`${payload.ip}\` | Score: ${payload.score ?? "N/A"} | ${payload.reasons?.join(", ") || "No details"}`,
  };
}

function buildGenericPayload(payload: WebhookPayload): object {
  return payload;
}

function detectWebhookType(url: string): "discord" | "slack" | "generic" {
  if (url.includes("discord.com/api/webhooks") || url.includes("discordapp.com/api/webhooks")) {
    return "discord";
  }
  if (url.includes("hooks.slack.com")) {
    return "slack";
  }
  return "generic";
}

async function sendWithRetry(url: string, body: object, retries: number, timeoutMs: number): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return;
    } catch (err) {
      if (attempt === retries) {
        console.error(`[Hilux Webhook] Failed after ${retries + 1} attempts to ${url}:`, err);
      } else {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
}

export async function dispatchWebhook(
  payload: WebhookPayload,
  options: WebhookDispatchOptions
): Promise<void> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 5000;

  const promises = options.urls.map(url => {
    const type = detectWebhookType(url);
    let body: object;

    switch (type) {
      case "discord":
        body = buildDiscordEmbed(payload);
        break;
      case "slack":
        body = buildSlackPayload(payload);
        break;
      default:
        body = buildGenericPayload(payload);
    }

    return sendWithRetry(url, body, retries, timeoutMs);
  });

  await Promise.allSettled(promises);
}
