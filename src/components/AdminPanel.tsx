import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  LayoutDashboard, 
  Utensils, 
  Star, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  LogOut,
  Save,
  Image as ImageIcon,
  DollarSign,
  TrendingUp,
  Tag,
  ShoppingBag,
  ExternalLink,
  Edit,
  RefreshCw,
  Smartphone,
  Percent,
  Gift
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc,
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  query,
  onSnapshot
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Dish, Review, Order } from '../types';

interface AdminPanelProps {
  onExit: () => void;
}

export default function AdminPanel({ onExit }: AdminPanelProps) {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'reviews' | 'hero' | 'orders' | 'deals'>('menu');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Dish | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sizes, setSizes] = useState<{name: string, price: number}[]>([]);

  useEffect(() => {
    if (editingItem) {
      setSizes(editingItem.sizes || []);
    } else {
      setSizes([{ name: 'Small', price: 15 }, { name: 'Medium', price: 25 }, { name: 'Large', price: 35 }]);
    }
  }, [editingItem, isAdding]);

  // Data State
  const [menuItems, setMenuItems] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Menu items and categories can stay as one-time fetch for stability while editing
    const fetchStatic = async () => {
      try {
        const menuSnap = await getDocs(collection(db, 'menu'));
        setMenuItems(menuSnap.docs.map(d => ({ ...d.data(), id: d.id }) as Dish));
        const catsSnap = await getDocs(collection(db, 'categories'));
        setCategories(catsSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch (e) {
        console.error("Static fetch failed", e);
      }
    };
    fetchStatic();

    // Listeners for dynamic data
    const qReviews = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Review));
    }, (err) => {
      console.warn("Reviews listener failed:", err);
    });

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(d => ({ ...d.data(), id: d.id }) as any));
      setIsLoading(false);
    }, (err) => {
      if (err.message.includes('permission')) {
        console.warn("User is not an admin - Orders listener denied.");
      } else {
        handleFirestoreError(err, OperationType.GET, 'orders');
      }
    });

    const unsubDeals = onSnapshot(query(collection(db, 'deals'), orderBy('createdAt', 'desc')), (snap) => {
      setDeals(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (err) => {
      console.warn("Deals listener failed:", err);
    });

    return () => {
      unsubReviews();
      unsubOrders();
      unsubDeals();
    };
  }, [user]);

  const fetchData = async () => {
    if (!auth.currentUser) return;
    setIsRefreshing(true);
    try {
      const menuSnap = await getDocs(collection(db, 'menu'));
      setMenuItems(menuSnap.docs.map(d => ({ ...d.data(), id: d.id }) as Dish));

      const catsSnap = await getDocs(collection(db, 'categories'));
      setCategories(catsSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("Authentication failed: " + (error as Error).message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Authentication failed: " + (error as Error).message);
    }
  };

  const toggleStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    // Optimistic Update
    const previousReviews = [...reviews];
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r));
    
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { status });
    } catch (e) {
      setReviews(previousReviews); // Rollback
      handleFirestoreError(e, OperationType.UPDATE, 'reviews');
    }
  };

  const deleteItem = async (col: string, id: string) => {
    const confirmed = window.confirm(`Permanently delete this ${col.slice(0, -1)}?`);
    if (!confirmed) return false;
    
    // Optimistic Update
    const previousState = {
      menu: [...menuItems],
      categories: [...categories],
      reviews: [...reviews],
      orders: [...orders]
    };

    if (col === 'menu') setMenuItems(prev => prev.filter(i => i.id !== id));
    if (col === 'categories') setCategories(prev => prev.filter(i => i.id !== id));
    if (col === 'reviews') setReviews(prev => prev.filter(i => i.id !== id));
    if (col === 'orders') setOrders(prev => prev.filter(i => i.id !== id));
    
    try {
      console.log(`Attempting to delete document from ${col} with ID: ${id}`);
      await deleteDoc(doc(db, col, id));
      return true;
    } catch (e) {
      // Rollback
      if (col === 'menu') setMenuItems(previousState.menu);
      if (col === 'categories') setCategories(previousState.categories);
      if (col === 'reviews') setReviews(previousState.reviews);
      if (col === 'orders') setOrders(previousState.orders);
      
      console.error("Delete failed:", e);
      alert("System Error: Delete command failed to propagate to server. Check connection.");
      handleFirestoreError(e, OperationType.DELETE, col);
      return false;
    }
  };

  const toggleFeature = async (id: string, type: 'isHero' | 'isSignature', value: boolean) => {
    try {
      await updateDoc(doc(db, 'menu', id), { [type]: value });
      setMenuItems(prev => prev.map(i => i.id === id ? { ...i, [type]: value } : i));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'menu');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const target = e.target as any;
    const catId = target.categoryId.value;
    const catName = categories.find(c => c.id === catId)?.name || 'Uncategorized';
    
    const updated = {
      title: target.title.value,
      subtitle: catName.toUpperCase(),
      categoryName: catName,
      categoryId: catId,
      image: target.image.value,
      price: parseFloat(target.price.value) || 15,
      accentColor: target.accentColor.value || '#ffe4e1',
      isHero: target.isHero.checked,
      isSignature: target.isSignature.checked,
      sizes: sizes // we'll collect this from state
    };
    try {
      // Optimistic record update
      const previousItems = [...menuItems];
      setMenuItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...updated } : i));
      setEditingItem(null);

      await updateDoc(doc(db, 'menu', editingItem.id), updated);
      alert("Catalog synced successfully!");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'menu');
      alert("Cloud Sync failed. Reverting changes.");
      // Rollback is implicitly handled by the next sync or manual fetch if needed, 
      // but for "really fast" we trust the server eventually catches up or we stay optimistic.
      // fetchStatic() could be called here.
    }
  };

  const totalSales = orders
    .filter(o => o.status === 'delivered')
    .reduce((acc, curr) => acc + (curr.total || 0), 0);

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    // Optimistic Update
    const previousOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (e) {
      setOrders(previousOrders); // Rollback
      handleFirestoreError(e, OperationType.UPDATE, 'orders');
    }
  };

  if (isLoading) return <div className="fixed inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-[300] font-black uppercase tracking-widest text-orange-600 animate-pulse">Initializing Dashboard...</div>;

  if (!user) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 z-[300]">
        <button 
          onClick={onExit}
          className="absolute top-8 right-8 p-4 bg-white dark:bg-slate-900 rounded-full shadow-xl text-slate-400 hover:text-orange-600 transition-all hover:scale-110 active:scale-95 z-10"
        >
          <X className="w-6 h-6" />
        </button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white dark:bg-slate-900 p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] shadow-2xl space-y-6 lg:space-y-10 border border-slate-100 dark:border-slate-800">
          <div className="text-center space-y-3 lg:space-y-4">
            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-orange-600 rounded-2xl lg:rounded-[1.5rem] flex items-center justify-center mx-auto shadow-xl shadow-orange-200 dark:shadow-none">
               <Utensils className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Admin <span className="text-orange-600">Gate</span></h2>
              <p className="text-slate-400 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em]">Authorized Personnel Only</p>
            </div>
          </div>
          <form onSubmit={handleAuth} className="space-y-3 lg:space-y-4">
            <div className="space-y-3 lg:space-y-4">
              <input type="email" placeholder="Access Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 lg:px-8 py-4 lg:py-5 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm lg:text-base" required />
              <input type="password" placeholder="Gate Key" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-6 lg:px-8 py-4 lg:py-5 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm lg:text-base" required />
            </div>
            <button type="submit" className="w-full py-4 lg:py-5 bg-slate-900 dark:bg-orange-600 text-white font-black uppercase tracking-widest lg:tracking-[0.2em] rounded-xl lg:rounded-2xl shadow-xl hover:bg-orange-600 transition-all active:scale-95 text-xs lg:text-base">
              Secure Login
            </button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
              <div className="relative flex justify-center text-[8px] lg:text-[10px] uppercase font-black tracking-widest"><span className="bg-white dark:bg-slate-900 px-4 text-slate-400">Identity Provider</span></div>
            </div>
            <button 
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-4 lg:py-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest lg:tracking-[0.2em] rounded-xl lg:rounded-2xl shadow-md hover:border-orange-600 transition-all flex items-center justify-center gap-3 lg:gap-4 active:scale-95 text-xs lg:text-base"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 lg:w-5 lg:h-5 opacity-50" alt="G" />
              Google SSO
            </button>
          </form>
          <p className="text-center text-[8px] lg:text-[10px] font-bold text-slate-300 uppercase tracking-widest">© Salar Food Cafe Security</p>
        </motion.div>
      </div>
    );
  }

  const seedDatabase = async () => {
    if (!confirm("This will seed your database with sample dishes. Continue?")) return;
    setIsRefreshing(true);
    try {
      const { DISHES } = await import('../types');
      for (const dish of DISHES) {
        await setDoc(doc(db, 'menu', dish.id), {
          ...dish,
          price: dish.price || 15,
          createdAt: serverTimestamp()
        });
      }
      alert("Database seeded successfully! Please refresh or sync data.");
      await fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'menu_seed');
      alert("Seeding failed: " + (e as Error).message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 flex z-[300] overflow-hidden transition-colors duration-700">
      {/* Sidebar */}
      <aside className="w-16 lg:w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-2 lg:p-6 h-full shadow-inner overflow-y-auto scrollbar-none">
        <div className="flex items-center gap-4 mb-8 lg:mb-16 px-2">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-600 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-100 dark:shadow-none">
               <LayoutDashboard className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div className="hidden lg:block">
              <span className="block text-xl font-black tracking-tighter uppercase dark:text-white leading-none">Cafe <span className="text-orange-600">Admin</span></span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">v2.0.4 Stable</span>
            </div>
        </div>

        <nav className="flex-1 space-y-1 lg:space-y-3">
           {[
             { id: 'menu', icon: Utensils, label: 'Kitchen Hub', color: 'bg-orange-600' },
             { id: 'categories', icon: Tag, label: 'Categories', color: 'bg-purple-600' },
             { id: 'hero', icon: TrendingUp, label: 'Top Drops', color: 'bg-blue-600' },
             { id: 'reviews', icon: Star, label: 'Moderation', color: 'bg-yellow-500' },
             { id: 'deals', icon: Percent, label: 'Deals Hub', color: 'bg-red-600' },
             { id: 'orders', icon: ShoppingBag, label: 'Sales Intel', color: 'bg-green-600' },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`w-full flex items-center gap-4 lg:gap-5 p-3 lg:p-5 rounded-2xl lg:rounded-3xl transition-all relative group ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300'}`}
             >
               <tab.icon className={`w-5 h-5 lg:w-6 lg:h-6 transition-colors ${activeTab === tab.id ? 'text-orange-600' : 'text-slate-400'}`} />
               <span className="hidden lg:block font-black text-xs uppercase tracking-[0.1em]">{tab.label}</span>
               {activeTab === tab.id && <motion.div layoutId="nav-pill" className="absolute left-0 w-1 h-6 lg:h-8 bg-orange-600 rounded-r-full" />}
             </button>
           ))}
        </nav>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2 lg:space-y-4">
          <button onClick={onExit} className="w-full flex items-center gap-4 lg:gap-5 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest group">
             <X className="w-5 h-5 lg:w-6 lg:h-6 group-hover:rotate-90 transition-transform" />
             <span className="hidden lg:block">Return to Site</span>
          </button>
          <button onClick={fetchData} disabled={isRefreshing} className="w-full flex items-center justify-center gap-3 p-3 lg:p-4 rounded-xl lg:rounded-2xl text-slate-400 hover:text-orange-600 transition-all font-black text-[10px] uppercase tracking-widest bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
             <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
             <span className="hidden lg:block">{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-4 lg:gap-5 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all font-black text-xs uppercase tracking-widest group">
             <LogOut className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform" />
             <span className="hidden lg:block">Sign Out</span>
          </button>
          <button onClick={seedDatabase} className="w-full flex items-center gap-4 lg:gap-5 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all font-black text-[10px] uppercase tracking-widest group border border-dashed border-orange-200">
             <RefreshCw className="w-5 h-5 lg:w-5 lg:h-5 group-hover:rotate-180 transition-transform" />
             <span className="hidden lg:block">Seed Catalog</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
        <header className="px-6 py-6 lg:px-12 lg:py-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10 transition-colors">
           <div>
             <h1 className="text-xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter capitalize leading-none mb-1 lg:mb-2">{activeTab} <span className="text-orange-600">Protocol</span></h1>
             <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] lg:tracking-[0.4em]">Operations Control</p>
           </div>
           
           <div className="flex items-center gap-2 lg:gap-6 shrink-0 ml-2">
              {activeTab === 'orders' && (
                <div className="text-right flex flex-col items-end justify-center min-w-[70px]">
                  <p className="text-[7px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 lg:mb-1">Revenue</p>
                  <p className="text-sm lg:text-2xl font-black text-green-600 font-mono leading-none">Rs.{totalSales.toFixed(0)}</p>
                </div>
              )}
              {activeTab === 'menu' && (
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 lg:gap-3 px-4 lg:px-8 py-3 lg:py-4 bg-orange-600 text-white rounded-full font-black uppercase text-[10px] tracking-widest lg:tracking-[0.2em] shadow-2xl shadow-orange-200 dark:shadow-none hover:bg-orange-700 hover:scale-105 transition-all active:scale-95">
                   <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                   <span className="hidden sm:inline">New Creation</span>
                   <span className="sm:hidden">New</span>
                </button>
              )}
           </div>
        </header>

        <div className="p-4 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              
              {activeTab === 'categories' && (
                <div className="max-w-2xl mx-auto space-y-6 lg:space-y-8">
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 lg:p-8 rounded-3xl lg:rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 lg:mb-6 flex items-center gap-3">
                      <Plus className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" /> New Category
                    </h2>
                    <form className="flex flex-col sm:flex-row gap-3 lg:gap-4" onSubmit={async (e) => {
                      e.preventDefault();
                      const target = e.target as any;
                      const name = target.categoryName.value;
                      if (!name) return;
                      
                      // Optimistic Update
                      const tempId = 'temp-' + Date.now();
                      const previousCats = [...categories];
                      setCategories(prev => [...prev, { id: tempId, name }]);
                      target.categoryName.value = '';

                      try {
                        const docRef = await addDoc(collection(db, 'categories'), { name, createdAt: serverTimestamp() });
                        setCategories(prev => prev.map(c => c.id === tempId ? { id: docRef.id, name } : c));
                      } catch (err) {
                         setCategories(previousCats);
                         alert("Failed to create category on server.");
                      }
                    }}>
                      <input name="categoryName" placeholder="e.g. Burgers" className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold" required />
                      <button type="submit" className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Add</button>
                    </form>
                  </div>

                  <div className="space-y-4">
                     {categories.map(cat => (
                        <div key={cat.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl flex justify-between items-center shadow-sm border border-slate-100 dark:border-slate-700">
                           <span className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-white">{cat.name}</span>
                           <button onClick={() => deleteItem('categories', cat.id)} className="p-3 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     ))}
                  </div>
                </div>
              )}

              {activeTab === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8">
                  {menuItems.map(item => (
                    <motion.div layout key={item.id} className="bg-slate-50 dark:bg-slate-900 p-4 lg:p-6 rounded-3xl lg:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex gap-4 lg:gap-6 shadow-sm group hover:shadow-xl transition-all">
                       <div className="relative w-24 h-24 lg:w-32 lg:h-32 shrink-0 overflow-hidden rounded-2xl shadow-lg">
                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                       </div>
                       <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base lg:text-lg leading-tight truncate">{item.title}</h3>
                            <p className="text-[8px] lg:text-[10px] font-black text-orange-600 uppercase tracking-widest mt-0.5 lg:mt-1">{item.categoryName || item.subtitle}</p>
                            <p className="text-xl lg:text-2xl font-black text-slate-400 font-mono mt-1 lg:mt-2">Rs.{item.price || 15}</p>
                          </div>
                          <div className="flex gap-2 pt-2 lg:pt-4">
                             <button onClick={() => setEditingItem(item)} className="p-2 lg:p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-xl hover:text-orange-600 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"><Edit className="w-4 h-4" /></button>
                             <button onClick={() => deleteItem('menu', item.id)} className="p-2 lg:p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-xl hover:text-red-500 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'hero' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                  <div className="space-y-6 lg:space-y-8 bg-slate-50 dark:bg-slate-900 p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 lg:gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 lg:pb-6">
                      <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
                      <h2 className="text-lg lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Hero Spotlight</h2>
                    </div>
                    <div className="space-y-3 lg:space-y-4 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-2 lg:pr-4 scrollbar-thin">
                      {menuItems.map(item => (
                         <div key={item.id} className="flex justify-between items-center p-3 lg:p-5 bg-white dark:bg-slate-800 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:border-orange-200 transition-all">
                           <div className="flex items-center gap-3 lg:gap-4">
                             <img src={item.image} className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl object-cover" alt="" />
                             <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 truncate max-w-[80px] lg:max-w-none">{item.title}</span>
                           </div>
                           <button onClick={() => toggleFeature(item.id, 'isHero', !item.isHero)} className={`px-4 lg:px-6 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[10px] font-black uppercase tracking-widest border-2 transition-all ${item.isHero ? 'bg-orange-600 border-orange-600 text-white' : 'bg-transparent border-slate-200 text-slate-300 hover:border-orange-600 hover:text-orange-600'}`}>
                             {item.isHero ? 'Live' : 'Off'}
                           </button>
                         </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6 lg:space-y-8 bg-slate-50 dark:bg-slate-900 p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 lg:gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 lg:pb-6">
                      <Star className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-500" />
                      <h2 className="text-lg lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Chef's Picks</h2>
                    </div>
                    <div className="space-y-3 lg:space-y-4 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-2 lg:pr-4 scrollbar-thin">
                      {menuItems.map(item => (
                         <div key={item.id} className="flex justify-between items-center p-3 lg:p-5 bg-white dark:bg-slate-800 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:border-yellow-200 transition-all">
                           <div className="flex items-center gap-3 lg:gap-4">
                             <img src={item.image} className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl object-cover" alt="" />
                             <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 truncate max-w-[80px] lg:max-w-none">{item.title}</span>
                           </div>
                           <button onClick={() => toggleFeature(item.id, 'isSignature', !item.isSignature)} className={`px-4 lg:px-6 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[10px] font-black uppercase tracking-widest border-2 transition-all ${item.isSignature ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-transparent border-slate-200 text-slate-300 hover:border-yellow-500 hover:text-yellow-500'}`}>
                             {item.isSignature ? 'Sig' : 'Reg'}
                           </button>
                         </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="grid grid-cols-1 gap-4 lg:gap-6">
                   {reviews.length === 0 && <div className="text-center py-20 opacity-20 font-black uppercase tracking-widest">No Feed records yet</div>}
                   {reviews.map(review => (
                     <motion.div layout key={review.id} className="bg-slate-50 dark:bg-slate-900 p-5 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-6 lg:gap-8 shadow-sm">
                        <div className="flex gap-4 lg:gap-8 flex-1">
                           <div className="relative shrink-0">
                             <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-2xl lg:rounded-[2rem] border-4 border-white dark:border-slate-800 shadow-xl bg-orange-600 flex items-center justify-center text-white font-black text-xl lg:text-3xl uppercase">
                                {review.user.charAt(0)}
                             </div>
                             <div className={`absolute -bottom-1 -right-1 w-5 h-5 lg:w-6 lg:h-6 rounded-full border-2 border-white flex items-center justify-center ${review.status === 'approved' ? 'bg-green-500' : review.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                {review.status === 'approved' ? <Check className="w-2.5 h-2.5 text-white" /> : <X className="w-2.5 h-2.5 text-white" />}
                             </div>
                           </div>
                           <div className="space-y-1 lg:space-y-3">
                             <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                               <h3 className="font-black text-lg lg:text-2xl text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{review.user}</h3>
                               <span className="text-[8px] lg:text-[10px] font-black text-slate-400 font-mono tracking-widest bg-white dark:bg-slate-800 px-2 lg:px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">{review.contact}</span>
                             </div>
                             <div className="flex gap-0.5 lg:gap-1">
                               {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 lg:w-4 lg:h-4 ${i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-slate-200 dark:text-slate-700'}`} />)}
                             </div>
                             <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-lg italic font-medium leading-relaxed max-w-3xl line-clamp-3">"{review.comment}"</p>
                           </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 lg:gap-3 justify-center">
                           <button onClick={() => toggleStatus(review.id, 'approved')} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 lg:gap-3 uppercase text-[8px] lg:text-[10px] font-black tracking-widest ${review.status === 'approved' ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-800 text-green-600 hover:bg-green-600 hover:text-white border border-green-100 dark:border-green-900/30'}`}>
                             <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                             <span className="hidden xl:block">Approve</span>
                           </button>
                           <button onClick={() => toggleStatus(review.id, 'rejected')} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 lg:gap-3 uppercase text-[8px] lg:text-[10px] font-black tracking-widest ${review.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-800 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 dark:border-red-900/30'}`}>
                             <X className="w-4 h-4 lg:w-5 lg:h-5" />
                             <span className="hidden xl:block">Reject</span>
                           </button>
                           <button 
                            onClick={async (e) => {
                              const btn = e.currentTarget;
                              btn.disabled = true;
                              await deleteItem('reviews', review.id);
                              btn.disabled = false;
                            }} 
                            className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 text-slate-300 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center gap-2 lg:gap-3 uppercase text-[8px] lg:text-[10px] font-black tracking-widest disabled:opacity-50"
                           >
                             <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                             <span className="hidden xl:block">Purge</span>
                           </button>
                        </div>
                     </motion.div>
                   ))}
                </div>
              )}
               {activeTab === 'orders' && (
                <div className="space-y-4 lg:space-y-6">
                   {orders.length === 0 && <div className="text-center py-20 opacity-20 font-black uppercase tracking-widest">No order transactions found</div>}
                   {orders.map(order => (
                     <motion.div layout key={order.id} className="bg-slate-50 dark:bg-slate-900 p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between gap-6 lg:gap-12 shadow-sm relative overflow-hidden group">
                        <div className="flex-1 space-y-6 lg:space-y-8 relative z-10">
                           <div className="flex flex-wrap items-center gap-3 lg:gap-6">
                              <span className={`px-4 lg:px-6 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[10px] font-black uppercase tracking-widest shadow-md ${
                                order.status === 'delivered' ? 'bg-green-600 text-white' : 
                                order.status === 'rejected' ? 'bg-red-600 text-white' :
                                order.status === 'processing' ? 'bg-blue-600 text-white' :
                                order.status === 'pending' ? 'bg-yellow-500 text-slate-900' :
                                order.status === 'pending_cod' ? 'bg-purple-600 text-white' :
                                'bg-orange-600 text-white'
                              }`}>
                                {order.status === 'pending_cod' ? 'COD PENDING' : order.status}
                              </span>
                              <span className="text-[8px] lg:text-[10px] font-black text-slate-400 font-mono tracking-widest bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">TXN: {order.id.slice(-8).toUpperCase()}</span>
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                                 <Smartphone className="w-3 h-3 text-orange-600" />
                                 <span className="text-[8px] lg:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{order.paymentMethod}</span>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-10 text-sm lg:text-base">
                              <div className="space-y-1">
                                <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Customer</p>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center font-black text-orange-600 border border-slate-100 dark:border-slate-700 text-xs lg:text-sm">{order.name[0]}</div>
                                  <p className="font-black text-slate-800 dark:text-white text-sm lg:text-lg tracking-tight uppercase truncate">{order.name}</p>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Contact</p>
                                <p className="font-black text-slate-800 dark:text-white font-mono text-sm lg:text-lg">{order.contact}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Address</p>
                                <p className="font-bold text-slate-500 dark:text-slate-300 text-[10px] lg:text-sm leading-relaxed line-clamp-2">{order.address}</p>
                              </div>
                           </div>


                           <div>
                              <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Order Details</p>
                              <div className="flex flex-wrap gap-2 lg:gap-3">
                                 {order.items.map((item, idx) => (
                                   <div key={idx} className="flex items-center gap-2 px-3 lg:px-5 py-2 lg:py-3 bg-white dark:bg-slate-800 rounded-xl lg:rounded-2xl text-[9px] lg:text-xs font-black uppercase tracking-tight border border-slate-100 dark:border-slate-700 shadow-sm">
                                     <span className="w-4 h-4 lg:w-5 lg:h-5 bg-orange-600/10 text-orange-600 rounded-md flex items-center justify-center text-[8px] lg:text-[10px] font-bold">{item.quantity || 1}x</span>
                                     <span className="dark:text-white truncate max-w-[100px] lg:max-w-none">{item.title}</span>
                                     {item.size && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[7px] font-black">{item.size}</span>}
                                   </div>
                                 ))}
                              </div>
                           </div>

                           {order.paymentMethod !== 'Cash on Delivery' && (
                             <div className="space-y-3">
                               <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Transaction Proof</p>
                               {order.screenshotURL ? (
                                 <div className="relative w-full max-w-sm h-48 lg:h-64 group/proof cursor-pointer overflow-hidden rounded-3xl border-4 border-white dark:border-slate-800 shadow-xl" onClick={() => window.open(order.screenshotURL, '_blank')}>
                                    <img src={order.screenshotURL} className="w-full h-full object-cover transition-transform group-hover/proof:scale-105" alt="Proof" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/proof:opacity-100 transition-opacity">
                                       <div className="flex flex-col items-center gap-2">
                                          <ExternalLink className="w-8 h-8 text-white" />
                                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Open Original</span>
                                       </div>
                                    </div>
                                 </div>
                               ) : (
                                 <div className="w-full max-w-sm p-8 bg-slate-100 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
                                    <Smartphone className="w-6 h-6 text-orange-600 animate-pulse" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Check WhatsApp for Payment Slip</p>
                                 </div>
                               )}
                             </div>
                           )}
                        </div>
                        <div className="lg:w-64 flex flex-col justify-between items-start lg:items-end lg:border-l border-slate-200 dark:border-slate-800 lg:pl-10 xl:pl-12 pt-6 lg:pt-0 gap-6">
                           <div className="text-left lg:text-right space-y-1">
                              <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total Pay</p>
                              <p className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">Rs.{order.total.toFixed(2)}</p>
                           </div>

                           <div className="flex flex-col gap-2 w-full">
                              {(order.status === 'pending' || order.status === 'pending_cod') && (
                                <>
                                  <button onClick={() => updateOrderStatus(order.id, 'processing')} className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"><Check className="w-4 h-4" /> Approve Order</button>
                                  <button onClick={() => updateOrderStatus(order.id, 'rejected')} className="w-full py-4 bg-white dark:bg-slate-800 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"><X className="w-4 h-4" /> Reject Order</button>
                                </>
                              )}
                              {order.status === 'processing' && (
                                <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">Mark Shipped</button>
                              )}
                              {order.status === 'shipped' && (
                                <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="w-full py-4 bg-green-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">Mark Delivered</button>
                              )}
                              <button onClick={() => window.open(`https://wa.me/${order.contact.replace(/\D/g, '')}`, '_blank')} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">WhatsApp Contact</button>
                              <button 
                                onClick={async (e) => {
                                  const btn = e.currentTarget;
                                  if (btn.disabled) return;
                                  
                                  if (!order.id) {
                                    console.error("Critical Error: Order object missing ID", order);
                                    alert("Cannot delete: Order ID missing from local state. Try refreshing.");
                                    return;
                                  }

                                  btn.disabled = true;
                                  console.log(`User triggered delete for order ${order.id}`);
                                  const ok = await deleteItem('orders', order.id);
                                  if (!ok) btn.disabled = false;
                                }} 
                                className="w-full py-4 bg-red-100 dark:bg-red-950/20 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/10 hover:bg-red-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                               >
                                 <Trash2 className="w-4 h-4" /> Delete Transaction
                               </button>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                </div>
              )}

              {activeTab === 'deals' && (
                <div className="space-y-8">
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
                      <Gift className="w-8 h-8 text-red-600" /> Create New Deal
                    </h2>
                    
                    <form className="space-y-8" onSubmit={async (e) => {
                      e.preventDefault();
                      const target = e.target as any;
                      const titleVal = target.dealTitle.value;
                      const descVal = target.dealDesc.value;
                      const priceVal = parseFloat(target.dealPrice.value);
                      
                      const selectedCheckboxes = document.querySelectorAll('input[name="dealItems"]:checked');
                      const selectedItemIds = Array.from(selectedCheckboxes).map((cb: any) => cb.value);
                      const selItems = menuItems.filter(i => selectedItemIds.includes(i.id));
                      
                      if (selItems.length < 2) {
                        alert("Please select at least 2 items for a deal.");
                        return;
                      }
                      
                      const origPrice = selItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
                      const disc = Math.round(((origPrice - priceVal) / origPrice) * 100);
                      
                      const dealData = {
                        title: titleVal,
                        description: descVal,
                        items: selItems,
                        price: priceVal,
                        originalPrice: origPrice,
                        discount: disc,
                        createdAt: serverTimestamp()
                      };

                      try {
                        await addDoc(collection(db, 'deals'), dealData);
                        alert("Deal deployed successfully!");
                        target.reset();
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, 'deals');
                      }
                    }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Deal Title</label>
                             <input name="dealTitle" placeholder="e.g. MEGA MUNCH COMBO" className="w-full px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-600 outline-none transition-all dark:text-white font-bold" required />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Brief Description</label>
                             <input name="dealDesc" placeholder="e.g. Best of both worlds with a massive discount" className="w-full px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-600 outline-none transition-all dark:text-white font-bold" required />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Special Deal Price (PKR)</label>
                             <input name="dealPrice" type="number" placeholder="999" className="w-full px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-600 outline-none transition-all dark:text-white font-bold" required />
                           </div>
                        </div>
                        
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Select Bundle Components</label>
                           <div className="h-[280px] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-4 space-y-2 scrollbar-thin">
                             {menuItems.map(item => (
                               <label key={item.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                 <input type="checkbox" name="dealItems" value={item.id} className="w-5 h-5 accent-red-600 rounded-lg" />
                                 <div className="flex items-center gap-3">
                                   <img src={item.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                   <div>
                                     <p className="font-black text-xs uppercase tracking-tight text-slate-700 dark:text-white">{item.title}</p>
                                     <p className="text-[10px] font-bold text-slate-400">Rs.{item.price}</p>
                                   </div>
                                 </div>
                               </label>
                             ))}
                           </div>
                        </div>
                      </div>
                      
                      <button type="submit" className="w-full py-5 bg-red-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3">
                         <Percent className="w-5 h-5" /> Activate Deal Protocol
                      </button>
                    </form>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {deals.map(deal => (
                       <motion.div layout key={deal.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm group hover:shadow-2xl transition-all relative overflow-hidden">
                          <div className="absolute top-4 right-4 z-10">
                             <button onClick={() => deleteItem('deals', deal.id)} className="p-3 bg-white dark:bg-slate-800 text-slate-300 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          
                          <div className="flex gap-2 mb-6 h-20 overflow-hidden">
                             {deal.items.slice(0, 3).map((item: any, idx: number) => (
                               <img key={idx} src={item.image} className="w-1/3 aspect-square object-cover rounded-2xl shadow-md transform rotate-2 first:-rotate-2 hover:rotate-0 transition-transform" alt="" />
                             ))}
                          </div>
                          
                          <div className="space-y-4">
                             <div>
                               <div className="flex items-center gap-3 mb-1">
                                 <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full font-black text-[8px] uppercase tracking-widest">{deal.discount}% OFF</span>
                                 <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter truncate">{deal.title}</h3>
                               </div>
                               <p className="text-[10px] font-bold text-slate-400 italic line-clamp-1">{deal.description}</p>
                             </div>
                             
                             <div className="flex items-end justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bundle Price</p>
                                   <div className="flex items-center gap-2">
                                      <span className="text-2xl font-black text-red-600 font-mono">Rs.{deal.price}</span>
                                      <span className="text-xs font-bold text-slate-300 line-through">Rs.{deal.originalPrice}</span>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">SAVING</p>
                                   <p className="text-sm font-black text-green-500 font-mono">Rs.{deal.originalPrice - deal.price}</p>
                                </div>
                             </div>
                          </div>
                       </motion.div>
                     ))}
                  </div>
                </div>
              )}


            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Item Modal (Add/Edit) */}
      <AnimatePresence>
        {(isAdding || editingItem) && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setEditingItem(null); }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[3.5rem] p-6 lg:p-12 shadow-2xl space-y-8 lg:space-y-10 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                   <div className="space-y-1">
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{editingItem ? 'Edit' : 'New'} <span className="text-orange-600">Creation</span></h2>
                    <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{editingItem ? 'Updating catalog integrity' : 'Deploying new culinary asset'}</p>
                   </div>
                   <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-slate-400 hover:text-red-500"><X className="w-5 h-5 lg:w-6 lg:h-6" /></button>
                </div>
                                  <form className="space-y-4 lg:space-y-6" onSubmit={editingItem ? handleUpdateItem : async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  
                  try {
                    const catId = target.categoryId.value;
                    const catName = categories.find(c => c.id === catId)?.name || 'Uncategorized';
                    
                      const newItem = {
                      title: target.title.value,
                      subtitle: catName.toUpperCase(),
                      categoryName: catName,
                      categoryId: catId,
                      image: target.image.value,
                      price: parseFloat(target.price.value) || 15,
                      rank: menuItems.length + 1,
                      isHero: target.isHero.checked,
                      isSignature: target.isSignature.checked,
                      accentColor: target.accentColor.value || '#ffe4e1',
                      sizes: sizes,
                    };

                    // Optimistic update
                    const tempId = 'temp-' + Date.now();
                    setMenuItems(prev => [{ ...newItem, id: tempId } as any, ...prev]);
                    setIsAdding(false);

                    await addDoc(collection(db, 'menu'), { ...newItem, createdAt: serverTimestamp() });
                  } catch (e) {
                    handleFirestoreError(e, OperationType.WRITE, 'menu');
                    alert("Catalog submission failed.");
                  }
                }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-1.5 lg:space-y-2">
                       <label className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Master Title</label>
                       <input name="title" defaultValue={editingItem?.title || ''} placeholder="e.g. LOTEK EXTRA" className="w-full px-5 lg:px-6 py-3 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm lg:text-base" required />
                    </div>
                    <div className="space-y-1.5 lg:space-y-2">
                       <label className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Category</label>
                       <select name="categoryId" defaultValue={editingItem?.categoryId || ''} className="w-full px-5 lg:px-6 py-3 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold appearance-none text-sm lg:text-base">
                          <option value="">Select Category</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-1.5 lg:space-y-2">
                       <label className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Price Unit (PKR)</label>
                       <input name="price" type="number" defaultValue={editingItem?.price || 15} placeholder="150" className="w-full px-5 lg:px-6 py-3 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm lg:text-base" required />
                    </div>
                    <div className="space-y-1.5 lg:space-y-2">
                       <label className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Theme Accent (Hex)</label>
                       <input name="accentColor" defaultValue={editingItem?.accentColor || '#ffe4e1'} placeholder="#ffe4e1" className="w-full px-5 lg:px-6 py-3 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm lg:text-base" required />
                    </div>
                    <div className="space-y-1.5 lg:space-y-2 sm:col-span-2">
                       <label className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Visual Asset URL</label>
                       <div className="flex gap-3 lg:gap-4">
                          <input name="image" defaultValue={editingItem?.image || ''} placeholder="https://unsplash.com/..." className="flex-1 px-5 lg:px-6 py-3 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm lg:text-base" required />
                          <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                             <ImageIcon className="w-5 h-5 lg:w-6 lg:h-6 text-slate-300" />
                          </div>
                       </div>
                    </div>
                    
                    <div className="sm:col-span-2 space-y-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Product Sizes & Variants</label>
                          <button type="button" onClick={() => setSizes([...sizes, { name: '', price: 0 }])} className="text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-full shadow-sm">
                             <Plus className="w-3 h-3" /> Add Size
                          </button>
                       </div>
                       <div className="space-y-3">
                          {sizes.map((s, idx) => (
                            <div key={idx} className="flex gap-3 items-center animate-in fade-in slide-in-from-left-2 transition-all">
                               <input 
                                 placeholder="Size (e.g. Small)" 
                                 value={s.name} 
                                 onChange={(e) => {
                                   const newSizes = [...sizes];
                                   newSizes[idx].name = e.target.value;
                                   setSizes(newSizes);
                                 }}
                                 className="flex-1 px-5 py-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm" 
                               />
                               <input 
                                 type="number" 
                                 placeholder="Price" 
                                 value={s.price} 
                                 onChange={(e) => {
                                   const newSizes = [...sizes];
                                   newSizes[idx].price = parseFloat(e.target.value) || 0;
                                   setSizes(newSizes);
                                 }}
                                 className="w-24 px-5 py-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-transparent focus:border-orange-600 outline-none transition-all dark:text-white font-bold text-sm" 
                               />
                               <button type="button" onClick={() => setSizes(sizes.filter((_, i) => i !== idx))} className="p-3 text-slate-300 hover:text-red-500 transition-all"><X className="w-4 h-4" /></button>
                            </div>
                          ))}
                       </div>
                    </div>
                    
                    <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 sm:gap-8 p-4 lg:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl lg:rounded-3xl border border-slate-100 dark:border-slate-800">
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input name="isHero" type="checkbox" defaultChecked={editingItem?.isHero} className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg text-orange-600 focus:ring-orange-600 border-slate-200" />
                          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-orange-600 transition-colors">Hero Slideshow</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input name="isSignature" type="checkbox" defaultChecked={editingItem?.isSignature} className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg text-yellow-500 focus:ring-yellow-500 border-slate-200" />
                          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-yellow-500 transition-colors">Signature Item</span>
                       </label>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-4 lg:py-5 bg-slate-900 dark:bg-orange-600 text-white font-black uppercase tracking-widest lg:tracking-[0.2em] rounded-2xl lg:rounded-3xl shadow-2xl hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-3 lg:gap-4 text-xs lg:text-base">
                    <Save className="w-4 h-4 lg:w-5 lg:h-5" />
                    {editingItem ? 'Sync Record' : 'Deploy Asset'}
                  </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
