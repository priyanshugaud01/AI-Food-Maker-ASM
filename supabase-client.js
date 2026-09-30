/**
 * TasteAI - Supabase Integration Client
 * Pure Vanilla JavaScript Supabase Client with full Auth, Database (profiles, recipes, favorites),
 * Row Level Security awareness, and persistent LocalStorage fallback.
 */

(function (window) {
  'use strict';

  const DEFAULT_SUPABASE_CONFIG = {
    url: 'https://lcxkqqwiatmoabtplrmf.supabase.co',
    anonKey: 'sb_publishable_XlqtdpN8DLVD_EV9Svp9pA_xcsioeau'
  };

  const STORAGE_KEYS = {
    CONFIG: 'tasteai_supabase_config',
    SESSION: 'tasteai_auth_session',
    USERS: 'tasteai_local_users',
    PROFILES: 'tasteai_local_profiles',
    RECIPES: 'tasteai_local_recipes',
    FAVORITES: 'tasteai_local_favorites',
  };

  class SupabaseService {
    constructor() {
      this.client = null;
      this.isConfigured = false;
      this.init();
    }

    init() {
      // Use the live TasteAI Supabase project by default.
      const existingConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (!existingConfig) {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_SUPABASE_CONFIG));
      }
      // Check for saved config
      const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) {
        try {
          const { url, anonKey } = JSON.parse(savedConfig);
          if (url && anonKey && window.supabase) {
            this.client = window.supabase.createClient(url, anonKey);
            this.isConfigured = true;
            console.log('[TasteAI] Real Supabase client initialized.');
          }
        } catch (e) {
          console.error('[TasteAI] Error parsing Supabase config:', e);
        }
      }

      if (!this.client) {
        console.log('[TasteAI] Using local storage database & auth store.');
        this._initLocalStorageStore();
      }
    }

    saveConfig(url, anonKey) {
      if (!url || !anonKey) {
        localStorage.removeItem(STORAGE_KEYS.CONFIG);
        this.client = null;
        this.isConfigured = false;
        return false;
      }
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ url, anonKey }));
      if (window.supabase) {
        try {
          this.client = window.supabase.createClient(url, anonKey);
          this.isConfigured = true;
          return true;
        } catch (e) {
          console.error('Failed to init Supabase client:', e);
          return false;
        }
      }
      return false;
    }

    getConfig() {
      try {
        const item = localStorage.getItem(STORAGE_KEYS.CONFIG);
        return item ? JSON.parse(item) : { url: '', anonKey: '' };
      } catch (e) {
        return { url: '', anonKey: '' };
      }
    }

    _initLocalStorageStore() {
      if (!localStorage.getItem(STORAGE_KEYS.RECIPES)) {
        // Initial sample recipes
        const initialRecipes = [
          {
            id: 'rec-sample-1',
            user_id: 'guest-user',
            recipe_name: 'Paneer Butter Masala',
            description: 'A rich and creamy curry made with cottage cheese simmered in a mildly spiced, fragrant tomato sauce with butter and cream.',
            cuisine: 'Indian',
            meal_type: 'Dinner',
            dietary_type: 'Vegetarian',
            preparation_time: '15 mins',
            cooking_time: '25 mins',
            total_time: '40 mins',
            difficulty: 'Medium',
            servings: 4,
            calories: 420,
            protein: 18,
            carbohydrates: 22,
            fat: 30,
            fiber: 5,
            sugar: 6,
            ingredients: [
              { item: 'Paneer (Cottage Cheese)', quantity: '250g', notes: 'cubed' },
              { item: 'Ripe Tomatoes', quantity: '4 medium', notes: 'puréed' },
              { item: 'Onions', quantity: '2 medium', notes: 'finely chopped' },
              { item: 'Butter', quantity: '2 tbsp', notes: 'unsalted' },
              { item: 'Heavy Cream', quantity: '3 tbsp', notes: 'fresh' },
              { item: 'Garam Masala', quantity: '1 tsp', notes: 'aromatic blend' }
            ],
            instructions: [
              'Melt 1 tbsp butter in a heavy pan. Lightly sauté paneer cubes for 2 minutes and set aside in warm water.',
              'In the same pan, add remaining butter and sauté chopped onions until translucent and golden.',
              'Pour in the tomato purée, turmeric, chili powder, and salt. Simmer for 10 minutes until oil separates.',
              'Gently fold in cream and garam masala, then add paneer cubes. Simmer for 3 minutes.',
              'Garnish with kasuri methi and fresh coriander. Serve hot with garlic naan or basmati rice.'
            ],
            cooking_tips: [
              'Soak fried paneer cubes in warm water for 5 minutes to keep them extraordinarily soft and tender.',
              'Strain the tomato purée through a fine sieve for a restaurant-style velvety smooth gravy.'
            ],
            is_favorite: true,
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 'rec-sample-2',
            user_id: 'guest-user',
            recipe_name: 'Tuscan Garlic Herb Pasta',
            description: 'Classic al dente pasta tossed in golden garlic-infused olive oil, sun-dried tomatoes, fresh baby spinach, and aged parmesan.',
            cuisine: 'Italian',
            meal_type: 'Lunch',
            dietary_type: 'Vegetarian',
            preparation_time: '10 mins',
            cooking_time: '15 mins',
            total_time: '25 mins',
            difficulty: 'Easy',
            servings: 2,
            calories: 380,
            protein: 14,
            carbohydrates: 56,
            fat: 12,
            fiber: 4,
            sugar: 3,
            ingredients: [
              { item: 'Linguine or Spaghetti', quantity: '200g', notes: 'durum wheat' },
              { item: 'Extra Virgin Olive Oil', quantity: '3 tbsp', notes: 'first cold pressed' },
              { item: 'Garlic Cloves', quantity: '5 cloves', notes: 'thinly sliced' },
              { item: 'Sun-dried Tomatoes', quantity: '1/3 cup', notes: 'julienned' },
              { item: 'Baby Spinach', quantity: '2 cups', notes: 'fresh leaves' }
            ],
            instructions: [
              'Boil pasta in generously salted water until 1 minute before al dente. Reserve 1/2 cup pasta water.',
              'In a large skillet, warm olive oil over medium-low heat. Add sliced garlic and cook gently until fragrant and pale gold.',
              'Stir in sun-dried tomatoes and red pepper flakes for 1 minute.',
              'Transfer hot pasta and baby spinach into the skillet. Toss vigorously with reserved pasta water until a silky emulsion coats every strand.',
              'Remove from heat, shower with freshly grated parmesan cheese and cracked black pepper.'
            ],
            cooking_tips: [
              'Never let the garlic brown too deeply or it will become bitter; keep heat gentle.',
              'The reserved starchy pasta water is the secret to creating a glossy restaurant-quality sauce.'
            ],
            is_favorite: false,
            created_at: new Date(Date.now() - 172800000).toISOString()
          }
        ];
        localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(initialRecipes));
      }

      if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(['rec-sample-1']));
      }

      if (!localStorage.getItem(STORAGE_KEYS.PROFILES)) {
        const defaultProfile = {
          id: 'guest-user',
          name: 'Guest Chef',
          email: 'chef@tasteai.local',
          age: 28,
          gender: 'Not specified',
          dietary_preference: 'Vegetarian',
          favorite_cuisine: 'Indian',
          nutrition_goal: 'Healthy & High Protein',
          created_at: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify([defaultProfile]));
      }
    }

    // ==========================================
    // AUTH METHODS
    // ==========================================
    async signUp(email, password, name = 'Chef') {
      if (this.isConfigured && this.client) {
        try {
          const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: { data: { name } }
          });
          if (error) throw error;
          if (data && data.user) {
            await this.upsertProfile({
              id: data.user.id,
              name: name || 'Chef',
              email: data.user.email,
              dietary_preference: 'Vegetarian',
              favorite_cuisine: 'Indian',
              nutrition_goal: 'Balanced'
            });
            this.setSession(data.user);
            return { user: data.user, error: null };
          }
        } catch (e) {
          console.warn('[TasteAI] Supabase Auth SignUp error:', e.message);
          return { user: null, error: e };
        }
      }

      // Local Fallback Auth
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { user: null, error: new Error('User already exists with this email address.') };
      }

      const newUser = {
        id: 'user_' + Math.random().toString(36).substring(2, 10),
        email,
        password, // In local demo store
        name,
        created_at: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      // Save initial profile
      await this.upsertProfile({
        id: newUser.id,
        name,
        email,
        age: 26,
        gender: 'Not specified',
        dietary_preference: 'Vegetarian',
        favorite_cuisine: 'Indian',
        nutrition_goal: 'Balanced Nutrition',
        created_at: new Date().toISOString()
      });

      this.setSession(newUser);
      return { user: newUser, error: null };
    }

    async signIn(email, password) {
      if (this.isConfigured && this.client) {
        try {
          const { data, error } = await this.client.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (data && data.user) {
            this.setSession(data.user);
            return { user: data.user, error: null };
          }
        } catch (e) {
          console.warn('[TasteAI] Supabase signIn error:', e.message);
          return { user: null, error: e };
        }
      }

      // Local Fallback SignIn
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) {
        return { user: null, error: new Error('Invalid email or password. Please verify your credentials or Continue as Guest.') };
      }

      this.setSession(user);
      return { user, error: null };
    }

    signInGuest() {
      const guestUser = {
        id: 'guest-user',
        email: 'guest@tasteai.local',
        name: 'Guest Chef',
        is_guest: true,
        created_at: new Date().toISOString()
      };
      this.setSession(guestUser);
      return guestUser;
    }

    async signOut() {
      if (this.isConfigured && this.client) {
        try {
          await this.client.auth.signOut();
        } catch (e) {
          console.warn('[TasteAI] Supabase signOut error:', e);
        }
      }
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }

    async resetPassword(email) {
      if (this.isConfigured && this.client) {
        return await this.client.auth.resetPasswordForEmail(email);
      }
      return { data: {}, error: null };
    }

    setSession(user) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    }

    getCurrentUser() {
      try {
        const item = localStorage.getItem(STORAGE_KEYS.SESSION);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        return null;
      }
    }

    // ==========================================
    // PROFILES TABLE
    // ==========================================
    async getProfile(userId) {
      if (this.isConfigured && this.client) {
        try {
          const { data, error } = await this.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (!error && data) return data;
        } catch (e) {
          console.warn('[TasteAI] Supabase getProfile error:', e);
        }
      }

      const profiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]');
      let profile = profiles.find(p => p.id === userId);
      if (!profile) {
        profile = {
          id: userId,
          name: 'Gourmet Chef',
          email: 'chef@tasteai.local',
          age: 27,
          gender: 'Not specified',
          dietary_preference: 'Vegetarian',
          favorite_cuisine: 'Indian',
          nutrition_goal: 'Clean Eating & Energy',
          created_at: new Date().toISOString()
        };
        profiles.push(profile);
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      }
      return profile;
    }

    async upsertProfile(profileData) {
      if (this.isConfigured && this.client) {
        try {
          const { error } = await this.client
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });
          if (error) console.warn('[TasteAI] Supabase upsertProfile error:', error);
        } catch (e) {
          console.warn('[TasteAI] Supabase upsertProfile exception:', e);
        }
      }

      // Always update local cache
      const profiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]');
      const index = profiles.findIndex(p => p.id === profileData.id);
      if (index >= 0) {
        profiles[index] = { ...profiles[index], ...profileData };
      } else {
        profiles.push(profileData);
      }
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      return profileData;
    }

    // ==========================================
    // RECIPES TABLE
    // ==========================================
    async getRecipes(userId) {
      if (this.isConfigured && this.client) {
        try {
          const { data, error } = await this.client
            .from('recipes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          if (!error && data) {
            // Sync with local favorites
            const favIds = await this.getFavoriteIds(userId);
            return data.map(r => ({
              ...r,
              is_favorite: favIds.includes(r.id)
            }));
          }
        } catch (e) {
          console.warn('[TasteAI] Supabase getRecipes error:', e);
        }
      }

      // Local store
      const recipes = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECIPES) || '[]');
      const favIds = await this.getFavoriteIds(userId);
      return recipes
        .filter(r => r.user_id === userId || userId === 'guest-user' || r.user_id === 'guest-user')
        .map(r => ({
          ...r,
          is_favorite: favIds.includes(r.id)
        }));
    }

    async saveRecipe(recipe, userId) {
      const newRecipe = {
        ...recipe,
        id: recipe.id || 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        user_id: userId,
        created_at: new Date().toISOString()
      };

      if (this.isConfigured && this.client) {
        try {
          const { error } = await this.client
            .from('recipes')
            .insert([{
              id: newRecipe.id,
              user_id: newRecipe.user_id,
              recipe_name: newRecipe.recipe_name,
              description: newRecipe.description,
              ingredients: newRecipe.ingredients,
              instructions: newRecipe.instructions,
              cuisine: newRecipe.cuisine,
              meal_type: newRecipe.meal_type,
              dietary_type: newRecipe.dietary_type,
              calories: newRecipe.calories,
              protein: newRecipe.protein,
              carbohydrates: newRecipe.carbohydrates,
              fat: newRecipe.fat,
              fiber: newRecipe.fiber,
              cooking_time: newRecipe.cooking_time,
              difficulty: newRecipe.difficulty,
              servings: newRecipe.servings,
              created_at: newRecipe.created_at
            }]);
          if (error) console.warn('[TasteAI] Supabase saveRecipe error:', error);
        } catch (e) {
          console.warn('[TasteAI] Supabase saveRecipe exception:', e);
        }
      }

      // Local store
      const recipes = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECIPES) || '[]');
      recipes.unshift(newRecipe);
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
      return newRecipe;
    }

    async deleteRecipe(recipeId, userId) {
      if (this.isConfigured && this.client) {
        try {
          await this.client
            .from('recipes')
            .delete()
            .eq('id', recipeId)
            .eq('user_id', userId);
        } catch (e) {
          console.warn('[TasteAI] Supabase deleteRecipe error:', e);
        }
      }

      const recipes = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECIPES) || '[]');
      const filtered = recipes.filter(r => r.id !== recipeId);
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(filtered));

      await this.removeFavorite(recipeId, userId);
      return true;
    }

    // ==========================================
    // FAVORITES TABLE
    // ==========================================
    async getFavoriteIds(userId) {
      if (this.isConfigured && this.client) {
        try {
          const { data, error } = await this.client
            .from('favorites')
            .select('recipe_id')
            .eq('user_id', userId);
          if (!error && data) {
            return data.map(f => f.recipe_id);
          }
        } catch (e) {
          console.warn('[TasteAI] Supabase getFavoriteIds error:', e);
        }
      }

      return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
    }

    async addFavorite(recipeId, userId) {
      if (this.isConfigured && this.client) {
        try {
          await this.client
            .from('favorites')
            .insert([{ user_id: userId, recipe_id: recipeId }]);
        } catch (e) {
          console.warn('[TasteAI] Supabase addFavorite error:', e);
        }
      }

      const favs = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
      if (!favs.includes(recipeId)) {
        favs.push(recipeId);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
      }
      return true;
    }

    async removeFavorite(recipeId, userId) {
      if (this.isConfigured && this.client) {
        try {
          await this.client
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('recipe_id', recipeId);
        } catch (e) {
          console.warn('[TasteAI] Supabase removeFavorite error:', e);
        }
      }

      let favs = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
      favs = favs.filter(id => id !== recipeId);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
      return true;
    }

    async toggleFavorite(recipeId, userId) {
      const favs = await this.getFavoriteIds(userId);
      if (favs.includes(recipeId)) {
        await this.removeFavorite(recipeId, userId);
        return false;
      } else {
        await this.addFavorite(recipeId, userId);
        return true;
      }
    }
  }

  window.TasteAISupabase = new SupabaseService();
})(window);
