export interface Review {
  id: string;
  user: string;
  contact?: string;
  avatar: string;
  comment: string;
  rating: number;
  status?: 'pending' | 'approved' | 'rejected';
  dishId?: string;
  createdAt?: any;
}

export interface Chef {
  name: string;
  role: string;
  description: string;
  avatar: string;
  rating: number;
  likes: number;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: any;
}

export interface Dish {
  id: string;
  rank: number;
  title: string;
  subtitle: string;
  image: string;
  chef?: Chef;
  tags: string[];
  reviews: Review[];
  accentColor: string;
  isHero?: boolean;
  isSignature?: boolean;
  price?: number;
  sizes?: { name: string; price: number }[];
  categoryId?: string;
  categoryName?: string; // Denormalized for easier display
}

export interface Order {
  id: string;
  name: string;
  contact: string;
  address: string;
  items: { title: string; price: number; quantity: number; size?: string }[];
  total: number;
  paymentMethod: 'Easypaisa' | 'JazzCash' | 'Bank Transfer' | 'Cash on Delivery';
  screenshotURL?: string;
  transactionId?: string;
  note?: string;
  systemStatus?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'rejected' | 'pending_cod';
  createdAt: any;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  items: Dish[];
  price: number;
  originalPrice: number;
  discount: number;
  createdAt: any;
}

export const DISHES: Dish[] = [
  {
    id: '1',
    rank: 1,
    title: 'LOTEK',
    subtitle: 'PERKEDEL',
    accentColor: '#ffe4e1', // Misty Rose
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1000',
    tags: ['Traditional', 'Indonesian'],
    reviews: [
      { id: 'r1', user: 'Sarah J.', avatar: 'https://i.pravatar.cc/150?u=sarah', comment: 'The best Lotek I have ever tasted! So authentic.', rating: 5 },
      { id: 'r2', user: 'Mike D.', avatar: 'https://i.pravatar.cc/150?u=mike', comment: 'Perfect balance of spices. Highly recommend it.', rating: 4 },
    ],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Feny',
      role: 'Dapur Umum Senyum',
      description: 'Kau terindah kan selalu terindah, apalagi masakanmu, ohh malah kaget gimbal si abang.',
      avatar: 'https://images.unsplash.com/photo-1583394060263-f309526bdeec?auto=format&fit=crop&q=80&w=200',
      rating: 4.9,
      likes: 96
    }
  },
  {
    id: '2',
    rank: 2,
    title: 'LAMB STEAK',
    subtitle: 'POTATO',
    accentColor: '#e0f2f1', // Light Teal
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000',
    tags: ['Gourmet', 'Fusion'],
    reviews: [
      { id: 'r3', user: 'Alex W.', avatar: 'https://i.pravatar.cc/150?u=alex', comment: 'Steak was cooked to perfection. Melts in your mouth.', rating: 5 },
      { id: 'r4', user: 'Emily R.', avatar: 'https://i.pravatar.cc/150?u=emily', comment: 'Excellent flavor pairing with the potatoes.', rating: 5 },
    ],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef K Semy',
      role: 'Komunitas Pecari Rasa',
      description: 'Dosen pembimbingku kok asem tenan ya rak, masak kok wingi ra teko teko. suh ssu!',
      avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200',
      rating: 4.3,
      likes: 84
    }
  },
  {
    id: '3',
    rank: 3,
    title: 'MARTABAK',
    subtitle: 'PAK ADIN',
    accentColor: '#fffde7', // Light Yellow
    image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=1000',
    tags: ['Street Food', 'Savory'],
    reviews: [
      { id: 'r5', user: 'David K.', avatar: 'https://i.pravatar.cc/150?u=david', comment: 'Huge portions and absolutely delicious. A must try!', rating: 5 },
    ],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Adin Salmon',
      role: 'Warung Mas Pur',
      description: 'Dengan modus "neng mabar yuk" akhirnya adin sukses menjadi juragan penerus mas pur.',
      avatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=200',
      rating: 4.6,
      likes: 36
    }
  },
  {
    id: '4',
    rank: 4,
    title: 'URAP ASLI',
    subtitle: 'WONOGIRI',
    accentColor: '#f1f8e9', // Light Green
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000',
    tags: ['Healthy', 'Local'],
    reviews: [
      { id: 'r6', user: 'Lina S.', avatar: 'https://i.pravatar.cc/150?u=lina', comment: 'Healthy and satisfying. The coconut is so fresh.', rating: 4 },
      { id: 'r7', user: 'Tom B.', avatar: 'https://i.pravatar.cc/150?u=tom', comment: 'The spices are perfectly balanced. Great local dish.', rating: 5 },
    ],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Reza',
      role: 'Shaiki Tin',
      description: 'Desainer nyambi chef, setelah meneliti gado south mountain yg lamo dinanti nanti.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
      rating: 4.5,
      likes: 52
    }
  },
  {
    id: '5',
    rank: 5,
    title: 'WAGYU BURGER',
    subtitle: 'PREMIUM',
    accentColor: '#fff3e0',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000',
    tags: ['Burger', 'Wagyu'],
    reviews: [],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Marco',
      role: 'Head Chef',
      description: 'Master of the grill, bringing you the finest wagyu cuts.',
      avatar: 'https://images.unsplash.com/photo-1583394060263-f309526bdeec?auto=format&fit=crop&q=80&w=200',
      rating: 5.0,
      likes: 120
    }
  },
  {
    id: '6',
    rank: 6,
    title: 'SALMON POKE',
    subtitle: 'FRESH',
    accentColor: '#e3f2fd',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000',
    tags: ['Healthy', 'Seafood'],
    reviews: [],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Yuki',
      role: 'Sushi Master',
      description: 'Bringing the taste of Japan to your bowl.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
      rating: 4.8,
      likes: 95
    }
  },
  {
    id: '7',
    rank: 7,
    title: 'TRUFFLE PASTA',
    subtitle: 'ALFREDO',
    accentColor: '#f3e5f5',
    image: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&q=80&w=1000',
    tags: ['Italian', 'Truffle'],
    reviews: [],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Antonio',
      role: 'Pasta Expert',
      description: 'Hand-rolled pasta with the aroma of black truffles.',
      avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200',
      rating: 4.9,
      likes: 110
    }
  },
  {
    id: '8',
    rank: 8,
    title: 'BERRY SMOOTHIE',
    subtitle: 'VIBRANT',
    accentColor: '#fce4ec',
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=1000',
    tags: ['Drink', 'Healthy'],
    reviews: [],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Elena',
      role: 'Smoothie Creator',
      description: 'Refreshing blends of frozen berries and organic honey.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
      rating: 4.7,
      likes: 70
    }
  },
  {
    id: '9',
    rank: 9,
    title: 'AVOCADO TOAST',
    subtitle: 'BRUNCH',
    accentColor: '#f1f8e9',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=1000',
    tags: ['Brunch', 'Vegan'],
    reviews: [],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Sam',
      role: 'Brunch Specialist',
      description: 'Smashed avocado with a hint of lemon and chili flakes.',
      avatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=200',
      rating: 4.6,
      likes: 85
    }
  },
  {
    id: '10',
    rank: 10,
    title: 'CHICKEN TIKKA',
    subtitle: 'SPICY',
    accentColor: '#fff3e0',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=1000',
    tags: ['Indian', 'Spicy'],
    reviews: [],
    price: 15,
    isHero: true,
    isSignature: true,
    chef: {
      name: 'Chef Raj',
      role: 'Spice Master',
      description: 'Tender chicken marinated in yogurt and secret spices.',
      avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200',
      rating: 4.9,
      likes: 130
    }
  }
];
