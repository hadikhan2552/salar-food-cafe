import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, User, Phone, MessageSquare, Send } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishId?: string;
}

export default function ReviewModal({ isOpen, onClose, dishId }: ReviewModalProps) {
  const [formData, setFormData] = useState({
    user: '',
    contact: '',
    comment: '',
    rating: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        ...formData,
        dishId: dishId || 'general',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      // Faster feedback loop
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ user: '', contact: '', comment: '', rating: 5 });
      }, 1000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
      alert("Review submission failed. Error: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 z-[201] rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Share Your <span className="text-orange-600">Flavor</span></h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                   <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {success ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Star className="w-10 h-10 text-green-600 fill-green-600" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">Review Submitted!</h4>
                  <p className="text-slate-500 text-sm">Thank you! Your review is pending approval.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          required
                          value={formData.user}
                          onChange={e => setFormData(prev => ({ ...prev, user: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-600 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          required
                          value={formData.contact}
                          onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                          placeholder="+1 234..."
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                          className="p-1 transition-transform active:scale-90"
                        >
                          <Star className={`w-8 h-8 ${formData.rating >= star ? 'fill-orange-400 text-orange-400' : 'text-slate-200 dark:text-slate-700'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Thought</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                      <textarea 
                        required
                        rows={4}
                        value={formData.comment}
                        onChange={e => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Tell us about the flavor..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-600 outline-none resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-200 dark:shadow-none hover:bg-orange-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit Review
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
