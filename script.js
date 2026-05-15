
  // ---------- STORAGE KEYS ----------
  const USERS_KEY = "taskflow_users";
  const SESSION_KEY = "taskflow_session";   // stores logged in user email

  // ---------- Helper functions for storage ----------
  function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch(e) { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // get current logged in user from session
  function getCurrentSessionEmail() {
    return localStorage.getItem(SESSION_KEY);
  }

  function setSession(email) {
    if (email) localStorage.setItem(SESSION_KEY, email);
    else localStorage.removeItem(SESSION_KEY);
  }

  // find user object by email
  function findUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email) || null;
  }

  // update user (full replace)
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

  // create new user (signup)
  function createUser(name, email, password) {
    const users = getUsers();
    if (users.find(u => u.email === email)) return false; // duplicate email
    const newUser = {
      id: Date.now() + Math.random().toString(36),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,  // plaintext for demo (in real world hash)
      tasks: []            // each task: { id, text, completed }
    };
    users.push(newUser);
    saveUsers(users);
    return true;
  }

  // ----- TASK HELPERS (per user) -----
  function getCurrentUserTasks() {
    const email = getCurrentSessionEmail();
    if (!email) return [];
    const user = findUserByEmail(email);
    return user ? (user.tasks || []) : [];
  }

  function saveCurrentUserTasks(tasks) {
    const email = getCurrentSessionEmail();
    if (!email) return false;
    const user = findUserByEmail(email);
    if (!user) return false;
    user.tasks = tasks;
    return updateUser(user);
  }

  // add new task
  function addTask(taskText) {
    if (!taskText.trim()) return false;
    const tasks = getCurrentUserTasks();
    const newTask = {
      id: Date.now() + Math.random().toString(36),
      text: taskText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    saveCurrentUserTasks(tasks);
    return true;
  }

  function toggleTaskCompletion(taskId) {
    let tasks = getCurrentUserTasks();
    tasks = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    saveCurrentUserTasks(tasks);
  }

  function deleteTask(taskId) {
    let tasks = getCurrentUserTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    saveCurrentUserTasks(tasks);
  }

  function clearCompletedTasks() {
    let tasks = getCurrentUserTasks();
    tasks = tasks.filter(t => !t.completed);
    saveCurrentUserTasks(tasks);
  }

  // ---------- UI RENDER: To-Do List ----------
  function renderTodoList() {
    const container = document.getElementById("taskListContainer");
    if (!container) return;
    const tasks = getCurrentUserTasks();
    const sessionEmail = getCurrentSessionEmail();
    const user = sessionEmail ? findUserByEmail(sessionEmail) : null;
    const usernameSpan = document.getElementById("activeUsername");
    if (usernameSpan && user) usernameSpan.innerText = user.name || user.email.split('@')[0];

    if (!tasks.length) {
      container.innerHTML = `<li class="empty-tasks">📭 No tasks yet. Add something productive!</li>`;
      return;
    }

    container.innerHTML = "";
    tasks.forEach(task => {
      const li = document.createElement("li");
      const taskDiv = document.createElement("div");
      taskDiv.className = "task-content";

      const checkBox = document.createElement("input");
      checkBox.type = "checkbox";
      checkBox.className = "task-check";
      checkBox.checked = task.completed;
      checkBox.addEventListener("change", (e) => {
        e.stopPropagation();
        toggleTaskCompletion(task.id);
        renderTodoList();   // re-render after change
      });

      const taskTextSpan = document.createElement("span");
      taskTextSpan.className = "task-text";
      taskTextSpan.innerText = task.text;

      taskDiv.appendChild(checkBox);
      taskDiv.appendChild(taskTextSpan);

      const actionDiv = document.createElement("div");
      actionDiv.className = "task-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.innerText = "Delete";
      deleteBtn.classList.add("danger");
      deleteBtn.style.background = "#5e2a2a";
      deleteBtn.addEventListener("click", () => {
        deleteTask(task.id);
        renderTodoList();
      });

      actionDiv.appendChild(deleteBtn);
      li.appendChild(taskDiv);
      li.appendChild(actionDiv);

      if (task.completed) li.classList.add("completed");
      container.appendChild(li);
    });
  }

  // ---------- UI SWITCH (auth <-> todo) ----------
  function showAuthPanel() {
    document.getElementById("authPanel").classList.remove("hidden");
    document.getElementById("todoPanel").classList.add("hidden");
    // reset potential error messages
    clearAuthErrors();
    // clear input fields for better UX
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
    document.getElementById("signupName").value = "";
    document.getElementById("signupEmail").value = "";
    document.getElementById("signupPassword").value = "";
  }

  function showTodoPanel() {
    document.getElementById("authPanel").classList.add("hidden");
    document.getElementById("todoPanel").classList.remove("hidden");
    renderTodoList();    // load tasks for logged user
  }

  function clearAuthErrors() {
    const loginErr = document.getElementById("loginError");
    const signupErr = document.getElementById("signupError");
    if(loginErr) loginErr.classList.add("hidden");
    if(signupErr) signupErr.classList.add("hidden");
    if(loginErr) loginErr.innerText = "";
    if(signupErr) signupErr.innerText = "";
  }

  function showLoginError(message) {
    const errDiv = document.getElementById("loginError");
    errDiv.innerText = message;
    errDiv.classList.remove("hidden");
  }

  function showSignupError(message) {
    const errDiv = document.getElementById("signupError");
    errDiv.innerText = message;
    errDiv.classList.remove("hidden");
  }

  // ---------- AUTH LOGIC ----------
  function handleLogin() {
    clearAuthErrors();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) {
      showLoginError("❌ Email and password are required.");
      return;
    }
    const user = findUserByEmail(email);
    if (!user) {
      showLoginError("No account found with this email.");
      return;
    }
    if (user.password !== password) {
      showLoginError("Incorrect password. Try again.");
      return;
    }
    // success
    setSession(email);
    showTodoPanel();
  }

  function handleSignup() {
    clearAuthErrors();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    if (!name || !email || !password) {
      showSignupError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      showSignupError("Password must be at least 6 characters.");
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      showSignupError("Enter a valid email address.");
      return;
    }
    const success = createUser(name, email, password);
    if (!success) {
      showSignupError("Email already registered. Try logging in.");
      return;
    }
    // auto-login after signup
    setSession(email);
    showTodoPanel();
  }

  function handleLogout() {
    setSession(null);
    showAuthPanel();
    // reset to login form visibility
    document.getElementById("loginFormSection").classList.remove("hidden");
    document.getElementById("signupFormSection").classList.add("hidden");
    clearAuthErrors();
  }

  // ---------- Task UI events ----------
  function setupTodoInteractions() {
    const addBtn = document.getElementById("addTaskBtn");
    const taskInput = document.getElementById("taskInput");
    const clearCompletedBtn = document.getElementById("clearCompletedBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (addBtn) {
      addBtn.onclick = () => {
        const text = taskInput.value;
        if (addTask(text)) {
          taskInput.value = "";
          renderTodoList();
        } else {
          // subtle feedback
          taskInput.placeholder = "Please enter a task!";
          setTimeout(() => { taskInput.placeholder = "Write a new task..."; }, 1500);
        }
      };
    }
    if (taskInput) {
      taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addBtn.click();
        }
      });
    }
    if (clearCompletedBtn) {
      clearCompletedBtn.onclick = () => {
        clearCompletedTasks();
        renderTodoList();
      };
    }
    if (logoutBtn) {
      logoutBtn.onclick = () => handleLogout();
    }
  }

  // ---------- AUTH PANEL TOGGLE (login/signup forms) ----------
  function bindAuthToggles() {
    const showSignupLink = document.getElementById("showSignupLink");
    const showLoginFromSignup = document.getElementById("showLoginFromSignup");
    const backToLoginBtn = document.getElementById("backToLoginBtn");
    const loginSection = document.getElementById("loginFormSection");
    const signupSection = document.getElementById("signupFormSection");

    if (showSignupLink) {
      showSignupLink.onclick = () => {
        clearAuthErrors();
        loginSection.classList.add("hidden");
        signupSection.classList.remove("hidden");
      };
    }
    if (showLoginFromSignup) {
      showLoginFromSignup.onclick = () => {
        clearAuthErrors();
        signupSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
      };
    }
    if (backToLoginBtn) {
      backToLoginBtn.onclick = () => {
        clearAuthErrors();
        signupSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
      };
    }
  }

  // ---------- INITIAL LOAD (session check) ----------
  function initApp() {
    bindAuthToggles();
    setupTodoInteractions();

    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    if (loginBtn) loginBtn.onclick = handleLogin;
    if (signupBtn) signupBtn.onclick = handleSignup;

    // check for existing session
    const currentEmail = getCurrentSessionEmail();
    if (currentEmail) {
      const user = findUserByEmail(currentEmail);
      if (user) {
        showTodoPanel();
      } else {
        // invalid session, clear it
        setSession(null);
        showAuthPanel();
      }
    } else {
      showAuthPanel();
    }
  }

  // start everything
  initApp();
