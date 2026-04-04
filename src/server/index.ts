import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../.env.local");

// .env.local takes priority; .env provides fallback vars (e.g. WHATSAPP_*)
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (validMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/admin/images/upload', upload.single('file'));

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Import admin routes
import adminRouter from "./api/admin";
import inventoryRouter from "./api/inventory";
import whatsappRouter from "./api/whatsapp";
import pg from "pg";

/**
 * Applies pending DDL that supabase-js cannot run (PostgREST doesn't support DDL).
 * Requires DATABASE_URL in the environment — format:
 *   postgresql://postgres.[project-ref]:[db-password]@aws-*.pooler.supabase.com:6543/postgres
 * If DATABASE_URL is absent, migrations are skipped and a warning is logged.
 */
async function runStartupMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[startup-migrations] DATABASE_URL not set — skipping DDL migrations.");
    console.warn("[startup-migrations] To enable: add DATABASE_URL to your Render env vars.");
    console.warn("[startup-migrations] Alternatively run this SQL in the Supabase SQL editor:");
    console.warn("  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS owner_pin text NULL;");
    return;
  }
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query("ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS owner_pin text NULL");
    console.log("[startup-migrations] ✓ owner_pin column ensured.");
  } catch (err: any) {
    console.error("[startup-migrations] DDL error:", err.message);
  } finally {
    await client.end();
  }
}

// Mount admin routes
app.use("/api/admin", adminRouter);
app.use("/api/admin/inventory", inventoryRouter);
app.use("/api/whatsapp", whatsappRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  runStartupMigrations().catch((e) => console.error("[startup-migrations] unexpected error:", e.message));
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║ Stery Shop Earn - Admin API Server     ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Admin API: http://localhost:${PORT}/api/admin/*\n`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const srkStatus = !srk
    ? "✗ MISSING — set SUPABASE_SERVICE_ROLE_KEY in .env.local"
    : srk === "your_service_role_key_here"
    ? "✗ PLACEHOLDER — replace with real key from Supabase dashboard → Settings → API"
    : "✓ Loaded";
  console.log(`Service Role Key: ${srkStatus}`);

});
