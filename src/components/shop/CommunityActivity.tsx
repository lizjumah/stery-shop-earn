import { useState, useEffect } from "react";
import { ShoppingCart, Star, Gift, Users, Zap, Package } from "lucide-react";

interface Activity {
  id: number;
  icon: React.ReactNode;
  message: string;
  time: string;
}

const ACTIVITY_POOL: Omit<Activity, "id" | "time">[] = [
  { icon: <Star className="w-4 h-4 text-primary" />, message: "Mary from Bungoma just earned 40 points." },
  { icon: <Gift className="w-4 h-4 text-accent" />, message: "James unlocked a KSh 100 voucher." },
  { icon: <Package className="w-4 h-4 text-primary" />, message: "A customer just bought the Breakfast Bundle." },
  { icon: <Users className="w-4 h-4 text-accent" />, message: "Alice invited a friend and earned 50 bonus points." },
  { icon: <Gift className="w-4 h-4 text-destructive" />, message: "Someone just redeemed a rewards voucher." },
  { icon: <ShoppingCart className="w-4 h-4 text-primary" />, message: "Peter from Kanduyi ordered cooking oil." },
  { icon: <Star className="w-4 h-4 text-primary" />, message: "A new customer earned their first 20 points!" },
  { icon: <ShoppingCart className="w-4 h-4 text-primary" />, message: "Grace just placed an order for KSh 1,200." },
  { icon: <Users className="w-4 h-4 text-accent" />, message: "David referred 3 friends this week." },
  { icon: <Gift className="w-4 h-4 text-accent" />, message: "Esther unlocked free delivery on her order." },
  { icon: <ShoppingCart className="w-4 h-4 text-primary" />, message: "A family essentials bundle was just purchased." },
  { icon: <Star className="w-4 h-4 text-primary" />, message: "Faith from Naitiri reached 200 loyalty points." },
];

const TIMES = ["Just now", "1 min ago", "2 min ago", "3 min ago", "5 min ago", "8 min ago"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateActivities(): Activity[] {
  return shuffle(ACTIVITY_POOL)
    .slice(0, 5)
    .map((a, i) => ({ ...a, id: Date.now() + i, time: TIMES[i] }));
}

export const CommunityActivity = () => {
  const [activities, setActivities] = useState<Activity[]>(generateActivities);
  const [fadeKey, setFadeKey] = useState(0);

  // Rotate activities every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(generateActivities());
      setFadeKey((k) => k + 1);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card rounded-xl p-4 card-elevated border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Zap className="w-4.5 h-4.5 text-accent" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
        </div>
        <h3 className="font-bold text-foreground text-sm">Stery Community Activity</h3>
      </div>
      <div key={fadeKey} className="space-y-2.5 animate-fade-in">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-2.5">
            <div className="bg-muted rounded-full p-1.5 mt-0.5 shrink-0">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">{activity.message}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
