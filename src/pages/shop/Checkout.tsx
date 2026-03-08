import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { products } from "@/data/products";
import { userData } from "@/data/user";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Phone, MapPin } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Checkout = () => {
  const { cart, clearCart, placeOrder } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deliveryOption = (searchParams.get("delivery") as "delivery" | "pickup") || "delivery";

  const [name, setName] = useState(userData.name);
  const [phone, setPhone] = useState(userData.phone);
  const [location, setLocation] = useState(userData.address);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "cash">("mpesa");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const cartProducts = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return { ...item, product };
  }).filter((item) => item.product);

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const deliveryFee = deliveryOption === "delivery" ? 100 : 0;
  const total = subtotal + deliveryFee;
  const totalPoints = cartProducts.reduce((sum, item) => sum + (item.product!.loyaltyPoints * item.quantity), 0);

  const handlePlaceOrder = () => {
    const num = `STR-${String(Date.now()).slice(-4)}`;
    setOrderNumber(num);
    placeOrder({
      id: Date.now().toString(),
      orderNumber: num,
      items: cartProducts.map((item) => ({
        productId: item.productId,
        name: item.product!.name,
        quantity: item.quantity,
        price: item.product!.price,
      })),
      total,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      deliveryOption,
      pointsEarned: totalPoints,
      customerName: name,
      phone,
      location,
      notes,
      paymentMethod,
    });
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
        <p className="text-sm text-muted-foreground text-center mb-2">
          {deliveryOption === "delivery" ? "We'll deliver to your location." : "Ready for pickup at our store."}
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
      {/* Header */}
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
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {deliveryOption === "delivery" && (
            <>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Delivery Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Delivery Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Near the church..."
                  className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground"
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
              onClick={() => setPaymentMethod("mpesa")}
              className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 ${
                paymentMethod === "mpesa" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="text-xl">📱</span>
              <div>
                <p className={`font-medium ${paymentMethod === "mpesa" ? "text-primary" : "text-foreground"}`}>M-Pesa</p>
                <p className="text-xs text-muted-foreground">Pay via M-Pesa</p>
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 ${
                paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="text-xl">💵</span>
              <div>
                <p className={`font-medium ${paymentMethod === "cash" ? "text-primary" : "text-foreground"}`}>Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay when you receive</p>
              </div>
            </button>
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
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Delivery</span><span>{deliveryFee === 0 ? "Free" : `KSh ${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground text-lg pt-1">
              <span>Total</span><span>KSh {total}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePlaceOrder}
          className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
        >
          Place Order — KSh {total}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
