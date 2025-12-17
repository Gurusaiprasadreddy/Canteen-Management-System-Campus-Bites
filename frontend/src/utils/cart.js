// Cart utility functions

export const getCart = () => {
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
};

export const addToCart = (item, quantity = 1) => {
  const cart = getCart();
  const existingItemIndex = cart.findIndex((cartItem) => cartItem.item_id === item.item_id);
  
  if (existingItemIndex >= 0) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({ ...item, quantity });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  return cart;
};

export const removeFromCart = (itemId) => {
  const cart = getCart();
  const updatedCart = cart.filter((item) => item.item_id !== itemId);
  localStorage.setItem('cart', JSON.stringify(updatedCart));
  return updatedCart;
};

export const updateCartItemQuantity = (itemId, quantity) => {
  const cart = getCart();
  const itemIndex = cart.findIndex((item) => item.item_id === itemId);
  
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      return removeFromCart(itemId);
    }
    cart[itemIndex].quantity = quantity;
    localStorage.setItem('cart', JSON.stringify(cart));
  }
  
  return cart;
};

export const clearCart = () => {
  localStorage.removeItem('cart');
  return [];
};

export const getCartTotal = () => {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
};

export const getCartItemCount = () => {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
};
