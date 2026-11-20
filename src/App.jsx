import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

const products = [
  { id: 1, name: "Vanilla Ice Cream", price: 80, emoji: "🍦", category: "Classic" },
  { id: 2, name: "Chocolate Ice Cream", price: 100, emoji: "🍫", category: "Classic" },
  { id: 3, name: "Strawberry Ice Cream", price: 90, emoji: "🍓", category: "Classic" },
  { id: 4, name: "Mango Ice Cream", price: 120, emoji: "🥭", category: "Special" },
  { id: 5, name: "Chocolate Sundae", price: 150, emoji: "🍨", category: "Special" },
  { id: 6, name: "Oreo Ice Cream", price: 130, emoji: "🍪", category: "Special" },
  { id: 7, name: "Cold Coffee", price: 100, emoji: "🥤", category: "Drinks" },
  { id: 8, name: "Milkshake", price: 120, emoji: "🥛", category: "Drinks" }
];

function App() {
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("All");

  const menuURL = window.location.origin;

  const categories = ["All", "Classic", "Special", "Drinks"];

  const filteredProducts =
    category === "All"
      ? products
      : products.filter(item => item.category === category);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);

      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const placeOrder = () => {
    if (cart.length === 0) {
      alert("Please add products first!");
      return;
    }

    alert("Order Placed Successfully! Total: ₹" + total);
    setCart([]);
  };

  return (
    <div className="app">

      {/* Header */}

      <header>
        <h1>🍦 MERIDIAN ICE CREAM</h1>
        <p>Happiness Comes in Every Scoop!</p>
      </header>

      {/* Hero */}

      <section className="hero">
        <h2>Welcome to Meridian</h2>
        <p>Discover Your Favourite Ice Cream</p>
        <button onClick={() =>
          document.getElementById("menu").scrollIntoView()
        }>
          Explore Menu
        </button>
      </section>

      {/* QR Code */}

      <section className="qr-section">
        <h2>Scan & Order</h2>

        <QRCodeSVG
          value={menuURL}
          size={180}
          level="H"
        />

        <p>Scan QR Code to Open Menu</p>
      </section>

      {/* Menu */}

      <section id="menu">

        <h2 className="section-title">Our Delicious Menu 🍨</h2>

        <div className="categories">
          {categories.map(cat => (
            <button
              key={cat}
              className={category === cat ? "active" : ""}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="products">

          {filteredProducts.map(product => (

            <div className="product-card" key={product.id}>

              <div className="product-image">
                {product.emoji}
              </div>

              <h3>{product.name}</h3>

              <p>{product.category}</p>

              <h3 className="price">₹{product.price}</h3>

              <button onClick={() => addToCart(product)}>
                + Add to Cart
              </button>

            </div>

          ))}

        </div>

      </section>

      {/* Cart */}

      <section className="cart-section">

        <h2>🛒 Your Cart</h2>

        {cart.length === 0 && <p>Your cart is empty!</p>}

        {cart.map(item => (

          <div className="cart-item" key={item.id}>

            <span>
              {item.emoji} {item.name} × {item.quantity}
            </span>

            <span>₹{item.price * item.quantity}</span>

            <button onClick={() => removeFromCart(item.id)}>
              Remove
            </button>

          </div>

        ))}

        <h3>Total Amount: ₹{total}</h3>

        <button className="order-btn" onClick={placeOrder}>
          Place Order
        </button>

      </section>

      <footer>
        <h3>🍦 MERIDIAN ICE CREAM</h3>
        <p>Thank You For Visiting Us!</p>
        <p>© 2026 Meridian Ice Cream</p>
      </footer>

    </div>
  );
}

export default App;