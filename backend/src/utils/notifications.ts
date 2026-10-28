// Email notifications for the vendor application lifecycle.
//
// Delivery goes through SMTP (nodemailer) when the EMAIL_* env vars hold
// real values; otherwise every email is printed to the console — the
// original development behaviour — so local setups keep working without
// credentials. All templates are bilingual (az/en) via the recipient's
// preferred language.

import nodemailer, { Transporter } from 'nodemailer';

type Lang = 'az' | 'en';

function normalizeLang(lang?: string | null): Lang {
  return lang === 'en' ? 'en' : 'az';
}

// Lazily-built SMTP transport. `undefined` = not decided yet, `null` = env
// vars absent or still the .env placeholders → console fallback.
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const configured =
    host && user && pass &&
    !host.includes('example.com') &&
    !user.includes('example.com') &&
    pass !== 'your-email-password';

  if (!configured) {
    transporter = null;
    console.log('[email] SMTP not configured — emails will be printed to the console');
    return transporter;
  }

  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 upgrades via STARTTLS
    auth: { user, pass },
  });
  console.log(`[email] SMTP transport ready (${host}:${port} as ${user})`);
  return transporter;
}

// Low-level send. Fire-and-forget on purpose: callers sit inside request
// handlers that must not fail (or wait) because the mail server hiccuped.
// Failures are logged with enough context to resend by hand.
//
// Transport priority:
//   1. Resend HTTPS API when RESEND_API_KEY is set. Railway's Free/Trial/Hobby
//      plans block outbound SMTP ports, so an HTTPS email API is the only way
//      to send mail from there.
//   2. SMTP (nodemailer) when the EMAIL_* vars are set (Pro plan / local).
//   3. Console output (local development without credentials).
function deliver(to: string, subject: string, body: string, lang: Lang): void {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    deliverViaResend(resendKey, to, subject, body);
    return;
  }

  const smtp = getTransporter();

  if (!smtp) {
    console.log('='.repeat(60));
    console.log(`EMAIL NOTIFICATION (Development Mode) - Language: ${lang.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('');
    console.log(body);
    console.log('='.repeat(60));
    return;
  }

  smtp
    .sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text: body,
    })
    .then((info) => {
      console.log(`[email] sent "${subject}" to ${to} (${info.messageId})`);
    })
    .catch((err: Error) => {
      console.error(`[email] FAILED "${subject}" to ${to}: ${err.message}`);
    });
}

// Send through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
// Uses Node's built-in fetch, so no extra dependency. Fire-and-forget like the
// SMTP path: errors are logged, never thrown into the request handler.
function deliverViaResend(apiKey: string, to: string, subject: string, body: string): void {
  // EMAIL_FROM must be an address on a domain verified in Resend, e.g.
  // "FestivKids <noreply@festivkids.az>". Without a verified domain Resend
  // only allows its test sender, which can mail nothing but your own address.
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  })
    .then(async (res) => {
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { id?: string };
        console.log(`[email] sent via Resend "${subject}" to ${to} (${data.id ?? 'no id'})`);
      } else {
        const detail = await res.text().catch(() => '');
        console.error(`[email] Resend FAILED "${subject}" to ${to}: HTTP ${res.status} ${detail}`);
      }
    })
    .catch((err: Error) => {
      console.error(`[email] Resend FAILED "${subject}" to ${to}: ${err.message}`);
    });
}

interface ApplicationEmailContext {
  applicantName: string;
  applicantEmail: string;
  houseNumber: string;
  fairName: string;
  submittedAt: Date;
  lang?: string | null;
}

export function sendApplicationReceivedEmail(ctx: ApplicationEmailContext): void {
  const lang = normalizeLang(ctx.lang);
  const date = ctx.submittedAt.toISOString().split('T')[0];
  if (lang === 'en') {
    deliver(
      ctx.applicantEmail,
      'Your application has been received',
      `Dear ${ctx.applicantName},\n\n` +
        `Your vendor application has been received.\n\n` +
        `  - Date: ${date}\n` +
        `  - House Number: ${ctx.houseNumber}\n` +
        `  - Fair: ${ctx.fairName}\n\n` +
        `It will be reviewed by an administrator. You will be notified once a decision is made.`,
      lang
    );
  } else {
    deliver(
      ctx.applicantEmail,
      'Müraciətiniz qəbul edildi',
      `Hörmətli ${ctx.applicantName},\n\n` +
        `Satıcı müraciətiniz qəbul edildi.\n\n` +
        `  - Tarix: ${date}\n` +
        `  - Ev nömrəsi: ${ctx.houseNumber}\n` +
        `  - Yarmarka: ${ctx.fairName}\n\n` +
        `Müraciətiniz admin tərəfindən nəzərdən keçiriləcək. Qərar verildikdə sizə bildiriş göndəriləcək.`,
      lang
    );
  }
}

export function sendNewApplicationAdminEmail(
  adminEmail: string,
  ctx: ApplicationEmailContext,
  adminAppUrl: string
): void {
  // Admins are notified in Azerbaijani (the panel's primary language).
  deliver(
    adminEmail,
    'Yeni satıcı müraciəti',
    `${ctx.applicantName} tərəfindən ${ctx.houseNumber} nömrəli ev üçün yeni satıcı müraciəti daxil oldu.\n\n` +
      `  - Yarmarka: ${ctx.fairName}\n` +
      `  - Müraciətçi: ${ctx.applicantName} (${ctx.applicantEmail})\n\n` +
      `Müraciətlər səhifəsi: ${adminAppUrl}`,
    'az'
  );
}

interface DecisionEmailContext {
  applicantName: string;
  applicantEmail: string;
  houseNumber: string;
  fairName: string;
  lang?: string | null;
}

export function sendApplicationApprovedEmail(ctx: DecisionEmailContext): void {
  const lang = normalizeLang(ctx.lang);
  if (lang === 'en') {
    deliver(
      ctx.applicantEmail,
      'Your application has been approved',
      `Dear ${ctx.applicantName},\n\n` +
        `Congratulations! Your vendor application has been approved.\n\n` +
        `  - Fair: ${ctx.fairName}\n` +
        `  - House Number: ${ctx.houseNumber}\n\n` +
        `You can now set up your stall. Sign in again to access your vendor dashboard.`,
      lang
    );
  } else {
    deliver(
      ctx.applicantEmail,
      'Müraciətiniz təsdiqləndi',
      `Hörmətli ${ctx.applicantName},\n\n` +
        `Təbrik edirik! Satıcı müraciətiniz təsdiqləndi.\n\n` +
        `  - Yarmarka: ${ctx.fairName}\n` +
        `  - Ev nömrəsi: ${ctx.houseNumber}\n\n` +
        `Artıq köşkünüzü qura bilərsiniz. Satıcı panelinə daxil olmaq üçün yenidən hesabınıza giriş edin.`,
      lang
    );
  }
}

export function sendApplicationRejectedEmail(
  ctx: DecisionEmailContext & { reason: string }
): void {
  const lang = normalizeLang(ctx.lang);
  if (lang === 'en') {
    deliver(
      ctx.applicantEmail,
      'Your application has been rejected',
      `Dear ${ctx.applicantName},\n\n` +
        `We regret to inform you that your vendor application has been rejected.\n\n` +
        `Reason: ${ctx.reason}\n\n` +
        `  - Fair: ${ctx.fairName}\n` +
        `  - House Number: ${ctx.houseNumber}`,
      lang
    );
  } else {
    deliver(
      ctx.applicantEmail,
      'Müraciətiniz rədd edildi',
      `Hörmətli ${ctx.applicantName},\n\n` +
        `Təəssüf ki, satıcı müraciətiniz rədd edildi.\n\n` +
        `Səbəb: ${ctx.reason}\n\n` +
        `  - Yarmarka: ${ctx.fairName}\n` +
        `  - Ev nömrəsi: ${ctx.houseNumber}`,
      lang
    );
  }
}

// ---------------------------------------------------------------------------
// Vendor review lifecycle emails. Same console-transport as the application
// emails above — swap deliver() for a real transport to go live.
// ---------------------------------------------------------------------------

interface ReviewPublishedVendorEmailContext {
  vendorName: string;
  vendorEmail: string;
  rating: number;
  comment?: string | null;
  lang?: string | null;
}

/** Tell the vendor a new (approved) review is now visible on their profile. */
export function sendReviewPublishedVendorEmail(
  ctx: ReviewPublishedVendorEmailContext
): void {
  const lang = normalizeLang(ctx.lang);
  const stars = '★'.repeat(ctx.rating) + '☆'.repeat(5 - ctx.rating);
  const commentBlock = ctx.comment ? `\n\n"${ctx.comment}"` : '';
  if (lang === 'en') {
    deliver(
      ctx.vendorEmail,
      'You received a new review',
      `Dear ${ctx.vendorName},\n\n` +
        `A visitor left a new review on your profile: ${stars} (${ctx.rating}/5)` +
        commentBlock +
        `\n\nYou can reply to the review from your vendor dashboard.`,
      lang
    );
  } else {
    deliver(
      ctx.vendorEmail,
      'Yeni rəy aldınız',
      `Hörmətli ${ctx.vendorName},\n\n` +
        `Ziyarətçi profiliniz haqqında yeni rəy yazdı: ${stars} (${ctx.rating}/5)` +
        commentBlock +
        `\n\nSatıcı panelindən rəyə cavab verə bilərsiniz.`,
      lang
    );
  }
}

// ---------------------------------------------------------------------------
// SOS emergency alerts.
// ---------------------------------------------------------------------------

interface SosAlertAdminEmailContext {
  incidentId: string;
  senderName: string | null; // null = anonymous visitor
  latitude: number | null;
  longitude: number | null;
  dashboardUrl: string;
}

/**
 * Backup channel for SOS alerts: the primary path is the WebSocket push to
 * the security dashboard; this email covers admins who are not watching it.
 * Azerbaijani only — same convention as the other admin-facing emails.
 */
export function sendSosAlertAdminEmail(adminEmail: string, ctx: SosAlertAdminEmailContext): void {
  const who = ctx.senderName || 'Anonim ziyarətçi';
  const where =
    ctx.latitude !== null && ctx.longitude !== null
      ? `Koordinatlar: ${ctx.latitude.toFixed(6)}, ${ctx.longitude.toFixed(6)}\n` +
        `Xəritə: https://www.google.com/maps?q=${ctx.latitude},${ctx.longitude}`
      : 'Məkan məlumatı yoxdur (ziyarətçi icazə verməyib və ya siqnal alınmayıb).';
  deliver(
    adminEmail,
    '🆘 TƏCİLİ: Yarmarkada SOS siqnalı',
    `${who} yarmarkada SOS düyməsini basdı.\n\n` +
      `${where}\n\n` +
      `Təhlükəsizlik paneli: ${ctx.dashboardUrl}\n` +
      `İnsident ID: ${ctx.incidentId}`,
    'az'
  );
}

interface ReviewDecisionVisitorEmailContext {
  visitorName: string;
  visitorEmail: string;
  vendorCompany: string;
  approved: boolean;
  reason?: string | null;
  lang?: string | null;
}

/** Tell the visitor their review was approved (published) or rejected. */
export function sendReviewDecisionVisitorEmail(
  ctx: ReviewDecisionVisitorEmailContext
): void {
  const lang = normalizeLang(ctx.lang);
  if (lang === 'en') {
    deliver(
      ctx.visitorEmail,
      ctx.approved ? 'Your review has been published' : 'Your review was not published',
      `Dear ${ctx.visitorName},\n\n` +
        (ctx.approved
          ? `Your review of "${ctx.vendorCompany}" passed moderation and is now public.`
          : `Your review of "${ctx.vendorCompany}" was not approved by moderation.` +
            (ctx.reason ? `\n\nReason: ${ctx.reason}` : '')),
      lang
    );
  } else {
    deliver(
      ctx.visitorEmail,
      ctx.approved ? 'Rəyiniz dərc olundu' : 'Rəyiniz dərc olunmadı',
      `Hörmətli ${ctx.visitorName},\n\n` +
        (ctx.approved
          ? `"${ctx.vendorCompany}" haqqında rəyiniz moderasiyadan keçdi və artıq açıqdır.`
          : `"${ctx.vendorCompany}" haqqında rəyiniz moderasiya tərəfindən təsdiqlənmədi.` +
            (ctx.reason ? `\n\nSəbəb: ${ctx.reason}` : '')),
      lang
    );
  }
}

interface PasswordResetEmailContext {
  email: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
  lang?: string | null;
}

export function sendPasswordResetEmail(ctx: PasswordResetEmailContext): void {
  const lang = normalizeLang(ctx.lang);
  if (lang === 'en') {
    deliver(
      ctx.email,
      'Reset your password',
      `Hello ${ctx.name},\n\n` +
        `We received a request to reset the password for your account.\n` +
        `Open this link to choose a new password:\n\n` +
        `${ctx.resetUrl}\n\n` +
        `The link is valid for ${ctx.expiresInMinutes} minutes and can be used once.\n` +
        `If you didn't ask for this, you can ignore this email — your password stays the same.`,
      lang
    );
  } else {
    deliver(
      ctx.email,
      'Şifrənin bərpası',
      `Salam, ${ctx.name},\n\n` +
        `Hesabınızın şifrəsini bərpa etmək üçün sorğu aldıq.\n` +
        `Yeni şifrə təyin etmək üçün bu linki açın:\n\n` +
        `${ctx.resetUrl}\n\n` +
        `Link ${ctx.expiresInMinutes} dəqiqə etibarlıdır və yalnız bir dəfə istifadə oluna bilər.\n` +
        `Əgər bu sorğunu siz göndərməmisinizsə, bu məktubu nəzərə almayın — şifrəniz dəyişməyəcək.`,
      lang
    );
  }
}
