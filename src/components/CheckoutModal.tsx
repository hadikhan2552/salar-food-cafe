import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  ArrowRight, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  Clock,
  ArrowLeft,
  Info,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  total: number;
  onCheckoutSuccess?: () => void;
}

type CheckoutStep = 'order-type' | 'details' | 'payment-method' | 'payment-instructions' | 'success';
type PaymentMethod = 'Easypaisa' | 'Bank Transfer' | 'Cash on Delivery';

const PAYMENT_DETAILS = {
  Easypaisa: {
    account: '03238814878',
    name: 'Muhammed Sameer'
  },
  'Bank Transfer': {
    account: 'PK58MEZN0022010112636659',
    name: 'Muhammed Sameer (Meezan Bank)'
  },
  'Cash on Delivery': null
};

const OWNER_WHATSAPP = "923238814878";

export default function CheckoutModal({ isOpen, onClose, cart, total, onCheckoutSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<CheckoutStep>('order-type');
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Easypaisa');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.contact || !formData.address) {
        alert("Please complete your delivery details.");
        return;
    }

    setIsSubmitting(true);
    try {
      // Pre-generate ID for instant feedback
      const ordersRef = collection(db, 'orders');
      const newOrderDoc = doc(ordersRef);
      const generatedId = newOrderDoc.id;
      setOrderId(generatedId);

      const orderData: any = {
        name: formData.name,
        contact: formData.contact,
        address: formData.address,
        items: cart.map(i => ({ 
          title: i.title, 
          price: i.price || 15, 
          quantity: i.quantity || 1,
          size: i.selectedSize?.name || null,
          isDeal: i.isDeal || false
        })),
        total,
        paymentMethod,
        status: paymentMethod === 'Cash on Delivery' ? 'pending_cod' : 'pending',
        createdAt: serverTimestamp()
      };
      
      // We don't await the UI transition to success
      setStep('success'); 
      if (onCheckoutSuccess) onCheckoutSuccess();
      
      // Perform the write in the background
      await setDoc(newOrderDoc, orderData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      alert("Checkout failed. Please try again.");
      setStep('details'); // Revert step on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendWhatsApp = () => {
    const itemsList = cart.map(item => `- ${item.title} ${item.selectedSize ? `(${item.selectedSize.name})` : ''} x${item.quantity || 1}`).join('%0A');
    const isCOD = paymentMethod === 'Cash on Delivery';
    
    const message = isCOD 
      ? `*NEW ORDER - CASH ON DELIVERY*%0A%0A` +
        `*Order ID:* ${orderId?.slice(-8).toUpperCase()}%0A` +
        `*Customer:* ${formData.name}%0A` +
        `*Contact:* ${formData.contact}%0A` +
        `*Bill:* Rs.${total.toFixed(2)}%0A` +
        `*Address:* ${formData.address}%0A%0A` +
        `*Items:*%0A${itemsList}%0A%0A` +
        `_Order placed via website._`
      : `*NEW ORDER - ONLINE PAYMENT*%0A%0A` +
        `*Order ID:* ${orderId?.slice(-8).toUpperCase()}%0A` +
        `*Customer:* ${formData.name}%0A` +
        `*Contact:* ${formData.contact}%0A` +
        `*Bill:* Rs.${total.toFixed(2)}%0A` +
        `*Method:* ${paymentMethod}%0A` +
        `*Address:* ${formData.address}%0A%0A` +
        `*Items:*%0A${itemsList}%0A%0A` +
        `*IMPORTANT:* I am sharing the payment slip below for verification.%0A%0A` +
        `_Order placed via website._`;
    
    window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${message}`, '_blank');
  };

  const renderStep = () => {
    switch(step) {
      case 'order-type':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="text-center space-y-1 mb-6 sm:mb-8">
                <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Order Method</h4>
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">How would you like to pay?</p>
             </div>
             <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <button 
                  onClick={() => { setPaymentMethod('Cash on Delivery'); setStep('details'); }}
                  className="flex justify-between items-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-3xl border-2 border-transparent hover:border-orange-600 transition-all group shadow-sm"
                >
                   <div className="flex items-center gap-3 sm:gap-5">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-100 dark:bg-orange-950/30 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                         <ShoppingBag className="w-5 h-5 sm:w-7 sm:h-7" />
                      </div>
                      <div className="text-left">
                         <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm sm:text-lg">Cash on Delivery</p>
                         <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">Pay when you receive your food</p>
                      </div>
                   </div>
                   <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                </button>

                <button 
                  onClick={() => { setPaymentMethod('Easypaisa'); setStep('details'); }}
                  className="flex justify-between items-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-3xl border-2 border-transparent hover:border-orange-600 transition-all group shadow-sm"
                >
                   <div className="flex items-center gap-3 sm:gap-5">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-100 dark:bg-orange-950/30 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                         <CreditCard className="w-5 h-5 sm:w-7 sm:h-7" />
                      </div>
                      <div className="text-left">
                         <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm sm:text-lg">Online Payment</p>
                         <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">Easypaisa / Bank Transfer</p>
                      </div>
                   </div>
                   <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                </button>
             </div>
          </motion.div>
        );

      case 'details':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Full Name</label>
                  <div className="relative mt-2">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Your Name" className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:text-white" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Contact Number</label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="03XXXXXXXXX" className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:text-white" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Delivery Address</label>
                  <div className="relative mt-2">
                    <MapPin className="absolute left-5 top-5 w-4 h-4 text-slate-300" />
                    <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={3} placeholder="Street, Area, City..." className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-orange-600 transition-all resize-none dark:text-white" />
                  </div>
               </div>
            </div>
            <button 
              disabled={!formData.name || !formData.contact || !formData.address || isSubmitting}
              onClick={() => {
                if (paymentMethod === 'Cash on Delivery') {
                  handleSubmit();
                } else {
                  setStep('payment-method');
                }
              }} 
              className="w-full py-5 bg-slate-900 dark:bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
               {paymentMethod === 'Cash on Delivery' ? (isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'Confirm Order') : 'Select Payment'} <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => setStep('order-type')} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Back to Method
             </button>
          </motion.div>
        );

      case 'payment-method':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center px-6 leading-relaxed">Choose your preferred manual payment system</p>
             <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'Easypaisa', icon: Smartphone, color: 'text-green-500', desc: 'Instant via Mobile App' },
                  { id: 'Bank Transfer', icon: Building2, color: 'text-blue-500', desc: 'Secure Bank Transfer/IBFT' }
                ].map((m) => (
                  <button 
                    key={m.id}
                    onClick={() => { setPaymentMethod(m.id as PaymentMethod); setStep('payment-instructions'); }}
                    className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent hover:border-orange-600 transition-all group"
                  >
                     <div className="flex items-center gap-4 text-left">
                        <div className={`w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${m.color}`}>
                           <m.icon className="w-6 h-6" />
                        </div>
                        <div>
                           <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{m.id}</p>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.desc}</p>
                        </div>
                     </div>
                     <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
             </div>
             <button onClick={() => setStep('details')} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Details
             </button>
          </motion.div>
        );

      case 'payment-instructions':
        const details = PAYMENT_DETAILS[paymentMethod as keyof typeof PAYMENT_DETAILS];
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-3xl border border-orange-100 dark:border-orange-950/50 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                   </div>
                   <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{paymentMethod}</h4>
                </div>
                
                <div className="space-y-4">
                   <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Holder</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white truncate">{details?.name}</p>
                   </div>
                   <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl flex justify-between items-center group">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Number</p>
                        <p className="text-xl font-black font-mono tracking-wider">{(details as any)?.number || (details as any)?.account}</p>
                      </div>
                      <button 
                        onClick={() => handleCopy((details as any)?.number || (details as any)?.account)} 
                        className={`p-3 rounded-xl transition-all flex items-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-white/10 hover:bg-white text-white hover:text-slate-900'}`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied && <span className="text-[10px] font-black uppercase">Copied</span>}
                      </button>
                   </div>
                </div>
             </div>

             <div className="flex items-start gap-4 p-4 text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed">
                <Info className="w-5 h-5 text-orange-600 shrink-0" />
                <p>Transfer the total amount to the account above, then click confirm. You will be redirected to WhatsApp to share your payment slip.</p>
             </div>

             <div className="text-center">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 animate-pulse">(Share payment slip on whatsapp)</p>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-5 bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'Confirm Order'} <ArrowRight className="w-5 h-5" />
                </button>
             </div>
            <button onClick={() => setStep('payment-method')} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Change Method
             </button>
          </motion.div>
        );

      case 'success':
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-8">
             <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-200">
                <CheckCircle2 className="w-12 h-12 text-white" />
             </div>
             <div className="space-y-2">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">SUCCESS!</h3>
                <p className="text-slate-500 font-bold leading-relaxed px-6 dark:text-slate-400">Your order has been placed successfully.</p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                   <span>Order Reference</span>
                   <span className="text-slate-900 dark:text-white">{orderId?.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                   <span>Status</span>
                   <span className="text-green-600 flex items-center gap-1">PLACED</span>
                </div>
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                   <span>Wait Time</span>
                   <span className="text-orange-600 flex items-center gap-1"><Clock className="w-3 h-3" /> ~15-30 MINS</span>
                </div>
             </div>
             <button 
              onClick={sendWhatsApp} 
              className="w-full py-6 bg-[#25D366] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl flex items-center justify-center gap-4 hover:scale-105 transition-all"
            >
               Order details on WhatsApp <Smartphone className="w-6 h-6" />
            </button>
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest animate-pulse">(Share payment slip on whatsapp)</p>
            <button onClick={onClose} className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400">Close Checkout</button>
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 z-[201] rounded-t-[2.5rem] sm:rounded-[3.5rem] shadow-[0_0_100px_rgba(249,115,22,0.3)] overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 sm:p-8 pb-2 sm:pb-4 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 shrink-0">
               <div className="space-y-1">
                  <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Secure <span className="text-orange-600">Checkout</span></h3>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${step === 'order-type' && i === 1 ? 'w-4 sm:w-8 bg-orange-600' : step === 'details' && i <= 2 ? 'w-4 sm:w-8 bg-orange-600' : step === 'payment-method' && i <= 3 ? 'w-4 sm:w-8 bg-orange-600' : step === 'payment-instructions' && i <= 4 ? 'w-4 sm:w-8 bg-orange-600' : step === 'success' ? 'w-4 sm:w-8 bg-green-500' : 'w-2 sm:w-4 bg-slate-200 dark:bg-slate-800'}`} />
                    ))}
                  </div>
               </div>
               <button onClick={onClose} className="p-2 sm:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full shadow-sm transition-all text-slate-400 active:scale-95"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-10 pb-12 sm:pb-10 scrollbar-thin">
               <div className="mb-4 sm:mb-8 p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-2 sm:gap-3">
                     <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 dark:bg-orange-950/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                     </div>
                     <p className="text-[8px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Total</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">Rs.{total.toFixed(2)}</p>
               </div>

               {renderStep()}
            </div>
            
            <div className="p-4 text-center border-t border-slate-100 dark:border-slate-800 shrink-0">
               <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Manual Payment Gateway • Salar Food Cafe</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}