import { z } from "zod";

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  errorCode?: "MISSING_URL" | "INVALID_URL" | "UNSUPPORTED_PROTOCOL";
  errorMessage?: string;
}

/**
 * Validates protocol and format of target website URLs.
 */
export function validateAndNormalizeUrl(rawInput: string | undefined | null): UrlValidationResult {
  if (!rawInput || typeof rawInput !== "string" || !rawInput.trim()) {
    return {
      isValid: false,
      errorCode: "MISSING_URL",
      errorMessage: "Website URL is required.",
    };
  }

  const trimmed = rawInput.trim();

  // Check if protocol was explicitly provided
  const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  let urlString = trimmed;

  if (hasProtocol) {
    const protocolMatch = trimmed.match(/^([a-zA-Z0-9+.-]+):/);
    const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : "";
    if (protocol !== "http" && protocol !== "https") {
      return {
        isValid: false,
        errorCode: "UNSUPPORTED_PROTOCOL",
        errorMessage: `Unsupported protocol '${protocol}:'. Only HTTP and HTTPS websites can be audited.`,
      };
    }
  } else {
    // Default to https://
    urlString = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isValid: false,
        errorCode: "UNSUPPORTED_PROTOCOL",
        errorMessage: "Only HTTP and HTTPS URLs are supported.",
      };
    }

    // Hostname checks
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname.length === 0) {
      return {
        isValid: false,
        errorCode: "INVALID_URL",
        errorMessage: "Target URL does not contain a valid domain name.",
      };
    }

    // Disallow invalid characters or spaces in host
    if (/\s/.test(hostname)) {
      return {
        isValid: false,
        errorCode: "INVALID_URL",
        errorMessage: "Host names cannot contain spaces.",
      };
    }

    // Normalized URL: standard port removal, lowercased host, stripped trailing slash on root
    parsed.hostname = hostname;
    if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
      parsed.port = "";
    }
    if (parsed.pathname === "/") {
      parsed.pathname = "";
    }

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch {
    return {
      isValid: false,
      errorCode: "INVALID_URL",
      errorMessage: "Invalid URL syntax. Please enter a valid address (e.g. example.com).",
    };
  }
}

/**
 * Zod schema using the robust validator.
 */
export const UrlInputSchema = z
  .string({ required_error: "Website URL is required." })
  .trim()
  .min(1, "Website URL is required.")
  .max(2048, "URL is too long (maximum 2048 characters).")
  .superRefine((val, ctx) => {
    const result = validateAndNormalizeUrl(val);
    if (!result.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.errorMessage || "Invalid URL",
      });
    }
  })
  .transform((val) => {
    const result = validateAndNormalizeUrl(val);
    return result.normalizedUrl || val;
  });

export type ValidatedUrl = z.infer<typeof UrlInputSchema>;
