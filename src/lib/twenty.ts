export type LeadPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  projectType: string;
  projectAmount: string;
  contribution: string;
  duration: string;
  message?: string;
};

type TwentyResult = {
  ok: boolean;
  mode: "webhook" | "api" | "disabled";
  message?: string;
};

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export async function sendLeadToTwenty(lead: LeadPayload): Promise<TwentyResult> {
  if (process.env.TWENTY_INTAKE_WEBHOOK_URL) {
    const response = await fetch(process.env.TWENTY_INTAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ezto.fr",
        receivedAt: new Date().toISOString(),
        lead,
      }),
    });

    return {
      ok: response.ok,
      mode: "webhook",
      message: response.ok ? undefined : "Twenty webhook a refusé la demande.",
    };
  }

  if (!process.env.TWENTY_API_BASE_URL || !process.env.TWENTY_API_KEY) {
    return { ok: true, mode: "disabled" };
  }

  const baseUrl = normalizeBaseUrl(process.env.TWENTY_API_BASE_URL);
  const headers = {
    Authorization: `Bearer ${process.env.TWENTY_API_KEY}`,
    "Content-Type": "application/json",
  };

  const personResponse = await fetch(`${baseUrl}/rest/people`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: {
        firstName: lead.firstName,
        lastName: lead.lastName,
      },
      emails: {
        primaryEmail: lead.email,
      },
      phones: {
        primaryPhoneNumber: lead.phone,
      },
      city: lead.city,
    }),
  });

  if (!personResponse.ok) {
    return {
      ok: false,
      mode: "api",
      message: "Création du contact Twenty impossible.",
    };
  }

  await fetch(`${baseUrl}/rest/opportunities`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `Demande ezto - ${lead.firstName} ${lead.lastName}`,
      amount: Number(lead.projectAmount) || null,
      stage: "Nouveau lead",
      source: "ezto.fr",
      projectType: lead.projectType,
      contribution: Number(lead.contribution) || null,
      duration: lead.duration,
      message: lead.message || null,
    }),
  });

  return { ok: true, mode: "api" };
}
