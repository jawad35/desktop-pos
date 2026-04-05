import React from 'react';
import { Product } from '../types';
import './ProductsList.css';

interface ProductsListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const ProductsList: React.FC<ProductsListProps> = ({ products, onAddToCart }) => {
  return (
    <div className="products-list">
      <h2>Products</h2>
      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-info">
              <h3>{product.name}</h3>
              <p className="category">{product.category}</p>
              <p className="price">${product.price.toFixed(2)}</p>
              <p className="stock">Stock: {product.quantity}</p>
            </div>
            <button 
              onClick={() => onAddToCart(product)}
              disabled={product.quantity === 0}
              className="add-button"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductsList;