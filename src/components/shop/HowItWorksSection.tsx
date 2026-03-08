import { ShoppingBag, CreditCard, Package } from "lucide-react";

const steps = [
  { icon: <ShoppingBag className="w-6 h-6 text-primary" />, step: "Step 1", title: "Browse & Add to Cart", desc: "Browse products and add items to your cart." },
  { icon: <CreditCard className="w-6 h-6 text-primary" />, step: "Step 2", title: "Checkout & Pay", desc: "Pay using M-Pesa Paybill or choose cash on delivery." },
  { icon: <Package className="w-6 h-6 text-primary" />, step: "Step 3", title: "We Deliver", desc: "Stery prepares your order and delivers it to your location." },
];

export const HowItWorksSection = () => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-foreground mb-4">How Stery Works</h2>
    <div className="space-y-3">
      {steps.map((item, i) => (
        <div key={i} className="bg-card rounded-xl p-4 card-elevated flex items-start gap-4">
          <div className="bg-primary/10 rounded-full p-3 shrink-0">{item.icon}</div>
          <div>
            <span className="text-xs font-semibold text-primary uppercase">{item.step}</span>
            <h3 className="font-semibold text-foreground mt-0.5">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);
