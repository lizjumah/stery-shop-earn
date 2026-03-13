import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Phone, MapPin, CreditCard, ShoppingBag } from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface SuccessState {
  orderNumber: string;
  customerName: string;
  phone: string;
  deliveryOption: "delivery" | "pickup";
  deliveryArea: string;
  location: string;
  paymentMethod: "mpesa" | "cash";
  total: number;
  earnedPoints: number;
  pointsDiscount: number;
  deliveryFee: number;
  freeDelivery: boolean;
  items: OrderItem[];
}

const STORE_WHATSAPP = "254794560657";

const OrderSuccess = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: SuccessState | null };

  // Guard against direct navigation with no state
  if (!state?.orderNumber) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">No order found</h2>
        <p className="text-muted-foreground text-sm">Please place an order first.</p>
        <Button onClick={() => navigate("/shop")} className="bg-primary hover:bg-primary/90">
          Continue Shopping
        </Button>
      </div>
    );
  }

  const {
    orderNumber,
    customerName,
    phone,
    deliveryOption,
    deliveryArea,
    location,
    paymentMethod,
    total,
    earnedPoints,
    pointsDiscount,
    deliveryFee,
    freeDelivery,
    items,
  } = state;

  const itemsList = items
    .map((i) => `• ${i.name} × ${i.quantity} — KSh ${i.subtotal}`)
    .join("\n");

  const deliveryInfo =
    deliveryOption === "delivery"
      ? `📍 *Delivery Area:* ${deliveryArea}\n📍 *Location:* ${location}${
          freeDelivery
            ? "\n🎉 *Free Delivery*"
            : `\n🚚 *Delivery Fee:* KSh ${deliveryFee}`
        }`
      : `🏪 *Pickup at Store*`;

  const pointsInfo =
    pointsDiscount > 0
      ? `\n🎁 *Points Redeemed:* ${pointsDiscount} pts (- KSh ${pointsDiscount})`
      : "";

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
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Success header */}
      <div className="flex flex-col items-center pt-12 pb-6 px-6 text-center">
        <div className="bg-green-50 rounded-full p-5 mb-4">
          <CheckCircle className="w-14 h-14 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Order Received ✓</h1>
        <p className="text-sm font-semibold text-primary mt-0.5">{orderNumber}</p>
        <p className="text-sm text-muted-foreground max-w-xs mt-2">
          We are preparing your order. Stery will contact you shortly.
        </p>
      </div>

      <div className="px-4 space-y-3 max-w-md mx-auto">
        {/* Order details card */}
        <div className="bg-card rounded-xl p-4 card-elevated space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-foreground text-lg">{orderNumber}</span>
          </div>

          {/* Customer */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-4 text-center">👤</span>
              <span className="font-medium text-foreground">{customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{phone}</span>
            </div>
            {deliveryOption === "delivery" ? (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {deliveryArea}
                    {location && ` — ${location}`}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>Store Pickup</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span>{paymentMethod === "mpesa" ? "M-Pesa Paybill" : "Cash on Delivery"}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-t border-border pt-3 space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-foreground font-medium">KSh {item.subtotal.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            {deliveryFee > 0 && !freeDelivery && (
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee</span>
                <span>KSh {deliveryFee.toLocaleString()}</span>
              </div>
            )}
            {freeDelivery && (
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee</span>
                <span className="text-accent font-medium">Free</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-primary font-medium">
                <span>Points discount</span>
                <span>- KSh {pointsDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-base pt-1">
              <span>Total</span>
              <span>KSh {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Points earned */}
        {earnedPoints > 0 && (
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-primary font-semibold text-sm">+{earnedPoints} loyalty points earned! 🎉</p>
            {pointsDiscount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                You saved KSh {pointsDiscount} with loyalty points
              </p>
            )}
          </div>
        )}

        {/* WhatsApp CTA */}
        <div className="space-y-2 pt-1">
          <p className="text-sm text-muted-foreground text-center">
            Send your order to{" "}
            <span className="font-semibold text-foreground">Stery Supermarket</span> on WhatsApp
            so our team can confirm it.
          </p>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full h-13 text-base font-semibold bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white rounded-xl gap-2">
              <span className="text-lg">💬</span> Send Order on WhatsApp
            </Button>
          </a>
          <p className="text-xs text-muted-foreground text-center">
            ✅ Order already saved — WhatsApp is only for confirmation.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/shop/orders")}
          >
            View My Orders
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={() => navigate("/shop")}
          >
            Continue Shopping
          </Button>
        </div>

        {/* Support */}
        <div className="bg-card rounded-xl p-4 card-elevated text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Need help? Contact Stery Customer Care</p>
          <p className="text-xs text-muted-foreground">We're available to assist with your order</p>
          <div className="flex gap-2 justify-center">
            <a href={`tel:+${STORE_WHATSAPP}`}>
              <Button size="sm" variant="outline" className="text-xs gap-1">
                📞 Call Stery
              </Button>
            </a>
            <a href={`https://wa.me/${STORE_WHATSAPP}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                💬 WhatsApp Stery
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
