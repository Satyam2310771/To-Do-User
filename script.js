// Storage Keys
const USERS_KEY = "taskmaster_users";
const SESSION_KEY = "taskmaster_session";
const THEME_KEY = "taskmaster_theme";

// Helper Functions
function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentSession() {
  return localStorage.getItem(SESSION_KEY);
}

function setSession(email) {
  email ? localStorage.setItem(SESSION_KEY, email) : localStorage.removeItem(SESSION_KEY);
}

function findUserByEmail(email) {
  return getUsers().find(u => u.email === email) || null;
}

function updateUser(updatedUser) {
  let users = getUsers();
  const index = users.findIndex(u => u.email === updatedUser.email);
  if (index !== -1) {
    users[index] = updatedUser;
    saveUsers(users);
    return true;
  }
  return false;
}

function createUser(name, email, password) {
  const users = getUsers();
  if (users.find(u => u.email === email)) return false;
  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: email.toLowerCase(),
    password: password,
    tasks: [],
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  return true;
}

// Task Operations
function getCurrentUserTasks() {
  const email = getCurrentSession();
  if (!email) return [];
  const user = findUserByEmail(email);
  return user?.tasks || [];
}

function saveCurrentUserTasks(tasks) {
  const email = getCurrentSession();
  if (!email) return false;
  const user = findUserByEmail(email);
  if (!user) return false;
  user.tasks = tasks;
  return updateUser(user);
}

function addTask(text, priority, dueDate) {
  if (!text.trim()) return false;
  const tasks = getCurrentUserTasks();
  const newTask = {
    id: Date.now(),
    text: text.trim(),
    completed: false,
    priority: priority || 'medium',
    dueDate: dueDate || '',
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  saveCurrentUserTasks(tasks);
  showToast('✅ Task added successfully!', 'success');
  return true;
}

function toggleTaskCompletion(taskId) {
  let tasks = getCurrentUserTasks();
  tasks = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
  saveCurrentUserTasks(tasks);
  updateStats();
}

function deleteTask(taskId) {
  let tasks = getCurrentUserTasks();
  tasks = tasks.filter(t => t.id !== taskId);
  saveCurrentUserTasks(tasks);
  showToast('🗑️ Task deleted', 'info');
  renderTodoList();
  updateStats();
}

function editTask(taskId, newText) {
  let tasks = getCurrentUserTasks();
  tasks = tasks.map(t => t.id === taskId ? { ...t, text: newText } : t);
  saveCurrentUserTasks(tasks);
  showToast('✏️ Task updated', 'success');
  renderTodoList();
}

function clearCompletedTasks() {
  let tasks = getCurrentUserTasks();
  const completedCount = tasks.filter(t => t.completed).length;
  tasks = tasks.filter(t => !t.completed);
  saveCurrentUserTasks(tasks);
  showToast(`Cleared ${completedCount} completed tasks`, 'info');
  renderTodoList();
  updateStats();
}

// Export Tasks
function exportTasks() {
  const tasks = getCurrentUserTasks();
  const data = {
    exportDate: new Date().toISOString(),
    user: findUserByEmail(getCurrentSession())?.name,
    tasks: tasks
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskmaster_backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Tasks exported successfully!', 'success');
}

// Filtering & Sorting
function filterAndSortTasks() {
  let tasks = getCurrentUserTasks();
  const searchTerm = document.getElementById('searchTasks')?.value.toLowerCase() || '';
  const priorityFilter = document.getElementById('filterPriority')?.value || 'all';
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';
  const sortBy = document.getElementById('sortBy')?.value || 'date';

  // Filter
  tasks = tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(searchTerm);
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && task.completed) ||
      (statusFilter === 'pending' && !task.completed);
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Sort
  tasks.sort((a, b) => {
    if (sortBy === 'date') return b.id - a.id;
    if (sortBy === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    if (sortBy === 'alphabetical') return a.text.localeCompare(b.text);
    return 0;
  });

  return tasks;
}

// Render Todo List
function renderTodoList() {
  const container = document.getElementById('taskListContainer');
  if (!container) return;
  
  const tasks = filterAndSortTasks();
  
  if (!tasks.length) {
    container.innerHTML = '<li class="empty-tasks"><i class="fas fa-clipboard-list"></i> No tasks found. Add some tasks!</li>';
    return;
  }
  
  container.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';
    
    li.innerHTML = `
      <div class="task-content">
        <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''} data-id="${task.id}">
        <span class="task-text">${escapeHtml(task.text)}</span>
        <span class="priority-badge priority-${task.priority}">
          ${task.priority === 'high' ? '🔥 High' : task.priority === 'medium' ? '📘 Medium' : '✅ Low'}
        </span>
        ${task.dueDate ? `<span class="due-date"><i class="far fa-calendar-alt"></i> ${formatDate(task.dueDate)}</span>` : ''}
        <div class="task-actions">
          <button class="edit-task" data-id="${task.id}"><i class="fas fa-edit"></i></button>
          <button class="delete-task" data-id="${task.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    
    container.appendChild(li);
  });
  
  // Attach event listeners
  document.querySelectorAll('.task-check').forEach(cb => {
    cb.addEventListener('change', (e) => toggleTaskCompletion(parseInt(e.target.dataset.id)));
  });
  
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id);
      const task = getCurrentUserTasks().find(t => t.id === id);
      const newText = prompt('Edit task:', task?.text);
      if (newText && newText.trim()) editTask(id, newText);
    });
  });
  
  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Delete this task?')) {
        deleteTask(parseInt(e.currentTarget.dataset.id));
      }
    });
  });
}

// Update Statistics
function updateStats() {
  const tasks = getCurrentUserTasks();
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  document.getElementById('totalTasks').textContent = total;
  document.getElementById('completedTasks').textContent = completed;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBarFill').style.width = `${percent}%`;
}

// UI Helpers
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const themeIcon = document.querySelector('#themeToggle i');
  if (themeIcon) {
    themeIcon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  setTheme(currentTheme === 'light' ? 'dark' : 'light');
  showToast('Theme changed', 'info');
}

// Auth Functions
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showLoginError('❌ Email and password are required');
    return;
  }
  
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    showLoginError('❌ Invalid email or password');
    return;
  }
  
  setSession(email);
  showTodoPanel();
  showToast(`Welcome back, ${user.name}!`, 'success');
}

function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  
  if (!name || !email || !password) {
    showSignupError('All fields are required');
    return;
  }
  
  if (password.length < 6) {
    showSignupError('Password must be at least 6 characters');
    return;
  }
  
  if (createUser(name, email, password)) {
    setSession(email);
    showTodoPanel();
    showToast(`Welcome to TaskMaster Pro, ${name}!`, 'success');
  } else {
    showSignupError('Email already exists');
  }
}

function handleLogout() {
  setSession(null);
  showAuthPanel();
  showToast('Logged out successfully', 'info');
}

// Panel Switching
function showAuthPanel() {
  document.getElementById('authPanel').classList.remove('hidden');
  document.getElementById('todoPanel').classList.add('hidden');
}

function showTodoPanel() {
  document.getElementById('authPanel').classList.add('hidden');
  document.getElementById('todoPanel').classList.remove('hidden');
  renderTodoList();
  updateStats();
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  const user = findUserByEmail(getCurrentSession());
  if (user) {
    document.getElementById('activeUsername').innerHTML = `<i class="fas fa-user-circle"></i> ${user.name}`;
  }
}

function showLoginError(msg) {
  const errDiv = document.getElementById('loginError');
  errDiv.textContent = msg;
  errDiv.classList.remove('hidden');
  setTimeout(() => errDiv.classList.add('hidden'), 3000);
}

function showSignupError(msg) {
  const errDiv = document.getElementById('signupError');
  errDiv.textContent = msg;
  errDiv.classList.remove('hidden');
  setTimeout(() => errDiv.classList.add('hidden'), 3000);
}

// Event Listeners Setup
function setupEventListeners() {
  document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
  document.getElementById('signupBtn')?.addEventListener('click', handleSignup);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('addTaskBtn')?.addEventListener('click', () => {
    const text = document.getElementById('taskInput').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    if (addTask(text, priority, dueDate)) {
      document.getElementById('taskInput').value = '';
      document.getElementById('taskDueDate').value = '';
      renderTodoList();
      updateStats();
    } else {
      showToast('Please enter a task', 'error');
    }
  });
  
  document.getElementById('clearCompletedBtn')?.addEventListener('click', clearCompletedTasks);
  document.getElementById('exportTasksBtn')?.addEventListener('click', exportTasks);
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  
  document.getElementById('showSignupLink')?.addEventListener('click', () => {
    document.getElementById('loginFormSection').classList.add('hidden');
    document.getElementById('signupFormSection').classList.remove('hidden');
  });
  
  document.getElementById('showLoginFromSignup')?.addEventListener('click', () => {
    document.getElementById('signupFormSection').classList.add('hidden');
    document.getElementById('loginFormSection').classList.remove('hidden');
  });
  
  document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
    document.getElementById('signupFormSection').classList.add('hidden');
    document.getElementById('loginFormSection').classList.remove('hidden');
  });
  
  document.getElementById('searchTasks')?.addEventListener('input', () => renderTodoList());
  document.getElementById('filterPriority')?.addEventListener('change', () => renderTodoList());
  document.getElementById('filterStatus')?.addEventListener('change', () => renderTodoList());
  document.getElementById('sortBy')?.addEventListener('change', () => renderTodoList());
  
  document.getElementById('taskInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('addTaskBtn').click();
  });
}

// Initialize App
function init() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(savedTheme);
  setupEventListeners();
  
  const session = getCurrentSession();
  if (session && findUserByEmail(session)) {
    showTodoPanel();
  } else {
    showAuthPanel();
  }
}

// Start App
init();