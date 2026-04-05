import React from 'react';
import { CartItem } from '../types';
import './Cart.css';

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({ cart, onUpdateQuantity, onRemove, onCheckout }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="cart">
      <h2>Shopping Cart</h2>
      {cart.length === 0 ? (
        <p className="empty-cart">Cart is empty</p>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p>${item.price.toFixed(2)}</p>
                </div>
                <div className="item-controls">
                  <input
                    type="number"
                    min="1"
                    max={item.quantity}
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="quantity-input"
                  />
                  <button onClick={() => onRemove(item.id)} className="remove-button">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-total">
            <strong>Total: ${total.toFixed(2)}</strong>
            <button onClick={onCheckout} className="checkout-button">
              Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;