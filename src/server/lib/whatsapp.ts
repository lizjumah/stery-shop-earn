/**
 * WhatsApp messaging helpers.
 * Uses Node 22 native fetch — no extra dependency required.
 *
 * ── Store alert ──────────────────────────────────────────────────────────────
 * Template: new_order_alert  (approved in Meta Business Manager)
 * Named variables: order_number, customer_name, total, fulfillment
 * Recipients: WHATSAPP_ALERT_TO  (comma-separated internal numbers)
 *
 * ── Customer confirmation ────────────────────────────────────────────────────
 * Template: customer_order_received  (must be approved in Meta Business Manager)
 * Named variables: customer_name, order_number
 * Recipient: customer's own phone number from the order
 *
 * ── Customer status notifications ────────────────────────────────────────────
 * Template: customer_order_ready      (status → ready_for_pickup)
 * Template: customer_order_dispatched (status → out_for_delivery)
 * Named variables: customer_name, order_number
 * Recipient: customer's own phone number from the order
 *
 * Usage (fire-and-forget):
 *   sendOrderAlert(order).catch(console.error);
 *   sendCustomerConfirmation(order).catch(console.error);
 *   sendCustomerReadyNotification(order).catch(console.error);
 *   sendCustomerDispatchedNotification(order).catch(console.error);
 */

export interface OrderAlertPayload {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  payment_status?: string | null;
  delivery_option: string;          // "pickup" | "delivery" | "countrywide"
  delivery_area?: string | null;
  delivery_location?: string | null;
  items: Array<{ name: string; quantity: number; price: number; subtotal?: number }>;
  created_at?: string | null;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Normalise a Kenyan phone number to the WhatsApp-required format: 254XXXXXXXXX
 * Handles:  0712345678  →  254712345678
 *           +254712345678  →  254712345678
 *           254712345678   →  254712345678  (no-op)
 * Returns null if the number cannot be recognised — caller skips send.
 */
function normalizeKenyanPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().+]/g, "");

  if (/^254\d{9}$/.test(cleaned))  return cleaned;           // already 254XXXXXXXXX
  if (/^0[17]\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;  // 07/01 local
  if (/^7\d{8}$/.test(cleaned))    return `254${cleaned}`;  // starts with 7, missing 0

  return null; // unrecognised — skip gracefully
}

function buildStoreTemplateVars(order: OrderAlertPayload): [string, string, string, string] {
  const base =
    order.delivery_option === "pickup"      ? "Pickup at store"      :
    order.delivery_option === "countrywide" ? "Countrywide delivery" :
                                              "Local delivery";

  const fulfillment = order.delivery_area ? `${base} – ${order.delivery_area}` : base;

  return [
    order.order_number,
    order.customer_name,
    `KES ${order.total.toLocaleString()}`,
    fulfillment,
  ];
}

// ── Store / admin alert ───────────────────────────────────────────────────────

/**
 * Sends an order alert template to every recipient in WHATSAPP_ALERT_TO.
 * Never throws — all errors are logged and swallowed so callers can fire-and-forget safely.
 */
export async function sendOrderAlert(order: OrderAlertPayload): Promise<void> {
  const token        = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId      = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const alertTo      = process.env.WHATSAPP_ALERT_TO?.trim();

  if (!token || !phoneId || !alertTo) {
    console.warn(
      "[whatsapp] Skipping store alert — missing env var(s):",
      [
        !token   && "WHATSAPP_ACCESS_TOKEN",
        !phoneId && "WHATSAPP_PHONE_NUMBER_ID",
        !alertTo && "WHATSAPP_ALERT_TO",
      ].filter(Boolean).join(", ")
    );
    return;
  }

  const recipients = alertTo.split(",").map((n) => n.trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.warn("[whatsapp] WHATSAPP_ALERT_TO parsed to zero recipients — check formatting");
    return;
  }

  // Parameters aligned to new_order_alert template (en_US):
  // {{1}} order_number  {{2}} customer_name  {{3}} total  {{4}} fulfillment
  const [, , , var4] = buildStoreTemplateVars(order); // reuse fulfillment string only
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() || "new_order_alert";
  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;

  for (const to of recipients) {
    const normalized = normalizeKenyanPhone(to);
    if (!normalized) {
      console.warn(`[whatsapp] Store alert — unrecognised phone format: ${to} — skipping`);
      continue;
    }

    const payload = {
      messaging_product: "whatsapp",
      to: normalized,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: order.order_number },
              { type: "text", text: order.customer_name },
              { type: "text", text: `KES ${order.total.toLocaleString()}` },
              { type: "text", text: var4 },
            ],
          },
        ],
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rawBody = await response.text().catch(() => "(unreadable body)");
      if (!response.ok) {
        console.error(`[whatsapp] Store alert FAILED to ${normalized} for order ${order.order_number} — HTTP ${response.status} — ${rawBody}`);
      } else {
        console.log(`[whatsapp] Store alert sent to ${normalized} for order ${order.order_number}`);
      }
    } catch (err: any) {
      console.error(
        `[whatsapp] Network error (store alert) to ${normalized} for order ${order.order_number}:`,
        err?.message ?? err
      );
    }
  }
}

// ── Customer confirmation ─────────────────────────────────────────────────────

/**
 * Sends a confirmation template to the customer's own phone number.
 * Template: customer_order_received  (set WHATSAPP_CUSTOMER_TEMPLATE_NAME to override)
 * Named variables: customer_name, order_number
 *
 * Skips silently if the customer phone is missing or unrecognised.
 * Never throws — safe for fire-and-forget use.
 */
export async function sendCustomerConfirmation(order: OrderAlertPayload): Promise<void> {
  const token   = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    console.warn(
      "[whatsapp] Skipping customer confirmation — missing env var(s):",
      [!token && "WHATSAPP_ACCESS_TOKEN", !phoneId && "WHATSAPP_PHONE_NUMBER_ID"]
        .filter(Boolean).join(", ")
    );
    return;
  }

  const rawPhone = order.customer_phone?.trim();
  if (!rawPhone) {
    console.warn(`[whatsapp] Skipping customer confirmation for order ${order.order_number} — no phone on record`);
    return;
  }

  const to = normalizeKenyanPhone(rawPhone);
  if (!to) {
    console.warn(
      `[whatsapp] Skipping customer confirmation for order ${order.order_number} — unrecognised phone format: ${rawPhone}`
    );
    return;
  }

  const message =
    `Hi ${order.customer_name} 😊\n` +
    `Thank you for shopping with Stery Supermarket 🛒\n\n` +
    `Your order #${order.order_number} has been received and our team is preparing it.\n\n` +
    `We will notify you once it is on the way.`;

  try {
    await sendWhatsAppMessage(to, message);
    console.log(`[whatsapp] Customer confirmation sent to ${to} for order ${order.order_number}`);
  } catch (err: any) {
    console.error(
      `[whatsapp] Network error (customer confirmation) to ${to} for order ${order.order_number}:`,
      err?.message ?? err
    );
  }
}

// ── Customer status notifications ─────────────────────────────────────────────

/**
 * Private helper shared by all customer status notification senders.
 * Handles phone normalisation, env-var guard, API call, and logging.
 * Never throws — safe for fire-and-forget use.
 */
async function sendCustomerStatusTemplate(
  order: OrderAlertPayload,
  templateName: string,
  logLabel: string,
): Promise<void> {
  const token   = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    console.warn(
      `[whatsapp] Skipping ${logLabel} — missing env var(s):`,
      [!token && "WHATSAPP_ACCESS_TOKEN", !phoneId && "WHATSAPP_PHONE_NUMBER_ID"]
        .filter(Boolean).join(", ")
    );
    return;
  }

  const rawPhone = order.customer_phone?.trim();
  if (!rawPhone) {
    console.warn(`[whatsapp] Skipping ${logLabel} for order ${order.order_number} — no phone on record`);
    return;
  }

  const to = normalizeKenyanPhone(rawPhone);
  if (!to) {
    console.warn(
      `[whatsapp] Skipping ${logLabel} for order ${order.order_number} — unrecognised phone format: ${rawPhone}`
    );
    return;
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: order.customer_name },
            { type: "text", text: order.order_number  },
          ],
        },
      ],
    },
  };

  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text().catch(() => "(unreadable body)");

    if (!response.ok) {
      console.error(
        `[whatsapp] ${logLabel} FAILED to ${to} for order ${order.order_number} — HTTP ${response.status} — ${rawBody}`
      );
    } else {
      console.log(`[whatsapp] ${logLabel} sent to ${to} for order ${order.order_number}`);
    }
  } catch (err: any) {
    console.error(
      `[whatsapp] Network error (${logLabel}) to ${to} for order ${order.order_number}:`,
      err?.message ?? err
    );
  }
}

/**
 * Notifies the customer when their order status changes to ready_for_pickup.
 * Template: customer_order_ready  (set WHATSAPP_READY_TEMPLATE_NAME to override)
 */
export async function sendCustomerReadyNotification(order: OrderAlertPayload): Promise<void> {
  const templateName = process.env.WHATSAPP_READY_TEMPLATE_NAME?.trim() || "customer_order_ready";
  return sendCustomerStatusTemplate(order, templateName, "customer READY notification");
}

/**
 * Notifies the customer when their order status changes to out_for_delivery.
 * Template: customer_order_dispatched  (set WHATSAPP_DISPATCH_TEMPLATE_NAME to override)
 */
export async function sendCustomerDispatchedNotification(order: OrderAlertPayload): Promise<void> {
  const token   = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    console.warn(
      "[whatsapp] Skipping customer DISPATCH notification — missing env var(s):",
      [!token && "WHATSAPP_ACCESS_TOKEN", !phoneId && "WHATSAPP_PHONE_NUMBER_ID"]
        .filter(Boolean).join(", ")
    );
    return;
  }

  const rawPhone = order.customer_phone?.trim();
  if (!rawPhone) {
    console.warn(`[whatsapp] Skipping customer DISPATCH notification for order ${order.order_number} — no phone on record`);
    return;
  }

  const to = normalizeKenyanPhone(rawPhone);
  if (!to) {
    console.warn(
      `[whatsapp] Skipping customer DISPATCH notification for order ${order.order_number} — unrecognised phone format: ${rawPhone}`
    );
    return;
  }

  const message =
    `Hi ${order.customer_name} 🚚\n` +
    `Your Stery order #${order.order_number} is now out for delivery.\n\n` +
    `Our rider will contact you shortly if needed.\n\n` +
    `Thank you for shopping with us.`;

  try {
    await sendWhatsAppMessage(to, message);
    console.log(`[whatsapp] customer DISPATCH notification sent to ${to} for order ${order.order_number}`);
  } catch (err: any) {
    console.error(
      `[whatsapp] Network error (customer DISPATCH notification) to ${to} for order ${order.order_number}:`,
      err?.message ?? err
    );
  }
}

// ── Free-text message sender ──────────────────────────────────────────────────

/**
 * Sends a free-text WhatsApp message to a single recipient.
 * Only works within the 24-hour customer service window (Meta policy).
 * Normalises Kenyan phone numbers automatically.
 * Never throws — safe for fire-and-forget use.
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  const token   = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version = process.env.WHATSAPP_API_VERSION?.trim() || "v22.0";

  if (!token || !phoneId) {
    console.warn(
      "[whatsapp] Skipping free-text message — missing env var(s):",
      [!token && "WHATSAPP_ACCESS_TOKEN", !phoneId && "WHATSAPP_PHONE_NUMBER_ID"]
        .filter(Boolean).join(", ")
    );
    return;
  }

  if (!to?.trim() || !message?.trim()) {
    console.warn("[whatsapp] sendWhatsAppMessage called with empty 'to' or 'message' — skipping");
    return;
  }

  const normalized = normalizeKenyanPhone(to.trim());
  if (!normalized) {
    console.warn(`[whatsapp] sendWhatsAppMessage — unrecognised phone format: ${to}`);
    return;
  }

  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: normalized,
    type: "text",
    text: { body: message.trim() },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text().catch(() => "(unreadable body)");

    if (!response.ok) {
      console.error(`[whatsapp] Free-text message FAILED to ${normalized} — HTTP ${response.status} — ${rawBody}`);
    } else {
      console.log(`[whatsapp] Free-text message sent to ${normalized}`);
    }
  } catch (err: any) {
    console.error(`[whatsapp] Network error (free-text) to ${normalized}:`, err?.message ?? err);
  }
}

// ── Status dispatcher ─────────────────────────────────────────────────────────

/**
 * Dispatches the correct customer notification based on order status.
 * Handles: ready_for_pickup → sendCustomerReadyNotification
 *          out_for_delivery → sendCustomerDispatchedNotification
 * Unknown statuses are logged and skipped — existing flows are never affected.
 * Never throws — safe for fire-and-forget use.
 */
export async function sendOrderStatusUpdate(
  order: OrderAlertPayload,
  status: string,
): Promise<void> {
  if (status === "ready_for_pickup") {
    return sendCustomerReadyNotification(order);
  }

  if (status === "out_for_delivery") {
    return sendCustomerDispatchedNotification(order);
  }

  console.log(
    `[whatsapp] sendOrderStatusUpdate — no notification defined for status "${status}" on order ${order.order_number}, skipping`
  );
}

// ── Named alias ───────────────────────────────────────────────────────────────

/**
 * Alias for sendCustomerConfirmation — satisfies the sendOrderConfirmation contract.
 * Delegates entirely; no logic is duplicated.
 */
export { sendCustomerConfirmation as sendOrderConfirmation };
