
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hrcaisojgvuulwubaqez.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authBox = document.getElementById("authBox");
const dashboard = document.getElementById("dashboard");
const adminPanel = document.getElementById("adminPanel");
const authMessage = document.getElementById("authMessage");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const fullNameInput = document.getElementById("fullName");
const updateFullNameInput = document.getElementById("updateFullName");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const saveNameBtn = document.getElementById("saveNameBtn");

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const totalIncome = document.getElementById("totalIncome");
const totalExpenses = document.getElementById("totalExpenses");
const balance = document.getElementById("balance");

const moneyTitle = document.getElementById("moneyTitle");
const moneyAmount = document.getElementById("moneyAmount");
const moneyType = document.getElementById("moneyType");
const addMoneyBtn = document.getElementById("addMoneyBtn");

const goalTitle = document.getElementById("goalTitle");
const goalTarget = document.getElementById("goalTarget");
const goalCategory = document.getElementById("goalCategory");
const addGoalBtn = document.getElementById("addGoalBtn");

const logsList = document.getElementById("logsList");
const goalsList = document.getElementById("goalsList");
const leaderboardList = document.getElementById("leaderboardList");
const studentFilter = document.getElementById("studentFilter");
const targetUser = document.getElementById("targetUser");

let currentUser = null;
let currentProfile = null;
let selectedStudentId = null;
let allStudents = [];

function showMessage(msg, isError = false) {
  authMessage.textContent = msg;
  authMessage.style.color = isError ? "#dc2626" : "#374151";
}

function isStaff() {
  return currentProfile && (currentProfile.role === "admin" || currentProfile.role === "teacher");
}

function getViewedUserId() {
  if (isStaff() && selectedStudentId) return selectedStudentId;
  return currentUser?.id || null;
}

async function ensureProfile(user, fullNameFromSignup = "") {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    if (!existingProfile.full_name && fullNameFromSignup) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({ full_name: fullNameFromSignup })
        .eq("id", user.id)
        .select()
        .single();
      return updated || existingProfile;
    }
    return existingProfile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: fullNameFromSignup,
      role: "student"
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  currentUser = data.user;
  currentProfile = await ensureProfile(currentUser);
  await loadDashboard();
  showMessage("Logged in.");
}

async function signup() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const fullName = fullNameInput.value.trim();

  if (!fullName) {
    showMessage("Please enter your full name.", true);
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  if (!data.user) {
    showMessage("Signup complete. Check email if confirmation is enabled.");
    return;
  }

  currentUser = data.user;
  currentProfile = await ensureProfile(currentUser, fullName);
  await loadDashboard();
  showMessage("Account created.");
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  selectedStudentId = null;
  dashboard.classList.add("hidden");
  adminPanel.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  showMessage("Logged out.");
}

async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  currentProfile = data;
  userName.textContent = data.full_name || "-";
  userRole.textContent = data.role || "student";
  updateFullNameInput.value = data.full_name || "";
}

async function saveFullName() {
  const full_name = updateFullNameInput.value.trim();

  if (!full_name) {
    alert("Enter your real full name.");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name })
    .eq("id", currentUser.id);

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  await loadProfile();
  alert("Name updated.");
}

async function loadStudents() {
  if (!isStaff()) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "student")
    .order("full_name");

  if (error) {
    console.error(error);
    return;
  }

  allStudents = data || [];

  studentFilter.innerHTML = "";
  targetUser.innerHTML = "";

  allStudents.forEach((student) => {
    const option1 = document.createElement("option");
    option1.value = student.id;
    option1.textContent = student.full_name || "Unnamed Student";
    studentFilter.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = student.id;
    option2.textContent = student.full_name || "Unnamed Student";
    targetUser.appendChild(option2);
  });

  if (allStudents.length && !selectedStudentId) {
    selectedStudentId = allStudents[0].id;
  }

  if (selectedStudentId) {
    studentFilter.value = selectedStudentId;
    targetUser.value = selectedStudentId;
  }
}

async function loadLogs() {
  const viewedUserId = getViewedUserId();

  let query = supabase
    .from("money_logs")
    .select("*, profiles!money_logs_user_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (isStaff() && viewedUserId) {
    query = query.eq("user_id", viewedUserId);
  }

  if (!isStaff()) {
    query = query.eq("user_id", currentUser.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    logsList.innerHTML = "<p>Could not load logs.</p>";
    return;
  }

  logsList.innerHTML = "";

  let income = 0;
  let expenses = 0;

  if (!data.length) {
    logsList.innerHTML = "<p>No money logs yet.</p>";
  }

  data.forEach((log) => {
    if (log.type === "income") income += Number(log.amount || 0);
    if (log.type === "expense") expenses += Number(log.amount || 0);

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div><strong>${log.title}</strong></div>
      <div>${log.profiles?.full_name || "Unknown Student"}</div>
      <div class="${log.type}">${log.type === "income" ? "+" : "-"}$${Number(log.amount).toFixed(2)}</div>
      <div class="small">${new Date(log.created_at).toLocaleString()}</div>
    `;
    logsList.appendChild(div);
  });

  totalIncome.textContent = income.toFixed(2);
  totalExpenses.textContent = expenses.toFixed(2);
  balance.textContent = (income - expenses).toFixed(2);
}

async function loadGoals() {
  const viewedUserId = getViewedUserId();

  let query = supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (isStaff() && viewedUserId) {
    query = query.eq("user_id", viewedUserId);
  }

  if (!isStaff()) {
    query = query.eq("user_id", currentUser.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    goalsList.innerHTML = "<p>Could not load goals.</p>";
    return;
  }

  goalsList.innerHTML = "";

  if (!data.length) {
    goalsList.innerHTML = "<p>No goals yet.</p>";
    return;
  }

  data.forEach((goal) => {
    const percent = Number(goal.target) > 0
      ? Math.min(100, Math.round((Number(goal.current) / Number(goal.target)) * 100))
      : 0;

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div><strong>${goal.title}</strong></div>
      <div>Category: ${goal.category || "General"}</div>
      <div>Progress: ${goal.current} / ${goal.target} (${percent}%)</div>
    `;
    goalsList.appendChild(div);
  });
}

async function loadLeaderboard() {
  if (!isStaff()) return;

  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student");

  if (studentsError) {
    console.error(studentsError);
    return;
  }

  const { data: logs, error: logsError } = await supabase
    .from("money_logs")
    .select("user_id, amount, type");

  if (logsError) {
    console.error(logsError);
    return;
  }

  const leaderboard = students.map((student) => {
    const studentLogs = logs.filter((l) => l.user_id === student.id);
    const income = studentLogs
      .filter((l) => l.type === "income")
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const expenses = studentLogs
      .filter((l) => l.type === "expense")
      .reduce((sum, l) => sum + Number(l.amount), 0);

    return {
      name: student.full_name || "Unnamed Student",
      income,
      expenses,
      balance: income - expenses
    };
  }).sort((a, b) => b.balance - a.balance);

  leaderboardList.innerHTML = "";

  if (!leaderboard.length) {
    leaderboardList.innerHTML = "<p>No students yet.</p>";
    return;
  }

  leaderboard.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div><strong>#${index + 1} ${item.name}</strong></div>
      <div>Income: $${item.income.toFixed(2)}</div>
      <div>Expenses: $${item.expenses.toFixed(2)}</div>
      <div>Balance: $${item.balance.toFixed(2)}</div>
    `;
    leaderboardList.appendChild(div);
  });
}

async function addMoneyLog() {
  const title = moneyTitle.value.trim();
  const amount = parseFloat(moneyAmount.value);
  const type = moneyType.value;
  const user_id = isStaff() ? targetUser.value : currentUser.id;

  if (!title || isNaN(amount) || amount <= 0) {
    alert("Enter a valid title and amount.");
    return;
  }

  const { error } = await supabase
    .from("money_logs")
    .insert({ user_id, title, amount, type });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  moneyTitle.value = "";
  moneyAmount.value = "";
  await loadLogs();
  await loadLeaderboard();
}

async function addGoal() {
  const title = goalTitle.value.trim();
  const target = parseFloat(goalTarget.value);
  const category = goalCategory.value.trim() || "General";
  const user_id = getViewedUserId();

  if (!title || isNaN(target) || target <= 0) {
    alert("Enter a valid goal and target.");
    return;
  }

  const { error } = await supabase
    .from("goals")
    .insert({ user_id, title, target, current: 0, category });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  goalTitle.value = "";
  goalTarget.value = "";
  goalCategory.value = "";
  await loadGoals();
}

async function loadDashboard() {
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  await loadProfile();

  if (isStaff()) {
    adminPanel.classList.remove("hidden");
    targetUser.classList.remove("hidden");
    await loadStudents();
    await loadLeaderboard();
  } else {
    adminPanel.classList.add("hidden");
    targetUser.classList.add("hidden");
  }

  await loadLogs();
  await loadGoals();
}

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) {
    currentProfile = await ensureProfile(currentUser);
    await loadDashboard();
  }
}

studentFilter.addEventListener("change", async (e) => {
  selectedStudentId = e.target.value;
  targetUser.value = selectedStudentId;
  await loadLogs();
  await loadGoals();
});

loginBtn.addEventListener("click", login);
signupBtn.addEventListener("click", signup);
logoutBtn.addEventListener("click", logout);
saveNameBtn.addEventListener("click", saveFullName);
addMoneyBtn.addEventListener("click", addMoneyLog);
addGoalBtn.addEventListener("click", addGoal);

checkSession();