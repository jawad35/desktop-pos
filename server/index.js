import express from 'express';
import cors from 'cors';
import db from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API 1: Get all products
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 2: Create new order
app.post('/api/orders', (req, res) => {
  const { items, total } = req.body;
  
  if (!items || !items.length) {
    return res.status(400).json({ success: false, error: 'No items in order' });
  }

  try {
    // Start transaction
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, total) 
      VALUES (?, ?)
    `);
    
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `);
    
    const updateProductStock = db.prepare(`
      UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND quantity >= ?
    `);

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;
    
    // Insert order
    const orderResult = insertOrder.run(orderNumber, total);
    const orderId = orderResult.lastInsertRowid;
    
    // Insert order items and update stock
    for (const item of items) {
      insertOrderItem.run(orderId, item.id, item.quantity, item.price);
      
      // Update product stock
      const updateResult = updateProductStock.run(item.quantity, item.id, item.quantity);
      
      if (updateResult.changes === 0) {
        throw new Error(`Insufficient stock for product ID: ${item.id}`);
      }
    }
    
    // Get the created order
    const order = db.prepare(`
      SELECT o.*, 
        json_group_array(
          json_object('id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price)
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `).get(orderId);
    
    res.json({ success: true, data: order });
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Additional utility API: Get order by ID
app.get('/api/orders/:id', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, 
        json_group_array(
          json_object('id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price)
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `).get(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`- GET  /api/products - Get all products`);
  console.log(`- POST /api/orders   - Create new order`);
});