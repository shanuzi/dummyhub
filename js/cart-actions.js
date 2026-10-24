// Functions that change the cart. Every change builds a NEW array (never push or splice).

import { getState, setState } from './state.js';
import { DEFAULT_MINIMUM_ORDER } from './constants.js';

// Returns an error message, or '' when the product was added.
export function addProductToCart(product, quantity) {
  const { cart } = getState();
  const existingItem = cart.find((item) => item.id === product.id);
  const quantityAlreadyInCart = existingItem ? existingItem.quantity : 0;
  const minimumOrder = product.minimumOrderQuantity || DEFAULT_MINIMUM_ORDER;

  if (!Number.isInteger(quantity) || quantity < 1) {
    return 'Please enter a whole number of 1 or more.';
  }
  if (!existingItem && quantity < minimumOrder) {
    return `The minimum order for this product is ${minimumOrder}.`;
  }
  if (quantityAlreadyInCart + quantity > product.stock) {
    return `Only ${product.stock} in stock (${quantityAlreadyInCart} already in your cart).`;
  }

  if (existingItem) {
    const updatedCart = cart.map((item) => {
      if (item.id !== product.id) {
        return item;
      }
      return { ...item, quantity: item.quantity + quantity };
    });
    setState({ cart: updatedCart });
    return '';
  }

  const newItem = {
    id: product.id,
    title: product.title,
    price: product.price,
    discountPercentage: product.discountPercentage,
    thumbnail: product.thumbnail,
    stock: product.stock,
    quantity,
  };
  setState({ cart: [...cart, newItem] });
  return '';
}

export function changeCartQuantity(productId, change) {
  const { cart } = getState();

  const updatedCart = cart.map((item) => {
    if (item.id !== productId) {
      return item;
    }
    const newQuantity = item.quantity + change;
    if (newQuantity < 1 || newQuantity > item.stock) {
      return item;
    }
    return { ...item, quantity: newQuantity };
  });

  setState({ cart: updatedCart });
}

export function removeFromCart(productId) {
  const { cart } = getState();
  const updatedCart = cart.filter((item) => item.id !== productId);
  setState({ cart: updatedCart });
}
