const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY ?? "";

export interface ContactPayload {
  name: string;
  email: string;
  topic: string;
  message: string;
  subject: string;
  botcheck?: string;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateContactPayload(input: unknown): ContactPayload {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid contact payload");
  }

  const record = input as Record<string, unknown>;
  const payload = {
    name: asText(record.name),
    email: asText(record.email),
    topic: asText(record.topic),
    message: asText(record.message),
    subject: asText(record.subject),
    botcheck: asText(record.botcheck),
  };

  if (!payload.name || !payload.email || !payload.message || !payload.subject) {
    throw new Error("Missing contact fields");
  }

  return payload;
}

export async function sendContactMessage(input: unknown) {
  const data = validateContactPayload(input);
  if (!WEB3FORMS_ACCESS_KEY) {
    return { success: false, reason: "missing_web3forms_key" };
  }
  if (data.botcheck) {
    return { success: false, reason: "botcheck" };
  }

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: data.subject,
      from_name: "MATS Subway",
      name: data.name,
      email: data.email,
      replyto: data.email,
      topic: data.topic,
      message: data.message,
      botcheck: data.botcheck ?? "",
    }),
  });

  const result = (await response.json().catch(() => ({}))) as { success?: boolean };
  return { success: response.ok && result.success === true };
}
