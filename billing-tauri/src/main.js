// ======= Global Variables =======
let currentUser = null;
let userRole = null;
let gstEnabled = true;

// Default users
const users = {
  admin: { username: 'admin', password: 'admin123', role: 'admin' },
  user: { username: 'user', password: 'user123', role: 'user' }
};

// Products with stock information
const products = [
  { id: 1, name: "Pen", price: 10, stock: 100, minStock: 10 },
  { id: 2, name: "Notebook", price: 40, stock: 50, minStock: 5 },
  { id: 3, name: "Eraser", price: 5, stock: 200, minStock: 20 },
  { id: 4, name: "Marker", price: 30, stock: 75, minStock: 15 },
  { id: 5, name: "Stapler", price: 80, stock: 25, minStock: 5 }
];

let cart = {};
let invoiceHistory = [];
let invoiceCounter = 1001;
let editingInvoiceId = null;

// ======= Authentication =======
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const messageEl = document.getElementById('loginMessage');
  
  // Check credentials
  const user = Object.values(users).find(u => u.username === username && u.password === password);
  
  if (user) {
    currentUser = user;
    userRole = user.role;
    
    // Hide login screen and show main app
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    
    // Update welcome message
    document.getElementById('userWelcome').textContent = `Welcome, ${user.username} (${user.role})`;
    
    // Setup navigation based on role
    setupNavigation();
    
    // Load data and initialize
    loadData();
    renderProducts();
    renderInvoice();
    showPage('billing');
    
    if (user.role === 'admin') {
      updateDashboard();
    }
    
  } else {
    messageEl.textContent = 'Invalid username or password';
    messageEl.style.color = 'red';
  }
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
  currentUser = null;
  userRole = null;
  
  // Clear form
  document.getElementById('loginForm').reset();
  document.getElementById('loginMessage').textContent = '';
  
  // Show login screen
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
});

// ======= Navigation Setup =======
function setupNavigation() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  
  if (userRole === 'admin') {
    nav.innerHTML = `
      <li class="active" onclick="showPage('dashboard')">Dashboard</li>
      <li onclick="showPage('billing')">Billing</li>
      <li onclick="showPage('invoices')">Invoices</li>
      <li onclick="showPage('stock')">Stock Management</li>
      <li onclick="showPage('settings')">Settings</li>
    `;
  } else {
    nav.innerHTML = `
      <li class="active" onclick="showPage('billing')">Billing</li>
      <li onclick="showPage('invoices')">Invoices</li>
    `;
  }
}

// ======= Data Management =======
function saveData() {
  // Using variables instead of localStorage for Claude.ai compatibility
  // In a real environment, you would use localStorage here
}

function loadData() {
  // In a real environment, you would load from localStorage here
  // For now, we'll use the default data
}

// ======= GST Toggle =======
document.getElementById('gstToggle').addEventListener('change', function(e) {
  gstEnabled = e.target.checked;
  document.getElementById('gstRow').style.display = gstEnabled ? 'table-row' : 'none';
  renderInvoice();
});

// ======= Product Management =======
function renderProducts(filtered = products) {
  const productList = document.getElementById("productList");
  productList.innerHTML = "";
  
  filtered.forEach(product => {
    const stockStatus = getStockStatus(product);
    const isOutOfStock = product.stock <= 0;
    
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <h4>${product.name}</h4>
      <p>₹${product.price}</p>
      <p class="stock-info ${stockStatus.class}">Stock: ${product.stock} ${stockStatus.text}</p>
      <button onclick="addToCart(${product.id})" ${isOutOfStock ? 'disabled' : ''}>
        ${isOutOfStock ? 'Out of Stock' : 'Add'}
      </button>
      ${userRole === 'admin' ? `<button onclick="editPrice(${product.id})">Edit</button>` : ''}
    `;
    productList.appendChild(div);
  });
}

function getStockStatus(product) {
  if (product.stock <= 0) {
    return { class: 'stock-out', text: '(Out of Stock)' };
  } else if (product.stock <= product.minStock) {
    return { class: 'stock-low', text: '(Low Stock)' };
  } else {
    return { class: '', text: '' };
  }
}

function addToCart(id) {
  const item = products.find(p => p.id === id);
  if (!item || item.stock <= 0) return;
  
  if (!cart[id]) {
    cart[id] = { ...item, qty: 1 };
  } else {
    if (cart[id].qty >= item.stock) {
      alert(`Only ${item.stock} items available in stock!`);
      return;
    }
    cart[id].qty++;
  }
  
  renderInvoice();
}

function editPrice(id) {
  if (userRole !== 'admin') return;
  
  const newPrice = parseFloat(prompt("Enter new price:"));
  if (!isNaN(newPrice) && newPrice > 0) {
    const product = products.find(p => p.id === id);
    product.price = newPrice;
    
    if (cart[id]) cart[id].price = newPrice;
    renderProducts();
    renderInvoice();
    saveData();
  }
}

// ======= Invoice Management =======
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
      <td>
        <div class="qty-controls">
          <button onclick="decreaseQty(${item.id})">-</button>
          <span>${item.qty}</span>
          <button onclick="increaseQty(${item.id})">+</button>
        </div>
      </td>
      <td>
        ₹<input type="number" min="1" value="${item.price}" class="price-input"
          onchange="updateItemPrice(${item.id}, this.value)" />
      </td>
      <td>₹${total}</td>
    `;
    invoiceBody.appendChild(row);
  });

  const gst = gstEnabled ? Math.round(subtotal * 0.18) : 0;
  const total = subtotal + gst;

  document.getElementById("subtotal").textContent = `₹${subtotal}`;
  document.getElementById("gst").textContent = `₹${gst}`;
  document.getElementById("total").textContent = `₹${total}`;
}

function increaseQty(id) {
  const product = products.find(p => p.id === id);
  if (cart[id].qty >= product.stock) {
    alert(`Only ${product.stock} items available in stock!`);
    return;
  }
  
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

function updateItemPrice(id, newPrice) {
  const price = parseFloat(newPrice);
  if (!isNaN(price) && price > 0) {
    cart[id].price = price;
    renderInvoice();
  }
}

// ======= Search Functionality =======
document.getElementById("searchBar").addEventListener("input", e => {
  const val = e.target.value.toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(val));
  renderProducts(filtered);
});

document.getElementById("invoiceSearch").addEventListener("input", e => {
  const query = e.target.value.toLowerCase();
  renderInvoiceList(query);
});

// ======= Billing Process =======
document.getElementById("finishBtn").addEventListener("click", () => {
  if (Object.keys(cart).length === 0) {
    alert("Cart is empty!");
    return;
  }
  
  const subtotal = parseInt(document.getElementById("subtotal").textContent.replace("₹", ""));
  const gst = gstEnabled ? parseInt(document.getElementById("gst").textContent.replace("₹", "")) : 0;
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
  msg.textContent = change === 0 ? "Payment complete. No balance." : `Payment complete. Return ₹${change} to customer.`;
  msg.style.color = "green";

  // Update stock
  Object.values(cart).forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      product.stock -= item.qty;
    }
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");

  const invoiceId = `INV_${dateStr}_${timeStr}_${invoiceCounter++}`;
  const invoiceData = {
    id: invoiceId,
    timestamp: now.toISOString(),
    date: now.toLocaleString(),
    total: `₹${total}`,
    subtotal: `₹${subtotal}`,
    gst: `₹${gst}`,
    gstEnabled: gstEnabled,
    mode: paymentMode,
    customer: name || "N/A",
    phone: phone || "N/A",
    items: Object.values(cart),
    profit: Math.round(subtotal * 0.2),
    paidAmount: paidAmount,
    change: change
  };

  invoiceHistory.push(invoiceData);
  saveData();
  
  // Clear cart and form
  cart = {};
  renderInvoice();
  renderProducts();

  document.getElementById("paymentMode").value = "";
  document.getElementById("amountPaid").value = "";
  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("paymentMsg").textContent = "";

  showBillSummary(invoiceData);
  renderInvoiceList();
  
  if (userRole === 'admin') {
    updateDashboard();
  }
});

// ======= Invoice Summary =======
function showBillSummary(invoice) {
  const pages = ["dashboardSection", "billingSection", "invoicesPage", "stockSection", "settingsSection", "billSummaryPage"];
  pages.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = "none";
  });
  document.getElementById("billSummaryPage").style.display = "block";

  const summary = document.getElementById("summaryContent");
  summary.innerHTML = `
    <h3>Invoice ID: ${invoice.id}</h3>
    <p><strong>Date:</strong> ${invoice.date}</p>
    <p><strong>Customer:</strong> ${invoice.customer}</p>
    <p><strong>Phone:</strong> ${invoice.phone}</p>
    <p><strong>Payment Mode:</strong> ${invoice.mode}</p>
    <p><strong>Amount Paid:</strong> ₹${invoice.paidAmount}</p>
    ${invoice.change > 0 ? `<p><strong>Change Returned:</strong> ₹${invoice.change}</p>` : ''}
    
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>₹${item.price}</td>
            <td>₹${item.qty * item.price}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Subtotal</td>
          <td>${invoice.subtotal}</td>
        </tr>
        ${invoice.gstEnabled ? `
        <tr>
          <td colspan="3">GST (18%)</td>
          <td>${invoice.gst}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="3"><strong>Total</strong></td>
          <td><strong>${invoice.total}</strong></td>
        </tr>
      </tfoot>
    </table>
  `;
}

// ======= Page Navigation =======
function showPage(page) {
  const sections = ["dashboardSection", "billingSection", "invoicesPage", "stockSection", "settingsSection", "billSummaryPage"];
  sections.forEach(sec => {
    const element = document.getElementById(sec);
    if (element) element.style.display = "none";
  });
  
  document.querySelectorAll("#sidebarNav li").forEach(li => li.classList.remove("active"));

  if (page === "dashboard" && userRole === 'admin') {
    document.getElementById("dashboardSection").style.display = "block";
    document.querySelector("#sidebarNav li:nth-child(1)").classList.add("active");
    updateDashboard();
  } else if (page === "billing") {
    document.getElementById("billingSection").style.display = "block";
    const targetLi = userRole === 'admin' ? 
      document.querySelector("#sidebarNav li:nth-child(2)") : 
      document.querySelector("#sidebarNav li:nth-child(1)");
    if (targetLi) targetLi.classList.add("active");
  } else if (page === "invoices") {
    document.getElementById("invoicesPage").style.display = "block";
    const targetLi = userRole === 'admin' ? 
      document.querySelector("#sidebarNav li:nth-child(3)") : 
      document.querySelector("#sidebarNav li:nth-child(2)");
    if (targetLi) targetLi.classList.add("active");
    renderInvoiceList();
  } else if (page === "stock" && userRole === 'admin') {
    document.getElementById("stockSection").style.display = "block";
    document.querySelector("#sidebarNav li:nth-child(4)").classList.add("active");
    renderStockTable();
  } else if (page === "settings" && userRole === 'admin') {
    document.getElementById("settingsSection").style.display = "block";
    document.querySelector("#sidebarNav li:nth-child(5)").classList.add("active");
  }
}

// ======= Invoice List =======
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
        <td>
          ${userRole === 'admin' || userRole === 'user' ? `<button onclick="editInvoice('${inv.id}')">Edit</button>` : ''}
        </td>
      `;
      tbody.appendChild(row);
    });
}

// ======= Invoice Editing =======
function editInvoice(invoiceId) {
  const invoice = invoiceHistory.find(inv => inv.id === invoiceId);
  if (!invoice) return;
  
  editingInvoiceId = invoiceId;
  
  const modal = document.getElementById("editInvoiceModal");
  const content = document.getElementById("editInvoiceContent");
  
  content.innerHTML = `
    <div class="form-group">
      <label>Customer Name</label>
      <input type="text" id="editCustomerName" value="${invoice.customer}" />
    </div>
    <div class="form-group">
      <label>Phone</label>
      <input type="text" id="editCustomerPhone" value="${invoice.phone}" />
    </div>
    <div class="form-group">
      <label>Payment Mode</label>
      <select id="editPaymentMode">
        <option value="Cash" ${invoice.mode === 'Cash' ? 'selected' : ''}>Cash</option>
        <option value="Card" ${invoice.mode === 'Card' ? 'selected' : ''}>Card</option>
        <option value="UPI" ${invoice.mode === 'UPI' ? 'selected' : ''}>UPI</option>
      </select>
    </div>
    <h4>Items</h4>
    <div id="editItemsList">
      ${invoice.items.map((item, index) => `
        <div class="form-group">
          <label>${item.name}</label>
          <input type="number" id="editQty_${index}" value="${item.qty}" min="1" />
          <span>× ₹${item.price} = ₹${item.qty * item.price}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  modal.style.display = "flex";
}

function saveInvoiceChanges() {
  const invoice = invoiceHistory.find(inv => inv.id === editingInvoiceId);
  if (!invoice) return;
  
  // Update customer details
  invoice.customer = document.getElementById("editCustomerName").value || "N/A";
  invoice.phone = document.getElementById("editCustomerPhone").value || "N/A";
  invoice.mode = document.getElementById("editPaymentMode").value;
  
  // Update quantities
  invoice.items.forEach((item, index) => {
    const newQty = parseInt(document.getElementById(`editQty_${index}`).value);
    if (newQty > 0) {
      item.qty = newQty;
    }
  });
  
  // Recalculate totals
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const gst = invoice.gstEnabled ? Math.round(subtotal * 0.18) : 0;
  const total = subtotal + gst;
  
  invoice.subtotal = `₹${subtotal}`;
  invoice.gst = `₹${gst}`;
  invoice.total = `₹${total}`;
  
  saveData();
  renderInvoiceList();
  closeEditModal();
  
  alert("Invoice updated successfully!");
}

function closeEditModal() {
  document.getElementById("editInvoiceModal").style.display = "none";
  editingInvoiceId = null;
}

// ======= Stock Management =======
function renderStockTable() {
  const tbody = document.getElementById("stockTableBody");
  tbody.innerHTML = "";
  
  products.forEach(product => {
    const status = getStockStatus(product);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.stock}</td>
      <td>${product.minStock}</td>
      <td>
        <span class="status-badge ${status.class === 'stock-out' ? 'status-out' : status.class === 'stock-low' ? 'status-low' : 'status-good'}">
          ${status.class === 'stock-out' ? 'Out of Stock' : status.class === 'stock-low' ? 'Low Stock' : 'In Stock'}
        </span>
      </td>
      <td>
        <button onclick="openStockModal(${product.id})">Update</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openStockModal(productId = null) {
  const modal = document.getElementById("stockModal");
  const select = document.getElementById("stockProductSelect");
  
  // Populate product select
  select.innerHTML = products.map(p => 
    `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name}</option>`
  ).join('');
  
  if (productId) {
    const product = products.find(p => p.id === productId);
    document.getElementById("stockQuantity").value = product.stock;
    document.getElementById("minStock").value = product.minStock;
  }
  
  modal.style.display = "flex";
}

function updateStock() {
  const productId = parseInt(document.getElementById("stockProductSelect").value);
  const newStock = parseInt(document.getElementById("stockQuantity").value);
  const minStock = parseInt(document.getElementById("minStock").value);
  
  if (isNaN(newStock) || isNaN(minStock) || newStock < 0 || minStock < 0) {
    alert("Please enter valid stock values");
    return;
  }
  
  const product = products.find(p => p.id === productId);
  if (product) {
    product.stock = newStock;
    product.minStock = minStock;
    
    renderStockTable();
    renderProducts();
    saveData();
    
    document.getElementById("stockModal").style.display = "none";
    alert("Stock updated successfully!");
  }
}

// ======= Settings =======
function changePassword(role) {
  const newPassword = document.getElementById(`new${role.charAt(0).toUpperCase() + role.slice(1)}Password`).value;
  
  if (!newPassword || newPassword.length < 6) {
    alert("Password must be at least 6 characters long");
    return;
  }
  
  users[role].password = newPassword;
  saveData();
  
  document.getElementById(`new${role.charAt(0).toUpperCase() + role.slice(1)}Password`).value = "";
  alert(`${role.charAt(0).toUpperCase() + role.slice(1)} password updated successfully!`);
}

function importProducts() {
  const fileInput = document.getElementById("productsFile");
  const file = fileInput.files[0];
  
  if (!file) {
    alert("Please select a file");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let importedProducts = [];
      
      if (file.type === "application/json") {
        importedProducts = JSON.parse(e.target.result);
      } else if (file.type === "text/csv") {
        // Simple CSV parsing
        const lines = e.target.result.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const product = {};
            headers.forEach((header, index) => {
              product[header] = values[index] || '';
            });
            importedProducts.push(product);
          }
        }
      }
      
      // Add products to the system
      let addedCount = 0;
      importedProducts.forEach(item => {
        if (item.name && item.price) {
          const newId = Math.max(...products.map(p => p.id)) + 1;
          products.push({
            id: newId,
            name: item.name,
            price: parseFloat(item.price) || 0,
            stock: parseInt(item.stock) || 0,
            minStock: parseInt(item.minStock) || 5
          });
          addedCount++;
        }
      });
      
      renderProducts();
      renderStockTable();
      saveData();
      
      alert(`Successfully imported ${addedCount} products!`);
      fileInput.value = "";
      
    } catch (error) {
      alert("Error importing file. Please check the file format.");
      console.error(error);
    }
  };
  
  reader.readAsText(file);
}

// ======= Dashboard (Admin Only) =======
function updateDashboard() {
  if (userRole !== 'admin') return;
  
  // Calculate yesterday's sales
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  const yesterdaySales = invoiceHistory
    .filter(inv => new Date(inv.timestamp).toDateString() === yesterdayStr)
    .reduce((sum, inv) => sum + parseInt(inv.total.replace('₹', '')), 0);
  
  document.getElementById("yesterdaySales").textContent = `₹${yesterdaySales}`;
  
  // Find top product
  const productSales = {};
  invoiceHistory.forEach(inv => {
    inv.items.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + item.qty;
    });
  });
  
  const topProduct = Object.keys(productSales).reduce((a, b) => 
    productSales[a] > productSales[b] ? a : b, '-'
  );
  
  document.getElementById("topProduct").textContent = topProduct;
  
  // Calculate total profit
  const totalProfit = invoiceHistory.reduce((sum, inv) => sum + (inv.profit || 0), 0);
  document.getElementById("profitAmount").textContent = `₹${totalProfit}`;
  
  // Update profit circle
  const maxProfit = 10000; // Arbitrary max for visualization
  const profitPercentage = Math.min(totalProfit / maxProfit * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (profitPercentage / 100) * circumference;
  
  document.getElementById("profitCircle").style.strokeDashoffset = offset;
  
  // Update top products list
  const topProductsList = document.getElementById("topProductsList");
  topProductsList.innerHTML = Object.entries(productSales)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, qty]) => `<li>${name}: ${qty} sold</li>`)
    .join('');
  
  // Update sales chart
  updateSalesChart();
}

function updateSalesChart() {
  const ctx = document.getElementById('salesChart').getContext('2d');
  
  // Generate last 7 days data
  const last7Days = [];
  const salesData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    
    last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    
    const daySales = invoiceHistory
      .filter(inv => new Date(inv.timestamp).toDateString() === dateStr)
      .reduce((sum, inv) => sum + parseInt(inv.total.replace('₹', '')), 0);
    
    salesData.push(daySales);
  }
  
  // Clear existing chart
  if (window.salesChart) {
    window.salesChart.destroy();
  }
  
  window.salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Sales (₹)',
        data: salesData,
        borderColor: '#6b8e23',
        backgroundColor: 'rgba(107, 142, 35, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// ======= Modal Event Listeners =======
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('close')) {
    e.target.closest('.modal').style.display = 'none';
  }
});

// ======= Stock Management Event Listeners =======
document.getElementById('addStockBtn').addEventListener('click', function() {
  openStockModal();
});

document.getElementById('lowStockBtn').addEventListener('click', function() {
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  
  if (lowStockProducts.length === 0) {
    alert("No products with low stock!");
    return;
  }
  
  const message = "Low Stock Products:\n" + 
    lowStockProducts.map(p => `${p.name}: ${p.stock} remaining`).join('\n');
  
  alert(message);
});

// ======= Initialize App =======
document.addEventListener('DOMContentLoaded', function() {
  // Initialize GST toggle
  document.getElementById('gstRow').style.display = gstEnabled ? 'table-row' : 'none';
});