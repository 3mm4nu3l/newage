type TwilioStartResult = {
  ok: boolean;
  mock?: boolean;
  message?: string;
};

type TwilioCheckResult = TwilioStartResult & {
  approved?: boolean;
};

function hasTwilioConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID,
  );
}

function authHeader() {
  const token = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  return `Basic ${token}`;
}

function verifyUrl(path: string) {
  return `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}${path}`;
}

export async function startSmsVerification(phone: string): Promise<TwilioStartResult> {
  if (!hasTwilioConfig()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, message: "Twilio n'est pas configuré." };
    }

    return { ok: true, mock: true, message: "Code de test : 123456" };
  }

  const response = await fetch(verifyUrl("/Verifications"), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: phone,
      Channel: "sms",
      Locale: "fr",
    }),
  });

  if (!response.ok) {
    return { ok: false, message: "Impossible d'envoyer le code pour le moment." };
  }

  return { ok: true };
}

export async function checkSmsVerification(phone: string, code: string): Promise<TwilioCheckResult> {
  if (!hasTwilioConfig()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, approved: false, message: "Twilio n'est pas configuré." };
    }

    return {
      ok: code === "123456",
      approved: code === "123456",
      mock: true,
      message: code === "123456" ? undefined : "Code incorrect.",
    };
  }

  const response = await fetch(verifyUrl("/VerificationCheck"), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: phone,
      Code: code,
    }),
  });

  if (!response.ok) {
    return { ok: false, approved: false, message: "Code incorrect ou expiré." };
  }

  const payload = (await response.json()) as { status?: string };

  return {
    ok: payload.status === "approved",
    approved: payload.status === "approved",
    message: payload.status === "approved" ? undefined : "Code incorrect ou expiré.",
  };
}
