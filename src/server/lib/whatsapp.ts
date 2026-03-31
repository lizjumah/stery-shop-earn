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
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() || "new_order_alert";

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

  const [var1, var2, var3, var4] = buildStoreTemplateVars(order);
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  for (const to of recipients) {
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
              { type: "text", parameter_name: "order_number",  text: var1 },
              { type: "text", parameter_name: "customer_name", text: var2 },
              { type: "text", parameter_name: "total",         text: var3 },
              { type: "text", parameter_name: "fulfillment",   text: var4 },
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
        console.error(`[whatsapp] Store alert FAILED to ${to} — HTTP ${response.status} — ${rawBody}`);
      } else {
        console.log(`[whatsapp] Store alert sent to ${to} for order ${order.order_number}`);
      }
    } catch (err: any) {
      console.error(
        `[whatsapp] Network error (store alert) to ${to} for order ${order.order_number}:`,
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
  const token        = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId      = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_CUSTOMER_TEMPLATE_NAME?.trim() || "customer_order_received";

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
            { type: "text", parameter_name: "customer_name", text: order.customer_name },
            { type: "text", parameter_name: "order_number",  text: order.order_number  },
          ],
        },
      ],
    },
  };

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text().catch(() => "(unreadable body)");

    if (!response.ok) {
      console.error(
        `[whatsapp] Customer confirmation FAILED to ${to} — HTTP ${response.status} — ${rawBody}`
      );
    } else {
      console.log(`[whatsapp] Customer confirmation sent to ${to} for order ${order.order_number}`);
    }
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
            { type: "text", parameter_name: "customer_name", text: order.customer_name },
            { type: "text", parameter_name: "order_number",  text: order.order_number  },
          ],
        },
      ],
    },
  };

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

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
  const templateName = process.env.WHATSAPP_DISPATCH_TEMPLATE_NAME?.trim() || "customer_order_dispatched";
  return sendCustomerStatusTemplate(order, templateName, "customer DISPATCH notification");
}
