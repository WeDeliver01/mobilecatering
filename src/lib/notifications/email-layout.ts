// Table-based HTML email: inline styles throughout, no flexbox/grid, MSO
// conditional comments for Outlook, one mobile media query. This is the
// shape every transactional email in the app renders through.

const INK = "#15171A";
const MUTED = "#585C63";
const LINE = "#E7E7EA";
const SURFACE = "#F7F7F8";
const WHITE = "#FFFFFF";

export interface EmailLine {
  label: string;
  value: string;
  bold?: boolean;
}

export interface EmailCta {
  label: string;
  url: string;
}

export interface RenderEmailOptions {
  title: string;
  preheader?: string;
  eyebrow?: string;
  heading: string;
  intro?: string;
  lines?: EmailLine[];
  cta?: EmailCta;
  secondaryNote?: string;
  company: { tradingName: string; address: string; email: string; phone: string };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderEmailHtml(opts: RenderEmailOptions): string {
  const { title, preheader = "", eyebrow, heading, intro, lines = [], cta, secondaryNote, company } = opts;

  const linesHtml = lines
    .map(
      (l) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUTED};">${esc(l.label)}</td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${INK};font-weight:${l.bold ? "700" : "400"};">${esc(l.value)}</td>
      </tr>`
    )
    .join("");

  const ctaHtml = cta
    ? `
    <tr>
      <td align="center" style="padding:28px 0 8px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${esc(cta.url)}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="12%" fillcolor="${INK}">
        <w:anchorlock/>
        <center style="color:${WHITE};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(cta.label)}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${esc(cta.url)}" style="background-color:${INK};border-radius:10px;color:${WHITE};display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:48px;text-align:center;text-decoration:none;width:260px;">${esc(cta.label)}</a>
        <!--<![endif]-->
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(title)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td { font-family: Arial, Helvetica, sans-serif; }
  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 20px !important; padding-right: 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${SURFACE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:${WHITE};border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
          <tr>
            <td class="px" style="padding:28px 40px;border-bottom:1px solid ${LINE};">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;height:32px;background-color:${INK};border-radius:8px;text-align:center;vertical-align:middle;">
                  <span style="color:${WHITE};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:32px;">M</span>
                </td>
                <td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:${INK};">${esc(company.tradingName.toUpperCase())}</td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:36px 40px 8px;">
              ${eyebrow ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${esc(eyebrow)}</p>` : ""}
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;color:${INK};">${esc(heading)}</h1>
              ${intro ? `<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${MUTED};">${esc(intro)}</p>` : ""}
            </td>
          </tr>
          ${lines.length > 0 ? `
          <tr>
            <td class="px" style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linesHtml}</table>
            </td>
          </tr>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="px" style="padding:0 40px;">${ctaHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ctaHtml}</table>` : ""}</td></tr></table>
          ${secondaryNote ? `
          <tr>
            <td class="px" style="padding:20px 40px 36px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">${esc(secondaryNote)}</p>
            </td>
          </tr>` : `<tr><td style="padding-bottom:16px;"></td></tr>`}
          <tr>
            <td class="px" style="padding:20px 40px;background-color:${SURFACE};border-top:1px solid ${LINE};">
              <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};">${esc(company.tradingName)}${company.address ? ` &middot; ${esc(company.address)}` : ""}</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};">${company.email ? esc(company.email) : ""}${company.email && company.phone ? " &middot; " : ""}${company.phone ? esc(company.phone) : ""}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailText(opts: RenderEmailOptions): string {
  const { heading, intro, lines = [], cta, company } = opts;
  const parts = [heading, "", intro ?? ""];
  for (const l of lines) parts.push(`${l.label}: ${l.value}`);
  if (cta) parts.push("", `${cta.label}: ${cta.url}`);
  parts.push("", company.tradingName, company.address, [company.email, company.phone].filter(Boolean).join(" | "));
  return parts.filter((p) => p !== undefined).join("\n");
}
