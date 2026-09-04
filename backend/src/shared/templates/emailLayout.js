const BRAND = {
  name: 'EduPortal',
  primary: '#0A6640',
  accent: '#10B981',
  mint: '#6EE7B7',
  forest: '#052E1C',
  muted: '#4B6358',
  subtle: '#6B7280',
  border: '#E2EEE8',
  surface: '#FFFFFF',
  canvas: '#F4FAF7',
  warningBorder: '#FDE68A',
  warningBg: '#FFFBEB',
  warningText: '#92400E',
};

const GREETING_OPENER = '(?:hello|hi|hey|dear|greetings)';

/**
 * Remove a leading Hello/Hi/Hey/Dear line so the layout greeting is not doubled.
 * @param {unknown} content
 */
export function stripLeadingEmailGreeting(content) {
  let next = String(content ?? '');
  if (!next.trim()) return next;

  const htmlBlock = new RegExp(
    `^(?:\\s|<br\\s*/?>)*<(?:p|div)[^>]*>\\s*${GREETING_OPENER}\\s+[^<\\n]{1,120}?[,!.]?\\s*</(?:p|div)>(?:\\s|<br\\s*/?>)*`,
    'i',
  );
  const htmlBreaks = new RegExp(
    `^(?:\\s|<br\\s*/?>)*${GREETING_OPENER}\\s+[^<\\n]{1,120}?[,!.]?(?:\\s*<br\\s*/?>)+\\s*`,
    'i',
  );
  const plainLines = new RegExp(
    `^\\s*${GREETING_OPENER}\\s+[^\\n]{1,120}?[,!.]?\\s*(?:\\r?\\n)+\\s*`,
    'i',
  );

  for (let i = 0; i < 4; i += 1) {
    const before = next;
    next = next.replace(htmlBlock, '').replace(htmlBreaks, '').replace(plainLines, '');
    if (next === before) break;
  }
  return next.trimStart();
}

/**
 * @param {{
 *   preheader?: string;
 *   eyebrow?: string;
 *   headline: string;
 *   intro?: string;
 *   body?: string;
 *   ctaLabel?: string | null;
 *   ctaUrl?: string | null;
 *   notice?: string | null;
 *   footerNote?: string;
 * }} params
 */
export function buildBrandedEmailHtml({
  preheader = '',
  eyebrow = BRAND.name,
  headline,
  intro = '',
  body = '',
  ctaLabel = null,
  ctaUrl = null,
  notice = null,
  footerNote = 'This is an automated message from EduPortal. Please do not reply to this email.',
}) {
  const bodyWithoutGreeting = intro ? stripLeadingEmailGreeting(body) : body;
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>`
    : '';

  const introRow = intro
    ? `<tr><td style="padding:12px 28px 0;font-size:15px;line-height:1.6;color:${BRAND.muted};">${intro}</td></tr>`
    : '';

  const bodyRow = bodyWithoutGreeting
    ? `<tr><td style="padding:12px 28px 0;font-size:15px;line-height:1.6;color:${BRAND.muted};">${bodyWithoutGreeting}</td></tr>`
    : '';

  const noticeRow = notice
    ? `
        <tr>
          <td style="padding:20px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid ${BRAND.warningBorder};background:${BRAND.warningBg};border-radius:12px;">
              <tr>
                <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:${BRAND.warningText};">
                  ${notice}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    : '';

  const ctaRows =
    ctaLabel && ctaUrl
      ? `
        <tr>
          <td style="padding:24px 28px 0;">
            <a href="${ctaUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:600;line-height:1;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 0;font-size:12px;line-height:1.6;color:${BRAND.subtle};word-break:break-all;">
            If the button does not work, copy and paste this link into your browser:<br/>
            <a href="${ctaUrl}" style="color:${BRAND.primary};text-decoration:underline;">${ctaUrl}</a>
          </td>
        </tr>
      `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${headline}</title>
      </head>
      <body style="margin:0;padding:0;background:${BRAND.canvas};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
        ${preheaderBlock}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-collapse:separate;">
                <tr>
                  <td style="padding:0 0 16px;text-align:center;">
                    <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};">
                      ${eyebrow}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(10,102,64,0.04);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="height:4px;background:linear-gradient(90deg, ${BRAND.primary} 0%, ${BRAND.accent} 55%, ${BRAND.mint} 100%);font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td style="padding:28px 28px 8px;">
                          <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:${BRAND.forest};">
                            ${headline}
                          </h1>
                        </td>
                      </tr>
                      ${introRow}
                      ${bodyRow}
                      ${noticeRow}
                      ${ctaRows}
                      <tr>
                        <td style="padding:24px 28px 28px;font-size:13px;line-height:1.6;color:${BRAND.subtle};">
                          Need help? Contact your institute administrator.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:${BRAND.subtle};">
                    ${footerNote}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();
}

/**
 * @param {{
 *   recipientName?: string;
 *   resetUrl: string;
 *   portalLabel?: string;
 * }} params
 */
export function buildPasswordResetEmail({ recipientName, resetUrl, portalLabel = 'EduPortal' }) {
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  const subject = `${portalLabel}: Reset your password`;

  const text = [
    greeting,
    '',
    'You requested a password reset for your account.',
    '',
    'Reset your password using this link (valid for 10 minutes):',
    resetUrl,
    '',
    'If you did not request this, you can safely ignore this email.',
    '',
    `— ${portalLabel}`,
  ].join('\n');

  const html = buildBrandedEmailHtml({
    preheader: 'Use this secure link to reset your password. It expires in 10 minutes.',
    eyebrow: portalLabel,
    headline: 'Reset your password',
    intro: greeting,
    body:
      'We received a request to reset the password for your account. Click the button below to choose a new password and sign back in.',
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    notice:
      '<strong>This link expires in 10 minutes.</strong> If you did not request a password reset, you can safely ignore this email — your password will stay the same.',
  });

  return { subject, text, html };
}

/**
 * @param {{
 *   headline: string;
 *   intro: string;
 *   body: string;
 *   ctaLabel?: string | null;
 *   ctaUrl?: string | null;
 *   instituteName: string;
 * }} params
 */
export function buildHtmlEmail({ headline, intro, body, ctaLabel, ctaUrl, instituteName }) {
  return buildBrandedEmailHtml({
    preheader: headline,
    eyebrow: instituteName,
    headline,
    intro,
    body,
    ctaLabel,
    ctaUrl,
    footerNote: `This message was sent by ${instituteName} via EduPortal.`,
  });
}
