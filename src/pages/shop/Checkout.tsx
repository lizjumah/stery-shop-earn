import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { useProducts } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Phone, MapPin, Copy, Check, Star, Loader2, ShoppingBag, User, Mail, FileText } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DELIVERY_AREAS = [
  { name: "Bungoma Town", fee: 100 },
  { name: "Kanduyi", fee: 200 },
  { name: "Naitiri", fee: 200 },
  { name: "Chwele", fee: 200 },
];
const FREE_DELIVERY_THRESHOLD = 3000;

const Checkout = () => {
  const { cart, clearCart, placeOrder } = useApp();
  const { customer, createOrLoadCustomer, addPoints, redeemPoints: customerRedeemPoints } = useCustomer();
  const { data: liveProducts = [] } = useProducts();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deliveryOption = (searchParams.get("delivery") as "delivery" | "pickup") || "delivery";
  const deliveryArea = searchParams.get("area") || "Bungoma Town";

  const [customerName, setCustomerName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [location, setLocation] = useState(customer?.delivery_location || "");
  const [deliveryNotes, setDeliveryNotes] = useState(customer?.delivery_notes || "");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "cash">("mpesa");
  const [mpesaCode, setMpesaCode] = useState("");
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [applyPoints, setApplyPoints] = useState(false);
  const [pointsToApply, setPointsToApply] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const cartProductsRef = useRef<typeof cartProducts>([]);

  const loyaltyPoints = customer?.loyalty_points || 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      try { setIsLoading(false); } catch { setHasError(true); setIsLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const cartProducts = (() => {
    try {
      return cart
        .map((item) => {
          const product = liveProducts.find((p) => p.id === item.productId);
          return { ...item, product };
        })
        .filter((item) => item.product);
    } catch { return []; }
  })();

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const selectedArea = DELIVERY_AREAS.find((a) => a.name === deliveryArea);
  const rawDeliveryFee = deliveryOption === "delivery" ? (selectedArea?.fee ?? 100) : 0;
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD && deliveryOption === "delivery";
  const deliveryFee = freeDelivery ? 0 : rawDeliveryFee;
  const preDiscountTotal = subtotal + deliveryFee;

  const canRedeem = loyaltyPoints >= 50;
  const maxRedeemable = Math.min(loyaltyPoints, preDiscountTotal);
  const pointsDiscount = applyPoints ? Math.min(pointsToApply, maxRedeemable) : 0;
  const total = preDiscountTotal - pointsDiscount;
  const earnedPoints = Math.floor(total / 100);

  const handleTogglePoints = () => {
    if (!applyPoints) {
      setApplyPoints(true);
      setPointsToApply(Math.min(loyaltyPoints, preDiscountTotal));
    } else {
      setApplyPoints(false);
      setPointsToApply(0);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(field);
    toast("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleIHavePaid = () => {
    if (!mpesaCode.trim()) {
      toast.error("Please enter your M-Pesa confirmation code");
      return;
    }
    setPaymentSubmitted(true);
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (deliveryOption === "delivery" && !location.trim()) {
      toast.error("Please enter your delivery location");
      return;
    }
    if (paymentMethod === "mpesa" && !paymentSubmitted) {
      toast.error("Please complete M-Pesa payment first");
      return;
    }

    try {
      // Pre-flight: check current stock from DB to block overselling
      const productIds = cartProducts.map((i) => i.productId);
      const { data: stockCheck } = await supabase
        .from("products")
        .select("id, name, stock_quantity")
        .in("id", productIds);

      if (stockCheck) {
        for (const item of cartProducts) {
          const stockRow = stockCheck.find((p) => p.id === item.productId);
          if (stockRow && stockRow.stock_quantity !== null && item.quantity > stockRow.stock_quantity) {
            toast.error(
              stockRow.stock_quantity === 0
                ? `"${item.product!.name}" is out of stock`
                : `Only ${stockRow.stock_quantity} of "${item.product!.name}" available`
            );
            return;
          }
        }
      }

      // Create or load customer account
      const cust = await createOrLoadCustomer({
        name: customerName,
        phone,
        email: email || undefined,
        delivery_location: location || undefined,
        delivery_notes: deliveryNotes || undefined,
      });

      if (!cust) {
        toast.error("Failed to create account. Please try again.");
        return;
      }

      const num = `STR-${String(Date.now()).slice(-4)}`;
      setOrderNumber(num);
      cartProductsRef.current = [...cartProducts];

      const orderItems = cartProducts.map((item) => ({
        productId: item.productId,
        name: item.product!.name,
        quantity: item.quantity,
        price: item.product!.price,
        subtotal: item.product!.price * item.quantity,
      }));

      if (pointsDiscount > 0) {
        await customerRedeemPoints(pointsDiscount, `Redeemed on Order ${num}`);
      }

      const { data: orderData, error: dbError } = await supabase
        .from("orders")
        .insert({
          order_number: num,
          customer_name: cust.name,
          customer_phone: cust.phone,
          customer_id: cust.id,
          items: orderItems as any,
          subtotal,
          delivery_fee: deliveryFee,
          points_redeemed: pointsDiscount,
          total,
          payment_method: paymentMethod,
          delivery_option: deliveryOption,
          delivery_area: deliveryOption === "delivery" ? deliveryArea : null,
          delivery_location: deliveryOption === "delivery" ? location : null,
          points_earned: earnedPoints,
          status: "received",
          order_source: "app",
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("Failed to save order to database:", dbError);
      } else if (orderData) {
        const itemsToInsert = orderItems.map((item) => ({
          order_id: orderData.id,
          product_name: item.name,
          quantity: item.quantity,
          price_per_item: item.price,
          subtotal: item.subtotal,
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
        if (itemsError) console.error("Failed to save order items:", itemsError);

        // Deduct stock via backend (fire-and-forget — don't block order completion)
        const customerId = localStorage.getItem("stery_customer_id") || "";
        fetch(`${BACKEND_URL}/api/admin/orders/${orderData.id}/deduct-stock`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Customer-ID": customerId },
          body: JSON.stringify({
            items: orderItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          }),
        })
          .then(() => {
            // Invalidate product cache so updated stock shows on next browse
            queryClient.invalidateQueries({ queryKey: ["products"] });
          })
          .catch((err) => console.warn("Stock deduction failed (backend may be offline):", err));
      }

      // Add loyalty points
      if (earnedPoints > 0) {
        await addPoints(`Order ${num}`, earnedPoints);
      }
      if (total >= 2000) {
        await addPoints(`Basket Bonus (KSh 2,000+)`, 30, "bonus");
      } else if (total >= 1000) {
        await addPoints(`Basket Bonus (KSh 1,000+)`, 10, "bonus");
      }

      // Also update local AppContext for in-session display
      placeOrder({
        id: Date.now().toString(),
        orderNumber: num,
        items: orderItems,
        total,
        status: "received",
        date: new Date().toISOString().split("T")[0],
        deliveryOption,
        pointsEarned: earnedPoints,
        customerName: cust.name,
        phone: cust.phone,
        location,
        paymentMethod,
        pointsRedeemed: pointsDiscount,
      });

      clearCart();
      setOrderPlaced(true);
    } catch {
      toast.error("Something went wrong placing your order. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading checkout…</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-xl font-bold text-foreground">Something went wrong</p>
        <p className="text-muted-foreground text-sm">Something went wrong loading checkout. Please try again.</p>
        <Button onClick={() => navigate(-1)} className="bg-primary hover:bg-primary/90">Go Back</Button>
      </div>
    );
  }

  if (orderPlaced) {
    const orderItems = cartProductsRef.current;
    const itemsList = orderItems.map((i) => `• ${i.product!.name} × ${i.quantity} — KSh ${i.product!.price * i.quantity}`).join("\n");
    const deliveryInfo = deliveryOption === "delivery"
      ? `📍 *Delivery Area:* ${deliveryArea}\n📍 *Location:* ${location}${freeDelivery ? "\n🎉 *Free Delivery*" : `\n🚚 *Delivery Fee:* KSh ${deliveryFee}`}`
      : `🏪 *Pickup at Store*`;
    const pointsInfo = pointsDiscount > 0 ? `\n🎁 *Points Redeemed:* ${pointsDiscount} pts (- KSh ${pointsDiscount})` : "";
    const whatsappMessage = [
      `🛒 *New Order: ${orderNumber}*`,
      ``,
      `👤 *Name:* ${customerName}`,
      `📞 *Phone:* ${phone}`,
      ``,
      `📦 *Items Ordered:*`,
      itemsList,
      ``,
      `💰 *Total:* KSh ${total}`,
      `💳 *Payment:* ${paymentMethod === "mpesa" ? "M-Pesa Paybill" : "Cash on Delivery"}`,
      pointsInfo,
      deliveryInfo,
    ].filter(Boolean).join("\n");
    const whatsappUrl = `https://wa.me/254794560657?text=${encodeURIComponent(whatsappMessage)}`;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="bg-accent/10 rounded-full p-6 mb-4">
          <CheckCircle className="w-16 h-16 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Order Created Successfully</h1>
        <p className="text-sm text-accent font-medium text-center mb-4 max-w-sm">
          Order received and reserved. Processing starts immediately.
        </p>

        <div className="bg-card rounded-xl p-4 card-elevated w-full max-w-sm mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Number</span>
            <span className="font-bold text-foreground">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-bold text-foreground">KSh {total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{deliveryOption === "delivery" ? "Delivery Area" : "Fulfillment"}</span>
            <span className="font-bold text-foreground">{deliveryOption === "delivery" ? deliveryArea : "Store Pickup"}</span>
          </div>
        </div>

        <div className="bg-primary/10 rounded-xl p-3 mb-5 text-center w-full max-w-sm">
          <p className="text-primary font-semibold text-sm">+{earnedPoints} loyalty points earned! 🎉</p>
          {pointsDiscount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">You saved KSh {pointsDiscount} with loyalty points</p>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
          Next step: Send your order to <span className="font-semibold text-foreground">Stery Supermarket</span> on WhatsApp so our team can confirm and prepare it.
        </p>

        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full max-w-sm">
          <Button className="w-full h-14 text-lg font-semibold bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white rounded-xl gap-2">
            <span className="text-xl">💬</span> Send Order on WhatsApp
          </Button>
        </a>

        <p className="text-xs text-muted-foreground text-center mt-3 max-w-sm">
          After sending the message, our team will confirm your order and arrange delivery.
        </p>

        <p className="text-xs font-medium text-center mt-2 max-w-sm text-accent">
          ✅ Order already saved. WhatsApp is only for confirmation.
        </p>

        <div className="bg-card rounded-xl p-4 card-elevated w-full max-w-sm mt-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Need help? Contact Stery Customer Care</p>
          <div className="flex gap-2 justify-center">
            <a href="tel:+254794560657">
              <Button size="sm" variant="outline" className="text-xs gap-1">📞 Call Stery</Button>
            </a>
            <a href="https://wa.me/254794560657" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-xs gap-1">💬 WhatsApp Stery</Button>
            </a>
          </div>
        </div>

        <Button variant="ghost" onClick={() => navigate("/shop")} className="mt-4 text-muted-foreground">
          Back to Home
        </Button>
      </div>
    );
  }

  if (cartProducts.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="bg-secondary rounded-full p-6">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Cart is empty</h2>
        <p className="text-muted-foreground text-sm">Your cart is empty. Please add items before checking out.</p>
        <Link to="/shop">
          <Button className="bg-primary hover:bg-primary/90">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-secondary rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Checkout</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Order Summary */}
        <div className="bg-card rounded-xl p-4 card-elevated">
          <h2 className="font-semibold text-foreground mb-3">Order Summary</h2>
          {cartProducts.map(({ productId, quantity, product }) => (
            <div key={productId} className="flex justify-between text-sm py-1.5">
              <span className="text-foreground">{product!.name} × {quantity}</span>
              <span className="text-foreground font-medium">KSh {product!.price * quantity}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span><span>KSh {subtotal}</span>
            </div>
            {deliveryOption === "delivery" && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery ({deliveryArea})</span>
                <span>
                  {freeDelivery ? (
                    <span className="text-accent font-medium">Free <span className="line-through text-muted-foreground/60 ml-1">KSh {rawDeliveryFee}</span></span>
                  ) : `KSh ${deliveryFee}`}
                </span>
              </div>
            )}
            {deliveryOption === "pickup" && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pickup</span><span className="text-accent font-medium">Free</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary font-medium">
                <span>🎁 Points Discount ({pointsDiscount} pts)</span>
                <span>- KSh {pointsDiscount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-lg pt-1">
              <span>Total</span><span>KSh {total}</span>
            </div>
            <p className="text-xs text-primary font-medium">+{earnedPoints} loyalty points from this order</p>
          </div>
        </div>

        {/* Points Redemption */}
        {customer && (
          <div className="bg-card rounded-xl p-4 card-elevated border border-primary/20">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              <span className="text-sm font-medium text-foreground">Your Stery Points: {loyaltyPoints}</span>
            </div>
            {canRedeem ? (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Apply points to reduce your total?</p>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant={applyPoints ? "default" : "outline"}
                    onClick={handleTogglePoints}
                    className={applyPoints ? "bg-primary hover:bg-primary/90" : ""}
                  >
                    {applyPoints ? `✅ -KSh ${pointsDiscount}` : "Apply Points"}
                  </Button>
                  {applyPoints && (
                    <input
                      type="number"
                      min={50}
                      max={maxRedeemable}
                      value={pointsToApply}
                      onChange={(e) => setPointsToApply(Math.max(50, Math.min(maxRedeemable, Number(e.target.value))))}
                      className="w-20 bg-secondary rounded-lg py-1.5 px-2 text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{50 - loyaltyPoints} more points to start redeeming</p>
            )}
          </div>
        )}

        {/* Customer Details */}
        <div className="bg-card rounded-xl p-4 card-elevated space-y-3">
          <h2 className="font-semibold text-foreground">Your Details</h2>
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Customer Name <span className="text-primary">*</span>
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Jane Wanjiku"
              className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone Number <span className="text-primary">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="e.g. 0712 345 678"
              className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email (optional)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="e.g. jane@email.com"
              className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          {deliveryOption === "delivery" && (
            <>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Area</p>
                    <p className="font-semibold text-foreground">{deliveryArea}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {freeDelivery ? <span className="text-accent">🎉 Free</span> : `KSh ${deliveryFee}`}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3" /> Delivery Location <span className="text-primary">*</span>
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bungoma Town, near Quickmart"
                  className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">📍 Please include a nearby landmark to help our driver find you quickly.</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3" /> Delivery Notes (optional)
                </label>
                <input
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Gate is blue, call on arrival"
                  className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
            </>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-card rounded-xl p-4 card-elevated">
          <h2 className="font-semibold text-foreground mb-3">Payment Method</h2>
          <div className="space-y-2">
            <button
              onClick={() => { setPaymentMethod("mpesa"); setPaymentSubmitted(false); }}
              className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${paymentMethod === "mpesa" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <span className="text-xl">📱</span>
              <div>
                <p className={`font-medium ${paymentMethod === "mpesa" ? "text-primary" : "text-foreground"}`}>M-Pesa Paybill</p>
                <p className="text-xs text-muted-foreground">Pay via M-Pesa Paybill</p>
              </div>
            </button>

            {paymentMethod === "mpesa" && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4 mt-2">
                <div className="bg-card rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Paybill Number</p>
                      <p className="text-lg font-bold text-foreground">4076859</p>
                    </div>
                    <button onClick={() => copyToClipboard("4076859", "paybill")} className="bg-secondary rounded-lg p-2">
                      {copiedField === "paybill" ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="text-lg font-bold text-foreground">Stery</p>
                    </div>
                    <button onClick={() => copyToClipboard("Stery", "account")} className="bg-secondary rounded-lg p-2">
                      {copiedField === "account" ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="border-t border-border pt-2">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-lg font-bold text-primary">KSh {total}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center bg-secondary/50 rounded-lg p-2">
                  ⚠️ Pay using the Paybill details above before placing your order.
                </p>
                {!paymentSubmitted ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">M-Pesa Confirmation Code</label>
                      <input
                        value={mpesaCode}
                        onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SLK4H7TXYZ"
                        className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary font-mono tracking-wider placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button onClick={handleIHavePaid} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                      ✅ I Have Paid
                    </Button>
                  </div>
                ) : (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                    <CheckCircle className="w-6 h-6 text-accent mx-auto mb-1" />
                    <p className="text-sm font-medium text-foreground">Payment submitted ✅</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setPaymentMethod("cash")}
              className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <span className="text-xl">💵</span>
              <div>
                <p className={`font-medium ${paymentMethod === "cash" ? "text-primary" : "text-foreground"}`}>Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
              </div>
            </button>
          </div>
        </div>

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={paymentMethod === "mpesa" && !paymentSubmitted}
          className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {paymentMethod === "mpesa" && !paymentSubmitted
            ? "Complete Payment First"
            : `Place Order — KSh ${total}`}
        </Button>

        {/* Customer Support */}
        <div className="bg-card rounded-xl p-4 card-elevated text-center space-y-2">
          <p className="text-sm text-muted-foreground">Need help? Contact Stery Customer Care</p>
          <div className="flex gap-2 justify-center">
            <a href="tel:+254794560657">
              <Button size="sm" variant="outline" className="text-xs gap-1">📞 Call Stery</Button>
            </a>
            <a href="https://wa.me/254794560657" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-xs gap-1">💬 WhatsApp Stery</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
