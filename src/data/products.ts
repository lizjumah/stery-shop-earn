export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  subcategory?: string; // one level below category — optional for backwards compat
  description: string;
  commission?: number;
  loyaltyPoints: number;
  inStock: boolean;
  stockQuantity?: number; // live stock level — enforced at add-to-cart
  isOffer?: boolean;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock"; // staff-controlled availability
}

export const products: Product[] = [
  { id: "1",  name: "Stery Bread",        price: 60,  image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", category: "Bakery",      subcategory: "Breads",           description: "Fresh baked bread from Stery Bakery. Soft, fluffy and delicious.",          commission: 10,  loyaltyPoints: 4,  inStock: true },
  { id: "2",  name: "Fresh Milk 500ml",   price: 75,  image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", category: "Groceries",   subcategory: "Dairy",            description: "Fresh pasteurized milk from local farms. Rich in calcium and vitamins.",     commission: 8,   loyaltyPoints: 5,  inStock: true },
  { id: "3",  name: "Sugar 1kg",          price: 180, originalPrice: 200, image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400", category: "Groceries",   subcategory: "Sugar & Salt",     description: "White refined sugar for tea and baking.",                                   commission: 12,  loyaltyPoints: 12, inStock: true, isOffer: true },
  { id: "4",  name: "Cooking Oil 1L",     price: 350, originalPrice: 400, image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400", category: "Groceries",   subcategory: "Cooking Oils",     description: "Pure vegetable cooking oil. Ideal for frying and cooking.",                 commission: 40,  loyaltyPoints: 20, inStock: true, isOffer: true },
  { id: "5",  name: "Bar Soap",           price: 120, image: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=400", category: "Household",   subcategory: "Cleaning",         description: "Multipurpose cleaning bar soap. Great for laundry and household use.",      commission: 15,  loyaltyPoints: 8,  inStock: true },
  { id: "6",  name: "Phone Charger",      price: 500, originalPrice: 650, image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400", category: "Electronics", subcategory: "Chargers & Cables", description: "Fast charging USB cable. Compatible with most Android phones.",              commission: 100, loyaltyPoints: 30, inStock: true, isOffer: true },
  { id: "7",  name: "Earphones",          price: 350, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400", category: "Electronics", subcategory: "Earphones",        description: "Comfortable in-ear earphones with clear sound quality and bass.",           commission: 60,  loyaltyPoints: 20, inStock: true },
  { id: "8",  name: "Baby Blanket",       price: 800, originalPrice: 950, image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400", category: "Baby Items",  subcategory: "Bedding",          description: "Soft, warm baby blanket. Perfect for newborns and infants.",                commission: 120, loyaltyPoints: 50, inStock: true, isOffer: true },
  { id: "9",  name: "Bracelet",           price: 1200, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400", category: "Jewelry",    subcategory: "Bracelets",        description: "Beautiful handmade bracelet. Perfect gift for someone special.",            commission: 200, loyaltyPoints: 60, inStock: true },
  { id: "10", name: "Cooking Pan",        price: 650, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", category: "Household",   subcategory: "Cookware",         description: "Non-stick cooking pan. Durable and easy to clean.",                        commission: 80,  loyaltyPoints: 35, inStock: true },
  { id: "11", name: "Unga Maize Flour 2kg", price: 220, originalPrice: 250, image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400", category: "Groceries", subcategory: "Flour & Grains",   description: "Premium maize flour for making ugali. Finely milled for smooth texture.",   commission: 15,  loyaltyPoints: 15, inStock: true, isOffer: true },
  { id: "12", name: "Tea Leaves 500g",    price: 450, originalPrice: 520, image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400", category: "Groceries",   subcategory: "Tea & Coffee",     description: "Premium Kenyan tea leaves. Strong and aromatic.",                           commission: 35,  loyaltyPoints: 30, inStock: true, isOffer: true },
  { id: "13", name: "Rice 2kg",           price: 280, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", category: "Groceries",   subcategory: "Flour & Grains",   description: "Premium long grain rice. Perfect for pilau and biriyani.",                  commission: 18,  loyaltyPoints: 18, inStock: true },
  { id: "14", name: "Eggs Tray (30)",     price: 450, image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400", category: "Groceries",   subcategory: "Eggs",             description: "Farm fresh eggs. High in protein.",                                         commission: 25,  loyaltyPoints: 25, inStock: true },
];

export const categories = ["All", "Groceries", "Bakery", "Electronics", "Household", "Baby Items", "Jewelry"];

/**
 * Subcategory options per category — used in storefront filter chips and admin product form.
 * V1: defined here in code. Future: owner-managed via DB table.
 */
export const subcategoryConfig: Record<string, string[]> = {
  Groceries:    ["Dairy", "Eggs", "Flour & Grains", "Cooking Oils", "Sugar & Salt", "Tea & Coffee"],
  Bakery:       ["Breads", "Buns & Rolls", "Cakes", "Biscuits"],
  Electronics:  ["Phones", "Chargers & Cables", "Earphones", "Accessories"],
  Household:    ["Cleaning", "Cookware", "Storage", "Bedding"],
  "Baby Items": ["Bedding", "Clothing", "Feeding", "Toys"],
  Jewelry:      ["Bracelets", "Necklaces", "Earrings", "Rings"],
};

/**
 * Category metadata — single source of truth for storefront display.
 * Future: owner can manage categories here or via a DB table.
 */
export const categoryConfig: Record<string, { emoji: string; label: string; description: string }> = {
  Groceries:    { emoji: "🛒", label: "Groceries",         description: "Fresh food and daily staples" },
  Bakery:       { emoji: "🍞", label: "Bakery",            description: "Freshly baked breads and pastries" },
  Electronics:  { emoji: "⚡", label: "Electronics",       description: "Phones, chargers and accessories" },
  Household:    { emoji: "🏠", label: "Household",         description: "Home and cleaning essentials" },
  "Baby Items": { emoji: "👶", label: "Baby Items",        description: "Baby care and nursery" },
  Jewelry:      { emoji: "💎", label: "Jewelry",           description: "Accessories and gifts" },
};
