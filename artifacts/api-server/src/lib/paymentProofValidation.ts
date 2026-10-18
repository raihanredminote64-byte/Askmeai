import OpenAI from "openai";
import type { File } from "@google-cloud/storage";

const client = new OpenAI({
  apiKey: process.env["NINEINFERENCE_API_KEY"] || "",
  baseURL: process.env["NINEINFERENCE_BASE_URL"] || "https://9inference.cloud/v1",
});

const MODEL = process.env["AI_MODEL"] || "deepseek-v4-pro";
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export type ProofValidationStatus = "VALID" | "INVALID" | "REVIEW";

export type ProofValidationResult = {
  status: ProofValidationStatus;
  transferDate: string | null;
  confidence: number | null;
  reason: string;
};

function dateInJakarta(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  const match = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseModelJson(content: string): Record<string, unknown> {
  const cleaned = content.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI returned no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

export async function validatePaymentProof(
  file: File,
  subscribedAt: Date,
): Promise<ProofValidationResult> {
  const expectedDate = dateInJakarta(subscribedAt);

  try {
    const [metadata] = await file.getMetadata();
    const contentType = String(metadata.contentType || "");
    if (!/^image\/(png|jpeg|webp)$/.test(contentType)) {
      return {
        status: "INVALID",
        transferDate: null,
        confidence: null,
        reason: "The uploaded proof is not a supported image file.",
      };
    }

    const [buffer] = await file.download();
    const imageData = `data:${contentType};base64,${buffer.toString("base64")}`;
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You validate Indonesian payment receipt screenshots. Never guess unreadable text. Return only JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Inspect this payment proof image. Extract the transfer date and determine whether it clearly shows a genuine payment receipt. ` +
                `Return exactly this JSON shape: {"isPaymentProof":true,"transferDate":"YYYY-MM-DD or null","confidence":0.0,"notes":"short reason"}. ` +
                `Use the date printed on the receipt, not the upload date. Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD. ` +
                `The expected subscribe date is ${expectedDate}, but do not force the image to match it.`,
            },
            {
              type: "image_url",
              image_url: { url: imageData },
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("AI returned an empty validation response");
    }

    const result = parseModelJson(content);
    const transferDate = normalizeDate(result.transferDate);
    const isPaymentProof = result.isPaymentProof === true;
    const confidence = typeof result.confidence === "number" && Number.isFinite(result.confidence)
      ? Math.min(1, Math.max(0, result.confidence))
      : null;
    const notes = typeof result.notes === "string" ? result.notes.trim() : "";

    if (!isPaymentProof) {
      return {
        status: "INVALID",
        transferDate,
        confidence,
        reason: notes || "The image does not clearly show a payment receipt.",
      };
    }
    if (!transferDate) {
      return {
        status: "REVIEW",
        transferDate: null,
        confidence,
        reason: notes || "The transfer date could not be read automatically.",
      };
    }
    if (transferDate !== expectedDate) {
      return {
        status: "INVALID",
        transferDate,
        confidence,
        reason: `Transfer date ${transferDate} does not match the subscribe date ${expectedDate}.`,
      };
    }

    return {
      status: "VALID",
      transferDate,
      confidence,
      reason: notes || `Transfer date matches the subscribe date ${expectedDate}.`,
    };
  } catch (error) {
    console.error("Payment proof validation failed", error);
    return {
      status: "REVIEW",
      transferDate: null,
      confidence: null,
      reason: "Automatic validation could not read this proof. Admin review is required.",
    };
  }
}