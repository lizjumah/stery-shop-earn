import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Star, Gift, Users, Zap, Package } from "lucide-react";

interface Activity {
  id: number;
  emoji: string;
  icon: React.ReactNode;
  message: string;
  time: string;
}

const ACTIVITY_POOL = [
  { emoji: "🪙", icon: <Star className="w-4 h-4 text-primary" />, message: "Mary from Bungoma earned 40 points." },
  { emoji: "🛒", icon: <ShoppingCart className="w-4 h-4 text-primary" />, message: "A customer bought the Breakfast Bundle." },
  { emoji: "🎁", icon: <Gift className="w-4 h-4 text-accent" />, message: "James unlocked a KSh 100 voucher." },
  { emoji: "👥", icon: <Users className="w-4 h-4 text-accent" />, message: "Alice invited a friend and earned 50 bonus points." },
  { emoji: "🪙", icon: <Star className="w-4 h-4 text-primary" />, message: "Someone just earned 25 points from a purchase." },
  { emoji: "🛒", icon: <ShoppingCart className="w-4 h-4 text-primary" />, message: "Peter from Kanduyi ordered cooking oil." },
  { emoji: "🪙", icon: <Star className="w-4 h-4 text-primary" />, message: "A new customer earned their first 20 points!" },
  { emoji: "🛒", icon: <ShoppingCart className="w-4 h-4 text-primary" />, message: "Grace just placed an order for KSh 1,200." },
  { emoji: "👥", icon: <Users className="w-4 h-4 text-accent" />, message: "David referred 3 friends this week." },
  { emoji: "🎁", icon: <Gift className="w-4 h-4 text-accent" />, message: "Esther unlocked free delivery on her order." },
  { emoji: "🛒", icon: <Package className="w-4 h-4 text-primary" />, message: "A family essentials bundle was just purchased." },
  { emoji: "🪙", icon: <Star className="w-4 h-4 text-primary" />, message: "Faith from Naitiri reached 200 loyalty points." },
  { emoji: "🎁", icon: <Gift className="w-4 h-4 text-destructive" />, message: "Someone just redeemed a rewards voucher." },
  { emoji: "🛒", icon: <ShoppingCart className="w-4 h-4 text-primary" />, message: "A customer just bought Sugar and Cooking Oil." },
  { emoji: "👥", icon: <Users className="w-4 h-4 text-accent" />, message: "Sarah earned KSh 200 commission from a referral." },
];

const TIMES = ["2 min ago", "5 min ago", "9 min ago", "12 min ago", "15 min ago"];

function pickRandom<T>(arr: T[], count: number, exclude?: Set<number>): { items: T[]; indices: number[] } {
  const available = arr.map((_, i) => i).filter((i) => !exclude?.has(i));
  const shuffled = available.sort(() => Math.random() - 0.5);
  const indices = shuffled.slice(0, count);
  return { items: indices.map((i) => arr[i]), indices };
}

function makeActivity(pool: typeof ACTIVITY_POOL, index: number, time: string, id: number): Activity {
  return { ...pool[index], id, time };
}

export const CommunityActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [fadingId, setFadingId] = useState<number | null>(null);
  const [counter, setCounter] = useState(0);

  // Initialize
  useEffect(() => {
    const { indices } = pickRandom(ACTIVITY_POOL, 5);
    const initial = indices.map((idx, i) => makeActivity(ACTIVITY_POOL, idx, TIMES[i], i));
    setActivities(initial);
    setUsedIndices(new Set(indices));
    setCounter(5);
  }, []);

  // Rotate one item every 18 seconds
  useEffect(() => {
    if (activities.length === 0) return;

    const interval = setInterval(() => {
      // Pick which slot to replace (rotate through)
      const replaceIndex = Math.floor(Math.random() * activities.length);
      const oldActivity = activities[replaceIndex];

      // Fade out
      setFadingId(oldActivity.id);

      setTimeout(() => {
        // Find a new activity not currently shown
        const currentPoolIndices = new Set<number>();
        activities.forEach((a) => {
          const idx = ACTIVITY_POOL.findIndex((p) => p.message === a.message);
          if (idx !== -1) currentPoolIndices.add(idx);
        });

        const { indices: newIndices } = pickRandom(ACTIVITY_POOL, 1, currentPoolIndices);
        const newPoolIdx = newIndices[0] ?? Math.floor(Math.random() * ACTIVITY_POOL.length);

        setCounter((c) => {
          const newId = c + 1;
          setActivities((prev) =>
            prev.map((a, i) =>
              i === replaceIndex
                ? makeActivity(ACTIVITY_POOL, newPoolIdx, "Just now", newId)
                : { ...a, time: shiftTime(a.time) }
            )
          );
          setFadingId(null);
          return newId;
        });
      }, 500); // fade duration
    }, 18000);

    return () => clearInterval(interval);
  }, [activities]);

  return (
    <div className="bg-card rounded-xl p-4 card-elevated border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Zap className="w-4 h-4 text-accent" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
        </div>
        <h3 className="font-bold text-foreground text-sm">Stery Community Activity</h3>
        <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-accent rounded-full inline-block animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-2.5">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start gap-2.5 transition-opacity duration-500 ${
              fadingId === activity.id ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="text-sm mt-0.5 shrink-0">{activity.emoji}</span>
            <p className="text-xs text-foreground leading-relaxed flex-1 min-w-0">{activity.message}</p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function shiftTime(time: string): string {
  if (time === "Just now") return "1 min ago";
  const match = time.match(/^(\d+)/);
  if (!match) return time;
  const mins = parseInt(match[1]) + 3;
  return `${mins} min ago`;
}
