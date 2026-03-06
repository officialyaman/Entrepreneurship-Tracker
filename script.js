import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hrcaisojgvuulwubaqez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyY2Fpc29qZ3Z1dWx3dWJhcWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjgyNTksImV4cCI6MjA4ODQwNDI1OX0.lavxJpKcDdVPcf6sKDvXmSRNsP092o8TabCfc6g-uSk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authBox = document.getElementById("authBox");
const dashboard = document.getElementById("dashboard");
const authMessage = document.getElementById("authMessage");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const fullNameInput = document.getElementById("fullName");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

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

let currentUser = null;
let currentProfile = null;

function showMessage(msg, isError = false) {
  authMessage.textContent = msg;
  authMessage.style.color = isError ? "#dc2626" : "#374151";
}

async function ensureProfile(user, fullNameFromSignup = "") {
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error(selectError);
    return null;
  }

  if (existingProfile) return existingProfile;

  const newProfile = {
    id: user.id,
    full_name: fullNameFromSignup || user.email.split("@")[0],
    role: "student"
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(newProfile)
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

  if (!email || !password) {
    showMessage("Enter email and password.", true);
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

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

  if (!email || !password || !fullName) {
    showMessage("Enter full name, email, and password.", true);
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  if (!data.user) {
    showMessage("Signup complete. Check your email if confirmation is enabled.");
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
  dashboard.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  showMessage("Logged out.");
}

async function loadProfile() {
  if (!currentUser) return;

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
}

async function loadLogs() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("money_logs")
    .select("*")
    .order("created_at", { ascending: false });

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
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

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

async function addMoneyLog() {
  if (!currentUser) return;

  const title = moneyTitle.value.trim();
  const amount = parseFloat(moneyAmount.value);
  const type = moneyType.value;

  if (!title || isNaN(amount) || amount <= 0) {
    alert("Enter a valid title and amount.");
    return;
  }

  const { error } = await supabase
    .from("money_logs")
    .insert({
      user_id: currentUser.id,
      title,
      amount,
      type
    });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  moneyTitle.value = "";
  moneyAmount.value = "";
  moneyType.value = "income";
  await loadLogs();
}

async function addGoal() {
  if (!currentUser) return;

  const title = goalTitle.value.trim();
  const target = parseFloat(goalTarget.value);
  const category = goalCategory.value.trim() || "General";

  if (!title || isNaN(target) || target <= 0) {
    alert("Enter a valid goal and target.");
    return;
  }

  const { error } = await supabase
    .from("goals")
    .insert({
      user_id: currentUser.id,
      title,
      target,
      current: 0,
      category
    });

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
  authBox.classList.remove("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  await loadProfile();
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

loginBtn.addEventListener("click", login);
signupBtn.addEventListener("click", signup);
logoutBtn.addEventListener("click", logout);
addMoneyBtn.addEventListener("click", addMoneyLog);
addGoalBtn.addEventListener("click", addGoal);

checkSession();
