import { Truck, MapPin } from "lucide-react";

const areas = [
  { area: "Bungoma Town", fee: "KSh 100" },
  { area: "Kanduyi", fee: "KSh 200" },
  { area: "Naitiri", fee: "KSh 200" },
  { area: "Chwele", fee: "KSh 200" },
];

export const DeliveryInfoSection = () => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-foreground mb-4">Delivery Information</h2>
    <div className="bg-card rounded-xl p-4 card-elevated">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Delivery Areas & Fees</h3>
      </div>
      <div className="space-y-2 mb-3">
        {areas.map((d) => (
          <div key={d.area} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{d.area}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{d.fee}</span>
          </div>
        ))}
      </div>
      <div className="bg-accent/10 rounded-lg p-3 text-center">
        <p className="text-accent text-sm font-semibold">🎉 FREE delivery on orders above KSh 3,000!</p>
      </div>
    </div>
  </div>
);
