export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description: string;
  commission?: number;
  loyaltyPoints: number;
  inStock: boolean;
  isOffer?: boolean;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Fresh Milk 500ml",
    price: 75,
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
    category: "Dairy",
    description: "Fresh pasteurized milk from local farms. Rich in calcium and vitamins.",
    commission: 8,
    loyaltyPoints: 5,
    inStock: true,
  },
  {
    id: "2",
    name: "Unga Maize Flour 2kg",
    price: 220,
    originalPrice: 250,
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400",
    category: "Groceries",
    description: "Premium maize flour for making ugali. Finely milled for smooth texture.",
    commission: 15,
    loyaltyPoints: 15,
    inStock: true,
    isOffer: true,
  },
  {
    id: "3",
    name: "Cooking Oil 1L",
    price: 320,
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
    category: "Groceries",
    description: "Pure vegetable cooking oil. Ideal for frying and cooking.",
    commission: 20,
    loyaltyPoints: 20,
    inStock: true,
  },
  {
    id: "4",
    name: "Sugar 1kg",
    price: 180,
    originalPrice: 200,
    image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400",
    category: "Groceries",
    description: "White refined sugar for tea and baking.",
    commission: 12,
    loyaltyPoints: 12,
    inStock: true,
    isOffer: true,
  },
  {
    id: "5",
    name: "Bread Loaf",
    price: 60,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    category: "Bakery",
    description: "Fresh baked bread, soft and delicious.",
    commission: 5,
    loyaltyPoints: 4,
    inStock: true,
  },
  {
    id: "6",
    name: "Rice 2kg",
    price: 280,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    category: "Groceries",
    description: "Premium long grain rice. Perfect for pilau and biriyani.",
    commission: 18,
    loyaltyPoints: 18,
    inStock: true,
  },
  {
    id: "7",
    name: "Tea Leaves 500g",
    price: 450,
    originalPrice: 520,
    image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400",
    category: "Beverages",
    description: "Premium Kenyan tea leaves. Strong and aromatic.",
    commission: 35,
    loyaltyPoints: 30,
    inStock: true,
    isOffer: true,
  },
  {
    id: "8",
    name: "Eggs Tray (30)",
    price: 450,
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400",
    category: "Dairy",
    description: "Farm fresh eggs. High in protein.",
    commission: 25,
    loyaltyPoints: 25,
    inStock: true,
  },
];

export const categories = ["All", "Groceries", "Dairy", "Bakery", "Beverages"];
