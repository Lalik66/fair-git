// Email notifications for the vendor application lifecycle.
//
// The project has no real mail transport (SMTP/SendGrid/etc.) — the prior
// code logged email bodies to the console in development. This module keeps
// that behaviour but centralises it so the four application emails
// (submit->user, submit->admins, approve, reject) share one code path and
// stay bilingual (az/en) via the recipient's preferred language.

type Lang = 'az' | 'en';

function normalizeLang(lang?: string | null): Lang {
  return lang === 'en' ? 'en' : 'az';
}

// Low-level "send". Swap the console block for a real transport here later
// and every caller below starts delivering for real.
function deliver(to: string, subject: string, body: string, lang: Lang): void {
  console.log('='.repeat(60));
  console.log(`EMAIL NOTIFICATION (Development Mode) - Language: ${lang.toUpperCase()}`);
  console.log('='.repeat(60));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('');
  console.log(body);
  console.log('='.repeat(60));
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
