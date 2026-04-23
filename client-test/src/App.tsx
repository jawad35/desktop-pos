import React, { useState, useEffect } from 'react';
import ProductsList from './components/ProductsList';
import Cart from './components/Cart';
import ProductManager from './components/ProductManager';
import { Product, CartItem } from './types';
import './App.css';

// Helper to check if running in Electron
const isElectron = () => {
  return window && window.electronAPI !== undefined;
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'connected' | 'offline'>('connected');
  const [showProductManager, setShowProductManager] = useState(false);

  // Fetch products on load
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      if (isElectron()) {
        const result = await window.electronAPI.getProducts();
        if (result.success) {
          setProducts(result.data);
          setServerStatus('connected');
        } else {
          setError(result.error);
          setServerStatus('offline');
        }
      } else {
        const response = await fetch('http://localhost:3001/api/products');
        const result = await response.json();
        
        if (result.success) {
          setProducts(result.data);
          setServerStatus('connected');
        } else {
          setError(result.error);
          setServerStatus('offline');
        }
      }
    } catch (err) {
      setError('Failed to fetch products');
      setServerStatus('offline');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert('Out of stock!');
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const checkout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const orderData = {
        items: cart.map(({ id, quantity, price }) => ({ id, quantity, price })),
        total
      };
      
      let result;
      
      if (isElectron()) {
        result = await window.electronAPI.createOrder(orderData);
      } else {
        const response = await fetch('http://localhost:3001/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        result = await response.json();
      }
      
      if (result.success) {
        alert(`Order created successfully! Order #: ${result.data.order_number}`);
        setCart([]);
        fetchProducts();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      alert('Failed to create order');
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Brainsees POS</h1>
        <div className="header-controls">
          <button 
            className="btn-manage-products"
            onClick={() => setShowProductManager(true)}
          >
            📦 Manage Products
          </button>
          <div className="status">
            <span className={`status-dot ${serverStatus === 'connected' ? 'connected' : 'offline'}`}></span>
            {serverStatus === 'connected' ? 'Connected' : 'Offline Mode'}
          </div>
        </div>
      </header>
      
      <div className="app-content">
        <ProductsList products={products} onAddToCart={addToCart} />
        <Cart 
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={checkout}
        />
      </div>

      {showProductManager && (
        <ProductManager onClose={() => {
          setShowProductManager(false);
          fetchProducts();
        }} />
      )}
    </div>
  );
}

export default App;