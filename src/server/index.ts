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

// Mount admin routes
app.use("/api/admin", adminRouter);
app.use("/api/admin/inventory", inventoryRouter);

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
