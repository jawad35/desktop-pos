import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import './ProductManager.css';

interface ProductManagerProps {
  onClose: () => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ onClose }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const result = await window.electronAPI.getProducts();
    if (result.success) {
      setProducts(result.data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity)
    };

    if (editingProduct) {
      // Update
      const result = await window.electronAPI.updateProduct(editingProduct.id, productData);
      if (result.success) {
        await loadProducts();
        resetForm();
      } else {
        setError(result.error);
      }
    } else {
      // Create
      const result = await window.electronAPI.createProduct(productData);
      if (result.success) {
        await loadProducts();
        resetForm();
      } else {
        setError(result.error);
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity.toString()
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const result = await window.electronAPI.deleteProduct(id);
      if (result.success) {
        await loadProducts();
      } else {
        alert('Error: ' + result.error);
      }
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', price: '', quantity: '' });
    setError('');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="product-manager-overlay">
      <div className="product-manager-modal">
        <div className="modal-header">
          <h2>Product Management</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="product-form-section">
            <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Update' : 'Add'} Product
                </button>
                {editingProduct && (
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="products-list-section">
            <h3>Products ({products.length})</h3>
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>{product.name}</td>
                      <td>${product.price.toFixed(2)}</td>
                      <td className={product.quantity < 10 ? 'low-stock' : ''}>
                        {product.quantity}
                      </td>
                      <td>
                        <button 
                          className="btn-edit"
                          onClick={() => handleEdit(product)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(product.id)}
                          disabled={product.quantity < 0}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManager;