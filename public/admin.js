let adminToken = null;

function api(path, method = "GET", body = null) {
  return fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": adminToken
    },
    body: body ? JSON.stringify(body) : null
  }).then(r => r.json());
}

// =================================
// LOGIN
// =================================
async function login() {
  const password = document.getElementById("password").value;

  const res = await fetch("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });

  const data = await res.json();

  if (!data.success) {
    document.getElementById("loginError").style.display = "block";
    return;
  }

  adminToken = data.token;
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";

  loadDashboard();
  loadKeys();
  loadLogs();
}

// =================================
// DASHBOARD
// =================================
async function loadDashboard() {
  const data = await api("/admin/dashboard");
  const box = document.getElementById("dashboardBox");

  box.innerHTML = `
    <div class="col-md-3">
      <div class="stat-card">
        <div>Total Users</div>
        <div class="stat-number">${data.totalUsers}</div>
      </div>
    </div>

    <div class="col-md-3">
      <div class="stat-card">
        <div>Total Credits</div>
        <div class="stat-number">${data.totalCredits}</div>
      </div>
    </div>

    <div class="col-md-3">
      <div class="stat-card">
        <div>Disabled Keys</div>
        <div class="stat-number">${data.disabledKeys}</div>
      </div>
    </div>

    <div class="col-md-3">
      <div class="stat-card">
        <div>Infer (24h)</div>
        <div class="stat-number">${data.infer24h}</div>
      </div>
    </div>
  `;
}

// =================================
// CREATE API KEY
// =================================
async function createKey() {
  const credits = document.getElementById("createCredits").value;
  const expiration = document.getElementById("createExpiry").value;
  const notes = document.getElementById("createNotes").value;

  const res = await api("/admin/create-key", "POST",
    { credits, expiration, notes });

  document.getElementById("createResult").innerHTML =
    `<span style="color:#3cb675;">Created Key: <b>${res.apiKey}</b></span>`;

  loadKeys();
}

// =================================
// MANAGE KEYS
// =================================
async function loadKeys() {
  const data = await api("/admin/keys");
  const box = document.getElementById("keysTable");

  let html = `
    <table class="table table-bordered table-dark">
      <thead>
        <tr>
          <th>API Key</th>
          <th>Credits</th>
          <th>Expiration</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(k => {
    html += `
      <tr>
        <td>${k.apiKey}</td>

        <td>
          <input id="c_${k.apiKey}" class="form-control form-control-sm" style="width:120px" value="${k.credits}">
        </td>

        <td>
          <input id="e_${k.apiKey}" class="form-control form-control-sm" type="datetime-local"
                 value="${new Date(k.expiration).toISOString().substring(0,16)}">
        </td>

        <td>
          <button class="btn btn-sm ${k.status === 'active' ? 'btn-success' : 'btn-danger'}"
                  onclick="toggleStatus('${k.apiKey}')">${k.status}</button>
        </td>

        <td>
          <button class="btn btn-primary btn-sm" onclick="saveCredit('${k.apiKey}')">Save Credit</button>
          <button class="btn btn-primary btn-sm" onclick="saveExp('${k.apiKey}')">Save Exp</button>
          <button class="btn btn-danger btn-sm" onclick="delKey('${k.apiKey}')">Delete</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  box.innerHTML = html;
}

async function saveCredit(apiKey) {
  const amount = document.getElementById("c_" + apiKey).value;
  await api("/admin/update-credit", "POST", { apiKey, amount });
  loadKeys();
}

async function saveExp(apiKey) {
  const expiration = document.getElementById("e_" + apiKey).value;
  await api("/admin/update-expiration", "POST", { apiKey, expiration });
  loadKeys();
}

async function toggleStatus(apiKey) {
  await api("/admin/toggle-status", "POST", { apiKey });
  loadKeys();
}

async function delKey(apiKey) {
  if (!confirm("Are you sure?")) return;
  await api("/admin/delete", "POST", { apiKey });
  loadKeys();
}

// =================================
// LOGS
// =================================
async function loadLogs() {
  const logs = await api("/admin/logs");
  const box = document.getElementById("logsTable");

  let html = `
  <table class="table table-sm table-dark">
    <thead>
      <tr>
        <th>API Key</th>
        <th>Length</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <tbody>
  `;

  logs.forEach(l => {
    html += `
      <tr>
        <td>${l.apiKey}</td>
        <td>${l.textLength}</td>
        <td>${l.time}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  box.innerHTML = html;
}

// =================================
// CHANGE PASSWORD
// =================================
async function changePassword() {
  const newPassword = document.getElementById("newAdminPass").value;

  const res = await api("/admin/change-password", "POST", { newPassword });

  if (res.success) {
    document.getElementById("changePassResult").innerHTML =
      `<span style="color:#3cb675;">Password updated!</span>`;
  }
}
