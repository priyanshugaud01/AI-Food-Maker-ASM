/**
 * TasteAI - AI Food Maker & Recipe Generator
 * Pure Vanilla JavaScript Application Logic
 * No external frontend frameworks.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentUser: null,
    currentProfile: null,
    currentView: 'dashboard',
    recipes: [],
    favorites: [],
    activeRecipe: null,
    theme: localStorage.getItem('tasteai_theme') || 'light',
  };

  // DOM Elements Cache
  const dom = {};

  // Initialize Application
  document.addEventListener('DOMContentLoaded', () => {
    initDomElements();
    applyTheme(state.theme);
    setupEventListeners();
    checkAuthSession();
    checkBackendHealth();
  });

  function initDomElements() {
    dom.authWrapper = document.getElementById('auth-wrapper');
    dom.appLayout = document.getElementById('app-layout');
    dom.toastContainer = document.getElementById('toast-container');
    dom.mobileDrawer = document.getElementById('mobile-drawer');
    dom.mobileDrawerOverlay = document.getElementById('mobile-drawer-overlay');
    dom.breadcrumbTitle = document.getElementById('breadcrumb-title');

    // Navigation Links
    dom.navLinks = document.querySelectorAll('[data-nav]');
    dom.viewSections = document.querySelectorAll('.view-section');

    // User Profile in Topbar, Sidebar & Drawer
    dom.userAvatar = document.getElementById('header-user-avatar');
    dom.userName = document.getElementById('header-user-name');
    dom.sidebarAvatar = document.getElementById('sidebar-user-avatar');
    dom.sidebarName = document.getElementById('sidebar-user-name');
    dom.drawerAvatar = document.getElementById('drawer-user-avatar');
    dom.drawerName = document.getElementById('drawer-user-name');
    dom.badgeRecipes = document.getElementById('sidebar-badge-recipes');
    dom.badgeFavs = document.getElementById('sidebar-badge-favs');

    // Auth Forms
    dom.authTabs = document.querySelectorAll('.auth-tab-btn');
    dom.loginForm = document.getElementById('login-form');
    dom.registerForm = document.getElementById('register-form');
    dom.guestBtn = document.getElementById('btn-guest-login');
    dom.forgotPassBtn = document.getElementById('btn-forgot-password');

    // Recipe Generator
    dom.genForm = document.getElementById('recipe-generator-form');
    dom.ingredientsInput = document.getElementById('gen-ingredients');
    dom.loadingBox = document.getElementById('loading-chef-box');
    dom.recipeShowcase = document.getElementById('recipe-showcase-container');

    // Ingredient Finder ("What Can I Cook?")
    dom.finderForm = document.getElementById('ingredient-finder-form');
    dom.finderIngredients = document.getElementById('finder-ingredients');
    dom.finderResults = document.getElementById('finder-results-container');

    // Modals
    dom.recipeModal = document.getElementById('recipe-detail-modal');
    dom.modalCloseBtn = document.getElementById('modal-close-btn');
    dom.modalBody = document.getElementById('recipe-modal-body');
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tasteai_theme', theme);

    // Update Topbar Theme Button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }

    // Update Sidebar Theme Button
    const sideIcon = document.getElementById('sidebar-theme-icon');
    const sideText = document.getElementById('sidebar-theme-text');
    if (sideIcon && sideText) {
      sideIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
      sideText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }

    // Update Drawer Theme Button
    const drawerIcon = document.getElementById('drawer-theme-icon');
    if (drawerIcon) {
      drawerIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme} mode`, 'info');
  }

  // ==========================================
  // TOAST NOTIFICATIONS (No window.alert)
  // ==========================================
  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // ==========================================
  // AUTHENTICATION FLOW
  // ==========================================
  async function checkAuthSession() {
    const user = window.TasteAISupabase.getCurrentUser();
    if (user) {
      state.currentUser = user;
      await onLoginSuccess(user);
    } else {
      showAuthScreen();
    }
  }

  function showAuthScreen() {
    state.currentUser = null;
    dom.authWrapper.style.display = 'flex';
    dom.appLayout.style.display = 'none';
  }

  function updateUserIdentity(name) {
    const displayName = name || 'Chef';
    const initial = displayName.charAt(0).toUpperCase();

    if (dom.userName) dom.userName.textContent = displayName;
    if (dom.userAvatar) dom.userAvatar.textContent = initial;
    if (dom.sidebarName) dom.sidebarName.textContent = displayName;
    if (dom.sidebarAvatar) dom.sidebarAvatar.textContent = initial;
    if (dom.drawerName) dom.drawerName.textContent = displayName;
    if (dom.drawerAvatar) dom.drawerAvatar.textContent = initial;
  }

  async function onLoginSuccess(user) {
    state.currentUser = user;
    dom.authWrapper.style.display = 'none';
    dom.appLayout.style.display = '';

    // Fetch Profile
    const profile = await window.TasteAISupabase.getProfile(user.id);
    state.currentProfile = profile;

    // Update Header, Sidebar & Drawer Profile
    const displayName = profile.name || user.email.split('@')[0] || 'Chef';
    updateUserIdentity(displayName);

    // Populate user profile form
    populateProfileForm(profile);

    // Load Recipes & Data
    await loadRecipesData();

    // Show Dashboard by default
    navigateTo('dashboard');
    showToast(`Welcome back, Chef ${displayName}!`, 'success');
  }

  // ==========================================
  // DATA LOADING & SYNC
  // ==========================================
  async function loadRecipesData() {
    if (!state.currentUser) return;
    const recipes = await window.TasteAISupabase.getRecipes(state.currentUser.id);
    state.recipes = recipes;
    state.favorites = recipes.filter(r => r.is_favorite);

    // Update Sidebar Counter Badges
    if (dom.badgeRecipes) dom.badgeRecipes.textContent = recipes.length;
    if (dom.badgeFavs) dom.badgeFavs.textContent = state.favorites.length;

    renderDashboard();
    renderMyRecipes();
    renderFavorites();
    renderNutritionView();
  }

  // ==========================================
  // VIEW ROUTING & RESPONSIVE DRAWER
  // ==========================================
  function openMobileDrawer() {
    if (dom.mobileDrawer) dom.mobileDrawer.classList.add('active');
    if (dom.mobileDrawerOverlay) dom.mobileDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    if (dom.mobileDrawer) dom.mobileDrawer.classList.remove('active');
    if (dom.mobileDrawerOverlay) dom.mobileDrawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateTo(viewId) {
    state.currentView = viewId;

    // Update active nav links across header, sidebar, drawer, and bottom navigation
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (link.getAttribute('data-nav') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile drawer if open
    closeMobileDrawer();

    // Update breadcrumb title
    const titles = {
      'dashboard': 'Home & Dashboard',
      'ai-maker': 'AI Recipe Maker',
      'ingredient-finder': 'What Can I Cook? (Pantry)',
      'my-recipes': 'My Saved Recipes',
      'favorites': 'Favorite Dishes',
      'nutrition': 'Nutrition Analytics',
      'profile': 'Chef Profile',
      'settings': 'Supabase Settings'
    };
    if (dom.breadcrumbTitle && titles[viewId]) {
      dom.breadcrumbTitle.textContent = titles[viewId];
    }

    // Show the active view section
    dom.viewSections.forEach(section => {
      if (section.id === `view-${viewId}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh view specific components
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'my-recipes') renderMyRecipes();
    if (viewId === 'favorites') renderFavorites();
    if (viewId === 'nutrition') renderNutritionView();
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    // Nav Click handlers
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-nav');
        if (view === 'logout') {
          handleLogout();
        } else {
          navigateTo(view);
        }
      });
    });

    // Mobile Drawer Toggle & Close
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', openMobileDrawer);
    }
    const drawerCloseBtn = document.getElementById('drawer-close-btn');
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', closeMobileDrawer);
    }
    if (dom.mobileDrawerOverlay) {
      dom.mobileDrawerOverlay.addEventListener('click', closeMobileDrawer);
    }

    // Theme Toggles (Topbar, Sidebar, Drawer)
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
    document.getElementById('sidebar-theme-btn')?.addEventListener('click', toggleTheme);
    document.getElementById('drawer-theme-btn')?.addEventListener('click', toggleTheme);

    // Auth Tabs Switch
    dom.authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        dom.authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        if (target === 'login') {
          dom.loginForm.style.display = 'block';
          dom.registerForm.style.display = 'none';
        } else {
          dom.loginForm.style.display = 'none';
          dom.registerForm.style.display = 'block';
        }
      });
    });

    // Login Form Submit
    dom.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
      }

      const submitBtn = dom.loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      const { user, error } = await window.TasteAISupabase.signIn(email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to TasteAI';

      if (error) {
        showToast(error.message || 'Login failed', 'error');
      } else {
        await onLoginSuccess(user);
      }
    });

    // Register Form Submit
    dom.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      if (!email || !password) {
        showToast('Please provide an email and password.', 'error');
        return;
      }
      if (password.length < 6) {
        showToast('Password should be at least 6 characters.', 'error');
        return;
      }

      const submitBtn = dom.registerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      const { user, error } = await window.TasteAISupabase.signUp(email, password, name);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Chef Account';

      if (error) {
        showToast(error.message || 'Registration failed', 'error');
      } else {
        showToast('Account created successfully!', 'success');
        await onLoginSuccess(user);
      }
    });

    // Guest Login Button
    dom.guestBtn.addEventListener('click', async () => {
      const guestUser = window.TasteAISupabase.signInGuest();
      await onLoginSuccess(guestUser);
    });

    // Forgot Password Button
    dom.forgotPassBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim() || 'your email';
      showToast(`Password reset link sent to ${email} (check inbox)`, 'info');
    });

    // Clickable Ingredient Chips
    document.querySelectorAll('.ingredient-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const item = chip.getAttribute('data-ingredient');
        if (!item) return;
        const current = dom.ingredientsInput.value.trim();
        if (current) {
          const list = current.split(',').map(s => s.trim());
          if (!list.includes(item)) {
            dom.ingredientsInput.value = current + ', ' + item;
          }
        } else {
          dom.ingredientsInput.value = item;
        }
        dom.ingredientsInput.focus();
      });
    });

    // Quick Dashboard Launcher
    const quickLaunchForm = document.getElementById('dashboard-quick-form');
    if (quickLaunchForm) {
      quickLaunchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const quickIngs = document.getElementById('dashboard-quick-ingredients').value.trim();
        if (quickIngs) {
          dom.ingredientsInput.value = quickIngs;
          navigateTo('ai-maker');
          dom.genForm.dispatchEvent(new Event('submit'));
        } else {
          navigateTo('ai-maker');
        }
      });
    }

    // AI Recipe Generator Form Submit
    dom.genForm.addEventListener('submit', handleGenerateRecipe);

    // "What Can I Cook?" Finder Submit
    dom.finderForm.addEventListener('submit', handleFindRecipes);

    // Profile Form Save
    const profileForm = document.getElementById('profile-edit-form');
    if (profileForm) {
      profileForm.addEventListener('submit', handleSaveProfile);
    }

    // Settings Supabase Config Form
    const settingsForm = document.getElementById('supabase-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', handleSaveSupabaseConfig);
    }

    // Copy SQL Button
    const copySqlBtn = document.getElementById('btn-copy-sql');
    if (copySqlBtn) {
      copySqlBtn.addEventListener('click', copySupabaseSql);
    }

    // Modal Close
    if (dom.modalCloseBtn) {
      dom.modalCloseBtn.addEventListener('click', closeModal);
    }
    window.addEventListener('click', (e) => {
      if (e.target === dom.recipeModal) closeModal();
    });

    // Search and Filter in My Recipes
    const recipeSearch = document.getElementById('recipes-search-input');
    const cuisineFilter = document.getElementById('recipes-filter-cuisine');
    const mealFilter = document.getElementById('recipes-filter-meal');
    if (recipeSearch) recipeSearch.addEventListener('input', filterMyRecipes);
    if (cuisineFilter) cuisineFilter.addEventListener('change', filterMyRecipes);
    if (mealFilter) mealFilter.addEventListener('change', filterMyRecipes);
  }

  // ==========================================
  // RECIPE GENERATION (AI + PYTHON BACKEND)
  // ==========================================
  async function handleGenerateRecipe(e) {
    e.preventDefault();
    const ingredients = dom.ingredientsInput.value.trim();
    if (!ingredients) {
      showToast('Please enter at least 1 or 2 ingredients!', 'error');
      dom.ingredientsInput.focus();
      return;
    }

    // Collect form options
    const mealType = document.querySelector('input[name="meal_type"]:checked')?.value || 'Dinner';
    const dietaryType = document.querySelector('input[name="dietary_type"]:checked')?.value || 'Vegetarian';
    const cuisine = document.querySelector('input[name="cuisine"]:checked')?.value || 'Indian';
    const cookingTime = document.querySelector('input[name="cooking_time"]:checked')?.value || '30 minutes';
    const difficulty = document.querySelector('input[name="difficulty"]:checked')?.value || 'Medium';
    const servings = parseInt(document.getElementById('gen-servings').value, 10) || 2;
    const nutritionGoal = state.currentProfile?.nutrition_goal || 'Balanced Nutrition';

    // Show loading state
    dom.loadingBox.classList.add('active');
    dom.recipeShowcase.innerHTML = '';
    dom.loadingBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Cycling culinary tips during loading
    const tips = [
      'Chopping vegetables uniformly guarantees even caramelization.',
      'Blooming spices in gentle warm fat releases essential culinary aromatics.',
      'Balancing acidity, salt, and heat transforms good dishes into extraordinary ones.',
      'Allowing cooked proteins or grains to rest locks in delicate moisture.'
    ];
    let tipIdx = 0;
    const tipEl = document.getElementById('loading-tip-text');
    const tipInterval = setInterval(() => {
      tipIdx = (tipIdx + 1) % tips.length;
      if (tipEl) tipEl.textContent = `Chef tip: ${tips[tipIdx]}`;
    }, 2800);

    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          meal_type: mealType,
          dietary_type: dietaryType,
          cuisine,
          cooking_time: cookingTime,
          difficulty,
          servings,
          nutrition_goal: nutritionGoal
        })
      });

      clearInterval(tipInterval);
      dom.loadingBox.classList.remove('active');

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const recipe = await response.json();
      state.activeRecipe = recipe;
      renderGeneratedRecipe(recipe);
      showToast(`Recipe "${recipe.recipe_name}" created successfully!`, 'success');

      // Scroll to generated recipe
      dom.recipeShowcase.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      clearInterval(tipInterval);
      dom.loadingBox.classList.remove('active');
      console.error('[TasteAI] Recipe generation error:', err);
      showToast('Could not complete recipe generation. Please try again.', 'error');
    }
  }

  // ==========================================
  // RENDER GENERATED RECIPE CARD
  // ==========================================
  function renderGeneratedRecipe(recipe) {
    const isFav = state.favorites.some(f => f.recipe_name === recipe.recipe_name || f.id === recipe.id);

    const ingredientsHtml = (recipe.ingredients || []).map((ing, idx) => `
      <li class="ingredient-item">
        <input type="checkbox" id="ing-chk-${idx}" class="ingredient-checkbox">
        <label for="ing-chk-${idx}" class="ingredient-item-text">
          <span class="ingredient-qty">${escapeHtml(ing.quantity || '')}</span>
          <strong>${escapeHtml(ing.item || '')}</strong>
          ${ing.notes ? `<span class="ingredient-notes">${escapeHtml(ing.notes)}</span>` : ''}
        </label>
      </li>
    `).join('');

    const instructionsHtml = (recipe.instructions || []).map((step, idx) => `
      <div class="instruction-step">
        <div class="step-num-bubble">${idx + 1}</div>
        <div class="step-text">${escapeHtml(step)}</div>
      </div>
    `).join('');

    const tipsHtml = (recipe.cooking_tips || []).map(tip => `
      <li>${escapeHtml(tip)}</li>
    `).join('');

    dom.recipeShowcase.innerHTML = `
      <div class="recipe-showcase-card">
        <div class="recipe-header-banner">
          <div class="recipe-meta-badges">
            <span class="badge badge-cuisine">🌍 ${escapeHtml(recipe.cuisine)}</span>
            <span class="badge badge-meal">🍽️ ${escapeHtml(recipe.meal_type)}</span>
            <span class="badge badge-diet">🥗 ${escapeHtml(recipe.dietary_type)}</span>
            <span class="badge badge-time">⏱️ ${escapeHtml(recipe.cooking_time)}</span>
          </div>
          <h2 class="recipe-hero-title">${escapeHtml(recipe.recipe_name)}</h2>
          <p class="recipe-hero-desc">${escapeHtml(recipe.description)}</p>

          <div class="recipe-metrics-grid">
            <div class="metric-pill">
              <div class="metric-pill-val">${escapeHtml(recipe.preparation_time || '10m')}</div>
              <div class="metric-pill-lbl">Prep Time</div>
            </div>
            <div class="metric-pill">
              <div class="metric-pill-val">${escapeHtml(recipe.cooking_time || '20m')}</div>
              <div class="metric-pill-lbl">Cook Time</div>
            </div>
            <div class="metric-pill">
              <div class="metric-pill-val">${escapeHtml(recipe.difficulty || 'Easy')}</div>
              <div class="metric-pill-lbl">Difficulty</div>
            </div>
            <div class="metric-pill">
              <div class="metric-pill-val">${escapeHtml(recipe.servings || 2)}</div>
              <div class="metric-pill-lbl">Servings</div>
            </div>
          </div>
        </div>

        <div class="nutrition-summary-card">
          <h3 class="recipe-section-title">📊 Nutrition Facts (Per Serving)</h3>
          <div class="nutrition-bars-grid">
            <div class="macro-box">
              <div class="macro-num">${recipe.calories || 0}</div>
              <div class="macro-name">Calories</div>
            </div>
            <div class="macro-box">
              <div class="macro-num">${recipe.protein || 0}g</div>
              <div class="macro-name">Protein</div>
            </div>
            <div class="macro-box">
              <div class="macro-num">${recipe.carbohydrates || 0}g</div>
              <div class="macro-name">Carbohydrates</div>
            </div>
            <div class="macro-box">
              <div class="macro-num">${recipe.fat || 0}g</div>
              <div class="macro-name">Fat</div>
            </div>
            <div class="macro-box">
              <div class="macro-num">${recipe.fiber || 0}g</div>
              <div class="macro-name">Fiber</div>
            </div>
            <div class="macro-box">
              <div class="macro-num">${recipe.sugar || 0}g</div>
              <div class="macro-name">Sugar</div>
            </div>
          </div>
        </div>

        <div class="recipe-body-grid">
          <div class="recipe-ingredients-col">
            <h3 class="recipe-section-title">🛒 Ingredients</h3>
            <ul class="ingredients-checklist">
              ${ingredientsHtml}
            </ul>
          </div>

          <div class="recipe-instructions-col">
            <h3 class="recipe-section-title">👨‍🍳 Cooking Instructions</h3>
            <div class="instructions-list">
              ${instructionsHtml}
            </div>
          </div>
        </div>

        ${tipsHtml ? `
          <div class="chef-tips-card">
            <h4>💡 Master Chef Tips</h4>
            <ul>${tipsHtml}</ul>
          </div>
        ` : ''}

        <div class="recipe-actions-bar">
          <button id="btn-save-generated-recipe" class="btn btn-primary">
            💾 Save Recipe
          </button>
          <button id="btn-fav-generated-recipe" class="btn btn-secondary ${isFav ? 'is-favorite' : ''}">
            ${isFav ? '❤️ In Favorites' : '🤍 Add to Favorites'}
          </button>
          <button id="btn-copy-recipe" class="btn btn-secondary">
            📋 Copy Recipe
          </button>
          <button id="btn-print-recipe" class="btn btn-secondary">
            🖨️ Print Recipe
          </button>
          <button id="btn-gen-another" class="btn btn-outline">
            ✨ Generate Another Recipe
          </button>
        </div>
      </div>
    `;

    // Attach Action Handlers
    document.getElementById('btn-save-generated-recipe')?.addEventListener('click', async () => {
      await saveCurrentRecipe(recipe);
    });

    document.getElementById('btn-fav-generated-recipe')?.addEventListener('click', async (e) => {
      await toggleFavCurrentRecipe(recipe, e.currentTarget);
    });

    document.getElementById('btn-copy-recipe')?.addEventListener('click', () => {
      copyRecipeToClipboard(recipe);
    });

    document.getElementById('btn-print-recipe')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btn-gen-another')?.addEventListener('click', () => {
      dom.genForm.scrollIntoView({ behavior: 'smooth' });
      dom.ingredientsInput.focus();
    });
  }

  // ==========================================
  // RECIPE ACTIONS (Save, Favorite, Copy, Print)
  // ==========================================
  async function saveCurrentRecipe(recipe) {
    if (!state.currentUser) {
      showToast('Please sign in or continue as guest to save recipes.', 'error');
      return;
    }

    try {
      const saved = await window.TasteAISupabase.saveRecipe(recipe, state.currentUser.id);
      showToast(`"${saved.recipe_name}" saved to My Recipes!`, 'success');
      await loadRecipesData();
    } catch (e) {
      showToast('Failed to save recipe.', 'error');
    }
  }

  async function toggleFavCurrentRecipe(recipe, buttonEl) {
    if (!state.currentUser) return;
    try {
      // If recipe is not saved yet, save it first
      let targetId = recipe.id;
      if (!targetId || !state.recipes.some(r => r.id === targetId)) {
        const saved = await window.TasteAISupabase.saveRecipe(recipe, state.currentUser.id);
        targetId = saved.id;
        recipe.id = saved.id;
      }

      const isFav = await window.TasteAISupabase.toggleFavorite(targetId, state.currentUser.id);
      if (buttonEl) {
        buttonEl.innerHTML = isFav ? '❤️ In Favorites' : '🤍 Add to Favorites';
      }
      showToast(isFav ? 'Added to Favorites!' : 'Removed from Favorites.', 'info');
      await loadRecipesData();
    } catch (e) {
      showToast('Could not update favorites.', 'error');
    }
  }

  function copyRecipeToClipboard(recipe) {
    const text = `
🍳 ${recipe.recipe_name} (${recipe.cuisine} • ${recipe.meal_type})
${recipe.description}

⏱️ Prep: ${recipe.preparation_time || '10m'} | Cook: ${recipe.cooking_time || '20m'} | Servings: ${recipe.servings || 2}
🔥 Calories: ${recipe.calories} kcal | Protein: ${recipe.protein}g | Carbs: ${recipe.carbohydrates}g | Fat: ${recipe.fat}g

🛒 INGREDIENTS:
${(recipe.ingredients || []).map(i => `• ${i.quantity} ${i.item} ${i.notes ? `(${i.notes})` : ''}`).join('\n')}

👨‍🍳 INSTRUCTIONS:
${(recipe.instructions || []).map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

💡 CHEF TIPS:
${(recipe.cooking_tips || []).map(t => `• ${t}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      showToast('Full recipe copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy to clipboard.', 'error');
    });
  }

  // ==========================================
  // INGREDIENT FINDER ("What Can I Cook?")
  // ==========================================
  async function handleFindRecipes(e) {
    e.preventDefault();
    const ingredients = dom.finderIngredients.value.trim();
    if (!ingredients) {
      showToast('Please enter your available ingredients!', 'error');
      dom.finderIngredients.focus();
      return;
    }

    const pantryStaples = Array.from(document.querySelectorAll('.staple-check:checked'))
      .map(cb => cb.value)
      .join(', ');

    const btn = dom.finderForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Searching culinary ideas...';
    dom.finderResults.innerHTML = '<div class="empty-state-box"><div class="simmer-pot-animation">🍲</div><p>Searching suitable recipes for your ingredients...</p></div>';

    try {
      const response = await fetch('/api/ingredient-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, pantry: pantryStaples })
      });

      btn.disabled = false;
      btn.textContent = 'Find Matching Recipes';

      if (!response.ok) throw new Error('Failed to find recipes');
      const data = await response.json();
      renderFinderSuggestions(data.suggestions || [], ingredients);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Find Matching Recipes';
      showToast('Error finding recipes. Please try again.', 'error');
    }
  }

  function renderFinderSuggestions(suggestions, originalIngredients) {
    if (!suggestions.length) {
      dom.finderResults.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">🤔</div>
          <h3 class="empty-state-title">No direct recipes found</h3>
          <p class="empty-state-desc">Try adding more staple items like onions, tomatoes, eggs or rice.</p>
        </div>
      `;
      return;
    }

    dom.finderResults.innerHTML = `
      <div class="section-header">
        <h3 class="section-title">💡 Recipes You Can Make</h3>
      </div>
      <div class="recipes-grid">
        ${suggestions.map(s => `
          <div class="recipe-card suggestion-card">
            <div>
              <div class="recipe-card-top">
                <span class="badge badge-cuisine">${escapeHtml(s.cuisine)}</span>
                <span class="match-score-badge">🔥 ${s.match_score}% Match</span>
              </div>
              <h3 class="recipe-card-title">${escapeHtml(s.name)}</h3>
              <p class="recipe-card-desc">${escapeHtml(s.description)}</p>
              
              <div style="margin: 14px 0; font-size: 0.85rem; color: var(--text-muted);">
                <strong>Matched:</strong> ${s.matched_ingredients.join(', ')}<br>
                <strong>Need from pantry:</strong> ${s.additional_needed.join(', ')}
              </div>
            </div>

            <div class="recipe-card-footer">
              <span style="font-weight: 700; font-size: 0.85rem; color: var(--primary);">⏱️ ${s.cooking_time}</span>
              <button class="btn btn-primary btn-sm btn-cook-suggestion" data-name="${escapeHtml(s.name)}" data-ingredients="${escapeHtml(originalIngredients)}">
                Cook This Dish ✨
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.btn-cook-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const ing = btn.getAttribute('data-ingredients');
        dom.ingredientsInput.value = ing;
        navigateTo('ai-maker');
        dom.genForm.dispatchEvent(new Event('submit'));
      });
    });
  }

  // ==========================================
  // DASHBOARD RENDERING
  // ==========================================
  function renderDashboard() {
    const welcomeName = state.currentProfile?.name || state.currentUser?.name || 'Chef';
    document.getElementById('dash-welcome-name').textContent = welcomeName;

    // Stats
    const totalCount = state.recipes.length;
    const favCount = state.favorites.length;
    const avgCals = totalCount > 0
      ? Math.round(state.recipes.reduce((acc, r) => acc + (r.calories || 0), 0) / totalCount)
      : 0;

    document.getElementById('stat-total-recipes').textContent = totalCount;
    document.getElementById('stat-total-favorites').textContent = favCount;
    document.getElementById('stat-avg-calories').textContent = avgCals ? `${avgCals} kcal` : '—';
    document.getElementById('stat-nutrition-score').textContent = totalCount > 0 ? '94%' : '—';

    // Recent Recipes (Up to 3)
    const recentContainer = document.getElementById('dash-recent-recipes');
    const recent = state.recipes.slice(0, 3);

    if (recent.length === 0) {
      recentContainer.innerHTML = `
        <div class="empty-state-box" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🍳</div>
          <h3 class="empty-state-title">No recipes generated yet</h3>
          <p class="empty-state-desc">Enter a few ingredients in the AI Recipe Maker to generate your first gourmet meal!</p>
          <button class="btn btn-primary" data-nav="ai-maker">Generate Your First Recipe</button>
        </div>
      `;
      recentContainer.querySelector('button')?.addEventListener('click', () => navigateTo('ai-maker'));
    } else {
      recentContainer.innerHTML = recent.map(r => createRecipeCardHtml(r)).join('');
      attachRecipeCardHandlers(recentContainer);
    }
  }

  // ==========================================
  // MY RECIPES VIEW
  // ==========================================
  function renderMyRecipes() {
    filterMyRecipes();
  }

  function filterMyRecipes() {
    const query = document.getElementById('recipes-search-input')?.value.toLowerCase().trim() || '';
    const cuisine = document.getElementById('recipes-filter-cuisine')?.value || 'all';
    const meal = document.getElementById('recipes-filter-meal')?.value || 'all';

    const filtered = state.recipes.filter(r => {
      const matchQuery = !query || r.recipe_name.toLowerCase().includes(query) ||
        (r.ingredients || []).some(i => (i.item || '').toLowerCase().includes(query));
      const matchCuisine = cuisine === 'all' || (r.cuisine || '').toLowerCase() === cuisine.toLowerCase();
      const matchMeal = meal === 'all' || (r.meal_type || '').toLowerCase() === meal.toLowerCase();
      return matchQuery && matchCuisine && matchMeal;
    });

    const grid = document.getElementById('my-recipes-grid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-box" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <h3 class="empty-state-title">No matching recipes</h3>
          <p class="empty-state-desc">Try clearing your filters or create a new recipe with the AI Recipe Maker.</p>
        </div>
      `;
    } else {
      grid.innerHTML = filtered.map(r => createRecipeCardHtml(r)).join('');
      attachRecipeCardHandlers(grid);
    }
  }

  // ==========================================
  // FAVORITES VIEW
  // ==========================================
  function renderFavorites() {
    const grid = document.getElementById('favorites-recipes-grid');
    if (!grid) return;

    const favs = state.recipes.filter(r => r.is_favorite);
    if (favs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-box" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">❤️</div>
          <h3 class="empty-state-title">No favorite recipes yet</h3>
          <p class="empty-state-desc">Click the heart icon on any recipe to add it to your favorite collection.</p>
          <button class="btn btn-secondary" data-nav="ai-maker">Generate New Recipes</button>
        </div>
      `;
      grid.querySelector('button')?.addEventListener('click', () => navigateTo('ai-maker'));
    } else {
      grid.innerHTML = favs.map(r => createRecipeCardHtml(r)).join('');
      attachRecipeCardHandlers(grid);
    }
  }

  // ==========================================
  // NUTRITION VIEW
  // ==========================================
  function renderNutritionView() {
    const count = state.recipes.length;
    let totalCals = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;

    state.recipes.forEach(r => {
      totalCals += (r.calories || 0);
      totalProtein += (r.protein || 0);
      totalCarbs += (r.carbohydrates || 0);
      totalFat += (r.fat || 0);
      totalFiber += (r.fiber || 0);
    });

    const avgCals = count ? Math.round(totalCals / count) : 0;
    const avgProtein = count ? Math.round(totalProtein / count) : 0;
    const avgCarbs = count ? Math.round(totalCarbs / count) : 0;
    const avgFat = count ? Math.round(totalFat / count) : 0;
    const avgFiber = count ? Math.round(totalFiber / count) : 0;

    document.getElementById('nutr-avg-cals').textContent = `${avgCals} kcal`;
    document.getElementById('nutr-avg-protein').textContent = `${avgProtein}g`;
    document.getElementById('nutr-avg-carbs').textContent = `${avgCarbs}g`;
    document.getElementById('nutr-avg-fat').textContent = `${avgFat}g`;
    document.getElementById('nutr-avg-fiber').textContent = `${avgFiber}g`;

    const nutrList = document.getElementById('nutrition-recipes-breakdown');
    if (nutrList) {
      nutrList.innerHTML = state.recipes.map(r => `
        <div class="stat-card" style="margin-bottom: 12px; cursor: pointer;" data-open-recipe="${r.id}">
          <div class="stat-icon-wrapper" style="background-color: var(--primary-soft); color: var(--primary);">🍽️</div>
          <div style="flex: 1;">
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 4px;">${escapeHtml(r.recipe_name)}</h4>
            <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 14px; flex-wrap: wrap;">
              <span>🔥 <strong>${r.calories || 0}</strong> kcal</span>
              <span>🍗 <strong>${r.protein || 0}g</strong> Protein</span>
              <span>🌾 <strong>${r.carbohydrates || 0}g</strong> Carbs</span>
              <span>🥑 <strong>${r.fat || 0}g</strong> Fat</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm">View Card</button>
        </div>
      `).join('');

      nutrList.querySelectorAll('[data-open-recipe]').forEach(el => {
        el.addEventListener('click', () => {
          const recId = el.getAttribute('data-open-recipe');
          const recipe = state.recipes.find(r => r.id === recId);
          if (recipe) openRecipeModal(recipe);
        });
      });
    }
  }

  // ==========================================
  // RECIPE CARD HTML HELPER
  // ==========================================
  function createRecipeCardHtml(r) {
    const isFav = r.is_favorite;
    return `
      <div class="recipe-card" data-recipe-id="${r.id}">
        <div class="recipe-card-header">
          <div class="recipe-card-top">
            <span class="badge badge-cuisine">${escapeHtml(r.cuisine || 'Gourmet')}</span>
            <span class="badge badge-time">⏱️ ${escapeHtml(r.cooking_time || '30m')}</span>
          </div>
          <h3 class="recipe-card-title">${escapeHtml(r.recipe_name)}</h3>
          <p class="recipe-card-desc">${escapeHtml(r.description || '')}</p>
        </div>
        <div class="recipe-card-details">
          <span>🔥 ${r.calories || 350} kcal</span>
          <span>•</span>
          <span>👥 ${r.servings || 2} servings</span>
          <span>•</span>
          <span>${r.difficulty || 'Medium'}</span>
        </div>
        <div class="recipe-card-footer">
          <button class="btn btn-secondary btn-sm btn-open-recipe" data-id="${r.id}">
            View Recipe
          </button>
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon btn-fav-card ${isFav ? 'is-favorite' : ''}" data-id="${r.id}" title="Toggle Favorite">
              ${isFav ? '❤️' : '🤍'}
            </button>
            <button class="btn-icon btn-delete-card" data-id="${r.id}" title="Delete Recipe">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function attachRecipeCardHandlers(container) {
    container.querySelectorAll('.btn-open-recipe').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const recipe = state.recipes.find(r => r.id === id);
        if (recipe) openRecipeModal(recipe);
      });
    });

    container.querySelectorAll('.btn-fav-card').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (!state.currentUser) return;
        const isFav = await window.TasteAISupabase.toggleFavorite(id, state.currentUser.id);
        btn.classList.toggle('is-favorite', isFav);
        btn.innerHTML = isFav ? '❤️' : '🤍';
        showToast(isFav ? 'Added to favorites' : 'Removed from favorites', 'info');
        await loadRecipesData();
      });
    });

    container.querySelectorAll('.btn-delete-card').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const recipe = state.recipes.find(r => r.id === id);
        if (!confirm(`Are you sure you want to delete "${recipe ? recipe.recipe_name : 'this recipe'}"?`)) return;

        await window.TasteAISupabase.deleteRecipe(id, state.currentUser.id);
        showToast('Recipe deleted.', 'info');
        await loadRecipesData();
      });
    });
  }

  // ==========================================
  // RECIPE MODAL VIEW
  // ==========================================
  function openRecipeModal(recipe) {
    if (!dom.recipeModal || !dom.modalBody) return;

    dom.modalBody.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div class="recipe-meta-badges">
          <span class="badge badge-cuisine">${escapeHtml(recipe.cuisine)}</span>
          <span class="badge badge-meal">${escapeHtml(recipe.meal_type)}</span>
          <span class="badge badge-diet">${escapeHtml(recipe.dietary_type)}</span>
          <span class="badge badge-time">⏱️ ${escapeHtml(recipe.cooking_time)}</span>
        </div>
        <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 8px;">${escapeHtml(recipe.recipe_name)}</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">${escapeHtml(recipe.description)}</p>
      </div>

      <div class="nutrition-summary-card" style="margin-bottom: 20px;">
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 8px;">Nutrition Facts</h4>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
          <div class="macro-box"><div class="macro-num">${recipe.calories || 0}</div><div class="macro-name">Calories</div></div>
          <div class="macro-box"><div class="macro-num">${recipe.protein || 0}g</div><div class="macro-name">Protein</div></div>
          <div class="macro-box"><div class="macro-num">${recipe.carbohydrates || 0}g</div><div class="macro-name">Carbs</div></div>
          <div class="macro-box"><div class="macro-num">${recipe.fat || 0}g</div><div class="macro-name">Fat</div></div>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 class="recipe-section-title">🛒 Ingredients</h3>
        <ul class="ingredients-checklist">
          ${(recipe.ingredients || []).map(i => `
            <li class="ingredient-item">
              <span class="ingredient-qty">${escapeHtml(i.quantity)}</span>
              <strong>${escapeHtml(i.item)}</strong>
              ${i.notes ? `<span class="ingredient-notes">${escapeHtml(i.notes)}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 class="recipe-section-title">👨‍🍳 Instructions</h3>
        <div class="instructions-list">
          ${(recipe.instructions || []).map((step, idx) => `
            <div class="instruction-step">
              <div class="step-num-bubble">${idx + 1}</div>
              <div class="step-text">${escapeHtml(step)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 24px;">
        <button id="modal-copy-btn" class="btn btn-secondary">📋 Copy</button>
        <button id="modal-print-btn" class="btn btn-secondary">🖨️ Print</button>
      </div>
    `;

    document.getElementById('modal-copy-btn')?.addEventListener('click', () => copyRecipeToClipboard(recipe));
    document.getElementById('modal-print-btn')?.addEventListener('click', () => window.print());

    dom.recipeModal.classList.add('active');
  }

  function closeModal() {
    if (dom.recipeModal) dom.recipeModal.classList.remove('active');
  }

  // ==========================================
  // USER PROFILE
  // ==========================================
  function populateProfileForm(profile) {
    if (!profile) return;
    document.getElementById('prof-name').value = profile.name || '';
    document.getElementById('prof-email').value = profile.email || state.currentUser?.email || '';
    document.getElementById('prof-age').value = profile.age || '';
    document.getElementById('prof-gender').value = profile.gender || 'Not specified';
    document.getElementById('prof-diet').value = profile.dietary_preference || 'Vegetarian';
    document.getElementById('prof-cuisine').value = profile.favorite_cuisine || 'Indian';
    document.getElementById('prof-goal').value = profile.nutrition_goal || 'Balanced Nutrition';

    document.getElementById('profile-display-name').textContent = profile.name || 'Gourmet Chef';
    document.getElementById('profile-display-email').textContent = profile.email || '';
    document.getElementById('profile-avatar-large').textContent = (profile.name || 'C').charAt(0).toUpperCase();
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!state.currentUser) return;

    const updated = {
      id: state.currentUser.id,
      name: document.getElementById('prof-name').value.trim(),
      email: document.getElementById('prof-email').value.trim(),
      age: parseInt(document.getElementById('prof-age').value, 10) || null,
      gender: document.getElementById('prof-gender').value,
      dietary_preference: document.getElementById('prof-diet').value,
      favorite_cuisine: document.getElementById('prof-cuisine').value,
      nutrition_goal: document.getElementById('prof-goal').value,
    };

    await window.TasteAISupabase.upsertProfile(updated);
    state.currentProfile = updated;
    populateProfileForm(updated);

    updateUserIdentity(updated.name);

    showToast('Profile information saved successfully!', 'success');
  }

  // ==========================================
  // SETTINGS & SUPABASE CONFIG
  // ==========================================
  function handleSaveSupabaseConfig(e) {
    e.preventDefault();
    const url = document.getElementById('supabase-url-input').value.trim();
    const anonKey = document.getElementById('supabase-anon-input').value.trim();

    const ok = window.TasteAISupabase.saveConfig(url, anonKey);
    if (ok) {
      showToast('Connected to Supabase project successfully!', 'success');
      document.getElementById('supabase-conn-badge').textContent = 'Connected (Supabase Cloud)';
      document.getElementById('supabase-conn-badge').style.color = 'var(--accent)';
    } else {
      showToast('Supabase configured locally. Fallback storage is active.', 'info');
    }
  }

  function copySupabaseSql() {
    const sql = document.getElementById('supabase-sql-code')?.innerText;
    if (sql) {
      navigator.clipboard.writeText(sql).then(() => {
        showToast('SQL Schema copied to clipboard! Paste it into Supabase SQL Editor.', 'success');
      });
    }
  }

  // ==========================================
  // BACKEND HEALTH & LOGOUT
  // ==========================================
  async function checkBackendHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        const badge = document.getElementById('backend-health-badge');
        if (badge) {
          badge.textContent = `Online • ${data.backend} • AI Ready`;
          badge.style.color = 'var(--accent)';
        }
      }
    } catch (e) {
      console.warn('Backend health check error:', e);
    }
  }

  async function handleLogout() {
    await window.TasteAISupabase.signOut();
    state.currentUser = null;
    state.currentProfile = null;
    showAuthScreen();
    showToast('You have been logged out.', 'info');
  }

  // Helper escape function
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
