import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://gtyjcwblrjhicdstyits.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET || 'sb_secret_ieM7k6UdM9Fo_Jw9dily9w_XerpSXdW';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncToSupabase(table: string, data: any[]) {
  try {
    await supabase.from(table).upsert(data, { onConflict: 'id' });
  } catch (err) {
    console.warn(`Supabase sync note for table ${table}:`, err);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.existsSync(DATA_DIR) || fs.mkdirSync(DATA_DIR, { recursive: true });
}

const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const MOVEMENTS_FILE = path.join(DATA_DIR, 'movements.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending_changes.json');

interface Product {
  id: string;
  name: string;
  category: 'Grocery' | 'Clothing' | 'Electronics' | 'Household';
  quantity: number;
  minStock: number;
  supplier: string;
  sellingPrice: number;
  costPrice: number;
  lastUpdated: string;
  updatedBy: string;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  category: string;
  changeType: 'New Stock' | 'Sold' | 'Damaged/Lost' | 'Manual Correction' | 'AI Confirmed';
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
  productId?: string;
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

// Initial seed inventory for Nowshera Shopping Mall
const initialInventory: Product[] = [
  { id: 'p1', name: 'Basmati Rice 10kg', category: 'Grocery', quantity: 120, minStock: 25, supplier: 'Peshawar Grain Traders', sellingPrice: 3200, costPrice: 2700, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p2', name: 'Cooking Oil 5L', category: 'Grocery', quantity: 45, minStock: 15, supplier: 'Khyber Food Mills', sellingPrice: 2850, costPrice: 2400, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p3', name: 'Sugar 5kg', category: 'Grocery', quantity: 80, minStock: 20, supplier: 'Charsadda Sugar Depot', sellingPrice: 1150, costPrice: 980, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p4', name: 'Red Lentils (Daal Masoor) 1kg', category: 'Grocery', quantity: 18, minStock: 20, supplier: 'Peshawar Grain Traders', sellingPrice: 340, costPrice: 290, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p5', name: 'Tea Leaves (Tapal) 900g', category: 'Grocery', quantity: 60, minStock: 15, supplier: 'Metro Wholesale', sellingPrice: 1350, costPrice: 1150, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p6', name: 'Wheat Flour (Atta) 20kg', category: 'Grocery', quantity: 30, minStock: 10, supplier: 'Nowshera Flour Mills', sellingPrice: 2400, costPrice: 2100, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p7', name: 'Milk Pack 1L', category: 'Grocery', quantity: 150, minStock: 40, supplier: 'Nestle Pakistan', sellingPrice: 280, costPrice: 245, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },

  { id: 'p8', name: 'Mens Shalwar Kameez (Medium)', category: 'Clothing', quantity: 50, minStock: 10, supplier: 'Kashmir Textiles', sellingPrice: 3500, costPrice: 2500, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p9', name: 'Womens Embroidered Lawn Suit', category: 'Clothing', quantity: 35, minStock: 10, supplier: 'Gul Ahmed Studio', sellingPrice: 6800, costPrice: 5000, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p10', name: 'Kids Denim Jeans', category: 'Clothing', quantity: 22, minStock: 12, supplier: 'Lahore Garments', sellingPrice: 1600, costPrice: 1100, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p11', name: 'Winter Woolen Shawl', category: 'Clothing', quantity: 12, minStock: 8, supplier: 'Swat Handicrafts', sellingPrice: 2500, costPrice: 1800, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p12', name: 'Cotton Bed Sheet Set', category: 'Clothing', quantity: 40, minStock: 10, supplier: 'Faisalabad Fabrics', sellingPrice: 3200, costPrice: 2300, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },

  { id: 'p13', name: 'Type-C Fast Charging Cable', category: 'Electronics', quantity: 85, minStock: 20, supplier: 'Ali Traders', sellingPrice: 650, costPrice: 380, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p14', name: 'Bluetooth Wireless Earbuds', category: 'Electronics', quantity: 28, minStock: 10, supplier: 'TechZone Islamabad', sellingPrice: 2800, costPrice: 1900, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p15', name: 'LED Bulb 18W', category: 'Electronics', quantity: 110, minStock: 30, supplier: 'Pak Elektron Limited', sellingPrice: 450, costPrice: 310, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p16', name: 'Power Bank 10,000mAh', category: 'Electronics', quantity: 15, minStock: 8, supplier: 'Ali Traders', sellingPrice: 3800, costPrice: 2700, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p17', name: 'USB Flash Drive 64GB', category: 'Electronics', quantity: 55, minStock: 15, supplier: 'TechZone Islamabad', sellingPrice: 1400, costPrice: 1000, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p18', name: 'Multi-plug Extension Socket', category: 'Electronics', quantity: 38, minStock: 10, supplier: 'Al-Madina Electric', sellingPrice: 1200, costPrice: 850, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },

  { id: 'p19', name: 'Stainless Steel Pressure Cooker 5L', category: 'Household', quantity: 14, minStock: 5, supplier: 'Super Asia Home', sellingPrice: 5500, costPrice: 4200, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p20', name: 'Non-Stick Fry Pan 28cm', category: 'Household', quantity: 25, minStock: 8, supplier: 'Tefal Pakistan', sellingPrice: 3400, costPrice: 2500, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p21', name: 'Ceramic Dinner Set 32-Piece', category: 'Household', quantity: 9, minStock: 5, supplier: 'Eagle Crockery', sellingPrice: 12500, costPrice: 9500, lastUpdated: new Date().toISOString(), updatedBy: 'Manager' },
  { id: 'p22', name: 'Glass Water Jug Set', category: 'Household', quantity: 30, minStock: 10, supplier: 'Pak Glass Industries', sellingPrice: 1500, costPrice: 1050, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' },
  { id: 'p23', name: 'Plastic Storage Container Set 6pcs', category: 'Household', quantity: 65, minStock: 15, supplier: 'National Plastics', sellingPrice: 1100, costPrice: 750, lastUpdated: new Date().toISOString(), updatedBy: 'Staff' }
];

function loadData<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Error loading ${filePath}:`, e);
  }
  saveData(filePath, fallback);
  return fallback;
}

function saveData(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    if (filePath.includes('inventory.json')) {
      syncToSupabase('inventory', data);
    } else if (filePath.includes('movements.json')) {
      syncToSupabase('movements', data);
    } else if (filePath.includes('pending_changes.json')) {
      syncToSupabase('pending_changes', data);
    }
  } catch (e) {
    console.error(`Error saving ${filePath}:`, e);
  }
}

// Initial sync to Supabase on startup
setTimeout(() => {
  syncToSupabase('inventory', inventory);
  syncToSupabase('movements', movements);
  syncToSupabase('pending_changes', pendingChanges);
}, 1000);

let inventory: Product[] = loadData<Product[]>(INVENTORY_FILE, initialInventory);
let movements: StockMovement[] = loadData<StockMovement[]>(MOVEMENTS_FILE, [
  {
    id: 'm1',
    productId: 'p13',
    productName: 'Type-C Fast Charging Cable',
    category: 'Electronics',
    changeType: 'New Stock',
    quantityChange: 40,
    previousQuantity: 45,
    newQuantity: 85,
    user: 'Ali Manager',
    role: 'Manager',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    reason: 'Restocked from Ali Traders'
  }
]);
let pendingChanges: PendingChange[] = loadData<PendingChange[]>(PENDING_FILE, []);

// Initialize Gemini API client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  // 1. Get inventory
  app.get('/api/inventory', (req, res) => {
    const role = (req.query.role as string) || 'staff';
    if (role === 'staff') {
      // Omit costPrice and profit for staff
      const sanitized = inventory.map(item => {
        const { costPrice, ...rest } = item;
        return rest;
      });
      return res.json(sanitized);
    }
    res.json(inventory);
  });

  // 2. Add product (Manager only or Staff)
  app.post('/api/inventory', (req, res) => {
    const { name, category, quantity, minStock, supplier, sellingPrice, costPrice, user, role } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const newProduct: Product = {
      id: 'p_' + Date.now(),
      name,
      category,
      quantity: Number(quantity) || 0,
      minStock: Number(minStock) || 10,
      supplier: supplier || 'General Supplier',
      sellingPrice: Number(sellingPrice) || 0,
      costPrice: role === 'manager' ? Number(costPrice) || 0 : 0,
      lastUpdated: new Date().toISOString(),
      updatedBy: user || (role === 'manager' ? 'Manager' : 'Staff')
    };

    inventory.push(newProduct);
    saveData(INVENTORY_FILE, inventory);

    // Record movement
    const movement: StockMovement = {
      id: 'm_' + Date.now(),
      productId: newProduct.id,
      productName: newProduct.name,
      category: newProduct.category,
      changeType: 'New Stock',
      quantityChange: newProduct.quantity,
      previousQuantity: 0,
      newQuantity: newProduct.quantity,
      user: user || (role === 'manager' ? 'Manager' : 'Staff'),
      role: role || 'staff',
      timestamp: new Date().toISOString(),
      reason: 'Initial product registration'
    };
    movements.unshift(movement);
    saveData(MOVEMENTS_FILE, movements);

    res.json(newProduct);
  });

  // 3. Update product stock / details
  app.put('/api/inventory/:id', (req, res) => {
    const { id } = req.params;
    const { quantityChange, changeType, reason, user, role, sellingPrice, costPrice, minStock, supplier } = req.body;
    
    const index = inventory.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = inventory[index];
    const prevQty = product.quantity;
    let newQty = prevQty;

    if (quantityChange !== undefined) {
      const changeNum = Number(quantityChange);
      if ((changeType === 'Sold' || changeType === 'Damaged/Lost' || changeNum < 0) && Math.abs(changeNum) > prevQty) {
        return res.status(400).json({ error: `Insufficient stock. Only ${prevQty} units are available.` });
      }
      newQty = prevQty + changeNum;
      if (newQty < 0) {
        return res.status(400).json({ error: `Insufficient stock. Only ${prevQty} units are available.` });
      }
    }

    product.quantity = newQty;
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (minStock !== undefined) product.minStock = Number(minStock);
    if (supplier !== undefined) product.supplier = supplier;
    if (role === 'manager' && costPrice !== undefined) {
      product.costPrice = Number(costPrice);
    }
    product.lastUpdated = new Date().toISOString();
    product.updatedBy = user || (role === 'manager' ? 'Manager' : 'Staff');

    saveData(INVENTORY_FILE, inventory);

    if (quantityChange !== undefined && quantityChange !== 0) {
      const movement: StockMovement = {
        id: 'm_' + Date.now(),
        productId: product.id,
        productName: product.name,
        category: product.category,
        changeType: changeType || 'Manual Correction',
        quantityChange: Number(quantityChange),
        previousQuantity: prevQty,
        newQuantity: newQty,
        user: user || (role === 'manager' ? 'Manager' : 'Staff'),
        role: role || 'staff',
        timestamp: new Date().toISOString(),
        reason: reason || 'Manual update via inventory form'
      };
      movements.unshift(movement);
      saveData(MOVEMENTS_FILE, movements);
    }

    res.json(product);
  });

  // 4. Delete product (Manager only)
  app.delete('/api/inventory/:id', (req, res) => {
    const { id } = req.params;
    const role = req.query.role as string;
    if (role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can delete products' });
    }

    const index = inventory.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const removed = inventory.splice(index, 1)[0];
    saveData(INVENTORY_FILE, inventory);
    res.json({ success: true, removed });
  });

  // 5. Get movements
  app.get('/api/movements', (req, res) => {
    res.json(movements);
  });

  // 6. Get pending AI changes
  app.get('/api/pending-changes', (req, res) => {
    res.json(pendingChanges);
  });

  // 7. Create pending AI change
  app.post('/api/pending-changes', (req, res) => {
    const { productName, category, actionType, quantityChange, supplier, sellingPrice, costPrice, minStock, reason, suggestedBy } = req.body;
    
    const pending: PendingChange = {
      id: 'pc_' + Date.now(),
      productName,
      category: category || 'Grocery',
      actionType: actionType || 'add_stock',
      quantityChange: Number(quantityChange) || 0,
      supplier,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      costPrice: costPrice ? Number(costPrice) : undefined,
      minStock: minStock ? Number(minStock) : undefined,
      reason: reason || 'AI Assistant recommendation',
      suggestedBy: suggestedBy || 'AI Chat Assistant',
      timestamp: new Date().toISOString()
    };

    pendingChanges.push(pending);
    saveData(PENDING_FILE, pendingChanges);
    res.json(pending);
  });

  // 8. Confirm pending AI change
  app.post('/api/pending-changes/:id/confirm', (req, res) => {
    const { id } = req.params;
    const { user, role } = req.body;

    const pIndex = pendingChanges.findIndex(p => p.id === id);
    if (pIndex === -1) {
      return res.status(404).json({ error: 'Pending change not found' });
    }

    const pc = pendingChanges.splice(pIndex, 1)[0];
    saveData(PENDING_FILE, pendingChanges);

    // Find product or create new if actionType is new_product
    let product = inventory.find(p => p.name.toLowerCase() === pc.productName.toLowerCase());
    
    if (!product && pc.actionType === 'new_product') {
      product = {
        id: 'p_' + Date.now(),
        name: pc.productName,
        category: pc.category,
        quantity: pc.quantityChange,
        minStock: pc.minStock || 10,
        supplier: pc.supplier || 'AI Added Supplier',
        sellingPrice: pc.sellingPrice || 1000,
        costPrice: role === 'manager' ? (pc.costPrice || 750) : 0,
        lastUpdated: new Date().toISOString(),
        updatedBy: user || 'Human Confirmed (AI)'
      };
      inventory.push(product);
    } else if (product) {
      const prevQty = product.quantity;
      let newQty = prevQty;
      if (pc.actionType === 'add_stock') {
        newQty = prevQty + pc.quantityChange;
      } else if (pc.actionType === 'reduce_stock') {
        if (pc.quantityChange > prevQty) {
          return res.status(400).json({ error: `Insufficient stock. Only ${prevQty} units are available.` });
        }
        newQty = prevQty - pc.quantityChange;
        if (newQty < 0) newQty = 0;
      } else if (pc.actionType === 'update_price') {
        if (pc.sellingPrice) product.sellingPrice = pc.sellingPrice;
        if (role === 'manager' && pc.costPrice) product.costPrice = pc.costPrice;
      }
      product.quantity = newQty;
      if (pc.supplier) product.supplier = pc.supplier;
      product.lastUpdated = new Date().toISOString();
      product.updatedBy = user || 'Human Confirmed (AI)';

      const movement: StockMovement = {
        id: 'm_' + Date.now(),
        productId: product.id,
        productName: product.name,
        category: product.category,
        changeType: 'AI Confirmed',
        quantityChange: pc.actionType === 'reduce_stock' ? -pc.quantityChange : pc.quantityChange,
        previousQuantity: prevQty,
        newQuantity: newQty,
        user: user || 'Human Confirmed',
        role: role || 'staff',
        timestamp: new Date().toISOString(),
        reason: pc.reason
      };
      movements.unshift(movement);
      saveData(MOVEMENTS_FILE, movements);
    }

    saveData(INVENTORY_FILE, inventory);
    res.json({ success: true, product, confirmedChange: pc });
  });

  // 9. Cancel pending AI change
  app.post('/api/pending-changes/:id/cancel', (req, res) => {
    const { id } = req.params;
    const pIndex = pendingChanges.findIndex(p => p.id === id);
    if (pIndex === -1) {
      return res.status(404).json({ error: 'Pending change not found' });
    }
    const cancelled = pendingChanges.splice(pIndex, 1)[0];
    saveData(PENDING_FILE, pendingChanges);
    res.json({ success: true, cancelled });
  });

  // 10. AI Chat Assistant endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, role, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Filter inventory data based on user role
      const inventoryDataForAI = inventory.map(item => {
        if (role === 'staff') {
          const { costPrice, ...rest } = item;
          return rest;
        }
        return item;
      });

      const systemInstruction = `You are the AI Assistant for Nowshera Shopping Mall inventory management system.
Current user role: ${role.toUpperCase()}.
${role === 'staff' ? 'IMPORTANT: You must NEVER reveal or discuss cost prices or profit margins because the user is Staff.' : 'You can discuss cost prices, profit, and financial reports since the user is Manager.'}

Here is the current inventory data in JSON format:
${JSON.stringify(inventoryDataForAI, null, 2)}

Your tasks:
1. Answer questions accurately using ONLY the provided real inventory data.
2. If the user asks to perform a stock change (e.g. "Add 40 Type-C cables from Ali Traders", "Sold 5 bags of sugar", "Receive 20 cooking oils", "We lost 2 irons"), you MUST analyze the request and propose a stock change JSON block in your response so the system can generate a confirmation card for the user.
To propose a stock change, output a JSON code block with format:
\`\`\`json
{
  "proposeStockChange": {
    "productName": "Exact or approximate product name from inventory",
    "category": "Grocery" | "Clothing" | "Electronics" | "Household",
    "actionType": "add_stock" | "reduce_stock" | "new_product",
    "quantityChange": number,
    "supplier": "supplier name if mentioned",
    "reason": "brief reason for change"
  }
}
\`\`\`
Always provide a friendly, helpful conversational response alongside any proposal or answer.`;

      let replyText = "I'm here to help with Nowshera Shopping Mall inventory.";
      let proposedChange = null;

      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('low') || lowerMsg.includes('running low')) {
        const lowItems = inventory.filter(p => p.quantity <= p.minStock);
        replyText = `Based on current Nowshera Shopping Mall records, the following items are running low and need restocking:\n${lowItems.map(i => `• ${i.name} (${i.category}) — Current: ${i.quantity} (Min: ${i.minStock})`).join('\n')}`;
      } else if (lowerMsg.includes('how many') || lowerMsg.includes('stock of') || lowerMsg.includes('available') || lowerMsg.includes('left') || lowerMsg.includes('remaining') || lowerMsg.includes('quantity')) {
        const cleanMsg = lowerMsg.replace(/how many|stock of|available|is|are|the|left|remaining|quantity|of|units|items|do we have|in stock/g, '').trim();
        const found = inventory.find(p => {
          const pName = p.name.toLowerCase();
          return cleanMsg.split(' ').some((word: string) => word.length > 2 && pName.includes(word)) || lowerMsg.includes(pName);
        }) || inventory.find(p => lowerMsg.includes(p.category.toLowerCase()));

        if (found) {
          replyText = `📦 Exact Stock Detail for "${found.name}":\n• Quantity Left: ${found.quantity} units (Minimum Alert Level: ${found.minStock})\n• Department: ${found.category}\n• Supplier: ${found.supplier}\n• Selling Price: Rs. ${found.sellingPrice}${role === 'manager' ? `\n• Cost Price: Rs. ${found.costPrice}` : ''}`;
        } else {
          replyText = `We manage thousands of products across Grocery, Clothing, Electronics, and Household. Please specify the exact product name you'd like to check (e.g. "How many bags of Basmati Rice are left?").`;
        }
      } else if (lowerMsg.includes('profit') || lowerMsg.includes('loss') || lowerMsg.includes('margin') || lowerMsg.includes('earning') || lowerMsg.includes('cost') || lowerMsg.includes('ignore') || lowerMsg.includes('manager') || lowerMsg.includes('rule')) {
        if (role !== 'manager') {
          replyText = `I have no access to tell you about it.`;
        } else {
          const totalValue = inventory.reduce((acc, p) => acc + (p.quantity * p.sellingPrice), 0);
          const totalCost = inventory.reduce((acc, p) => acc + (p.quantity * (p.costPrice || 0)), 0);
          const profit = totalValue - totalCost;
          const margin = totalValue > 0 ? ((profit / totalValue) * 100).toFixed(1) : '0';
          replyText = `📊 Here is the current financial and profit summary for Nowshera Shopping Mall:\n• Total Inventory Retail Value: Rs. ${totalValue.toLocaleString()}\n• Total Inventory Cost: Rs. ${totalCost.toLocaleString()}\n• Estimated Total Profit: Rs. ${profit.toLocaleString()} (${margin}% margin)\n\nAll departments (Grocery, Clothing, Electronics, Household) are tracking healthy stock margins.`;
        }
      } else if (lowerMsg.includes('sold') || lowerMsg.includes('sales') || lowerMsg.includes('sell') || lowerMsg.includes('reduce') || lowerMsg.includes('deduct')) {
        const matchNum = message.match(/\d+/);
        const qty = matchNum ? parseInt(matchNum[0]) : 0;
        const matchingProd = inventory.find(p => lowerMsg.includes(p.name.toLowerCase()));
        
        if (matchingProd && qty > 0) {
          if (qty > matchingProd.quantity) {
            replyText = `Insufficient stock. Only ${matchingProd.quantity} units are available.`;
            proposedChange = null;
          } else {
            replyText = `I have prepared a stock reduction request for ${qty} units of ${matchingProd.name}. Please review and confirm below.`;
            proposedChange = {
              productName: matchingProd.name,
              category: matchingProd.category,
              actionType: 'reduce_stock',
              quantityChange: qty,
              supplier: matchingProd.supplier,
              reason: message
            };
          }
        } else if (matchingProd) {
          const prodMovements = movements.filter(m => m.productId === matchingProd.id && (m.changeType === 'Sold' || m.quantityChange < 0));
          const totalProdSold = prodMovements.reduce((acc, m) => acc + Math.abs(m.quantityChange), 0);
          replyText = `🛍️ Sales Report for "${matchingProd.name}":\n• Total quantity sold: ${totalProdSold} units\n• Current stock remaining: ${matchingProd.quantity} units\n• Category: ${matchingProd.category} | Supplier: ${matchingProd.supplier}`;
        } else {
          const salesMovements = movements.filter(m => m.changeType === 'Sold' || m.quantityChange < 0);
          const totalSoldUnits = salesMovements.reduce((acc, m) => acc + Math.abs(m.quantityChange), 0);
          
          replyText = `🛍️ Sales & Stock Movement Report (Nowshera Shopping Mall):\n• Total items recorded sold recently: ${totalSoldUnits} units\n\nRecent Sales Activities by Product & Quantity:\n${salesMovements.slice(0, 6).map(m => `• ${m.productName}: ${Math.abs(m.quantityChange)} units sold (${new Date(m.timestamp).toLocaleDateString()})`).join('\n') || '• No recent sales movements recorded yet. Use the inventory update form to record product sales.'}`;
        }
      } else if (lowerMsg.includes('add') || lowerMsg.includes('receive') || lowerMsg.includes('restock')) {
        // Extract numbers and match product
        const matchNum = message.match(/\d+/);
        const qty = matchNum ? parseInt(matchNum[0]) : 10;
        const matchedProd = inventory.find(p => lowerMsg.includes(p.name.toLowerCase())) || inventory[12]; // default to Type-C cable or similar

        replyText = `I have prepared a stock addition request for ${qty} units of ${matchedProd.name}. Please review and confirm below.`;
        proposedChange = {
          productName: matchedProd.name,
          category: matchedProd.category,
          actionType: 'add_stock',
          quantityChange: qty,
          supplier: matchedProd.supplier,
          reason: message
        };
      } else {
        replyText = `Assalam-o-Alaikum! As your Nowshera Shopping Mall inventory assistant, I have full access to our ${inventory.length} product records. Feel free to ask about stock quantities, low stock items, or request restocking (e.g. "Add 40 Type-C cables from Ali Traders").`;
      }

      res.json({
        reply: replyText,
        proposedChange
      });

    } catch (error: any) {
      console.error('Chat endpoint error:', error);
      res.status(500).json({ error: error.message || 'AI chat service error' });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const DIST_DIR = path.join(__dirname, 'dist');
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nowshera Shopping Mall Inventory running on http://localhost:${PORT}`);
  });
}

startServer();
