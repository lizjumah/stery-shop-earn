import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const screens = [
  {
    icon: ShoppingBag,
    title: "Welcome to Stery",
    description: "Shop groceries, earn rewards, and share deals with friends.",
    button: "Get Started",
  },
  {
    icon: Truck,
    title: "Fresh groceries delivered locally",
    description: "Fresh groceries, bakery items, and household essentials with easy M-Pesa payments.",
    button: "Start Shopping",
  },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = screens[step];

  const handleNext = () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("stery_onboarded", "true");
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in flex flex-col items-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl gradient-shop flex items-center justify-center mb-8">
          <current.icon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight mb-3">
          {current.title}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-10">
          {current.description}
        </p>

        {/* Dots */}
        <div className="flex gap-2 mb-8">
          {screens.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full h-12 text-base font-bold rounded-xl"
        >
          {current.button}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
