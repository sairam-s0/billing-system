const products = [
  { id: 1, name: "Pen", price: 10 },
  { id: 2, name: "Notebook", price: 40 },
  { id: 3, name: "Eraser", price: 5 },
  { id: 4, name: "Marker", price: 30 },
  { id: 5, name: "Stapler", price: 80 }
];

let cart = {};
let invoiceHistory = [];
let invoiceCounter = 1001;

function renderProducts(filtered = products) {
  const productList = document.getElementById("productList");
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
  const invoiceBody = document.getElementById("invoiceBody");
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

  document.getElementById("subtotal").textContent = `₹${subtotal}`;
  document.getElementById("gst").textContent = `₹${gst}`;
  document.getElementById("total").textContent = `₹${total}`;
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

document.getElementById("searchBar").addEventListener("input", e => {
  const val = e.target.value.toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(val));
  renderProducts(filtered);
});

document.getElementById("invoiceSearch").addEventListener("input", e => {
  const query = e.target.value.toLowerCase();
  renderInvoiceList(query);
});

document.getElementById("finishBtn").addEventListener("click", () => {
  const subtotal = parseInt(document.getElementById("subtotal").textContent.replace("₹", ""));
  const gst = parseInt(document.getElementById("gst").textContent.replace("₹", ""));
  const total = subtotal + gst;

  const paymentMode = document.getElementById("paymentMode").value;
  const paidAmount = parseFloat(document.getElementById("amountPaid").value);
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();

  const msg = document.getElementById("paymentMsg");

  if (!paymentMode || isNaN(paidAmount)) {
    msg.textContent = "Please provide valid payment mode and amount.";
    msg.style.color = "red";
    return;
  }

  if (paidAmount < total) {
    msg.textContent = `Insufficient amount! ₹${total - paidAmount} remaining.`;
    msg.style.color = "red";
    return;
  }

  const change = paidAmount - total;
  msg.textContent = change === 0
    ? "Payment complete. No balance."
    : `Payment complete. Return ₹${change} to customer.`;
  msg.style.color = "green";

  const invoiceId = `INV${invoiceCounter++}`;
  const invoiceData = {
    id: invoiceId,
    date: new Date().toLocaleString(),
    total: `₹${total}`,
    mode: paymentMode,
    customer: name || "N/A",
    phone: phone || "N/A",
    items: Object.values(cart)
  };

  invoiceHistory.push(invoiceData);
  cart = {};
  renderInvoice();

  // Clear form
  document.getElementById("paymentMode").value = "";
  document.getElementById("amountPaid").value = "";
  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";

  // Show bill summary
  showBillSummary(invoiceData);
  renderInvoiceList();
});

function showBillSummary(invoice) {
  document.getElementById("billingPage").style.display = "none";
  document.getElementById("invoicesPage").style.display = "none";
  document.getElementById("billSummaryPage").style.display = "block";

  const summary = document.getElementById("summaryContent");
  summary.innerHTML = `
    <h3>Invoice ID: ${invoice.id}</h3>
    <p><strong>Date:</strong> ${invoice.date}</p>
    <p><strong>Customer:</strong> ${invoice.customer}</p>
    <p><strong>Phone:</strong> ${invoice.phone}</p>
    <p><strong>Payment Mode:</strong> ${invoice.mode}</p>
    <table>
      <thead>
        <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${invoice.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>₹${item.price}</td>
            <td>₹${item.price * item.qty}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <p style="margin-top:10px;"><strong>Total:</strong> ${invoice.total}</p>
  `;
}

function showPage(page) {
  document.querySelectorAll("aside li").forEach(li => li.classList.remove("active"));
  if (page === "billing") {
    document.querySelector("aside li:nth-child(1)").classList.add("active");
  } else if (page === "invoices") {
    document.querySelector("aside li:nth-child(2)").classList.add("active");
  }

  document.getElementById("billingPage").style.display = page === "billing" ? "block" : "none";
  document.getElementById("billSummaryPage").style.display = "none";
  document.getElementById("invoicesPage").style.display = page === "invoices" ? "block" : "none";

  if (page === "invoices") renderInvoiceList();
}

function renderInvoiceList(filter = "") {
  const tbody = document.getElementById("pastInvoices");
  tbody.innerHTML = "";
  invoiceHistory
    .filter(inv => inv.id.toLowerCase().includes(filter.toLowerCase()))
    .forEach(inv => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><a href="#" onclick='showBillSummary(${JSON.stringify(inv)})'>${inv.id}</a></td>
        <td>${inv.date}</td>
        <td>${inv.customer}</td>
        <td>${inv.total}</td>
        <td>${inv.mode}</td>
      `;
      tbody.appendChild(row);
    });
}

// Initialize
renderProducts();
renderInvoice();
