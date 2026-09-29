import React from "react";
import { SystemSettings } from "../types";

/**
 * Clean institution name to hide/remove "/ Bangladesh Krishi Bank" or English translations from official headers
 */
export function getCleanInstitutionName(name?: string): string {
  if (!name) return "বাংলাদেশ কৃষি ব্যাংক";
  const cleaned = name
    .replace(/\/[\s]*Bangladesh Krishi Bank/gi, "")
    .replace(/\/[\s]*BANGLADESH KRISHI BANK/gi, "")
    .replace(/-[\s]*Bangladesh Krishi Bank/gi, "")
    .replace(/Bangladesh Krishi Bank/gi, "")
    .replace(/\/[\s]*[a-zA-Z\s]+/g, "")
    .replace(/[/\-—]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "বাংলাদেশ কৃষি ব্যাংক";
}

export function isDocumentLogoEnabled(
  systemSettings?: SystemSettings | null,
  toolId?: string,
  docId?: string
): boolean {
  if (!systemSettings?.brandingPolicy) return true;
  const branding = systemSettings.brandingPolicy;
  if (branding.showLogo === false) return false;

  if (toolId && docId && branding.documentRules) {
    const key1 = `${toolId}:${docId}`;
    const key2 = `${toolId}::${docId}`;
    let rule = branding.documentRules[key1] ?? branding.documentRules[key2];
    if (rule === undefined) {
      // Check partial/wildcard matching for docId (e.g. "forwarding" matching "form1-forwarding" or "postfacto-forwarding")
      for (const [k, r] of Object.entries(branding.documentRules)) {
        if (k.startsWith(`${toolId}:`) && k.includes(docId)) {
          rule = r;
          break;
        }
      }
    }
    if (rule !== undefined) {
      return (rule as any).logoHeaderEnabled !== false;
    }
  }
  return true;
}

export function isDocumentWatermarkEnabled(
  systemSettings?: SystemSettings | null,
  toolId?: string,
  docId?: string
): boolean {
  if (!systemSettings?.brandingPolicy) return true;
  const branding = systemSettings.brandingPolicy;
  if (branding.showWatermark === false) return false;

  if (toolId && docId && branding.documentRules) {
    const key1 = `${toolId}:${docId}`;
    const key2 = `${toolId}::${docId}`;
    let rule = branding.documentRules[key1] ?? branding.documentRules[key2];
    if (rule === undefined) {
      for (const [k, r] of Object.entries(branding.documentRules)) {
        if (k.startsWith(`${toolId}:`) && k.includes(docId)) {
          rule = r;
          break;
        }
      }
    }
    if (rule !== undefined) {
      return (rule as any).watermarkEnabled !== false;
    }
  }
  return true;
}

interface GlobalBrandingProps {
  systemSettings?: SystemSettings | null;
  officeName?: string;
  slogan?: string;
  websiteUrl?: string;
  className?: string;
  toolId?: string;
  docId?: string;
}

/**
 * Standard Vector SVG for Bangladesh Krishi Bank Official Emblem
 */
export function DefaultBKBLogoSvg({
  width = 56,
  height = 56,
  className = "",
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      className={className}
      style={{ display: "block" }}
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" strokeWidth="6" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" strokeWidth="1.5" strokeDasharray="3,2" />
      <path
        d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82"
        fill="none"
        stroke="#006a4e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="50" cy="22" r="3" fill="#f42a41" />
    </svg>
  );
}

/**
 * React Component: Official Bank Pad Header
 * Follows exact standard: 1.6em Title, 1.1em Subtitle, 0.9em Slogan, 0.75em URL
 */
export function GlobalDocumentPadHeader({
  systemSettings,
  officeName,
  slogan: propSlogan,
  websiteUrl: propWebsiteUrl,
  className = "",
  toolId,
  docId,
}: GlobalBrandingProps) {
  if (!isDocumentLogoEnabled(systemSettings, toolId, docId)) {
    return null;
  }

  const branding = systemSettings?.brandingPolicy;
  const logoUrl = branding?.logoUrl || systemSettings?.logoUrl;
  const institutionName = getCleanInstitutionName(
    branding?.institutionName || systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"
  );
  const displayOffice =
    officeName || branding?.officeName || systemSettings?.description || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি";
  const slogan = propSlogan || branding?.slogan || "গণমানুষের ব্যাংক";
  const websiteUrl = propWebsiteUrl || branding?.websiteUrl || "www.krishibank.gov.bd";

  return (
    <div
      className={`pad-header flex justify-between items-center border-b-[1.5px] border-black pb-2 mb-4 w-full select-none ${className}`}
    >
      {/* Left: Emblem or Custom Logo */}
      <div className="w-[70px] flex items-center justify-start shrink-0">
        {logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "" ? (
          <img
            src={logoUrl}
            alt="Institution Logo"
            className="w-[56px] h-[56px] max-h-[56px] max-w-[65px] object-contain block"
          />
        ) : (
          <DefaultBKBLogoSvg width={56} height={56} />
        )}
      </div>

      {/* Center: Large Proportional Titles without English translation */}
      <div className="flex-1 text-center px-2">
        <div className="pad-header-title font-bold text-black leading-[1.1] text-[1.6em]">
          {institutionName}
        </div>
        <div className="pad-header-subtitle font-bold text-black mt-0.5 text-[1.1em]">
          {displayOffice}
        </div>
      </div>

      {/* Right: Slogan & Website URL */}
      <div className="w-[130px] text-right leading-[1.2] shrink-0">
        <div className="pad-header-tagline font-bold text-black text-[0.9em]">{slogan}</div>
        <div className="pad-header-url text-[#222] mt-0.5 text-[0.75em]">{websiteUrl}</div>
      </div>
    </div>
  );
}

/**
 * React Component: Official Watermark Background Overlay
 */
export function GlobalDocumentWatermark({
  systemSettings,
  opacity,
  className = "",
  toolId,
  docId,
}: {
  systemSettings?: SystemSettings | null;
  opacity?: number;
  className?: string;
  toolId?: string;
  docId?: string;
}) {
  if (!isDocumentWatermarkEnabled(systemSettings, toolId, docId)) {
    return null;
  }

  const branding = systemSettings?.brandingPolicy;
  const watermarkOpacity =
    opacity ?? branding?.watermarkOpacity ?? 0.065;
  const logoUrl = branding?.logoUrl || systemSettings?.logoUrl;

  return (
    <div
      className={`watermark-container absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 ${className}`}
      style={{ opacity: watermarkOpacity }}
    >
      {logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "" ? (
        <img
          src={logoUrl}
          alt="Watermark Logo"
          style={{
            maxHeight: "280px",
            maxWidth: "280px",
            width: "280px",
            height: "280px",
            objectFit: "contain",
            filter: "grayscale(100%)",
            display: "block",
          }}
        />
      ) : (
        <svg width="280" height="280" viewBox="0 0 100 100" style={{ display: "block" }}>
          <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" strokeWidth="5" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" strokeWidth="1.5" strokeDasharray="3,2" />
          <path
            d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82"
            fill="none"
            stroke="#006a4e"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="50" cy="22" r="3" fill="#f42a41" />
        </svg>
      )}
    </div>
  );
}

/**
 * Generate standard Bank Pad Header HTML string for rich-text editors & server documents
 */
export function getGlobalBankPadHeaderHtml(
  systemSettings?: SystemSettings | null,
  officeName?: string,
  toolId?: string,
  docId?: string
): string {
  if (!isDocumentLogoEnabled(systemSettings, toolId, docId)) {
    return "";
  }

  const branding = systemSettings?.brandingPolicy;
  const logoUrl = branding?.logoUrl || systemSettings?.logoUrl;
  const institutionName = getCleanInstitutionName(
    branding?.institutionName || systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"
  );
  const displayOffice =
    officeName || branding?.officeName || systemSettings?.description || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি";
  const slogan = branding?.slogan || "গণমানুষের ব্যাংক";
  const websiteUrl = branding?.websiteUrl || "www.krishibank.gov.bd";

  const logoElement =
    logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== ""
      ? `<img src="${logoUrl}" alt="Logo" style="max-height: 55px; max-width: 65px; object-fit: contain; display: block;" />`
      : `<svg width="55" height="55" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" stroke-width="6"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" stroke-width="1.5" stroke-dasharray="3,2"/>
        <path d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82" fill="none" stroke="#006a4e" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="22" r="3" fill="#f42a41"/>
      </svg>`;

  return `
    <div class="pad-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 12px; width: 100%;">
      <div style="width: 70px; display: flex; align-items: center; justify-content: flex-start;">
        ${logoElement}
      </div>
      <div style="flex: 1; text-align: center; padding: 0 10px;">
        <div class="pad-header-title" style="font-size: 1.6em; font-weight: bold; color: #000; line-height: 1.1;">${institutionName}</div>
        <div class="pad-header-subtitle" style="font-size: 1.1em; font-weight: bold; color: #000; margin-top: 2px;">${displayOffice}</div>
      </div>
      <div style="width: 125px; text-align: right; line-height: 1.2;">
        <div class="pad-header-tagline" style="font-size: 0.9em; font-weight: bold; color: #000;">${slogan}</div>
        <div class="pad-header-url" style="font-size: 0.75em; color: #222; margin-top: 2px;">${websiteUrl}</div>
      </div>
    </div>
  `;
}

/**
 * Generate standard Bank Watermark HTML string
 */
export function getGlobalBankWatermarkHtml(
  systemSettings?: SystemSettings | null,
  toolId?: string,
  docId?: string
): string {
  if (!isDocumentWatermarkEnabled(systemSettings, toolId, docId)) {
    return "";
  }

  const branding = systemSettings?.brandingPolicy;
  const logoUrl = branding?.logoUrl || systemSettings?.logoUrl;
  const opacity = branding?.watermarkOpacity ?? 0.065;

  const logoWatermarkContent =
    logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== ""
      ? `<img src="${logoUrl}" alt="Watermark" style="max-height: 280px; max-width: 280px; width: 280px; height: 280px; object-fit: contain; filter: grayscale(100%); opacity: ${opacity}; display: block;" />`
      : `<svg width="280" height="280" viewBox="0 0 100 100" style="opacity: ${opacity}; display: block;">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" stroke-width="5"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" stroke-width="1.5" stroke-dasharray="3,2"/>
        <path d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82" fill="none" stroke="#006a4e" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="22" r="3" fill="#f42a41"/>
      </svg>`;

  return `
    <div class="watermark-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 0; user-select: none; display: flex; align-items: center; justify-content: center;">
      ${logoWatermarkContent}
    </div>
  `;
}
