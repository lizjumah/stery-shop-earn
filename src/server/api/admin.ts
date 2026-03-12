import { Router, Request, Response } from "express";
import { verifyAdmin, logAdminAction, supabaseAdmin } from "../middleware/auth";

const router = Router();

router.use(verifyAdmin);

/*
UPLOAD PRODUCT IMAGE
POST /api/admin/images/upload
Multipart: field name "file"
Returns: { success: true, url: string }
*/
router.post("/images/upload", async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded", message: "Send the image as multipart field named 'file'" });
    }

    // Build a unique storage path: products/<timestamp>-<original-name>
    const ext = file.originalname.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `products/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      return res.status(500).json({ error: "Uploaded but could not retrieve public URL" });
    }

    await logAdminAction("UPLOAD_PRODUCT_IMAGE", "product_image", storagePath, null, { url: urlData.publicUrl }, req.adminId!);

    res.json({ success: true, url: urlData.publicUrl });
  } catch (err: any) {
    console.error("Image upload error:", err);
    res.status(500).json({ error: "Image upload failed", message: err.message });
  }
});

/*
GET STOCK ALERTS
*/
router.get("/stock-alerts", async (req: Request, res: Response) => {

  try {

    const { data, error } =
      await supabaseAdmin
        .from("stock_alerts")
        .select(`
          *,
          products:product_id(
            id,
            name,
            stock_quantity
          )
        `)
        .order("created_at", { ascending:false });

    if(error){
      throw error;
    }

    // Attach current_stock from joined product
    const alerts = (data || []).map((a: any) => ({
      ...a,
      current_stock: a.products?.stock_quantity ?? null,
    }));

    res.json({

      success:true,

      alerts,

      count:alerts.length

    });

  } catch(err:any){

    console.log("Stock alerts error:",err);

    res.status(500).json({

      error:"Failed to fetch stock alerts",

      message:err.message

    });

  }

});

/*
CREATE STOCK ALERT
*/
router.post("/stock-alerts", async (req:Request,res:Response)=>{

  try{

    const { product_id, threshold_quantity, alert_type } = req.body;

    const { data,error } =
      await supabaseAdmin
        .from("stock_alerts")
        .insert({

          product_id,

          threshold: threshold_quantity ?? 10,

          alert_type: alert_type ?? "low_stock",

          status:"active",

          created_at:new Date().toISOString()

        })
        .select()
        .single();

    if(error){
      throw error;
    }

    await logAdminAction(

      "CREATE_STOCK_ALERT",

      "stock_alert",

      data.id,

      null,

      data,

      req.adminId!

    );

    res.json({

      success:true,

      alert:data

    });

  }catch(err:any){

    res.status(500).json({

      error:"Failed to create alert",

      message:err.message

    });

  }

});

/*
RESOLVE STOCK ALERT
*/
router.put("/stock-alerts/:id", async (req:Request,res:Response)=>{

  try{

    const id = req.params.id;

    const { data,error } =
      await supabaseAdmin
        .from("stock_alerts")
        .update({

          status:"resolved",

          resolved_at:new Date().toISOString()

        })
        .eq("id",id)
        .select()
        .single();

    if(error){
      throw error;
    }

    await logAdminAction(

      "RESOLVE_STOCK_ALERT",

      "stock_alert",

      id,

      null,

      data,

      req.adminId!

    );

    res.json({

      success:true,

      alert:data

    });

  }catch(err:any){

    res.status(500).json({

      error:"Failed to resolve alert",

      message:err.message

    });

  }

});

/*
CREATE PRODUCT
POST /api/admin/products
*/
router.post("/products", async (req: Request, res: Response) => {
  try {
    const { name, price, original_price, image_url, category, subcategory, description, commission, loyalty_points, in_stock, stock_quantity, is_offer } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "name and price are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name,
        price,
        original_price: original_price ?? null,
        image_url: image_url ?? null,
        category: category ?? "Groceries",
        subcategory: subcategory ?? null,
        description: description ?? null,
        commission: commission ?? 0,
        loyalty_points: loyalty_points ?? 0,
        in_stock: (stock_quantity ?? 100) > 0,
        stock_quantity: stock_quantity ?? 100,
        is_offer: is_offer ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    await logAdminAction("CREATE_PRODUCT", "product", data.id, null, data, req.adminId!);

    // Auto-create alert if new product starts with low stock
    const finalQty = stock_quantity ?? 100;
    if (finalQty <= 10) {
      await syncStockAlert(data.id, finalQty);
    }

    res.json({ success: true, product: data });
  } catch (err: any) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Failed to create product", message: err.message });
  }
});

/*
AUTO-MANAGE STOCK ALERTS
Called after any product stock_quantity update.
- stock === 0       → upsert out_of_stock alert
- 1 <= stock <= 10  → upsert low_stock alert
- stock > 10        → resolve any active alert
Never creates duplicate active alerts for the same product.
*/
async function syncStockAlert(productId: string, stockQuantity: number) {
  try {
    const LOW_STOCK_THRESHOLD = 10;
    const needsAlert = stockQuantity === 0 || stockQuantity <= LOW_STOCK_THRESHOLD;
    const alertType = stockQuantity === 0 ? "out_of_stock" : "low_stock";

    // Find existing active alert for this product
    const { data: existing } = await supabaseAdmin
      .from("stock_alerts")
      .select("id, alert_type")
      .eq("product_id", productId)
      .eq("status", "active")
      .maybeSingle();

    if (!needsAlert) {
      // Stock is healthy — resolve any active alert
      if (existing) {
        await supabaseAdmin
          .from("stock_alerts")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return;
    }

    if (existing) {
      // Already have an active alert — update type if it changed (e.g. low_stock → out_of_stock)
      if (existing.alert_type !== alertType) {
        await supabaseAdmin
          .from("stock_alerts")
          .update({ alert_type: alertType, threshold: LOW_STOCK_THRESHOLD })
          .eq("id", existing.id);
      }
      // Same type — leave it as is (no duplicate)
      return;
    }

    // No active alert — create one
    await supabaseAdmin
      .from("stock_alerts")
      .insert({
        product_id: productId,
        alert_type: alertType,
        threshold: LOW_STOCK_THRESHOLD,
        status: "active",
        created_at: new Date().toISOString(),
      });
  } catch (err) {
    // Non-critical — log but don't fail the product update
    console.error("syncStockAlert error:", err);
  }
}

/*
UPDATE PRODUCT
PUT /api/admin/products/:id
*/
router.put("/products/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, original_price, image_url, category, subcategory, description, commission, loyalty_points, is_offer, stock_quantity } = req.body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (original_price !== undefined) updateData.original_price = original_price;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory || null;
    if (description !== undefined) updateData.description = description;
    if (commission !== undefined) updateData.commission = commission;
    if (loyalty_points !== undefined) updateData.loyalty_points = loyalty_points;
    if (is_offer !== undefined) updateData.is_offer = is_offer;
    if (stock_quantity !== undefined) {
      updateData.stock_quantity = stock_quantity;
      updateData.in_stock = stock_quantity > 0;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Product not found" });

    await logAdminAction("UPDATE_PRODUCT", "product", id, null, updateData, req.adminId!);

    // Auto-manage stock alert whenever stock_quantity changes
    if (stock_quantity !== undefined) {
      await syncStockAlert(id, stock_quantity);
    }

    res.json({ success: true, product: data });
  } catch (err: any) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Failed to update product", message: err.message });
  }
});

/*
UPDATE ORDER STATUS
POST /api/admin/orders/:id/status
Body: { status: string }
*/
router.post("/orders/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ["received", "preparing", "processed_at_pos", "out_for_delivery", "delivered", "cancelled"];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        valid: VALID_STATUSES,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select("id, order_number, status")
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    await logAdminAction(
      "UPDATE_ORDER_STATUS",
      "order",
      id,
      null,
      { status },
      req.adminId!
    );

    res.json({ success: true, order: data });
  } catch (err: any) {
    console.error("Update order status error:", err);
    res.status(500).json({ error: "Failed to update order status", message: err.message });
  }
});

/*
DEDUCT STOCK AFTER ORDER
POST /api/admin/orders/:id/deduct-stock
Body: { items: [{ productId: string, quantity: number }] }
Called immediately after a successful order insert. Uses service role to bypass RLS.
*/
router.post("/orders/:id/deduct-stock", async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: { productId: string; quantity: number }[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array is required" });
    }

    const results: { productId: string; newQty: number }[] = [];

    for (const item of items) {
      const { productId, quantity } = item;
      if (!productId || !quantity || quantity <= 0) continue;

      // Fetch current stock
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, stock_quantity")
        .eq("id", productId)
        .maybeSingle();

      if (!product) continue;

      const newQty = Math.max(0, (product.stock_quantity ?? 0) - quantity);

      await supabaseAdmin
        .from("products")
        .update({ stock_quantity: newQty, in_stock: newQty > 0 })
        .eq("id", productId);

      // Sync stock alert for the new quantity
      await syncStockAlert(productId, newQty);

      results.push({ productId, newQty });
    }

    res.json({ success: true, results });
  } catch (err: any) {
    console.error("Deduct stock error:", err);
    res.status(500).json({ error: "Failed to deduct stock", message: err.message });
  }
});

/*
RECORD POS TRANSACTION
POST /api/admin/orders/:id/pos
Body: { pos_receipt_number: string, pos_total: number, staff_notes?: string }
*/
router.post("/orders/:id/pos", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pos_receipt_number, pos_total, staff_notes } = req.body;

    if (!pos_receipt_number) {
      return res.status(400).json({ error: "pos_receipt_number is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({
        pos_receipt_number,
        pos_total,
        pos_processed_at: new Date().toISOString(),
        staff_notes: staff_notes ?? null,
        status: "processed_at_pos",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, order_number, status")
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    await logAdminAction(
      "RECORD_POS_TRANSACTION",
      "order",
      id,
      null,
      { pos_receipt_number, pos_total },
      req.adminId!
    );

    res.json({ success: true, order: data });
  } catch (err: any) {
    console.error("Record POS transaction error:", err);
    res.status(500).json({ error: "Failed to record POS transaction", message: err.message });
  }
});

export default router;