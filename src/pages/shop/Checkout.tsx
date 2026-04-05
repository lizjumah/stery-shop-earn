import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { useProducts } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/client";
const BACKEND_URL = API_BASE;
import {
  ArrowLeft,
  Phone,
  MapPin,
  Copy,
  Check,

  Loader2,
  ShoppingBag,
  User,
  Mail,
  FileText,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_DELIVERY_AREAS = [
  { name: "Bungoma Town", fee: 50 },
  { name: "Nzoia", fee: 50 },
  { name: "Mabanga", fee: 50 },
  { name: "Nasaka", fee: 50 },
  { name: "Matisi", fee: 50 },
  { name: "Luuya", fee: 100 },
  { name: "Webuye", fee: 100 },
  { name: "Kanduyi", fee: 100 },
];
const FREE_DELIVERY_THRESHOLD = 3000;

type FulfillmentMethod = "pickup" | "local" | "countrywide";

const inputCls =
  "w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground";

const Checkout = () => {
  const { cart, clearCart, placeOrder } = useApp();
  const { customer, createOrLoadCustomer, addPoints, redeemPoints: customerRedeemPoints } =
    useCustomer();
  const { data: liveProducts = [] } = useProducts();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("pickup");
  const [deliveryArea, setDeliveryArea] = useState("Bungoma Town");

  const [cwDestination, setCwDestination] = useState("");
  const [cwShuttle, setCwShuttle] = useState("");
  const [cwReceiverName, setCwReceiverName] = useState("");
  const [cwReceiverPhone, setCwReceiverPhone] = useState("");

  const [customerName, setCustomerName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [location, setLocation] = useState(customer?.delivery_location || "");
  const [deliveryNotes, setDeliveryNotes] = useState(customer?.delivery_notes || "");
  const [pendingOrderNum] = useState(() => `STR-${String(Date.now()).slice(-4)}`);
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "cash">("mpesa");
  const [mpesaCode, setMpesaCode] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);



  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setIsLoading(false);
      } catch {
        setHasError(true);
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!customer) return;
    if (!customerName && customer.name) setCustomerName(customer.name);
    if (!phone && customer.phone) setPhone(customer.phone);
    if (!email && customer.email) setEmail(customer.email);
    if (!location && customer.delivery_location) setLocation(customer.delivery_location);
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cartProducts = (() => {
    try {
      return cart
        .map((item) => {
          const product = liveProducts.find((p) => p.id === item.productId);
          return { ...item, product };
        })
        .filter((item) => item.product);
    } catch {
      return [];
    }
  })();

  const subtotal = cartProducts.reduce(
    (sum, item) => sum + item.product!.price * item.quantity,
    0
  );
  const selectedArea = LOCAL_DELIVERY_AREAS.find((a) => a.name === deliveryArea);
  const rawDeliveryFee = fulfillmentMethod === "local" ? (selectedArea?.fee ?? 100) : 0;
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD && fulfillmentMethod === "local";
  const deliveryFee =
    fulfillmentMethod === "countrywide" ? 0 : freeDelivery ? 0 : rawDeliveryFee;
  const preDiscountTotal = subtotal + deliveryFee;
  const pointsDiscount = 0;
  const total = preDiscountTotal - pointsDiscount;
  const earnedPoints = Math.floor(total / 100);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(field);
    toast("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    let didNavigate = false;

    if (!customerName.trim()) {
      toast.error("Please enter your name");
      setIsSubmitting(false);
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      setIsSubmitting(false);
      return;
    }

    if (fulfillmentMethod === "local" && !location.trim()) {
      toast.error("Please enter your delivery location");
      setIsSubmitting(false);
      return;
    }

    if (fulfillmentMethod === "countrywide") {
      if (!cwDestination.trim()) {
        toast.error("Please enter destination town");
        setIsSubmitting(false);
        return;
      }
      if (!cwReceiverName.trim()) {
        toast.error("Please enter receiver name");
        setIsSubmitting(false);
        return;
      }
      if (!cwReceiverPhone.trim()) {
        toast.error("Please enter receiver phone number");
        setIsSubmitting(false);
        return;
      }
    }

    if (paymentMethod === "mpesa" && !mpesaCode.trim()) {
      toast.error("Please enter your M-Pesa confirmation code");
      setIsSubmitting(false);
      return;
    }

    try {
      const productIds = cartProducts.map((i) => i.productId);
      const { data: stockCheck } = await supabase
        .from("products")
        .select("id, name, stock_quantity")
        .in("id", productIds);

      if (stockCheck) {
        for (const item of cartProducts) {
          const stockRow = stockCheck.find((p) => p.id === item.productId);
          if (
            stockRow &&
            stockRow.stock_quantity !== null &&
            item.quantity > stockRow.stock_quantity
          ) {
            toast.error(
              stockRow.stock_quantity === 0
                ? `"${item.product!.name}" is out of stock`
                : `Only ${stockRow.stock_quantity} of "${item.product!.name}" available`
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      const cust = await createOrLoadCustomer({
        name: customerName,
        phone,
        email: email || undefined,
        delivery_location: location || undefined,
        delivery_notes: deliveryNotes || undefined,
      });

      if (!cust) {
        toast.error("Failed to create account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const num = pendingOrderNum;

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

      const dbDeliveryOption =
        fulfillmentMethod === "pickup"
          ? "pickup"
          : fulfillmentMethod === "countrywide"
          ? "countrywide"
          : "delivery";

      const dbDeliveryArea =
        fulfillmentMethod === "local"
          ? deliveryArea
          : fulfillmentMethod === "countrywide"
          ? cwDestination
          : null;

      const dbDeliveryLocation =
        fulfillmentMethod === "local"
          ? location
          : fulfillmentMethod === "countrywide"
          ? [
              `To: ${cwDestination}`,
              cwShuttle ? `Via: ${cwShuttle}` : null,
              `Receiver: ${cwReceiverName} (${cwReceiverPhone})`,
            ]
              .filter(Boolean)
              .join(" | ")
          : null;

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
          delivery_option: dbDeliveryOption,
          delivery_area: dbDeliveryArea,
          delivery_location: dbDeliveryLocation,
          points_earned: earnedPoints,
          status: "received",
          order_source: "app",
          loyalty_card_number: cust.loyalty_card_number ?? null,
        } as any)
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

        const customerId = localStorage.getItem("stery_customer_id") || "";
        fetch(`${BACKEND_URL}/api/admin/orders/${orderData.id}/deduct-stock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Customer-ID": customerId,
          },
          body: JSON.stringify({
            items: orderItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          }),
        })
          .then(() => queryClient.invalidateQueries({ queryKey: ["products"] }))
          .catch((err) =>
            console.warn("Stock deduction failed (backend may be offline):", err)
          );
      }

      if (earnedPoints > 0) {
        await addPoints(`Order ${num}`, earnedPoints);
      }

      placeOrder({
        id: orderData?.id ?? Date.now().toString(),
        order_number: num,
        customer_id: cust.id,
        customer_phone: cust.phone,
        items: orderItems,
        total,
        status: "received",
        created_at: new Date().toISOString(),
        delivery_area: dbDeliveryArea,
        pointsEarned: earnedPoints,
      });

      clearCart();
      didNavigate = true;

      navigate("/shop/order-success", {
        state: {
          orderId: orderData?.id,
          orderNumber: num,
          customerName: cust.name,
          phone: cust.phone,
          deliveryOption: dbDeliveryOption,
          deliveryArea: dbDeliveryArea,
          location: dbDeliveryLocation,
          paymentMethod,
          total,
          earnedPoints,
          pointsDiscount,
          deliveryFee,
          freeDelivery,
          items: orderItems,
        },
      });
    } catch {
      toast.error("Something went wrong placing your order. Please try again.");
    } finally {
      if (!didNavigate) setIsSubmitting(false);
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
        <p className="text-muted-foreground text-sm">
          Something went wrong loading checkout. Please try again.
        </p>
        <Button onClick={() => navigate(-1)} className="bg-primary hover:bg-primary/90">
          Go Back
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
        <p className="text-muted-foreground text-sm">
          Your cart is empty. Please add items before checking out.
        </p>
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
        <div className="bg-card rounded-xl p-4 card-elevated">
          <h2 className="font-semibold text-foreground mb-3">Order Summary</h2>
          {cartProducts.map(({ productId, quantity, product }) => (
            <div key={productId} className="flex justify-between text-sm py-1.5">
              <span className="text-foreground">
                {product!.name} × {quantity}
              </span>
              <span className="text-foreground font-medium">
                KSh {product!.price * quantity}
              </span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Items</span>
              <span>{cartProducts.reduce((sum, i) => sum + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>KSh {subtotal}</span>
            </div>

            {fulfillmentMethod === "pickup" && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pickup</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
            )}

            {fulfillmentMethod === "local" && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery ({deliveryArea})</span>
                <span>
                  {freeDelivery ? (
                    <span className="text-green-600 font-medium">
                      Free{" "}
                      <span className="line-through text-muted-foreground/60 ml-1">
                        KSh {rawDeliveryFee}
                      </span>
                    </span>
                  ) : (
                    `KSh ${deliveryFee}`
                  )}
                </span>
              </div>
            )}

            {fulfillmentMethod === "countrywide" && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Shipping</span>
                <span className="text-amber-600 font-medium">To be confirmed</span>
              </div>
            )}

            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary font-medium">
                <span>🎁 Points Discount ({pointsDiscount} pts)</span>
                <span>- KSh {pointsDiscount}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-foreground text-xl pt-2 border-t border-border mt-1">
              <span>Total</span>
              <span>
                KSh {total}
                {fulfillmentMethod === "countrywide" && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    (+ shipping)
                  </span>
                )}
              </span>
            </div>

            {customer ? (
              <p className="text-xs text-primary font-medium">
                +{earnedPoints} loyalty points from this order
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Login to earn loyalty points from this order
              </p>
            )}
          </div>
        </div>

        {(() => {
          const isDelivery = fulfillmentMethod === "local" || fulfillmentMethod === "countrywide";
          return (
            <div className="bg-card rounded-xl p-4 card-elevated">
              <h2 className="font-semibold text-foreground mb-1">
                How would you like to receive your order?
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Select a fulfillment option
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => setFulfillmentMethod("pickup")}
                  className={`w-full p-3.5 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                    fulfillmentMethod === "pickup"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      fulfillmentMethod === "pickup"
                        ? "border-primary"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {fulfillmentMethod === "pickup" && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={`font-medium text-sm ${
                          fulfillmentMethod === "pickup"
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        Pickup at store
                      </p>
                      <span className="text-xs font-semibold text-green-600 shrink-0 ml-2">
                        Free
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Collect from Stery Supermarket, Bungoma
                    </p>
                    <p className="text-xs text-primary font-medium mt-1">
                      Ready in about 1 hour
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (!isDelivery) setFulfillmentMethod("local");
                  }}
                  className={`w-full p-3.5 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                    isDelivery ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isDelivery ? "border-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {isDelivery && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm ${
                        isDelivery ? "text-primary" : "text-foreground"
                      }`}
                    >
                      Delivery
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Have your order delivered to you
                    </p>
                  </div>
                </button>

                {isDelivery && (
                  <div className="ml-7 border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-muted/40 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Delivery type
                      </p>
                    </div>

                    <div className="p-3 space-y-2">
                      <button
                        onClick={() => setFulfillmentMethod("local")}
                        className={`w-full p-3 rounded-lg border-2 text-left flex items-start gap-2.5 transition-all ${
                          fulfillmentMethod === "local"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            fulfillmentMethod === "local"
                              ? "border-primary"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {fulfillmentMethod === "local" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p
                              className={`font-medium text-sm ${
                                fulfillmentMethod === "local"
                                  ? "text-primary"
                                  : "text-foreground"
                              }`}
                            >
                              Local delivery
                            </p>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              From KSh 50
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Same-day delivery within Bungoma and nearby areas
                          </p>
                          <p className="text-xs text-primary font-medium mt-1">
                            Delivered in about 2 hours
                          </p>
                        </div>
                      </button>

                      {fulfillmentMethod === "local" && (
                        <div className="space-y-3 pt-1 pl-1">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              Select your delivery area
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {LOCAL_DELIVERY_AREAS.map((area) => (
                                <button
                                  key={area.name}
                                  onClick={() => setDeliveryArea(area.name)}
                                  className={`p-2.5 rounded-lg border-2 text-left transition-colors ${
                                    deliveryArea === area.name
                                      ? "border-primary bg-primary/5"
                                      : "border-border"
                                  }`}
                                >
                                  <p
                                    className={`text-xs font-semibold ${
                                      deliveryArea === area.name
                                        ? "text-primary"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {area.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {subtotal >= FREE_DELIVERY_THRESHOLD ? (
                                      <span className="text-green-600 font-medium">Free</span>
                                    ) : (
                                      `KSh ${area.fee}`
                                    )}
                                  </p>
                                </button>
                              ))}
                            </div>
                            {subtotal >= FREE_DELIVERY_THRESHOLD && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center mt-2">
                                <p className="text-green-700 text-xs font-semibold">
                                  🎉 Free delivery unlocked on this order!
                                </p>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                              <MapPin className="w-3 h-3" /> Delivery location{" "}
                              <span className="text-primary font-normal">*</span>
                            </label>
                            <input
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="e.g. Near Quickmart, Bungoma Town"
                              className={inputCls}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 Include a nearby landmark to help the rider find you.
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                              <FileText className="w-3 h-3" /> Delivery notes (optional)
                            </label>
                            <input
                              value={deliveryNotes}
                              onChange={(e) => setDeliveryNotes(e.target.value)}
                              placeholder="e.g. Gate is blue, call on arrival"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setFulfillmentMethod("countrywide")}
                        className={`w-full p-3 rounded-lg border-2 text-left flex items-start gap-2.5 transition-all ${
                          fulfillmentMethod === "countrywide"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            fulfillmentMethod === "countrywide"
                              ? "border-primary"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {fulfillmentMethod === "countrywide" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p
                              className={`font-medium text-sm ${
                                fulfillmentMethod === "countrywide"
                                  ? "text-primary"
                                  : "text-foreground"
                              }`}
                            >
                              Countrywide delivery
                            </p>
                            <span className="text-xs text-amber-600 font-medium shrink-0 ml-2">
                              Fee TBC
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Delivery via shuttle or courier
                          </p>
                          <p className="text-xs text-primary font-medium mt-1">
                            Dispatched same day
                          </p>
                        </div>
                      </button>

                      {fulfillmentMethod === "countrywide" && (
                        <div className="space-y-3 pt-1 pl-1">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-amber-700 leading-relaxed">
                              Transport fee is charged separately depending on route. We will
                              confirm the final shipping cost before dispatch.
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                              Destination town{" "}
                              <span className="text-primary font-normal">*</span>
                            </label>
                            <input
                              value={cwDestination}
                              onChange={(e) => setCwDestination(e.target.value)}
                              placeholder="e.g. Nairobi, Kisumu, Nakuru"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                              Receiver name{" "}
                              <span className="text-primary font-normal">*</span>
                            </label>
                            <input
                              value={cwReceiverName}
                              onChange={(e) => setCwReceiverName(e.target.value)}
                              placeholder="Full name of person collecting"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                              Receiver phone number{" "}
                              <span className="text-primary font-normal">*</span>
                            </label>
                            <input
                              value={cwReceiverPhone}
                              onChange={(e) => setCwReceiverPhone(e.target.value)}
                              type="tel"
                              placeholder="e.g. 0712 345 678"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                              Preferred shuttle / courier (optional)
                            </label>
                            <input
                              value={cwShuttle}
                              onChange={(e) => setCwShuttle(e.target.value)}
                              placeholder="e.g. Easy Coach, Modern Coast"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
              className={inputCls}
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
              className={inputCls}
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
              className={inputCls}
            />
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 card-elevated">
          <h2 className="font-semibold text-foreground mb-3">Payment Method</h2>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod("mpesa")}
              className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                paymentMethod === "mpesa" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="text-xl">📱</span>
              <div>
                <p
                  className={`font-medium ${
                    paymentMethod === "mpesa" ? "text-primary" : "text-foreground"
                  }`}
                >
                  M-Pesa Paybill
                </p>
                <p className="text-xs text-muted-foreground">Pay via M-Pesa Paybill</p>
              </div>
            </button>

            {paymentMethod === "mpesa" && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4 mt-2">
                <div className="bg-card rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Step 1 — Complete M-Pesa payment
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Step 2 — Enter your transaction code
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Step 3 — Confirm your order
                  </p>
                </div>

                <div className="bg-card rounded-lg p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between sm:block">
                      <div>
                        <p className="text-xs text-muted-foreground">Business Number</p>
                        <p className="text-base font-semibold text-foreground">4076859</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard("4076859", "paybill")}
                        className="bg-secondary rounded-lg p-2 sm:mt-1"
                      >
                        {copiedField === "paybill" ? (
                          <Check className="w-4 h-4 text-accent" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between sm:block border-t border-border pt-3 sm:border-0 sm:pt-0">
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="text-base font-semibold text-foreground">{pendingOrderNum}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(pendingOrderNum, "account")}
                        className="bg-secondary rounded-lg p-2 sm:mt-1"
                      >
                        {copiedField === "account" ? (
                          <Check className="w-4 h-4 text-accent" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <div className="border-t border-border pt-3 sm:border-0 sm:pt-0">
                      <p className="text-xs text-muted-foreground">Amount to Pay</p>
                      <p className="text-base font-semibold text-primary">
                        KSh {total}
                        {fulfillmentMethod === "countrywide" && (
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            (+ shipping)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    M-Pesa Confirmation Code
                  </label>
                  <input
                    value={mpesaCode}
                    onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SLK4H7TXYZ"
                    className="w-full bg-secondary rounded-lg py-2.5 px-3 text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary font-mono tracking-wider placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You will receive this code by SMS after payment.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className={
            paymentMethod === "mpesa" && !mpesaCode.trim()
              ? "w-full h-auto whitespace-normal px-4 py-4 text-sm font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 shadow-none disabled:opacity-70"
              : "w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          }
        >
          {isSubmitting
            ? "Placing Order..."
            : paymentMethod === "mpesa" && !mpesaCode.trim()
            ? "Enter your M-Pesa confirmation code to place your order."
            : `Confirm Order — KSh ${total}${
                fulfillmentMethod === "countrywide" ? " + shipping" : ""
              }`}
        </Button>

        <div className="bg-card rounded-xl p-4 card-elevated text-center space-y-2">
          <p className="text-sm text-muted-foreground">Need help? Contact Stery Customer Care</p>
          <div className="flex gap-2 justify-center">
            <a href="tel:+254794560657">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                📞 Call Stery
              </Button>
            </a>
            <a href="https://wa.me/254794560657" target="_blank" rel="noopener noreferrer">
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

export default Checkout;