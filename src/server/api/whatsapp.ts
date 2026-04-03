import { Router, Request, Response } from "express";
import { sendWhatsAppMessage } from "../lib/whatsapp";

const router = Router();

/*
POST /api/whatsapp/test
Sends a free-text WhatsApp message to the given number.
Body: { to: string, message: string }
No admin auth required — intended for integration testing.
*/
router.post("/test", async (req: Request, res: Response) => {
  const { to, message } = req.body as { to?: string; message?: string };

  if (!to?.trim()) {
    return res.status(400).json({ error: "'to' is required" });
  }
  if (!message?.trim()) {
    return res.status(400).json({ error: "'message' is required" });
  }

  try {
    await sendWhatsAppMessage(to.trim(), message.trim());
    return res.json({ success: true, to: to.trim() });
  } catch (err: any) {
    // sendWhatsAppMessage never throws, but guard anyway
    return res.status(500).json({ error: "Failed to send message", message: err?.message ?? String(err) });
  }
});

export default router;
