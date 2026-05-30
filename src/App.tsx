/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Menu as MenuIcon, 
  ChevronLeft, 
  ChevronRight, 
  Utensils, 
  Star, 
  Sun, 
  Moon, 
  PhoneCall, 
  Edit,
  X,
  ShoppingBag,
  Wine,
  Filter,
  Search,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { collection, getDocs, setDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { Dish, Review, Deal, DISHES as SEED_DATA } from './types';
import AdminPanel from './components/AdminPanel';
import ReviewModal from './components/ReviewModal';
import CheckoutModal from './components/CheckoutModal';

const CACHE_KEYS = {
  MENU: 'salar_menu_cache',
  REVIEWS: 'salar_reviews_cache',
  TIMESTAMP: 'salar_cache_timestamp'
};

export default function App() {
  const [menuItems, setMenuItems] = useState<Dish[]>(SEED_DATA);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeSelectionDish, setSizeSelectionDish] = useState<Dish | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // 1. Data Fetching with Caching
  useEffect(() => {
    const fetchData = async () => {
      // 1. Load from Cache First
      const cachedMenu = localStorage.getItem(CACHE_KEYS.MENU);
      const cachedReviews = localStorage.getItem(CACHE_KEYS.REVIEWS);
      
      if (cachedMenu) setMenuItems(JSON.parse(cachedMenu));
      if (cachedReviews) setReviews(JSON.parse(cachedReviews));

      // 2. Fetch Fresh Data in Background (One-time getDocs)
      try {
        console.log("Starting Firebase sync with project:", db.app.options.projectId);
        
        // Test connection
        const menuSnap = await getDocs(collection(db, 'menu')).catch(e => {
          if (e.message?.includes('permission') || e.code === 'permission-denied') {
             console.error("CRITICAL: Permission Denied for 'menu' collection.");
             console.log("Current Project ID:", db.app.options.projectId);
             console.log("Rules require public read access. Ensure Firestore is enabled in 'Native Mode' and rules are deployed to the correct database instance.");
          }
          console.error("Menu fetch failed", e);
          return null;
        });
        if (menuSnap) {
          const cloudData = menuSnap.docs.map(d => ({ ...d.data(), id: d.id }) as Dish);
          const mergedData = cloudData.length > 0 ? cloudData : SEED_DATA;
          setMenuItems(mergedData);
          localStorage.setItem(CACHE_KEYS.MENU, JSON.stringify(mergedData));
        }

        const catsSnap = await getDocs(collection(db, 'categories')).catch(e => {
          if (e.message?.includes('permission') || e.code === 'permission-denied') {
             console.warn("Categories permission denied - check if collection exists or rules are deployed.");
          }
          console.error("Categories fetch failed", e);
          return null;
        });
        if (catsSnap) {
          const cloudCats = catsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
          setCategoriesData(cloudCats);
        }

        const reviewQuery = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const reviewSnap = await getDocs(reviewQuery).catch(e => {
          console.error("Reviews fetch failed (Check index)", e);
          return null;
        });
        if (reviewSnap) {
          const reviewData = reviewSnap.docs
            .map(d => ({ ...d.data(), id: d.id }) as Review)
            .filter(r => r.status === 'approved'); // Client side filter to avoid index requirement
          setReviews(reviewData);
          localStorage.setItem(CACHE_KEYS.REVIEWS, JSON.stringify(reviewData));
        }

        const dealsSnap = await getDocs(collection(db, 'deals')).catch(e => {
          console.warn("Deals fetch failed - might be empty or permission issues", e);
          return null;
        });
        if (dealsSnap) {
          setDeals(dealsSnap.docs.map(d => ({ ...d.data(), id: d.id }) as Deal));
        }
      } catch (error) {
        console.error("Fetch process failed", error);
      }
    };

    fetchData();
  }, []);

  const categories = useMemo(() => {
    if (categoriesData.length > 0) {
      return [{ id: 'all', name: 'All' }, ...categoriesData];
    }
    const cats = new Set(['All']);
    menuItems.forEach(item => {
      if (item.categoryName) cats.add(item.categoryName);
      else if (item.subtitle) cats.add(item.subtitle);
    });
    return Array.from(cats).map(c => ({ id: c.toLowerCase(), name: c }));
  }, [menuItems, categoriesData]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const catName = item.categoryName || item.subtitle;
      const matchesCategory = selectedCategory === 'All' || catName === selectedCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            catName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const heroDishes = useMemo(() => menuItems.filter(d => d.isHero), [menuItems]);
  const signatureDishes = useMemo(() => menuItems.filter(d => d.isSignature), [menuItems]);
  const currentDish = heroDishes[currentIndex] || menuItems[0];

  const addToCart = (dish: Dish, selectedSize?: { name: string; price: number }) => {
    const finalPrice = selectedSize ? selectedSize.price : (dish.price || 15);
    setCart((prev) => [...prev, { 
      ...dish, 
      price: finalPrice, 
      selectedSize: selectedSize || null, 
      cartId: Math.random() 
    }]);
    setSizeSelectionDish(null);
    setNotification(`${dish.title} added to bag!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const addDealToCart = (deal: Deal) => {
    setCart((prev) => [...prev, { 
      id: deal.id,
      title: deal.title, 
      subtitle: 'Exclusive Deal Bundle',
      price: deal.price, 
      isDeal: true,
      items: deal.items,
      image: deal.items[0]?.image, // Use first item image as main
      cartId: Math.random() 
    }]);
    setNotification(`${deal.title} added to bag!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddToCartClick = (dish: Dish) => {
    if (dish.sizes && dish.sizes.length > 0) {
      setSizeSelectionDish(dish);
    } else {
      addToCart(dish);
    }
  };

  const removeFromCart = (cartId: number) => {
    setCart((prev) => prev.filter(item => item.cartId !== cartId));
  };

  const totalPrice = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price || 15), 0);
  }, [cart]);

  useEffect(() => {
    if (heroDishes.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroDishes.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroDishes.length]);

  if (isAdminMode) return <AdminPanel onExit={() => setIsAdminMode(false)} />;

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans transition-all duration-700 overflow-x-hidden bg-slate-950 dark text-slate-100">
      
      {/* Principal SEO Heading H1 (Screen-reader optimized for highest indexable search engine priority) */}
      <h1 className="sr-only">Salar Food Cafe | Artisanal Fast Food & Premium Gourmet Burgers in Islamabad</h1>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
               <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase transition-colors">Salar<span className="text-orange-600">Food</span>Cafe</span>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {['Home', 'About', 'Menu', 'Reviews'].map((tab) => (
              <a key={tab} href={`#${tab.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors">
                {tab}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-3 bg-orange-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 text-[10px] rounded-full flex items-center justify-center font-black border-2 border-white">{cart.length}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative w-full min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-6 overflow-hidden">
        {currentDish && (
          <>
            <motion.div 
              key={currentDish.accentColor}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="absolute inset-0 pointer-events-none -z-10 blur-[120px]"
              style={{ backgroundColor: currentDish.accentColor }}
            />

            <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="relative z-10 lg:flex-1 flex justify-center">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentDish.id}
                    initial={{ opacity: 0, scale: 0.8, rotate: -15, y: 20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 1.1, rotate: 15, y: -20 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-[220px] h-[220px] md:w-[420px] md:h-[420px] xl:w-[480px] xl:h-[480px]"
                  >
                    <img 
                      src={currentDish.image} 
                      loading="lazy"
                      className="w-full h-full object-cover rounded-full border-[10px] sm:border-[20px] border-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-700" 
                      alt={currentDish.title} 
                    />
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 sm:w-24 sm:h-24 bg-orange-600 rounded-full flex flex-col items-center justify-center text-white border-4 sm:border-8 border-slate-800 shadow-xl">
                        <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest">Only</span>
                        <span className="text-xs sm:text-xl font-black tracking-tighter leading-none">Rs.{currentDish.price}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex-1 text-center lg:text-left space-y-6 sm:space-y-8">
                <AnimatePresence mode="wait">
                  <motion.div key={currentDish.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
                    <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded-full mb-3 sm:mb-4 text-[8px] sm:text-[10px] font-black tracking-[0.3em] shadow-sm uppercase">
                       HOT & FRESH SELECTION
                    </span>
                    <h1 className="text-4xl sm:text-7xl xl:text-8xl font-black text-slate-900 dark:text-white leading-[0.85] tracking-tighter mb-4 sm:mb-6">
                      <span className="block mb-1 sm:mb-2 text-4xl sm:text-8xl stylish-heading drop-shadow-sm">{currentDish.title}</span>
                      <span className="stylish-subtitle block dark:text-slate-400">
                        {currentDish.subtitle}
                      </span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-base md:text-lg max-w-lg mx-auto lg:mx-0 font-bold leading-relaxed px-4 sm:px-0">
                       Salar Food Cafe brings you the ultimate urban dining experience with flavors reimagined for the modern foodie.
                    </p>
                  </motion.div>
                </AnimatePresence>

                  <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4 px-6 sm:px-0">
                  <button onClick={() => handleAddToCartClick(currentDish)} className="px-6 py-4 sm:px-10 sm:py-5 bg-orange-600 text-white font-black uppercase tracking-widest rounded-full shadow-2xl shadow-orange-100 dark:shadow-none hover:bg-orange-700 hover:scale-105 transition-all flex items-center justify-center gap-3 text-[10px] sm:text-sm">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> Order Now
                  </button>
                  <a href="#menu" className="px-6 py-4 sm:px-10 sm:py-5 border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white font-black uppercase tracking-widest rounded-full hover:bg-slate-900 hover:text-white transition-all text-center text-[10px] sm:text-sm">
                    Explore Menu
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* About Us Section (SEO Optimized content block + #about anchor target) */}
      <section id="about" className="w-full py-16 sm:py-32 px-4 sm:px-6 bg-slate-950 text-white relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(249,115,22,0.05),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6 sm:space-y-8 text-center lg:text-left"
            >
              <div className="space-y-2 sm:space-y-4">
                <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs block">THE SALAR EXPERIENCE</span>
                <h2 className="text-3xl sm:text-6xl font-black text-white tracking-tighter leading-none">
                  Crafting Modern <span className="text-orange-600">Culinary Art</span>
                </h2>
              </div>
              <p className="text-slate-400 text-sm sm:text-lg leading-relaxed font-medium">
                At Salar Food Cafe, we believe fast food should be a luxurious gourmet journey, not a compromise. Founded in Islamabad, we combine culinary artistry with premium, farm-fresh ingredients to create satisfying meals that excite the modern palate.
              </p>
              <p className="text-slate-400 text-sm sm:text-lg leading-relaxed font-medium">
                Our signature Honey Wings, handcrafted giant burgers, and savory deals are made with extreme dedication to taste, texture, and uncompromising hygiene. Experience the ultimate flavor destination.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
                <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3">
                   <span className="text-orange-500 font-black text-2xl">100%</span>
                   <span className="text-slate-300 font-bold uppercase text-[9px] tracking-widest leading-none block">Fresh<br/>Ingredients</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3">
                   <span className="text-orange-500 font-black text-2xl">5★</span>
                   <span className="text-slate-300 font-bold uppercase text-[9px] tracking-widest leading-none block">Customer<br/>Rating</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
            >
              {[
                {
                  title: "Artisanal Recipes",
                  description: "Every sauce is mixed, and every marinade prepped from scratch daily.",
                  icon: "✨"
                },
                {
                  title: "Supreme Quality",
                  description: "We work directly with premium vendors to secure the freshest poultry & vegetables.",
                  icon: "👑"
                },
                {
                  title: "Perfect Hygiene",
                  description: "Our high-tech smart kitchen operates on flawless, sterile operating protocols.",
                  icon: "🧼"
                },
                {
                  title: "Express Delivery",
                  description: "Carefully packaged premium box sets sent straight to your table hot and fresh.",
                  icon: "🚀"
                }
              ].map((pillar, idx) => (
                <div key={idx} className="p-6 sm:p-8 bg-slate-900/60 rounded-[2rem] border border-white/5 space-y-4 hover:border-orange-500/20 transition-all hover:bg-slate-900 group">
                  <div className="w-12 h-12 bg-orange-950/40 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                    {pillar.icon}
                  </div>
                  <div className="space-y-1">
                     <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">{pillar.title}</h3>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed">{pillar.description}</p>
                  </div>
                </div>
              ))}
            </motion.div>

          </div>
        </div>
      </section>

      {/* Exclusive Deals Section */}
      {deals.length > 0 && (
        <section className="w-full py-12 sm:py-24 px-4 sm:px-6 bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent_70%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-12 sm:mb-20 space-y-2 sm:space-y-4">
              <span className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs">LIMITED TIME OFFERS</span>
              <h2 className="text-4xl sm:text-7xl font-black text-white tracking-tighter leading-none">Exclusive <span className="text-red-600">Deals</span></h2>
              <p className="text-slate-400 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest max-w-sm mx-auto">Smarter choices, bigger cravings, massive savings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
              {deals.map(deal => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={deal.id} 
                  className="group bg-slate-900 rounded-[2.5rem] border border-white/5 p-6 hover:border-red-500/30 transition-all hover:bg-slate-900/80 shadow-2xl"
                >
                  <div className="relative mb-8 pt-4">
                    <div className="flex justify-center -space-x-12 sm:-space-x-16 group-hover:space-x-2 transition-all duration-700">
                      {deal.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-slate-950 shadow-2xl transform hover:scale-110 hover:-translate-y-4 transition-all duration-500 hover:z-20">
                           <img src={item.image} className="w-full h-full object-cover" alt="" />
                        </div>
                      ))}
                    </div>
                    <div className="absolute -top-2 -right-2 bg-red-600 text-white px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl rotate-3">
                       {deal.discount}% OFF
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-red-500 transition-colors">{deal.title}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{deal.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {deal.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                           <CheckCircle2 className="w-3 h-3 text-red-600 shrink-0" />
                           <span className="text-[9px] font-black uppercase text-slate-300 truncate">{item.title}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Value</p>
                          <div className="flex items-center gap-2">
                             <span className="text-2xl sm:text-3xl font-black text-white font-mono">Rs.{deal.price}</span>
                             <span className="text-xs sm:text-sm font-bold text-slate-500 line-through">Rs.{deal.originalPrice}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className="block text-[8px] font-black text-green-500 uppercase tracking-widest mb-1">YOU SAVE</span>
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full font-black text-xs sm:text-sm font-mono">Rs.{deal.originalPrice - deal.price}</span>
                       </div>
                    </div>

                    <button onClick={() => addDealToCart(deal)} className="w-full py-4 sm:py-5 bg-white text-slate-950 font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-600 hover:text-white transition-all transform active:scale-95 shadow-xl text-xs sm:text-sm">
                       Grab Deal Bundle
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Menu Filter Section */}
      <section id="menu" className="w-full py-12 sm:py-24 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 mb-10 sm:mb-16">
            <div className="space-y-2 sm:space-y-4 max-w-xl text-center md:text-left">
              <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs">OUR CATALOG</span>
              <h2 className="text-3xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Full Menu <span className="text-orange-600">Collection</span></h2>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search flavors..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-orange-600 dark:text-white transition-all text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

            {/* Categories */}
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 sm:gap-2 mb-8 sm:mb-12">
            {categories.map(cat => (
              <button 
                key={cat.id || cat}
                onClick={() => setSelectedCategory(cat.name || cat)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === (cat.name || cat) ? 'bg-orange-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                {cat.name || cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {filteredMenu.map((dish) => (
                <motion.div 
                  layout
                  key={dish.id} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700/50"
                >
                  <div className="relative w-full aspect-square overflow-hidden rounded-[1rem] sm:rounded-[1.2rem] mb-2 sm:mb-3 shadow-md">
                    <img 
                      src={dish.image} 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt={dish.title} 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                       <button onClick={() => handleAddToCartClick(dish)} className="bg-white text-slate-900 px-3 py-1.5 rounded-full font-black text-[7px] sm:text-[8px] uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-transform">Add</button>
                    </div>
                  </div>
                  <div className="space-y-1 px-1">
                    <div>
                      <h3 className="text-[10px] sm:text-xs font-black text-white truncate uppercase tracking-tighter">{dish.title}</h3>
                      <p className="text-[7px] sm:text-[8px] font-black text-orange-600 uppercase tracking-widest mt-0.5">{dish.categoryName || dish.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] sm:text-sm font-black text-slate-400">Rs.{dish.price || 15}</span>
                      <button onClick={() => handleAddToCartClick(dish)} className="px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-900 dark:bg-orange-600 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded-full hover:bg-orange-600 transition-all shadow-md active:scale-95">ORDER</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {filteredMenu.length === 0 && (
            <div className="w-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-black dark:text-white opacity-50 uppercase tracking-widest">No matching flavors found</h3>
            </div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="w-full py-16 sm:py-24 bg-white dark:bg-slate-950 px-4 sm:px-6">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-16 space-y-2 sm:space-y-4">
               <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs">COMMUNITY VOICE</span>
               <h2 className="text-3xl sm:text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">Guest <span className="text-orange-600">Circle</span></h2>
            </div>
            
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 sm:gap-8 space-y-6 sm:space-y-8">
               {reviews.slice(0, 6).map((review) => (
                 <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={review.id} className="break-inside-avoid bg-slate-50 dark:bg-slate-900/50 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 sm:border-4 border-white dark:border-slate-800 shadow-md bg-orange-600 flex items-center justify-center text-white font-black text-sm sm:text-lg uppercase">
                        {review.user.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-tighter">{review.user}</h4>
                        <div className="flex gap-0.5 mt-0.5 sm:mt-1">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-2.5 h-2.5 sm:w-3 h-3 ${i < review.rating ? 'fill-orange-400 text-orange-400' : 'text-slate-200'}`} />)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">"{review.comment}"</p>
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                       <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Guest</span>
                       <Star className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 opacity-20" />
                    </div>
                 </motion.div>
               ))}
            </div>
            
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mt-12 sm:mt-20 text-center space-y-6 sm:space-y-8">
               <p className="text-slate-400 font-bold uppercase text-[10px] sm:text-xs tracking-widest max-w-[200px] sm:max-w-xs mx-auto">Want to share your experience with Salar Food Cafe?</p>
               <button onClick={() => setIsReviewModalOpen(true)} className="px-8 py-4 sm:px-12 sm:py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-[0.2em] rounded-full hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-all shadow-2xl flex items-center gap-3 sm:gap-4 mx-auto group text-xs sm:text-base">
                 <Edit className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" /> Write a Review
               </button>
            </motion.div>
         </div>
      </section>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 h-[100dvh] w-full sm:w-[480px] bg-white dark:bg-slate-900 z-[101] shadow-2xl flex flex-col">
              <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                <div>
                  <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Your Bag</h3>
                  <p className="text-[8px] sm:text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mt-1">{cart.length} ITEMS SELECTED</p>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 sm:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full shadow-sm transition-all"><X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-8">
                {cart.map((item) => (
                  <motion.div layout key={item.cartId} className="flex gap-3 sm:gap-6 items-center group">
                    <div className="relative w-14 h-14 sm:w-24 sm:h-24 shrink-0 overflow-hidden rounded-xl sm:rounded-[2rem] shadow-lg">
                      <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.title} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs sm:text-lg text-slate-900 dark:text-white uppercase tracking-tighter leading-none truncate">{item.title}</h4>
                        {item.selectedSize && <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded text-[6px] font-black uppercase shrink-0">{item.selectedSize.name}</span>}
                      </div>
                      <p className="text-[7px] sm:text-[10px] font-black text-orange-600 uppercase mt-0.5 sm:mt-1 tracking-widest truncate">{item.subtitle}</p>
                      <div className="flex items-center justify-between mt-1 sm:mt-2">
                        <span className="text-[11px] sm:text-lg font-black text-slate-400">Rs.{item.price || 15}</span>
                        <button onClick={() => removeFromCart(item.cartId)} className="p-1 sm:p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-30">
                    <ShoppingBag className="w-16 h-16 text-slate-400" />
                    <p className="font-black uppercase text-sm tracking-widest">Your bag is empty</p>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3 sm:space-y-6 pb-6 sm:pb-8 shrink-0">
                 <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest">
                       <span>Subtotal</span>
                       <span className="text-slate-900 dark:text-white">Rs.{totalPrice.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest">
                       <span>Delivery</span>
                       <span className="text-green-600 uppercase">Variable</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 sm:pt-4 mt-2 sm:mt-4 border-t border-slate-200 dark:border-slate-800">
                       <span className="font-black uppercase text-[10px] sm:text-xs text-slate-900 dark:text-white tracking-[0.2em]">Grand Total</span>
                       <span className="text-xl sm:text-4xl font-black text-orange-600">Rs.{totalPrice.toFixed(0)}</span>
                    </div>
                 </div>
                 <button 
                  disabled={cart.length === 0}
                  onClick={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }} 
                  className="w-full py-4 sm:py-6 bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black uppercase tracking-[0.2em] rounded-2xl sm:rounded-[2rem] shadow-2xl hover:bg-orange-700 transition-all text-[10px] sm:text-sm active:scale-95"
                >
                  Secure Checkout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} />
      <CheckoutModal 
        isOpen={isCheckoutModalOpen} 
        onClose={() => setIsCheckoutModalOpen(false)} 
        cart={cart} 
        total={totalPrice} 
        onCheckoutSuccess={() => setCart([])}
      />

      {/* Cart Addition Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-[300] bg-slate-900 dark:bg-orange-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-xs font-black uppercase tracking-widest">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Size Selection Overlay */}
      <AnimatePresence>
        {sizeSelectionDish && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSizeSelectionDish(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl space-y-8 overflow-hidden">
               <div className="text-center space-y-2">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Select <span className="text-orange-600">Size</span></h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sizeSelectionDish.title}</p>
               </div>
               <div className="grid grid-cols-1 gap-3">
                 {sizeSelectionDish.sizes?.map((size, idx) => (
                   <button 
                     key={idx} 
                     onClick={() => addToCart(sizeSelectionDish, size)}
                     className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent hover:border-orange-600 transition-all group"
                   >
                     <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{size.name}</span>
                     <span className="text-orange-600 font-black font-mono">Rs.{size.price}</span>
                   </button>
                 ))}
               </div>
               <button onClick={() => setSizeSelectionDish(null)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full bg-slate-900 py-24 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 border-b border-white/5 pb-16">
             <div className="space-y-8 col-span-1 md:col-span-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                       <Utensils className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-3xl font-black uppercase tracking-tighter">Salar<span className="text-orange-600">Food</span>Cafe</h4>
                </div>
                <p className="text-slate-400 text-lg font-medium max-w-md leading-relaxed">Artisanal fast food reimagined for the modern foodie. Savor the gourmet revolution in every bite.</p>
                <div className="flex gap-4">
                  {[Wine, ShoppingBag, PhoneCall].map((Icon, i) => (
                    <button key={i} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-orange-600 hover:border-orange-600 transition-all">
                      <Icon className="w-5 h-5 text-white" />
                    </button>
                  ))}
                </div>
             </div>
             <div className="space-y-8">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">Contact</h4>
                <nav className="flex flex-col gap-5 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                   <a href="mailto:salaarfoodcafe@gmail.com" className="hover:text-orange-500 transition-colors lowercase">salaarfoodcafe@gmail.com</a>
                   <a href="https://wa.me/923238814878" className="hover:text-orange-500 transition-colors tracking-widest">+92 323 8814878</a>
                   <p className="text-[10px] opacity-50 mt-4 leading-relaxed">Industrial Area, Sector I-9, Islamabad, Pakistan</p>
                </nav>
             </div>
             <div className="space-y-8">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">Control Center</h4>
                <div className="space-y-6">
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-loose">Internal access for culinary directors and store management.</p>
                  <button 
                    onClick={() => setIsAdminMode(true)}
                    className="w-full px-8 py-4 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-slate-900 transition-all active:scale-95 shadow-xl"
                  >
                    Enter Dashboard
                  </button>
                </div>
             </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-8 mt-16 px-6">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">© 2024. SALAR FOOD CAFE VENTURES.</p>
            <div className="flex gap-10 text-[10px] font-black uppercase tracking-widest text-slate-600">
               <a href="#" className="hover:text-white transition-colors">Privacy</a>
               <a href="#" className="hover:text-white transition-colors">Terms</a>
               <a href="#" className="hover:text-white transition-colors">Suppliers</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

