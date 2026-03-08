import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";
import { useApp } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: typeof products;
}

const STORE_INFO = {
  hours: "Monday–Saturday: 7:00 AM – 8:00 PM\nSunday: 8:00 AM – 6:00 PM",
  location: "Bungoma Town, along Moi Avenue, near the main stage.",
  delivery: "Yes! We deliver within Bungoma Town (KSh 100), Kanduyi, Naitiri, and Chwele (KSh 200 each). Orders above KSh 3,000 get FREE delivery!",
  phone: "0794 560 657",
};

const GREETINGS = [
  "hi", "hello", "hey", "habari", "sasa", "mambo", "niaje", "good morning", "good afternoon", "good evening",
];

function parseIntent(text: string): { type: string; query: string; items?: { name: string; qty: number }[] } {
  const lower = text.toLowerCase().trim();

  if (GREETINGS.some((g) => lower.startsWith(g))) return { type: "greeting", query: "" };
  if (/hours?|open|close|time/i.test(lower)) return { type: "hours", query: "" };
  if (/locat|where|find.*shop|direction|address/i.test(lower)) return { type: "location", query: "" };
  if (/deliver/i.test(lower)) return { type: "delivery", query: "" };
  if (/phone|call|contact|number/i.test(lower)) return { type: "phone", query: "" };
  if (/deal|offer|promo|discount|ofa|sale/i.test(lower)) return { type: "deals", query: "" };
  if (/thank/i.test(lower)) return { type: "thanks", query: "" };

  // Try to parse "I want 2 bread and 1 milk" style
  const cartPattern = /(\d+)\s+([a-z\s]+?)(?:\s+and\s+|\s*,\s*|$)/gi;
  const items: { name: string; qty: number }[] = [];
  let match;
  while ((match = cartPattern.exec(lower)) !== null) {
    items.push({ name: match[2].trim(), qty: parseInt(match[1]) });
  }
  if (items.length > 0) return { type: "add_to_cart", query: "", items };

  // Default: product search
  return { type: "search", query: lower.replace(/^(do you have|show me|where can i find|i need|i want|looking for|find)\s*/i, "").trim() };
}

function searchProducts(query: string) {
  const q = query.toLowerCase();
  return products.filter(
    (p) => p.inStock && (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  );
}

function findProduct(name: string) {
  const q = name.toLowerCase();
  return products.find(
    (p) => p.inStock && (p.name.toLowerCase().includes(q) || p.name.toLowerCase().split(" ").some((w) => q.includes(w)))
  );
}

export const SteryChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! 👋 I'm your Stery shopping assistant. How can I help you today?\n\nYou can ask me to:\n• Find products\n• Show today's deals\n• Add items to your cart\n• Answer questions about our store",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart, cart } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Process after a small delay for natural feel
    setTimeout(() => {
      const intent = parseIntent(text);
      let reply: Partial<ChatMessage> = {};

      switch (intent.type) {
        case "greeting":
          reply.content = "Hello! 😊 Welcome to Stery. What can I help you find today?";
          break;

        case "thanks":
          reply.content = "You're welcome! 😊 Happy shopping at Stery!";
          break;

        case "hours":
          reply.content = `🕐 **Store Hours:**\n\n${STORE_INFO.hours}`;
          break;

        case "location":
          reply.content = `📍 **Our Location:**\n\n${STORE_INFO.location}`;
          break;

        case "delivery":
          reply.content = `🚚 **Delivery Info:**\n\n${STORE_INFO.delivery}`;
          break;

        case "phone":
          reply.content = `📞 **Contact Us:**\n\n${STORE_INFO.phone}\n\nFeel free to call or WhatsApp us!`;
          break;

        case "deals": {
          const dealProducts = products.filter((p) => p.isOffer && p.inStock);
          reply.content = "🔥 **OFA MOTOMOTO DEALS**\n\nHere are today's best deals:";
          reply.products = dealProducts.slice(0, 5);
          break;
        }

        case "add_to_cart": {
          const added: string[] = [];
          const notFound: string[] = [];
          intent.items?.forEach(({ name, qty }) => {
            const product = findProduct(name);
            if (product) {
              for (let i = 0; i < qty; i++) addToCart(product.id);
              added.push(`${qty}× ${product.name}`);
            } else {
              notFound.push(name);
            }
          });
          let msg = "";
          if (added.length) msg += `✅ Added to cart:\n${added.map((a) => `• ${a}`).join("\n")}`;
          if (notFound.length) msg += `\n\n❌ Couldn't find: ${notFound.join(", ")}`;
          if (added.length) msg += "\n\nReady to checkout? 🛒";
          reply.content = msg || "I couldn't find those items. Try searching for a specific product name.";
          break;
        }

        case "search": {
          const results = searchProducts(intent.query);
          if (results.length > 0) {
            reply.content = `I found ${results.length} product${results.length > 1 ? "s" : ""} for "${intent.query}":`;
            reply.products = results.slice(0, 5);
          } else {
            reply.content = `Sorry, I couldn't find "${intent.query}" in our store. 😔\n\nTry searching for: bread, milk, sugar, eggs, cooking oil, tea leaves, flour, or rice.`;
          }
          break;
        }

        default:
          reply.content = "I'm not sure I understand. You can ask me to find products, show deals, or add items to your cart! 😊";
      }

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: reply.content || "", products: reply.products },
      ]);
    }, 400);
  };

  const handleAddProduct = (productId: string, name: string) => {
    addToCart(productId);
    toast.success(`${name} added to cart!`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Ask Stery</span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h2 className="font-bold text-sm">Stery Assistant</h2>
                <p className="text-[10px] opacity-80">Always here to help 💚</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={i}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.products.map((p) => (
                        <div key={p.id} className="bg-card rounded-xl p-2.5 flex items-center gap-2.5 border border-border">
                          <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">{p.name}</p>
                            <p className="text-primary font-bold text-xs">KSh {p.price}</p>
                            {p.originalPrice && (
                              <p className="text-[10px] text-muted-foreground line-through">KSh {p.originalPrice}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddProduct(p.id, p.name)}
                            className="bg-primary text-primary-foreground rounded-full p-2 shrink-0 hover:bg-primary/90 active:scale-95"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Checkout shortcut after cart additions */}
                  {msg.role === "assistant" && msg.content.includes("Ready to checkout") && (
                    <button
                      onClick={() => { setOpen(false); navigate("/shop/cart"); }}
                      className="mt-2 flex items-center gap-1.5 bg-accent text-accent-foreground rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-accent/90"
                    >
                      Go to Checkout <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
            {["Today's deals", "Do you deliver?", "Store hours", "Show me bread"].map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="whitespace-nowrap bg-muted text-foreground text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted/80 shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-4 pt-2 border-t border-border bg-background shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button type="submit" size="icon" className="rounded-full bg-primary hover:bg-primary/90 h-10 w-10 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
