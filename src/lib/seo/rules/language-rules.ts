import type { SEOCheckResult } from "../types";

export function checkLanguageDeclaration(language: string | null): SEOCheckResult {
  if (!language || language.trim().length === 0) {
    return {
      checkId: "seo_language_declaration",
      category: "seo",
      name: "HTML Language Declaration",
      status: "fail",
      severity: "warning",
      explanation: "The <html> element does not specify a 'lang' attribute.",
      evidence: null,
      recommendation: "Declare a language code on the root HTML tag (e.g. <html lang=\"en\">) to assist regional search indexing.",
    };
  }

  // Basic format check (e.g. en, en-US, es-ES, fr)
  const isValidLangFormat = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)?$/.test(language);
  if (!isValidLangFormat) {
    return {
      checkId: "seo_language_declaration",
      category: "seo",
      name: "HTML Language Declaration",
      status: "warning",
      severity: "info",
      explanation: `HTML 'lang' attribute value '${language}' does not follow standard IETF language tag formatting (e.g. 'en' or 'en-US').`,
      evidence: language,
      recommendation: "Ensure the language code conforms to BCP 47 / ISO standards.",
    };
  }

  return {
    checkId: "seo_language_declaration",
    category: "seo",
    name: "HTML Language Declaration",
    status: "pass",
    severity: "none",
    explanation: `Document correctly declares language '${language}'.`,
    evidence: language,
    recommendation: null,
  };
}
