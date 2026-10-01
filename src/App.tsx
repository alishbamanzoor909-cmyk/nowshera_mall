/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, LayoutDashboard, History, Sparkles, AlertTriangle, 
  Plus, Search, ArrowUpDown, CheckCircle2, XCircle, ShieldCheck, 
  User, DollarSign, TrendingUp, RefreshCw, ShoppingCart, AlertCircle, Menu, X, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: 'Grocery' | 'Clothing' | 'Electronics' | 'Household';
  quantity: number;
  minStock: number;
  supplier: string;
  sellingPrice: number;
  costPrice?: number;
  lastUpdated: string;
  updatedBy: string;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  category: string;
  changeType: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  user: string;
  role: string;
  timestamp: string;
  reason?: string;
}

interface PendingChange {
  id: string;
  productName: string;
  category: 'Grocery' | 'Clothing' | 'Electronics' | 'Household';
  actionType: 'add_stock' | 'reduce_stock' | 'new_product' | 'update_price';
  quantityChange: number;
  supplier?: string;
  sellingPrice?: number;
  costPrice?: number;
  minStock?: number;
  reason: string;
  suggestedBy: string;
  timestamp: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  proposedChange?: any;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [role, setRole] = useState<'manager' | 'staff'>('manager');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'history' | 'pending'>('dashboard');
  
  const [inventory, setInventory] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (loginEmail.trim() === 'manager@gmail.com' && loginPassword === '123456') {
      setRole('manager');
      setIsAuthenticated(true);
    } else if (loginEmail.trim() === 'staff@gmail.com' && loginPassword === '654321') {
      setRole('staff');
      setIsAuthenticated(true);
    } else {
      setLoginError('Wrong email or password. Please enter correct credentials.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
  };

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Update form state
  const [updateQty, setUpdateQty] = useState<number>(10);
  const [updateType, setUpdateType] = useState<string>('New Stock');
  const [updateReason, setUpdateReason] = useState<string>('Regular stock update');

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<'Grocery' | 'Clothing' | 'Electronics' | 'Household'>('Grocery');
  const [newProdQty, setNewProdQty] = useState(50);
  const [newProdMin, setNewProdMin] = useState(15);
  const [newProdSupplier, setNewProdSupplier] = useState('');
  const [newProdSelling, setNewProdSelling] = useState(1000);
  const [newProdCost, setNewProdCost] = useState(750);

  // AI Chat Drawer / Panel state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Assalam-o-Alaikum! I am your Nowshera Shopping Mall AI assistant. Ask me anything about stock levels, low items, or type "Add 40 Type-C cables from Ali Traders" to prepare stock updates.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const fetchAppData = async () => {
    try {
      setLoading(true);
      const [invRes, movRes, penRes] = await Promise.all([
        fetch(`/api/inventory?role=${role}`),
        fetch('/api/movements'),
        fetch('/api/pending-changes')
      ]);
      const invData = await invRes.json();
      const movData = await movRes.json();
      const penData = await penRes.json();

      setInventory(invData);
      setMovements(movData);
      setPendingChanges(penData);
    } catch (err) {
      console.error('Error fetching app data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, [role]);

  useEffect(() => {
    if (chatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatOpen]);

  // Handlers
  const handleManualUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const res = await fetch(`/api/inventory/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityChange: Number(updateQty),
          changeType: updateType,
          reason: updateReason,
          user: role === 'manager' ? 'Mall Manager' : 'Mall Staff',
          role
        })
      });
      if (res.ok) {
        setShowUpdateModal(false);
        setSelectedProduct(null);
        fetchAppData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update stock.');
      }
    } catch (err) {
      console.error('Failed to update product stock:', err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName,
          category: newProdCategory,
          quantity: newProdQty,
          minStock: newProdMin,
          supplier: newProdSupplier || 'Local Supplier',
          sellingPrice: newProdSelling,
          costPrice: role === 'manager' ? newProdCost : undefined,
          user: role === 'manager' ? 'Mall Manager' : 'Mall Staff',
          role
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewProdName('');
        setNewProdSupplier('');
        fetchAppData();
      }
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const handleConfirmPending = async (id: string) => {
    try {
      const res = await fetch(`/api/pending-changes/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: role === 'manager' ? 'Mall Manager' : 'Mall Staff',
          role
        })
      });
      if (res.ok) {
        fetchAppData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to confirm change.');
        fetchAppData();
      }
    } catch (err) {
      console.error('Failed to confirm change:', err);
    }
  };

  const handleCancelPending = async (id: string) => {
    try {
      const res = await fetch(`/api/pending-changes/${id}/cancel`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchAppData();
      }
    } catch (err) {
      console.error('Failed to cancel change:', err);
    }
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    const newHistory = [...chatHistory, { role: 'user' as const, text: userText }];
    setChatHistory(newHistory);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          role,
          history: newHistory.slice(-6)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [
          ...prev,
          { role: 'model', text: data.reply, proposedChange: data.proposedChange }
        ]);

        if (data.proposedChange) {
          // Also register in pending changes on backend if AI returned a proposed change
          await fetch('/api/pending-changes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productName: data.proposedChange.productName,
              category: data.proposedChange.category || 'Grocery',
              actionType: data.proposedChange.actionType || 'add_stock',
              quantityChange: data.proposedChange.quantityChange || 0,
              supplier: data.proposedChange.supplier,
              reason: data.proposedChange.reason,
              suggestedBy: 'AI Assistant Chat'
            })
          });
          fetchAppData();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setChatHistory(prev => [
          ...prev,
          { role: 'model', text: errData.error || 'AI assistant is currently unavailable. Please try again later.' }
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatHistory(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error communicating with the inventory assistant.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}?role=${role}`, { method: 'DELETE' });
      if (res.ok) fetchAppData();
      else alert('Only managers can delete products');
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations for Dashboard
  const totalProducts = inventory.length;
  const lowStockProducts = inventory.filter(p => p.quantity <= p.minStock);
  const totalStockUnits = inventory.reduce((acc, p) => acc + p.quantity, 0);
  
  // Manager Financials
  const totalInventoryCost = role === 'manager' 
    ? inventory.reduce((acc, p) => acc + (p.quantity * (p.costPrice || 0)), 0)
    : 0;
  const totalInventoryValue = inventory.reduce((acc, p) => acc + (p.quantity * p.sellingPrice), 0);
  const estimatedProfit = totalInventoryValue - totalInventoryCost;

  const filteredInventory = inventory.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-900 flex items-center justify-center text-white font-bold shadow-lg">
              <Package className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Nowshera Shopping Mall</h1>
            <p className="text-xs text-slate-500">Secure Inventory & Management Portal</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3.5 bg-purple-900 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In Securely</span>
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-[11px] text-slate-400">Nowshera Shopping Mall &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Top Navigation Bar (Zone 1: Brand, Zone 2: Nav Links, Zone 3: Role Toggle & AI Chat Button) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-900 flex items-center justify-center text-white font-bold shadow-sm">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Nowshera Shopping Mall</h1>
            <p className="text-xs text-slate-500 font-medium">Inventory & Stock Management System ({role.toUpperCase()})</p>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('inventory')} 
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'inventory' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Inventory ({totalProducts})
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Stock History
          </button>
          <button 
            onClick={() => setActiveTab('pending')} 
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all relative ${activeTab === 'pending' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            AI Approvals
            {pendingChanges.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-purple-600 text-white rounded-full text-[10px] font-bold">
                {pendingChanges.length}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Actions & Sign Out */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Assistant</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Bar */}
      <div className="flex lg:hidden bg-white border-b border-slate-200 px-4 py-2 gap-2 overflow-x-auto">
        <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-purple-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('inventory')} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${activeTab === 'inventory' ? 'bg-purple-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Inventory</button>
        <button onClick={() => setActiveTab('history')} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${activeTab === 'history' ? 'bg-purple-900 text-white' : 'bg-slate-100 text-slate-700'}`}>History</button>
        <button onClick={() => setActiveTab('pending')} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${activeTab === 'pending' ? 'bg-purple-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Approvals ({pendingChanges.length})</button>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Role Notice Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between text-purple-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-200 flex items-center justify-center text-purple-800">
              {role === 'manager' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-sm font-bold">Logged in as: <span className="underline capitalize">{role}</span> Mode</p>
              <p className="text-xs text-purple-800">
                {role === 'manager' ? 'Full access to financial cost prices, profit metrics, and manager reports.' : 'Viewing product stock quantities and sales updates. Cost prices and profit are restricted.'}
              </p>
            </div>
          </div>
          {pendingChanges.length > 0 && (
            <button 
              onClick={() => setActiveTab('pending')}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{pendingChanges.length} AI Changes Awaiting Confirmation</span>
            </button>
          )}
        </div>

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-8">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{totalProducts}</h2>
                  <p className="text-xs text-slate-500 mt-1">Across 4 Mall Departments</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-3xl font-bold tracking-tight text-amber-600 tabular-nums">{lowStockProducts.length}</h2>
                  <p className="text-xs text-slate-500 mt-1">Requires immediate restock</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Stock Units</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{totalStockUnits}</h2>
                  <p className="text-xs text-slate-500 mt-1">Units available in mall</p>
                </div>
              </div>

              {role === 'manager' ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Profit Margin</span>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h2 className="text-3xl font-bold tracking-tight text-purple-900 tabular-nums">Rs. {estimatedProfit.toLocaleString()}</h2>
                    <p className="text-xs text-slate-500 mt-1">Based on current retail vs cost</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Suppliers</span>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {new Set(inventory.map(p => p.supplier)).size}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Reliable mall vendors</p>
                  </div>
                </div>
              )}
            </div>

            {/* Low Stock Alert Section */}
            {lowStockProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="text-base font-bold">Low Stock Warning List</h3>
                  </div>
                  <button onClick={() => setActiveTab('inventory')} className="text-xs font-semibold text-purple-700 hover:underline">
                    View All Inventory →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.category} · Supplier: {p.supplier}</p>
                        <p className="text-xs font-bold text-amber-700 mt-1">Current: {p.quantity} (Min: {p.minStock})</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setUpdateQty(20);
                          setUpdateType('New Stock');
                          setShowUpdateModal(true);
                        }}
                        className="px-3 py-1.5 bg-purple-900 text-white rounded-lg text-xs font-semibold hover:bg-purple-800 transition-colors"
                      >
                        Restock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Stock Movements & Quick AI Prompt */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">Recent Stock Movements</h3>
                  <button onClick={() => setActiveTab('history')} className="text-xs font-semibold text-purple-700 hover:underline">
                    View History
                  </button>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-3">Product</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Change</th>
                        <th className="pb-3">By</th>
                        <th className="pb-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.slice(0, 5).map(m => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-3 font-semibold text-slate-900">{m.productName}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              m.changeType === 'New Stock' ? 'bg-purple-100 text-purple-800' :
                              m.changeType === 'Sold' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {m.changeType}
                            </span>
                          </td>
                          <td className="py-3 font-mono font-bold tabular-nums">
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </td>
                          <td className="py-3 text-slate-600">{m.user}</td>
                          <td className="py-3 text-slate-500">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Quick Assistant Widget */}
              <div className="bg-purple-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-800 flex items-center justify-center text-purple-200">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-800 px-2 py-0.5 rounded-full text-purple-200">Nowshera AI</span>
                  </div>
                  <h3 className="text-lg font-bold">Ask AI or Prepare Stock Updates</h3>
                  <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                    Type natural instructions like "Add 50 packs of rice from Peshawar Grain" or ask "Which items are running low?".
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setChatOpen(true);
                      setChatInput('Which items are running low right now?');
                    }}
                    className="w-full py-2.5 bg-white text-purple-900 rounded-xl text-xs font-bold hover:bg-purple-50 transition-colors text-left px-4 shadow-xs"
                  >
                    💬 "Which items are running low?"
                  </button>
                  <button
                    onClick={() => {
                      setChatOpen(true);
                      setChatInput('Add 30 Type-C cables from Ali Traders');
                    }}
                    className="w-full py-2.5 bg-purple-800 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors text-left px-4 border border-purple-700"
                  >
                    📦 "Add 30 Type-C cables from Ali Traders"
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mall Inventory Directory</h3>
                <p className="text-xs text-slate-500">Manage stock, prices, suppliers, and manual updates across departments.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-purple-900 text-white text-xs font-semibold rounded-xl hover:bg-purple-800 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search products or suppliers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {['All', 'Grocery', 'Clothing', 'Electronics', 'Household'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${categoryFilter === cat ? 'bg-purple-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Stock Qty</th>
                    <th className="p-3.5">Min Stock</th>
                    <th className="p-3.5">Supplier</th>
                    <th className="p-3.5">Selling Price</th>
                    {role === 'manager' && <th className="p-3.5">Cost Price</th>}
                    {role === 'manager' && <th className="p-3.5">Profit/Unit</th>}
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map(item => {
                    const isLow = item.quantity <= item.minStock;
                    const profit = role === 'manager' && item.costPrice ? item.sellingPrice - item.costPrice : 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-semibold text-slate-900">
                          {item.name}
                          {isLow && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                              Low Stock
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">{item.category}</td>
                        <td className="p-3.5 font-mono font-bold tabular-nums text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 tabular-nums">{item.minStock}</td>
                        <td className="p-3.5 text-slate-600">{item.supplier}</td>
                        <td className="p-3.5 font-mono font-semibold tabular-nums text-slate-900">Rs. {item.sellingPrice.toLocaleString()}</td>
                        {role === 'manager' && (
                          <td className="p-3.5 font-mono tabular-nums text-slate-600">Rs. {item.costPrice?.toLocaleString() || 0}</td>
                        )}
                        {role === 'manager' && (
                          <td className="p-3.5 font-mono tabular-nums text-emerald-700 font-semibold">Rs. {profit.toLocaleString()}</td>
                        )}
                        <td className="p-3.5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(item);
                              setUpdateQty(10);
                              setUpdateType('New Stock');
                              setShowUpdateModal(true);
                            }}
                            className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg font-semibold hover:bg-purple-200 transition-colors"
                          >
                            Update Stock
                          </button>
                          {role === 'manager' && (
                            <button
                              onClick={() => handleDeleteProduct(item.id)}
                              className="px-2 py-1 bg-rose-50 text-rose-700 rounded-lg font-semibold hover:bg-rose-100 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. STOCK HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Stock Audit Trail & Movements</h3>
              <p className="text-xs text-slate-500">Complete immutable record of all stock receipts, sales, damages, and AI confirmations.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Movement Type</th>
                    <th className="p-3.5">Qty Change</th>
                    <th className="p-3.5">Before → After</th>
                    <th className="p-3.5">User / Role</th>
                    <th className="p-3.5">Reason / Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900">{m.productName}</td>
                      <td className="p-3.5 text-slate-600">{m.category}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          m.changeType === 'New Stock' ? 'bg-purple-100 text-purple-800' :
                          m.changeType === 'AI Confirmed' ? 'bg-purple-900 text-white' :
                          m.changeType === 'Sold' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {m.changeType}
                        </span>
                      </td>
                      <td className={`p-3.5 font-mono font-bold tabular-nums ${m.quantityChange > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-slate-600">
                        {m.previousQuantity} → {m.newQuantity}
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {m.user} <span className="text-[10px] text-slate-400 uppercase">({m.role})</span>
                      </td>
                      <td className="p-3.5 text-slate-500">{m.reason || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. AI APPROVALS / PENDING CHANGES TAB */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">AI Stock Change Approvals</h3>
                <p className="text-xs text-slate-500">AI-prepared stock changes must be explicitly confirmed by human staff or manager before database write.</p>
              </div>
              <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-xl text-xs font-bold">
                {pendingChanges.length} Pending
              </span>
            </div>

            {pendingChanges.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No pending AI stock changes</p>
                <p className="text-xs text-slate-400 max-w-sm">Use the AI Assistant chat to request restocking or updates, and proposed changes will appear here for confirmation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingChanges.map(pc => (
                  <div key={pc.id} className="p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/30 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded-md text-[11px] font-bold">
                          {pc.actionType.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(pc.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{pc.productName}</h4>
                      <p className="text-xs text-slate-600 mt-1">Category: <span className="font-medium">{pc.category}</span></p>
                      <p className="text-xs text-slate-600">Quantity Change: <span className="font-mono font-bold text-purple-900">+{pc.quantityChange}</span></p>
                      {pc.supplier && <p className="text-xs text-slate-600">Supplier: {pc.supplier}</p>}
                      <p className="text-xs text-slate-500 italic mt-2 bg-white p-2.5 rounded-xl border border-slate-200">
                        "{pc.reason}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-purple-100">
                      <button
                        onClick={() => handleConfirmPending(pc.id)}
                        className="flex-1 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Apply</span>
                      </button>
                      <button
                        onClick={() => handleCancelPending(pc.id)}
                        className="flex-1 py-2 bg-white hover:bg-slate-100 text-rose-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* AI CHAT ASSISTANT SLIDING PANEL / DRAWER */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div className="p-4 bg-purple-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-200" />
              <div>
                <h3 className="text-sm font-bold">Nowshera Mall AI Assistant</h3>
                <p className="text-[10px] text-purple-200">Role: {role.toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1.5 hover:bg-purple-800 rounded-lg text-purple-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-900 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>

                {/* If AI proposed a stock change in chat */}
                {msg.proposedChange && (
                  <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-xl w-full flex flex-col gap-2">
                    <p className="text-[11px] font-bold text-purple-900">
                      📦 Proposed: {msg.proposedChange.actionType} {msg.proposedChange.quantityChange} {msg.proposedChange.productName}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActiveTab('pending');
                          setChatOpen(false);
                        }}
                        className="px-3 py-1 bg-purple-900 text-white rounded-lg text-[11px] font-bold hover:bg-purple-800"
                      >
                        Review in Approvals →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="self-start bg-white p-3 rounded-2xl border border-slate-200 text-xs text-slate-500 animate-pulse">
                AI is checking inventory data...
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask stock questions or request updates..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="px-4 py-2 bg-purple-900 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* MANUAL STOCK UPDATE MODAL */}
      {showUpdateModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Update Stock: {selectedProduct.name}</h3>
              <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualUpdate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Current Stock Quantity</label>
                <input
                  type="text"
                  disabled
                  value={selectedProduct.quantity}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Change Type</label>
                <select
                  value={updateType}
                  onChange={e => setUpdateType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                >
                  <option value="New Stock">New Stock Received (+)</option>
                  <option value="Sold">Products Sold (-)</option>
                  <option value="Damaged/Lost">Damaged / Lost (-)</option>
                  <option value="Manual Correction">Manual Correction (+/-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {updateType === 'Sold' || updateType === 'Damaged/Lost' ? 'Quantity to Deduct (-)' : 'Quantity to Add (+)'}
                </label>
                <input
                  type="number"
                  value={updateQty}
                  onChange={e => setUpdateQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={updateReason}
                  onChange={e => setUpdateReason(e.target.value)}
                  placeholder="e.g. Received shipment from Ali Traders"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-900 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition-colors shadow-xs"
                >
                  Save Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add New Mall Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={e => setNewProdName(e.target.value)}
                    placeholder="e.g. Bluetooth Soundbar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Household">Household</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={newProdSupplier}
                    onChange={e => setNewProdSupplier(e.target.value)}
                    placeholder="e.g. Ali Traders"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    required
                    value={newProdQty}
                    onChange={e => setNewProdQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min Low-Stock Level</label>
                  <input
                    type="number"
                    required
                    value={newProdMin}
                    onChange={e => setNewProdMin(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={newProdSelling}
                    onChange={e => setNewProdSelling(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                {role === 'manager' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cost Price (Rs.) [Manager Only]</label>
                    <input
                      type="number"
                      required
                      value={newProdCost}
                      onChange={e => setNewProdCost(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-900 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition-colors shadow-xs"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        Nowshera Shopping Mall Inventory Management System &copy; {new Date().getFullYear()} — Secure Real-Time Stock Control & AI Assistant
      </footer>

    </div>
  );
}
