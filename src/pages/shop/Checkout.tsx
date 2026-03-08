import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { products } from "@/data/products";
import { userData } from "@/data/user";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Phone, MapPin, Copy, Check } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const DELIVERY_AREAS = [
  { name: "Bungoma Town", fee: 100 },
  { name: "Kanduyi", fee: 200 },
  { name: "Naitiri", fee: 200 },
  { name: "Chwele", fee: 200 },
];
const FREE_DELIVERY_THRESHOLD = 3000;

const Checkout = () => {
  const { cart, clearCart, placeOrder } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deliveryOption = (searchParams.get("delivery") as "delivery" | "pickup") || "delivery";
  const deliveryArea = searchParams.get("area") || "Bungoma Town";

  const [name, setName] = useState(userData.name);
  const [phone, setPhone] = useState(userData.phone);
  const [location, setLocation] = useState(userData.address);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "cash">("mpesa");
  const [mpesaPhone, setMpesaPhone] = useState(userData.phone);
  const [mpesaCode, setMpesaCode] = useState("");
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const cartProducts = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return { ...item, product };
  }).filter((item) => item.product);

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const selectedArea = DELIVERY_AREAS.find((a) => a.name === deliveryArea);
  const rawDeliveryFee = deliveryOption === "delivery" ? (selectedArea?.fee ?? 100) : 0;
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD && deliveryOption === "delivery";
  const deliveryFee = freeDelivery ? 0 : rawDeliveryFee;
  const total = subtotal + deliveryFee;
  const totalPoints = cartProducts.reduce((sum, item) => sum + (item.product!.loyaltyPoints * item.quantity), 0);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
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

  const handlePlaceOrder = () => {
    if (paymentMethod === "mpesa" && !paymentSubmitted) {
      toast.error("Please complete M-Pesa payment first");
      return;
    }
    const num = `STR-${String(Date.now()).slice(-4)}`;
    setOrderNumber(num);

    const orderItems = cartProducts.map((item) => ({
      productId: item.productId,
      name: item.product!.name,
      quantity: item.quantity,
      price: item.product!.price,
    }));

    placeOrder({
      id: Date.now().toString(),
      orderNumber: num,
      items: orderItems,
      total,
      status: paymentMethod === "mpesa" ? "pending" : "pending",
      date: new Date().toISOString().split("T")[0],
      deliveryOption,
      pointsEarned: totalPoints,
      customerName: name,
      phone,
      location,
      notes,
      paymentMethod,
    });

    // Send order to WhatsApp
    const itemsList = orderItems.map((i) => `• ${i.name} × ${i.quantity} — KSh ${i.price * i.quantity}`).join("\n");
    const deliveryInfo = deliveryOption === "delivery"
      ? `📍 *Delivery Area:* ${deliveryArea}\n📍 *Location:* ${location}${freeDelivery ? "\n🎉 *Free Delivery*" : `\n🚚 *Delivery Fee:* KSh ${deliveryFee}`}`
      : `🏪 *Pickup at Store*`;
    const whatsappMessage = [
      `🛒 *New Order: ${num}*`,
      ``,
      `👤 *Customer:* ${name}`,
      `📞 *Phone:* ${phone}`,
      ``,
      `📦 *Items Ordered:*`,
      itemsList,
      ``,
      `💰 *Total:* KSh ${total}`,
      `💳 *Payment:* ${paymentMethod === "mpesa" ? "M-Pesa Paybill" : "Cash on Delivery"}`,
      deliveryInfo,
      notes ? `📝 *Notes:* ${notes}` : "",
    ].filter(Boolean).join("\n");

    const whatsappUrl = `https://wa.me/254794560657?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, "_blank");

    clearCart();
    setOrderPlaced(true);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="bg-accent/10 rounded-full p-6 mb-4">
          <CheckCircle className="w-16 h-16 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Order Received!</h1>
        <p className="text-muted-foreground text-center mb-2">Your order <span className="font-bold text-foreground">{orderNumber}</span> has been placed.</p>
        {paymentMethod === "mpesa" ? (
          <p className="text-sm text-primary font-medium text-center mb-2">
            Payment submitted. We will confirm your payment and dispatch your order.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center mb-2">
            Pay when your order is delivered.
          </p>
        )}
        <p className="text-sm text-muted-foreground text-center mb-2">
          {deliveryOption === "delivery" ? `We'll deliver to ${deliveryArea}.` : "Ready for pickup at our store."}
        </p>
        <p className="text-sm text-primary font-semibold mb-6">+{totalPoints} loyalty points earned! 🎉</p>
        <Button onClick={() => navigate("/shop")} className="bg-primary hover:bg-primary/90 w-full max-w-xs">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-secondary rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Checkout</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Customer Info */}
        <div className="bg-card rounded-xl p-4 card-elevated space-y-3">
          <h2 className="font-semibold text-foreground">Your Details</h2>
          <div>
            <label className="text-sm text-muted-foreground">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {deliveryOption === "delivery" && (
            <>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Delivery Area</p>
                <p className="font-semibold text-foreground">{deliveryArea}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {freeDelivery ? (
                    <span className="text-accent font-medium">🎉 Free delivery (order above KSh {FREE_DELIVERY_THRESHOLD.toLocaleString()})</span>
                  ) : (
                    `Delivery fee: KSh ${deliveryFee}`
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Delivery Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Delivery Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Near the church..." className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground" />
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
              className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                paymentMethod === "mpesa" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="text-xl">📱</span>
              <div>
                <p className={`font-medium ${paymentMethod === "mpesa" ? "text-primary" : "text-foreground"}`}>M-Pesa Paybill</p>
                <p className="text-xs text-muted-foreground">Pay via M-Pesa Paybill</p>
              </div>
            </button>

            {paymentMethod === "mpesa" && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4 mt-2">
                <h3 className="font-semibold text-foreground text-center">M-Pesa Payment Details</h3>

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
                  ⚠️ Please make payment before dispatch using the Paybill details above.
                </p>

                {!paymentSubmitted ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Your M-Pesa Phone Number</label>
                      <input
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">M-Pesa Confirmation Code</label>
                      <input
                        value={mpesaCode}
                        onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SLK4H7TXYZ"
                        className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary font-mono tracking-wider"
                      />
                    </div>
                    <Button onClick={handleIHavePaid} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                      ✅ I Have Paid
                    </Button>
                  </div>
                ) : (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                    <CheckCircle className="w-6 h-6 text-accent mx-auto mb-1" />
                    <p className="text-sm font-medium text-foreground">Payment submitted.</p>
                    <p className="text-xs text-muted-foreground">We will confirm your payment and dispatch your order.</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setPaymentMethod("cash")}
              className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="text-xl">💵</span>
              <div>
                <p className={`font-medium ${paymentMethod === "cash" ? "text-primary" : "text-foreground"}`}>Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay when your order is delivered</p>
              </div>
            </button>

            {paymentMethod === "cash" && (
              <div className="bg-secondary/50 rounded-xl p-3 mt-1">
                <p className="text-sm text-muted-foreground text-center">💵 Pay when your order is delivered.</p>
              </div>
            )}
          </div>
        </div>

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
                  ) : (
                    `KSh ${deliveryFee}`
                  )}
                </span>
              </div>
            )}
            {deliveryOption === "pickup" && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pickup</span><span className="text-accent font-medium">Free</span>
              </div>
            )}
            {freeDelivery && (
              <p className="text-xs text-accent font-medium">🎉 Free delivery on orders above KSh {FREE_DELIVERY_THRESHOLD.toLocaleString()}</p>
            )}
            <div className="flex justify-between font-bold text-foreground text-lg pt-1">
              <span>Total</span><span>KSh {total}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePlaceOrder}
          disabled={paymentMethod === "mpesa" && !paymentSubmitted}
          className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {paymentMethod === "mpesa" && !paymentSubmitted
            ? "Complete Payment First"
            : `Place Order — KSh ${total}`}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
