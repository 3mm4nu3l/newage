"use client";

import { ArrowRight, Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  projectType: string;
  projectAmount: string;
  contribution: string;
  duration: string;
  message: string;
};

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  projectType: "Résidence principale",
  projectAmount: "",
  contribution: "",
  duration: "20 ans",
  message: "",
};

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error((data as { message?: string }).message || "Une erreur est survenue.");
  }

  return data;
}

export function LeadForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "checking" | "submitting" | "sent">("idle");
  const [message, setMessage] = useState("");

  const isVerified = Boolean(verificationToken);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === "phone") {
      setVerificationToken("");
      setCode("");
    }
  }

  async function sendCode() {
    setStatus("sending");
    setMessage("");

    try {
      const result = await postJson<{ ok: boolean; mock?: boolean; message?: string }>("/api/verify/start", {
        phone: form.phone,
      });
      setMessage(result.mock ? result.message || "Code de test envoyé." : "Code envoyé par SMS.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'envoyer le code.");
    } finally {
      setStatus("idle");
    }
  }

  async function verifyCode() {
    setStatus("checking");
    setMessage("");

    try {
      const result = await postJson<{ ok: boolean; token: string; mock?: boolean }>("/api/verify/check", {
        phone: form.phone,
        code,
      });
      setVerificationToken(result.token);
      setMessage("Mobile vérifié.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Code incorrect.");
    } finally {
      setStatus("idle");
    }
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      await postJson("/api/leads", {
        ...form,
        verificationToken,
      });
      setStatus("sent");
      setForm(initialFormState);
      setCode("");
      setVerificationToken("");
      setMessage("Demande envoyée. Un courtier vous rappelle rapidement.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible d'envoyer la demande.");
    }
  }

  return (
    <form className="lead-form" onSubmit={submitLead}>
      <div className="form-grid two">
        <label>
          <span>Prénom</span>
          <input required value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
        </label>
        <label>
          <span>Nom</span>
          <input required value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          <span>Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </label>
        <label>
          <span>Ville</span>
          <input required value={form.city} onChange={(event) => updateField("city", event.target.value)} />
        </label>
      </div>

      <label>
        <span>Mobile</span>
        <div className="phone-row">
          <input
            required
            inputMode="tel"
            placeholder="06 12 34 56 78"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
          />
          <button disabled={status === "sending" || !form.phone || isVerified} onClick={sendCode} type="button">
            {status === "sending" ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}
            {isVerified ? "Vérifié" : "Code"}
          </button>
        </div>
      </label>

      {!isVerified && (
        <label>
          <span>Code SMS</span>
          <div className="phone-row">
            <input
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <button disabled={status === "checking" || code.length < 4} onClick={verifyCode} type="button">
              {status === "checking" ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
              Valider
            </button>
          </div>
        </label>
      )}

      <div className="form-grid two">
        <label>
          <span>Projet</span>
          <select value={form.projectType} onChange={(event) => updateField("projectType", event.target.value)}>
            <option>Résidence principale</option>
            <option>Résidence secondaire</option>
            <option>Investissement locatif</option>
            <option>Rachat de prêt</option>
          </select>
        </label>
        <label>
          <span>Durée souhaitée</span>
          <select value={form.duration} onChange={(event) => updateField("duration", event.target.value)}>
            <option>10 ans</option>
            <option>15 ans</option>
            <option>20 ans</option>
            <option>25 ans</option>
          </select>
        </label>
      </div>

      <div className="form-grid two">
        <label>
          <span>Montant du projet</span>
          <input
            required
            inputMode="numeric"
            placeholder="350000"
            value={form.projectAmount}
            onChange={(event) => updateField("projectAmount", event.target.value)}
          />
        </label>
        <label>
          <span>Apport</span>
          <input
            required
            inputMode="numeric"
            placeholder="50000"
            value={form.contribution}
            onChange={(event) => updateField("contribution", event.target.value)}
          />
        </label>
      </div>

      <label>
        <span>Message</span>
        <textarea
          rows={4}
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          placeholder="Disponibilité, banque actuelle, précision utile..."
        />
      </label>

      <label className="consent-row">
        <input required type="checkbox" />
        <span>J’accepte d’être contacté par un courtier ezto au sujet de mon projet immobilier.</span>
      </label>

      <button className="submit-button" disabled={!isVerified || status === "submitting"} type="submit">
        {status === "submitting" ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
        Envoyer ma demande
      </button>

      {message && <p className={`form-message ${status === "sent" ? "success" : ""}`}>{message}</p>}
    </form>
  );
}
