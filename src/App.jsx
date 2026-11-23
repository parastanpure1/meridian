import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  addOrder,
  getAllOrders,
  updateOrder,
  deleteOrder
} from './db';

const products = [
  { id: 1, name: 'Vanilla Dream', category: 'Classic', price: 80, image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600', description: 'Classic creamy vanilla ice cream' },
  { id: 2, name: 'Chocolate Bliss', category: 'Chocolate', price: 120, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600', description: 'Rich and delicious chocolate' },
  { id: 3, name: 'Strawberry Love', category: 'Fruit', price: 100, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600', description: 'Fresh strawberry flavour' },
  { id: 4, name: 'Mango Magic', category: 'Fruit', price: 110, image: 'https://images.unsplash.com/photo-1501446529957-6226bd447c46?w=600', description: 'Sweet mango ice cream' },
  { id: 5, name: 'Oreo Crunch', category: 'Chocolate', price: 140, image: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?w=600', description: 'Chocolate with crunchy cookies' },
  { id: 6, name: 'Butterscotch', category: 'Classic', price: 90, image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600', description: 'Creamy butterscotch flavour' },
  { id: 7, name: 'Pista Special', category: 'Classic', price: 130, image: 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=600', description: 'Premium pista ice cream' },
  { id: 8, name: 'Black Currant', category: 'Fruit', price: 120, image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600', description: 'Refreshing black currant flavour' },
];

const categories = ['All', 'Classic', 'Chocolate', 'Fruit'];
const statuses = ['Pending', 'Preparing', 'Completed', 'Cancelled'];

const money = (value) =>
  `₹${Number(value || 0).toFixed(2)}`;

// OFFERS: only one offer applies per order - the one that saves the most.
const calculateBestOffer = (items = []) => {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
  const itemCount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const candidates = [];
  if (itemCount >= 2) candidates.push({ name: 'Couple Special', discount: Math.min(30, subtotal) });
  if (itemCount >= 4) candidates.push({ name: 'Friends Treat', discount: subtotal * 0.10 });
  if (itemCount >= 10) candidates.push({ name: 'Birthday Party', discount: subtotal * 0.15 });
  if (subtotal >= 2000) candidates.push({ name: 'Party Order', discount: subtotal * 0.20 });
  if (itemCount >= 20) candidates.push({ name: 'Mega Party', discount: subtotal * 0.25 });

  const best = candidates.sort((a, b) => b.discount - a.discount)[0];
  const discount = best ? Math.min(subtotal, best.discount) : 0;

  return {
    subtotal,
    discount: Number(discount.toFixed(2)),
    total: Number((subtotal - discount).toFixed(2)),
    offerName: best ? best.name : 'No offer applied'
  };
};

const offerCards = [
  { icon: '❤️', name: 'Couple Special', condition: 'Buy 2 or more ice creams', reward: '₹30 OFF' },
  { icon: '👫', name: 'Friends Treat', condition: 'Buy 4 or more ice creams', reward: '10% OFF' },
  { icon: '🎂', name: 'Birthday Party', condition: 'Buy 10 or more ice creams', reward: '15% OFF' },
  { icon: '🎉', name: 'Party Order', condition: 'Order worth ₹2,000 or more', reward: '20% OFF' },
  { icon: '🏆', name: 'Mega Party', condition: 'Buy 20 or more ice creams', reward: '25% OFF' }
];

export default function App() {
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('shop');
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const filteredProducts =
    category === 'All'
      ? products
      : products.filter(p => p.category === category);

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const offerCalculation = useMemo(
    () => calculateBestOffer(cart),
    [cart]
  );
  const subtotal = offerCalculation.subtotal;
  const discount = offerCalculation.discount;
  const total = offerCalculation.total;
  const appliedOffer = offerCalculation.offerName;

  const upiId = 'PREM_ARGDE';
  const upiName = 'Meridian Ice Cream';

  const upiLink =
    `upi://pay?pa=${encodeURIComponent(upiId)}` +
    `&pn=${encodeURIComponent(upiName)}` +
    `&am=${total.toFixed(2)}&cu=INR`;

  // READ: Get all orders from IndexedDB
  const refreshOrders = async () => {
    try {
      const records = await getAllOrders();

      records.sort(
        (a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
      );

      setOrders(records);
    } catch (error) {
      setNotice(`Database error: ${error.message}`);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(''), 4500);

    return () => clearTimeout(timer);
  }, [notice]);

  // ADD TO CART
  const addToCart = (product) => {
    setCart(prev => {
      const found = prev.find(
        item => item.id === product.id
      );

      if (found) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // DECREASE QUANTITY
  const decreaseQuantity = (id) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  // REMOVE FROM CART
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // PLACE ORDER
  const placeOrder = () => {
    if (!cart.length) {
      return setNotice('Please add products to your cart first.');
    }

    if (
      !customer.name.trim() ||
      !/^[0-9]{10}$/.test(customer.phone.trim())
    ) {
      return setNotice(
        'Enter customer name and valid 10-digit phone number.'
      );
    }

    setPaymentMethod('');
    setPaymentSuccess(false);
    setShowPayment(true);
  };

  // CREATE: Save order in IndexedDB
  const confirmOrder = async (
    method,
    paymentStatus = 'Pending'
  ) => {
    const order = {
      id: `MID-${Date.now()}`,

      customer: { ...customer },

      items: cart.map(item => ({ ...item })),

      subtotal,
      discount,
      offerName: appliedOffer,
      total,

      paymentMethod: method,

      paymentStatus,

      status: 'Pending',

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString()
    };

    setLoading(true);

    try {
      await addOrder(order);

      await refreshOrders();

      setPaymentSuccess(true);

      setNotice(
        `Order ${order.id} saved successfully!`
      );
    } catch (error) {
      setNotice(
        `Could not save order: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // FINISH ORDER
  const finishOrder = () => {
    setCart([]);

    setCustomer({
      name: '',
      phone: '',
      address: ''
    });

    setPaymentMethod('');
    setShowPayment(false);
    setPaymentSuccess(false);
  };

  // UPDATE ORDER
  const saveEdit = async (event) => {
    event.preventDefault();

    if (!editingOrder) return;

    const nextOffer = calculateBestOffer(editingOrder.items);

    const updated = {
      ...editingOrder,
      subtotal: nextOffer.subtotal,
      discount: nextOffer.discount,
      offerName: nextOffer.offerName,
      total: nextOffer.total,
      updatedAt: new Date().toISOString()
    };

    try {
      await updateOrder(updated);

      setEditingOrder(null);

      await refreshOrders();

      setNotice('Order updated successfully.');
    } catch (error) {
      setNotice(`Update failed: ${error.message}`);
    }
  };

  // UPDATE STATUS
  const changeStatus = async (order, status) => {
    try {
      await updateOrder({
        ...order,
        status,
        updatedAt: new Date().toISOString()
      });

      await refreshOrders();

      setNotice(`Order status changed to ${status}.`);
    } catch (error) {
      setNotice(`Status update failed: ${error.message}`);
    }
  };

  // DELETE ORDER
  const removeOrder = async (id) => {
    if (
      !window.confirm(
        `Delete order ${id}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteOrder(id);

      await refreshOrders();

      setNotice('Order deleted successfully.');
    } catch (error) {
      setNotice(`Delete failed: ${error.message}`);
    }
  };

  // DASHBOARD STATISTICS
  const stats = useMemo(() => ({
    count: orders.length,

    pending: orders.filter(
      o => o.status === 'Pending'
    ).length,

    revenue: orders
      .filter(o => o.status !== 'Cancelled')
      .reduce(
        (sum, o) => sum + Number(o.total || 0),
        0
      )
  }), [orders]);

  return (
    <div className="app">

      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')}>×</button>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="navbar">

        <a className="logo" href="#home">
          🍦 Meridian<span>Ice Cream</span>
        </a>

        <div className="nav-links">

          <button
            className={view === 'shop' ? 'nav-active' : ''}
            onClick={() => setView('shop')}
          >
            Shop
          </button>

          <button
            className={view === 'admin' ? 'nav-active' : ''}
            onClick={() => {
              setView('admin');
              refreshOrders();
            }}
          >
            Admin Orders ({orders.length})
          </button>

          {view === 'shop' && (
            <a href="#cart">Cart ({totalItems})</a>
          )}

        </div>
      </nav>

      {/* SHOP PAGE */}
      {view === 'shop' ? (

        <>

          <section className="hero" id="home">

            <div className="hero-content">

              <p className="hero-tag">
                WELCOME TO MERIDIAN
              </p>

              <h1>
                Happiness Comes<br />
                In Every <span>Scoop!</span>
              </h1>

              <p className="hero-description">
                Taste the happiness with our delicious
                and creamy ice creams.
                Made with love, served with smiles.
              </p>

              <a href="#menu" className="hero-btn">
                Explore Menu →
              </a>

            </div>
          </section>

          {/* SPECIAL OFFERS */}
          <section className="offers-section" id="offers">
            <div className="section-heading">
              <p>DEALS MADE SWEETER</p>
              <h2>Special Offers 🎁</h2>
              <span>Best eligible offer is applied automatically.</span>
            </div>

            <div className="offers-grid">
              {offerCards.map(offer => (
                <article className="offer-card" key={offer.name}>
                  <div className="offer-icon">{offer.icon}</div>
                  <span className="offer-badge">{offer.reward}</span>
                  <h3>{offer.name}</h3>
                  <p>{offer.condition}</p>
                  <small>
                    {appliedOffer === offer.name && cart.length
                      ? '✓ Applied to your cart'
                      : 'Auto-applied when eligible'}
                  </small>
                  <a href="#menu" className="offer-order-btn">Order Now</a>
                </article>
              ))}
            </div>

            <p className="offers-note">
              Only one offer per order. We apply the one that saves you the most.
            </p>
          </section>

          {/* PRODUCTS */}
          <section className="menu-section" id="menu">

            <div className="section-heading">
              <p>OUR SPECIAL COLLECTION</p>
              <h2>Explore Our Menu</h2>
              <span>Choose your favourite flavour</span>
            </div>

            <div className="category-buttons">

              {categories.map(item => (
                <button
                  key={item}
                  className={
                    category === item ? 'active' : ''
                  }
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}

            </div>

            <div className="product-grid">

              {filteredProducts.map(product => (

                <div className="product-card" key={product.id}>

                  <div className="product-image">
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  </div>

                  <div className="product-info">

                    <span className="product-category">
                      {product.category}
                    </span>

                    <h3>{product.name}</h3>

                    <p>{product.description}</p>

                    <div className="product-bottom">

                      <strong>₹{product.price}</strong>

                      {cart.some(
                        i => i.id === product.id
                      ) ? (

                        <div className="quantity-control">

                          <button
                            onClick={() =>
                              decreaseQuantity(product.id)
                            }
                          >
                            −
                          </button>

                          <span>
                            {cart.find(
                              i => i.id === product.id
                            )?.quantity || 0}
                          </span>

                          <button
                            onClick={() => addToCart(product)}
                          >
                            +
                          </button>

                        </div>

                      ) : (

                        <button
                          onClick={() => addToCart(product)}
                        >
                          + Add
                        </button>

                      )}

                    </div>
                  </div>
                </div>

              ))}

            </div>
          </section>

          {/* CART */}
          <section className="cart-section" id="cart">

            <div className="section-heading">
              <p>YOUR ORDER</p>
              <h2>Shopping Cart 🛒</h2>
            </div>

            <div className="cart-box">

              {cart.length === 0 ? (

                <div className="empty-cart">
                  <h3>🛒 Your Cart is Empty</h3>
                  <p>
                    Add your favourite ice cream to continue.
                  </p>
                </div>

              ) : (

                <>

                  {cart.map(item => (

                    <div className="cart-item" key={item.id}>

                      <img src={item.image} alt={item.name} />

                      <div className="cart-item-info">
                        <h3>{item.name}</h3>
                        <p>
                          ₹{item.price} × {item.quantity}
                        </p>
                      </div>

                      <div className="quantity-control">

                        <button
                          onClick={() =>
                            decreaseQuantity(item.id)
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          onClick={() => addToCart(item)}
                        >
                          +
                        </button>

                      </div>

                      <strong>
                        {money(item.price * item.quantity)}
                      </strong>

                      <button
                        className="text-danger"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>

                    </div>

                  ))}

                  {/* CUSTOMER DETAILS */}
                  <div className="customer-form">

                    <h3>Customer Details</h3>

                    <div className="form-grid">

                      <label>
                        Full Name

                        <input
                          value={customer.name}
                          onChange={e =>
                            setCustomer({
                              ...customer,
                              name: e.target.value
                            })
                          }
                          placeholder="Enter your name"
                        />
                      </label>

                      <label>
                        Mobile Number

                        <input
                          value={customer.phone}
                          maxLength="10"
                          onChange={e =>
                            setCustomer({
                              ...customer,
                              phone: e.target.value.replace(/\D/g, '')
                            })
                          }
                          placeholder="10-digit mobile number"
                        />
                      </label>

                      <label className="full-width">
                        Address (optional)

                        <textarea
                          value={customer.address}
                          onChange={e =>
                            setCustomer({
                              ...customer,
                              address: e.target.value
                            })
                          }
                          placeholder="Delivery address or counter pickup"
                        />
                      </label>

                    </div>
                  </div>

                  <div className="offer-summary">
                    <div>
                      <span>Subtotal</span>
                      <strong>{money(subtotal)}</strong>
                    </div>
                    <div className="offer-summary-discount">
                      <span>Offer ({appliedOffer})</span>
                      <strong>− {money(discount)}</strong>
                    </div>
                  </div>

                  <div className="cart-total">
                    <span>Total Amount</span>
                    <h2>{money(total)}</h2>
                  </div>

                  <button
                    className="order-btn"
                    onClick={placeOrder}
                  >
                    Proceed to Payment →
                  </button>

                </>
              )}

            </div>
          </section>

          {/* MENU QR */}
          <section className="qr-section">

            <div className="qr-content">

              <h2>Scan & Explore Our Menu</h2>

              <p>
                Scan this QR code to open the
                Meridian Ice Cream digital menu.
              </p>

              <div className="qr-code">
                <QRCodeSVG
                  value={window.location.href.split('#')[0]}
                  size={180}
                  level="H"
                />
              </div>

              <small>Meridian Ice Cream Digital Menu</small>

            </div>
          </section>

        </>

      ) : (

        /* ADMIN DASHBOARD */
        <section className="admin-section">

          <div className="admin-heading">

            <div>
              <p className="eyebrow">
                MERIDIAN MANAGEMENT
              </p>

              <h1>Orders Dashboard</h1>

              <span>
                Orders saved in this browser's IndexedDB
              </span>
            </div>

            <button
              className="refresh-btn"
              onClick={refreshOrders}
            >
              ↻ Refresh
            </button>

          </div>

          {/* STATISTICS */}
          <div className="stats-grid">

            <div className="stat-card">
              <span>Total Orders</span>
              <strong>{stats.count}</strong>
            </div>

            <div className="stat-card">
              <span>Pending Orders</span>
              <strong>{stats.pending}</strong>
            </div>

            <div className="stat-card">
              <span>Sales (excluding cancelled)</span>
              <strong>{money(stats.revenue)}</strong>
            </div>

          </div>

          {/* ORDERS TABLE */}
          <div className="orders-panel">

            <div className="orders-title">
              <h2>All Customer Orders</h2>
              <span>{orders.length} records</span>
            </div>

            {orders.length === 0 ? (

              <div className="empty-cart">
                <h3>No orders yet</h3>
                <p>
                  Orders placed from the shop will appear here.
                </p>
              </div>

            ) : (

              <div className="table-wrap">

                <table>

                  <thead>
                    <tr>
                      <th>Order ID / Date</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>CRUD Actions</th>
                    </tr>
                  </thead>

                  <tbody>

                    {orders.map(order => (

                      <tr key={order.id}>

                        <td>
                          <strong>{order.id}</strong>
                          <small>
                            {new Date(
                              order.createdAt
                            ).toLocaleString()}
                          </small>
                        </td>

                        <td>
                          {order.customer?.name}
                          <small>{order.customer?.phone}</small>
                          <small>{order.customer?.address}</small>
                        </td>

                        <td>
                          {order.items?.map(item => (
                            <div key={item.id}>
                              {item.name} × {item.quantity}
                            </div>
                          ))}
                        </td>

                        <td>
                          <strong>{money(order.total)}</strong>
                          {order.discount > 0 && (
                            <small>
                              {order.offerName}: −{money(order.discount)}
                            </small>
                          )}
                        </td>

                        <td>
                          {order.paymentMethod}
                          <small>{order.paymentStatus}</small>
                        </td>

                        <td>

                          <select
                            className={`status-select status-${order.status.toLowerCase()}`}
                            value={order.status}
                            onChange={e =>
                              changeStatus(
                                order,
                                e.target.value
                              )
                            }
                          >

                            {statuses.map(status => (
                              <option key={status}>
                                {status}
                              </option>
                            ))}

                          </select>

                        </td>

                        <td>

                          <div className="action-buttons">

                            <button
                              className="edit-btn"
                              onClick={() =>
                                setEditingOrder(
                                  JSON.parse(JSON.stringify(order))
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() =>
                                removeOrder(order.id)
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>

      )}

      {/* FOOTER */}
      <footer className="footer">

        <h2>🍦 Meridian Ice Cream</h2>

        <p>Making every moment sweeter!</p>

        <small>
          © 2026 Meridian Ice Cream. All Rights Reserved.
        </small>

      </footer>

      {/* PAYMENT POPUP */}
      {showPayment && (

        <div className="payment-overlay">

          <div className="payment-box">

            {paymentSuccess ? (

              <div className="success-screen">

                <div className="success-icon">✓</div>

                <h2>Order Saved Successfully!</h2>

                <p>
                  Your order has been stored in IndexedDB
                  and is visible in Admin Orders.
                </p>

                <div className="success-details">

                  <span>Payment Method</span>
                  <strong>{paymentMethod.toUpperCase()}</strong>

                  <span>Order Status</span>
                  <strong>Pending</strong>

                  <span>Offer Applied</span>
                  <strong>{appliedOffer}</strong>

                  <span>Discount Saved</span>
                  <strong>{money(discount)}</strong>

                  <span>Total Amount</span>
                  <strong>{money(total)}</strong>

                </div>

                <button onClick={finishOrder}>
                  Continue Shopping
                </button>

              </div>

            ) : (

              <>

                <button
                  className="close-payment"
                  onClick={() => setShowPayment(false)}
                >
                  ×
                </button>

                <h2>Choose Payment Method</h2>

                <p className="payment-subtitle">
                  Select your preferred payment option.
                </p>

                <div className="payment-total">
                  <span>Total Amount</span>
                  <h2>{money(total)}</h2>
                </div>

                <div className="payment-options">

                  {[
                    ['upi', '📱', 'UPI Payment', 'Google Pay, PhonePe, Paytm'],
                    ['card', '💳', 'Credit / Debit Card', 'Demo only - no gateway connected'],
                    ['cash', '💵', 'Cash Payment', 'Pay at the counter']
                  ].map(([value, icon, title, subtitle]) => (

                    <button
                      key={value}
                      className={`payment-option ${
                        paymentMethod === value ? 'selected' : ''
                      }`}
                      onClick={() => setPaymentMethod(value)}
                    >

                      <span className="payment-icon">
                        {icon}
                      </span>

                      <span className="payment-text">
                        <strong>{title}</strong>
                        <small>{subtitle}</small>
                      </span>

                      <span className="radio-circle">
                        {paymentMethod === value ? '✓' : ''}
                      </span>

                    </button>

                  ))}

                </div>

                {paymentMethod === 'upi' && (

                  <div className="payment-detail upi-payment-detail">

                    <div className="upi-qr-heading">
                      Scan & Pay with UPI
                    </div>

                    <div className="upi-qr">
                      <QRCodeSVG
                        value={upiLink}
                        size={180}
                        level="H"
                        includeMargin
                      />
                    </div>

                    <strong className="upi-amount">
                      Pay {money(total)}
                    </strong>

                    <p>UPI ID: {upiId}</p>
                    <p>Name: {upiName}</p>

                    <a
                      className="open-upi-btn"
                      href={upiLink}
                    >
                      Open UPI App →
                    </a>

                    <p className="upi-warning">
                      UPI payment is not verified automatically.
                      Admin should verify payment separately.
                    </p>

                  </div>

                )}

                {paymentMethod === 'card' && (

                  <div className="payment-detail">
                    Card gateway is not connected.
                    This demo saves the order as payment pending.
                  </div>

                )}

                {paymentMethod === 'cash' && (

                  <div className="payment-detail">
                    Pay at the Meridian Ice Cream counter.
                    The order will be saved as cash payment.
                  </div>

                )}

                <button
                  className="confirm-payment"
                  disabled={!paymentMethod || loading}
                  onClick={() =>
                    confirmOrder(
                      paymentMethod,
                      paymentMethod === 'cash'
                        ? 'Pay at counter'
                        : 'Pending verification'
                    )
                  }
                >

                  {loading
                    ? 'Saving Order…'
                    : paymentMethod === 'upi'
                    ? 'I Have Paid – Save Order'
                    : paymentMethod === 'card'
                    ? 'Save Demo Order'
                    : 'Confirm Cash Order'}

                </button>

                <p className="demo-note">
                  Card/UPI gateway verification is not integrated.
                  This app saves the order record; it does not
                  confirm a bank payment.
                </p>

              </>

            )}

          </div>

        </div>

      )}

      {/* EDIT ORDER POPUP */}
      {editingOrder && (

        <div className="payment-overlay">

          <form
            className="payment-box edit-form"
            onSubmit={saveEdit}
          >

            <button
              type="button"
              className="close-payment"
              onClick={() => setEditingOrder(null)}
            >
              ×
            </button>

            <h2>Edit Order</h2>

            <p className="payment-subtitle">
              Update customer details and item quantities.
            </p>

            <label>
              Customer Name

              <input
                required
                value={editingOrder.customer.name}
                onChange={e =>
                  setEditingOrder({
                    ...editingOrder,
                    customer: {
                      ...editingOrder.customer,
                      name: e.target.value
                    }
                  })
                }
              />
            </label>

            <label>
              Phone

              <input
                required
                maxLength="10"
                value={editingOrder.customer.phone}
                onChange={e =>
                  setEditingOrder({
                    ...editingOrder,
                    customer: {
                      ...editingOrder.customer,
                      phone: e.target.value
                    }
                  })
                }
              />
            </label>

            <label>
              Address

              <textarea
                value={editingOrder.customer.address || ''}
                onChange={e =>
                  setEditingOrder({
                    ...editingOrder,
                    customer: {
                      ...editingOrder.customer,
                      address: e.target.value
                    }
                  })
                }
              />
            </label>

            <h3>Order Items</h3>

            {editingOrder.items.map(item => (

              <div className="edit-item" key={item.id}>

                <span>
                  {item.name} ({money(item.price)})
                </span>

                <input
                  aria-label={`${item.name} quantity`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e =>
                    setEditingOrder({
                      ...editingOrder,
                      items: editingOrder.items.map(i =>
                        i.id === item.id
                          ? {
                              ...i,
                              quantity: Math.max(
                                1,
                                Number(e.target.value)
                              )
                            }
                          : i
                      )
                    })
                  }
                />

              </div>

            ))}

            <div className="cart-total">
              <span>Updated Total ({calculateBestOffer(editingOrder.items).offerName})</span>

              <h2>{money(calculateBestOffer(editingOrder.items).total)}</h2>
            </div>

            <button
              className="confirm-payment"
              type="submit"
            >
              Save Changes (UPDATE)
            </button>

          </form>

        </div>

      )}

    </div>
  );
}