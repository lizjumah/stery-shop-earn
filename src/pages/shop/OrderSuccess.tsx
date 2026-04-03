import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, MapPin, ShoppingBag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
const STORE_CALL = "+254794560657";

const OrderSuccess = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: SuccessState | null };

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

  const statusLabel = "Order Received";
  const statusStyle = "text-green-700 bg-green-50 border-green-200";

  const nextStepTitle = "Your order has been received and is being prepared.";
  const nextStepBody = "You can track your order progress anytime below.";

  const whatsappMessage = [
    `Hello Stery, I have placed order #${orderNumber}.`,
    "",
    `Name: ${customerName}`,
    `Phone: ${phone}`,
    "",
    "Please assist me with this order.",
  ].join("\n");

  const whatsappUrl = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

  const firstName = customerName?.split(" ")[0] || null;

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="flex flex-col items-center pt-10 pb-5 px-6 text-center">
        <div className="bg-green-50 rounded-full p-4 mb-3">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Order Received ✅</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {firstName ? `Thank you, ${firstName}! ` : "Thank you! "}Your order has been received.
        </p>
      </div>

      <div className="px-4 space-y-3 max-w-md mx-auto">
        <div className="bg-card rounded-xl p-4 card-elevated flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Order Number</p>
            <p className="text-xl font-bold text-foreground">{orderNumber}</p>
          </div>
          <span className={cn("shrink-0 text-xs font-semibold px-3 py-1 rounded-full border", statusStyle)}>
            {statusLabel}
          </span>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 rounded-full p-2 shrink-0 mt-0.5">
              <ArrowRight className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{nextStepTitle}</p>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{nextStepBody}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 card-elevated">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">Order Summary</span>
          </div>

          <div className="space-y-1.5 mb-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-foreground font-medium">
                  KSh {item.subtotal.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-2 space-y-1 text-sm">
            {deliveryFee > 0 && !freeDelivery && (
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee</span>
                <span>KSh {deliveryFee.toLocaleString()}</span>
              </div>
            )}
            {freeDelivery && (
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-primary font-medium">
                <span>Points discount</span>
                <span>- KSh {pointsDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-base pt-0.5">
              <span>Total paid</span>
              <span>KSh {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t border-border pt-2 mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {deliveryOption === "delivery" ? (
              <span>{deliveryArea}{location ? ` — ${location}` : ""}</span>
            ) : (
              <span>Pickup at store</span>
            )}
          </div>
        </div>

        {earnedPoints > 0 && (
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-primary font-semibold text-sm">
              +{earnedPoints} loyalty points earned! 🎉
            </p>
            {pointsDiscount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                You saved KSh {pointsDiscount} with loyalty points
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={() => navigate("/shop/orders")}
          >
            Track My Order
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/shop")}
          >
            Continue Shopping
          </Button>
        </div>

        <div className="pt-1 text-center">
          <p className="text-sm font-medium text-foreground">Need help?</p>
          <div className="mt-2 flex items-center justify-center gap-3 text-sm">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
            >
              Chat with Stery
            </a>
            <span className="text-muted-foreground">|</span>
            <a
              href={`tel:${STORE_CALL}`}
              className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
            >
              Call Stery
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
