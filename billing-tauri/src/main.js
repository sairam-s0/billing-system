const products = [
  { id: 1, name: "Pen", price: 10 },
  { id: 2, name: "Notebook", price: 40 },
  { id: 3, name: "Eraser", price: 5 },
  { id: 4, name: "Marker", price: 30 },
  { id: 5, name: "Stapler", price: 80 }
];

let cart = {};

const productList = document.getElementById("productList");
const searchBar = document.getElementById("searchBar");
const invoiceBody = document.getElementById("invoiceBody");
const subtotalEl = document.getElementById("subtotal");
const gstEl = document.getElementById("gst");
const totalEl = document.getElementById("total");

function renderProducts(filtered = products) {
  productList.innerHTML = "";
  filtered.forEach(product => {
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <h4>${product.name}</h4>
      <p>₹${product.price}</p>
      <button onclick="addToCart(${product.id})">Add</button>
      <button onclick="editPrice(${product.id})">Edit</button>
    `;
    productList.appendChild(div);
  });
}

function addToCart(id) {
  const item = products.find(p => p.id === id);
  if (!cart[id]) {
    cart[id] = { ...item, qty: 1 };
  } else {
    cart[id].qty++;
  }
  renderInvoice();
}

function editPrice(id) {
  const newPrice = parseFloat(prompt("Enter new price:"));
  if (!isNaN(newPrice) && newPrice > 0) {
    products.find(p => p.id === id).price = newPrice;
    if (cart[id]) cart[id].price = newPrice;
    renderProducts();
    renderInvoice();
  }
}

function renderInvoice() {
  invoiceBody.innerHTML = "";
  let subtotal = 0;

  Object.values(cart).forEach(item => {
    const total = item.price * item.qty;
    subtotal += total;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>₹${item.price}</td>
      <td>₹${total}</td>
      <td>
        <button onclick="increaseQty(${item.id})">+</button>
        <button onclick="decreaseQty(${item.id})">-</button>
      </td>
    `;
    invoiceBody.appendChild(row);
  });

  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  subtotalEl.textContent = `₹${subtotal}`;
  gstEl.textContent = `₹${gst}`;
  totalEl.textContent = `₹${total}`;
}

function increaseQty(id) {
  cart[id].qty++;
  renderInvoice();
}

function decreaseQty(id) {
  if (cart[id].qty > 1) {
    cart[id].qty--;
  } else {
    delete cart[id];
  }
  renderInvoice();
}

searchBar.addEventListener("input", e => {
  const val = e.target.value.toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(val));
  renderProducts(filtered);
});

document.getElementById("finishBtn").addEventListener("click", () => {
  if (Object.keys(cart).length === 0) return alert("Cart is empty!");
  alert("Billing complete. Check invoice summary above.");
  console.table(cart);
  cart = {};
  renderInvoice();
});

renderProducts();
