/**
 * ChatGPT Gold - Prompt Management System
 * Handles creation, organization, and management of custom prompts
 * Version: 2.0.5 - CRITICAL FIX: Direct button listeners instead of event delegation
 * Last Modified: 2025-01-20
 */

class PromptManager {
  constructor(parentInstance) {
    this.parent = parentInstance;
    this.prompts = [];
    this.categories = []; // Track categories with their colors and icons
    this.currentModal = null;
    this.pendingFavoriteOperations = new Set();
    this.categoryOrder = []; // Track category order
    this.categoryExpandedState = {}; // Track which categories are expanded
    this.dragState = {
      isDragging: false,
      draggedElement: null,
      draggedPromptId: null,
      draggedCategory: null,
      dropTarget: null
    };
    this.sortState = {
      currentSort: 'custom', // custom, name, date
      direction: 'asc', // asc, desc
      previousState: null
    };
    this.emojiData = this.getEmojiData();
    this.init();
  }

  async init() {
    await this.loadPrompts();
    await this.loadCategories();
    await this.loadCategoryOrder();
    await this.loadCategoryExpandedState();
    this.renderPrompts();
    this.setupPromptEventListeners();
  }

  async loadPrompts() {
    try {
      // Try chrome.runtime first
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_GET',
        keys: ['chatgpt_gold_prompts']
      });
      
      if (response.success) {
        this.prompts = response.data.chatgpt_gold_prompts || this.getDefaultPrompts();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.warn('ChatGPT Gold: Background script unavailable, using localStorage fallback:', error);
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('chatgpt_gold_prompts_backup');
        this.prompts = stored ? JSON.parse(stored) : this.getDefaultPrompts();
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed:', localError);
        this.prompts = this.getDefaultPrompts();
      }
    }
  }

  getDefaultPrompts() {
    return [
      { id: 'prompt_code_review', title: 'Code Review', description: 'Review code for bugs and improvements', content: 'Please review this code for potential bugs, security issues, and suggest improvements:\n\n```\n{{code}}\n```', category: 'Development', favorite: true, createdAt: Date.now() },
      { id: 'prompt_explain_simply', title: 'Explain Simply', description: 'Explain a complex topic in simple terms', content: 'Please explain this in simple terms that anyone can understand:\n\n{{topic}}', category: 'Education', favorite: true, createdAt: Date.now() },
      { id: 'prompt_professional_email', title: 'Professional Email', description: 'Draft a professional email', content: 'Draft a professional email to {{recipient}} about {{topic}}.', category: 'Communication', favorite: false, createdAt: Date.now() },
      { id: 'prompt_summarize', title: 'Summarize', description: 'Summarize text concisely', content: 'Please summarize the key points from the following text:\n\n{{text}}', category: 'Writing', favorite: true, createdAt: Date.now() },
      { id: 'prompt_quick_help', title: 'Quick Help', description: 'Get quick help on any topic', content: 'I need help with: {{topic}}', category: 'Quick', favorite: false, createdAt: Date.now() },
      { id: 'prompt_quick_idea', title: 'Brainstorm Ideas', description: 'Brainstorm ideas quickly', content: 'Give me 5 creative ideas for: {{topic}}', category: 'Quick', favorite: false, createdAt: Date.now() },
      { id: 'prompt_detailed_analysis', title: 'Detailed Analysis', description: 'Comprehensive analysis with multiple variables', content: 'Please provide a detailed analysis of {{topic}} considering the following aspects:\n\n1. Context: {{context}}\n2. Target audience: {{audience}}\n3. Key objectives: {{objectives}}\n4. Timeline: {{timeline}}\n5. Budget considerations: {{budget}}\n\nProvide specific recommendations and actionable insights based on these parameters.', category: 'Analysis', favorite: false, createdAt: Date.now() }
    ];
  }

  async savePrompts(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_SET',
        data: { chatgpt_gold_prompts: this.prompts }
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('chatgpt_gold_prompts_backup', JSON.stringify(this.prompts));
    } catch (error) {
      console.warn('ChatGPT Gold: Failed to save via background script, using localStorage fallback:', error);
      
      // Fallback to localStorage
      try {
        localStorage.setItem('chatgpt_gold_prompts_backup', JSON.stringify(this.prompts));
        return; // Success via fallback
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed:', localError);
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.savePrompts(retryCount + 1);
        } else {
          throw error;
        }
      }
    }
  }

  async loadCategories() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_GET',
        keys: ['chatgpt_gold_prompt_categories']
      });
      
      if (response.success) {
        this.categories = response.data.chatgpt_gold_prompt_categories || this.getDefaultCategories();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.warn('ChatGPT Gold: Failed to load categories via background script, using localStorage fallback');
      try {
        const stored = localStorage.getItem('chatgpt_gold_prompt_categories_backup');
        this.categories = stored ? JSON.parse(stored) : this.getDefaultCategories();
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed:', localError);
        this.categories = this.getDefaultCategories();
      }
    }
  }

  getDefaultCategories() {
    return [
      { name: 'Development', icon: '💻', color: '#3b82f6' },
      { name: 'Education', icon: '📚', color: '#10b981' },
      { name: 'Communication', icon: '✉️', color: '#8b5cf6' },
      { name: 'Writing', icon: '✍️', color: '#f59e0b' },
      { name: 'Analysis', icon: '📊', color: '#ef4444' },
      { name: 'Quick', icon: '⚡', color: '#06b6d4' }
    ];
  }

  async saveCategories() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_SET',
        data: { chatgpt_gold_prompt_categories: this.categories }
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      localStorage.setItem('chatgpt_gold_prompt_categories_backup', JSON.stringify(this.categories));
    } catch (error) {
      console.warn('ChatGPT Gold: Failed to save categories via background script, using localStorage fallback:', error);
      try {
        localStorage.setItem('chatgpt_gold_prompt_categories_backup', JSON.stringify(this.categories));
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed:', localError);
        throw error;
      }
    }
  }

  getCategoryInfo(categoryName) {
    const category = this.categories.find(cat => cat.name === categoryName);
    return category || { name: categoryName, icon: '📁', color: '#6b7280' };
  }

  getEmojiData() {
    return {
      'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
      'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🪲', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦣', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦔', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦫'],
      'Food & Drink': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯'],
      'Activity': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🤼‍♀️', '🤼', '🤸‍♀️', '🤸', '⛹️‍♀️', '⛹️', '🤺', '🤾‍♀️', '🤾', '🏌️‍♀️', '🏌️', '🧘‍♀️', '🧘', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊', '🤽‍♀️', '🤽', '🚣‍♀️', '🚣', '🧗‍♀️', '🧗', '🚵‍♀️', '🚵', '🚴‍♀️', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹‍♀️', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🪘', '🥁', '🪗', '🎷', '🎺', '🪕', '🎸', '🪈', '🎻', '🎲', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴', '🎯', '🎳'],
      'Travel & Places': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️', '🚉', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🎢', '🎡', '🎠', '🎪', '🚢', '🛥️', '🚤', '⛵', '🛶', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🛑', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋'],
      'Objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪓', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧴', '🧷', '🧸', '🧵', '🧶', '🪡', '🪢', '🧽', '🪣', '🧼', '🪥', '🪒', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛏️', '🛋️', '🪞', '🪟', '🚽', '🚿', '🛁', '🪣', '🧴', '🧼', '🧽', '🧹', '🧺', '🧻'],
      'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
    };
  }

  async createPrompt(promptData) {
    const prompt = {
      id: 'prompt_' + Date.now(),
      title: promptData.title,
      description: promptData.description,
      content: promptData.content,
      category: promptData.category || 'Uncategorized',
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.prompts.push(prompt);
    await this.savePrompts();
    this.renderPrompts();
    
    // Refresh search data in parent
    if (this.parent.refreshSearchData) {
      this.parent.refreshSearchData();
    }
    
    this.parent.showToast(`Prompt "${prompt.title}" created successfully`);
    return prompt;
  }

  async editPrompt(promptId, promptData) {
    const index = this.prompts.findIndex(p => p.id === promptId);
    if (index === -1) throw new Error('Prompt not found');
    this.prompts[index] = { ...this.prompts[index], ...promptData, updatedAt: Date.now() };
    await this.savePrompts();
    this.renderPrompts();
    
    // Refresh search data in parent
    if (this.parent.refreshSearchData) {
      this.parent.refreshSearchData();
    }
    
    this.parent.showToast(`Prompt "${promptData.title}" updated successfully`);
    return this.prompts[index];
  }

  async deletePrompt(promptId) {
    const prompt = this.prompts.find(p => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found');
    this.prompts = this.prompts.filter(p => p.id !== promptId);
    await this.savePrompts();
    this.renderPrompts();
    
    // Refresh search data in parent
    if (this.parent.refreshSearchData) {
      this.parent.refreshSearchData();
    }
    
    this.parent.showToast(`Prompt "${prompt.title}" deleted`);
  }

  async toggleFavorite(promptId) {
    
    // Prevent concurrent favorite operations on the same prompt
    if (this.pendingFavoriteOperations.has(promptId)) {
      return;
    }
    
    const prompt = this.prompts.find(p => p.id === promptId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }
    
    // Mark operation as pending
    this.pendingFavoriteOperations.add(promptId);
    
    const oldFavorite = prompt.favorite;
    prompt.favorite = !prompt.favorite;
    
    // Immediately update UI to provide instant feedback
    this.updateFavoriteButtonState(promptId, prompt.favorite);
    
    try {
      await this.savePrompts();
      this.parent.showToast(`Prompt "${prompt.title}" ${prompt.favorite ? 'favorited' : 'unfavorited'}`);
    } catch (error) {
      
      // Check for extension context issues or other Chrome runtime errors
      const isExtensionContextError = error.message && (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes('chrome.runtime.sendMessage')
      );
      
      if (isExtensionContextError) {
        
        // Try localStorage fallback directly
        try {
          localStorage.setItem('chatgpt_gold_prompts_backup', JSON.stringify(this.prompts));
          this.parent.showToast(`Prompt "${prompt.title}" ${prompt.favorite ? 'favorited' : 'unfavorited'} (saved locally)`);
        } catch (localError) {
          // Revert the change
          prompt.favorite = oldFavorite;
          this.updateFavoriteButtonState(promptId, prompt.favorite);
          this.parent.showToast(`Failed to save favorite. Please try again.`);
        }
      } else {
        // Revert the change for other errors
        prompt.favorite = oldFavorite;
        this.updateFavoriteButtonState(promptId, prompt.favorite);
        this.parent.showToast(`Failed to ${prompt.favorite ? 'favorite' : 'unfavorite'} prompt. Please try again.`);
      }
    } finally {
      // Clear pending operation
      this.pendingFavoriteOperations.delete(promptId);
    }
  }

  updateFavoriteButtonState(promptId, isFavorite) {
    const button = document.querySelector(`[data-action="favorite-prompt"][data-prompt-id="${promptId}"]`);
    if (button) {
      button.classList.toggle('active', isFavorite);
      button.textContent = isFavorite ? '⭐' : '☆';
    }
  }

  renderPrompts() {
    const container = document.querySelector('[data-section="prompts"]');
    if (!container) return;

    const promptsByCategory = this.prompts.reduce((acc, prompt) => {
      (acc[prompt.category] = acc[prompt.category] || []).push(prompt);
      return acc;
    }, {});

    // Include all defined categories, even if they have no prompts
    this.categories.forEach(category => {
      if (!promptsByCategory[category.name]) {
        promptsByCategory[category.name] = [];
      }
    });

    // Initialize category order if empty
    if (this.categoryOrder.length === 0) {
      this.categoryOrder = Object.keys(promptsByCategory);
    }
    
    // Ensure all defined categories are in categoryOrder
    this.categories.forEach(category => {
      if (!this.categoryOrder.includes(category.name)) {
        this.categoryOrder.push(category.name);
      }
    });

    // Sort categories and prompts based on current sort state
    const sortedCategories = this.getSortedCategories(Object.keys(promptsByCategory));
    
    // Check if all categories are expanded for button text
    const allExpanded = sortedCategories.every(category => this.isCategoryExpanded(category));
    const toggleAllText = allExpanded ? 'Collapse All' : 'Expand All';
    
    container.innerHTML = `
      <div class="cg-prompt-actions">
        <button class="cg-btn cg-btn-small" id="cg-new-prompt">New Prompt</button>
        <button class="cg-btn cg-btn-small" id="cg-manage-prompts">Manage Prompts</button>
      </div>
      <div class="cg-toolbar">
        <div class="cg-toolbar-left">
          <div class="cg-sort-controls">
            <select class="cg-sort-dropdown" id="cg-sort-type">
              <option value="custom" ${this.sortState.currentSort === 'custom' ? 'selected' : ''}>Custom Order</option>
              <option value="name" ${this.sortState.currentSort === 'name' ? 'selected' : ''}>Alphabetical</option>
              <option value="date" ${this.sortState.currentSort === 'date' ? 'selected' : ''}>Date</option>
            </select>
            <div class="cg-sort-direction" ${this.sortState.currentSort === 'custom' ? 'style="display: none;"' : ''}>
              <button class="cg-direction-btn ${this.sortState.direction === 'asc' ? 'active' : ''}" data-direction="asc" title="Ascending">
                ↑
              </button>
              <button class="cg-direction-btn ${this.sortState.direction === 'desc' ? 'active' : ''}" data-direction="desc" title="Descending">
                ↓
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="cg-expand-controls">
        <button class="cg-expand-btn" id="cg-toggle-all-categories">${toggleAllText} Categories</button>
      </div>
      <div id="cg-prompts-list">
        ${sortedCategories.map((category) => {
          const prompts = promptsByCategory[category];
          const sortedPrompts = this.getSortedPrompts(prompts);
          
          const expanded = this.isCategoryExpanded(category);
          return `
          <div class="cg-prompt-category ${expanded ? 'expanded' : ''}" data-category="${category}" draggable="true">
            <div class="cg-category-header" style="border-left: 3px solid ${this.getCategoryInfo(category).color}">
              <div class="cg-drag-handle" draggable="true" title="Drag to reorder category">
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor"></path>
                </svg>
              </div>
              <button class="cg-category-toggle" data-action="toggle-category" data-category="${category}" type="button">
                <span data-action="toggle-category" data-category="${category}">${expanded ? '▼' : '▶'}</span>
              </button>
              <span class="cg-category-icon">${this.getCategoryInfo(category).icon}</span>
              <span class="cg-category-name">${category}</span>
              <span class="cg-category-count">(${prompts.length})</span>
              <div class="cg-category-controls">
                <button class="cg-category-btn" data-action="edit-category" data-category="${category}" title="Edit category">✏️</button>
                <button class="cg-category-btn" data-action="delete-category" data-category="${category}" title="Delete category">🗑️</button>
              </div>
            </div>
            <div class="cg-category-prompts" style="display: ${expanded ? 'block' : 'none'}">
              ${sortedPrompts.map(prompt => `
                <div class="cg-prompt-item" data-prompt-id="${prompt.id}" draggable="true">
                  <div class="cg-prompt-header">
                    <span class="cg-drag-handle cg-prompt-drag" title="Drag to reorder prompt">⋮⋮</span>
                    <h4 class="cg-prompt-title">${prompt.title}</h4>
                    <div class="cg-prompt-controls">
                      <button class="cg-prompt-btn cg-favorite-btn ${prompt.favorite ? 'active' : ''}" data-action="favorite-prompt" data-prompt-id="${prompt.id}">
                        ${prompt.favorite ? '⭐' : '☆'}
                      </button>
                      <button class="cg-prompt-btn" data-action="edit-prompt" data-prompt-id="${prompt.id}">✏️</button>
                      <button class="cg-prompt-btn" data-action="delete-prompt" data-prompt-id="${prompt.id}">🗑️</button>
                    </div>
                  </div>
                  <p class="cg-prompt-description">${prompt.description}</p>
                  <div class="cg-prompt-details-preview" data-prompt-id="${prompt.id}">
                    <div class="cg-prompt-details-collapsed" ${!this.shouldShowPreview(prompt) ? 'style="display: none;"' : ''}>
                      <div class="cg-prompt-summary">
                        <span class="cg-variables-count">${(prompt.content.match(/{{(.*?)}}/g) || []).length} variables</span>
                        <button class="cg-btn-link cg-expand-details" data-action="expand-details" data-prompt-id="${prompt.id}">Show details...</button>
                      </div>
                    </div>
                    <div class="cg-prompt-details-expanded" ${this.shouldShowPreview(prompt) ? 'style="display: none;"' : ''}>
                      <pre class="cg-prompt-full-text">${prompt.content}</pre>
                      <div class="cg-prompt-variables">
                        ${(prompt.content.match(/{{(.*?)}}/g) || []).map(variable => 
                          `<span class="cg-variable-tag">${variable}</span>`
                        ).join(' ')}
                      </div>
                      <button class="cg-btn-link cg-collapse-details" data-action="collapse-details" data-prompt-id="${prompt.id}">Hide details</button>
                    </div>
                  </div>
                  <button class="cg-btn cg-btn-small" data-action="use-prompt" data-prompt-id="${prompt.id}">Use Prompt</button>
                </div>
              `).join('')}
            </div>
          </div>
          `;
        }).join('')}
      </div>
    `;
    
    this.setupDragAndDrop();
    this.setupSortEventListeners();
    this.setupCategoryToggleListeners(); // Add direct toggle listeners
    this.setupToggleAllListener(); // Add toggle all listener
  }

  setupCategoryToggleListeners() {
    // Attach listeners directly to each toggle button
    const toggleButtons = document.querySelectorAll('.cg-category-toggle');
    
    toggleButtons.forEach((button) => {
      const categoryName = button.dataset.category;
      
      // Remove existing listeners by cloning (same as manual script)
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Add working event listener (exact same logic as manual script)
      newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        
        // Find the category container
        const categoryElement = this.closest('.cg-prompt-category');
        if (!categoryElement) {
          return;
        }
        
        // Find the prompts container
        const promptsDiv = categoryElement.querySelector('.cg-category-prompts');
        if (!promptsDiv) {
          return;
        }
        
        // Check current state
        const isCurrentlyVisible = promptsDiv.style.display !== 'none' &&
                                  promptsDiv.style.display !== '' ?
                                  promptsDiv.style.display === 'block' :
                                  promptsDiv.offsetHeight > 0;
        
        // Toggle the display
        if (isCurrentlyVisible) {
          promptsDiv.style.display = 'none';
          categoryElement.classList.remove('expanded');
        } else {
          promptsDiv.style.display = 'block';
          categoryElement.classList.add('expanded');
        }
        
        // Update the arrow icon
        const arrow = this.querySelector('span');
        if (arrow) {
          arrow.textContent = isCurrentlyVisible ? '▶' : '▼';
        }
        
      });
    });
  }

  setupToggleAllListener() {
    const toggleAllButton = document.querySelector('#cg-toggle-all-categories');
    if (toggleAllButton) {
      // Remove existing listener if any
      if (toggleAllButton._toggleListener) {
        toggleAllButton.removeEventListener('click', toggleAllButton._toggleListener);
      }
      
      const toggleListener = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.toggleAllCategories();
      };
      
      toggleAllButton._toggleListener = toggleListener;
      toggleAllButton.addEventListener('click', toggleListener);
    }
  }

  setupDragAndDrop() {
    const container = document.querySelector('#cg-prompts-list');
    if (!container) return;

    // Setup drag listeners for categories
    container.querySelectorAll('.cg-prompt-category').forEach(category => {
      category.addEventListener('dragstart', this.handleCategoryDragStart.bind(this));
      category.addEventListener('dragover', this.handleCategoryDragOver.bind(this));
      category.addEventListener('drop', this.handleCategoryDrop.bind(this));
      category.addEventListener('dragend', this.handleDragEnd.bind(this));
    });

    // Setup drag listeners for prompts
    container.querySelectorAll('.cg-prompt-item').forEach(prompt => {
      prompt.addEventListener('dragstart', this.handlePromptDragStart.bind(this));
      prompt.addEventListener('dragover', this.handlePromptDragOver.bind(this));
      prompt.addEventListener('drop', this.handlePromptDrop.bind(this));
      prompt.addEventListener('dragend', this.handleDragEnd.bind(this));
    });
  }

  handleCategoryDragStart(e) {
    this.dragState.isDragging = true;
    this.dragState.draggedElement = e.target;
    this.dragState.draggedCategory = e.target.dataset.category;
    
    e.target.classList.add('cg-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  }

  handleCategoryDragOver(e) {
    if (!this.dragState.isDragging || !this.dragState.draggedCategory) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.target.closest('.cg-prompt-category');
    if (target && target !== this.dragState.draggedElement) {
      target.classList.add('cg-drop-target');
      this.dragState.dropTarget = target;
    }
  }

  handleCategoryDrop(e) {
    e.preventDefault();
    if (!this.dragState.draggedCategory) return;

    const targetCategory = e.target.closest('.cg-prompt-category');
    if (targetCategory && targetCategory !== this.dragState.draggedElement) {
      this.reorderCategories(this.dragState.draggedCategory, targetCategory.dataset.category);
    }
  }

  handlePromptDragStart(e) {
    this.dragState.isDragging = true;
    this.dragState.draggedElement = e.target;
    this.dragState.draggedPromptId = e.target.dataset.promptId;
    
    e.target.classList.add('cg-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  }

  handlePromptDragOver(e) {
    if (!this.dragState.isDragging || !this.dragState.draggedPromptId) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.target.closest('.cg-prompt-item');
    if (target && target !== this.dragState.draggedElement) {
      target.classList.add('cg-drop-target');
      this.dragState.dropTarget = target;
    }
  }

  handlePromptDrop(e) {
    e.preventDefault();
    if (!this.dragState.draggedPromptId) return;

    const targetPrompt = e.target.closest('.cg-prompt-item');
    if (targetPrompt && targetPrompt !== this.dragState.draggedElement) {
      this.reorderPrompts(this.dragState.draggedPromptId, targetPrompt.dataset.promptId);
    }
  }

  handleDragEnd(e) {
    // Clean up drag state
    document.querySelectorAll('.cg-dragging, .cg-drop-target').forEach(el => {
      el.classList.remove('cg-dragging', 'cg-drop-target');
    });
    
    this.dragState = {
      isDragging: false,
      draggedElement: null,
      draggedPromptId: null,
      draggedCategory: null,
      dropTarget: null
    };
  }

  reorderCategories(draggedCategory, targetCategory) {
    const currentIndex = this.categoryOrder.indexOf(draggedCategory);
    const targetIndex = this.categoryOrder.indexOf(targetCategory);
    
    if (currentIndex === -1 || targetIndex === -1) return;

    // Remove dragged category and insert at target position
    this.categoryOrder.splice(currentIndex, 1);
    this.categoryOrder.splice(targetIndex, 0, draggedCategory);
    
    this.renderPrompts();
    this.saveCategoryOrder();
  }

  reorderPrompts(draggedPromptId, targetPromptId) {
    const draggedPrompt = this.prompts.find(p => p.id === draggedPromptId);
    const targetPrompt = this.prompts.find(p => p.id === targetPromptId);
    
    if (!draggedPrompt || !targetPrompt || draggedPrompt.category !== targetPrompt.category) return;

    // Get prompts in the same category
    const categoryPrompts = this.prompts
      .filter(p => p.category === draggedPrompt.category)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentDraggedIndex = categoryPrompts.findIndex(p => p.id === draggedPromptId);
    const currentTargetIndex = categoryPrompts.findIndex(p => p.id === targetPromptId);

    if (currentDraggedIndex === -1 || currentTargetIndex === -1) return;

    // Reorder using array manipulation
    const [movedPrompt] = categoryPrompts.splice(currentDraggedIndex, 1);
    categoryPrompts.splice(currentTargetIndex, 0, movedPrompt);

    // Update order values
    categoryPrompts.forEach((prompt, index) => {
      prompt.order = (index + 1) * 1000;
    });

    this.renderPrompts();
    this.savePrompts();
  }

  async saveCategoryOrder() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_SET',
        data: { chatgpt_gold_category_order: this.categoryOrder }
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      localStorage.setItem('chatgpt_gold_category_order_backup', JSON.stringify(this.categoryOrder));
    } catch (error) {
      console.warn('ChatGPT Gold: Failed to save category order:', error);
      localStorage.setItem('chatgpt_gold_category_order_backup', JSON.stringify(this.categoryOrder));
    }
  }

  async loadCategoryOrder() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_GET',
        keys: ['chatgpt_gold_category_order']
      });
      
      if (response && response.success && response.data.chatgpt_gold_category_order) {
        this.categoryOrder = response.data.chatgpt_gold_category_order;
        return;
      } else if (response && response.error) {
        throw new Error(response.error);
      } else {
        throw new Error('Invalid response from background script');
      }
    } catch (error) {
      // Fallback to localStorage - this is expected when background script is unavailable
      try {
        const stored = localStorage.getItem('chatgpt_gold_category_order_backup');
        this.categoryOrder = stored ? JSON.parse(stored) : [];
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed for category order:', localError);
        this.categoryOrder = [];
      }
    }
  }

  async loadCategoryExpandedState() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_GET',
        keys: ['chatgpt_gold_category_expanded']
      });
      
      if (response && response.success && response.data.chatgpt_gold_category_expanded) {
        this.categoryExpandedState = response.data.chatgpt_gold_category_expanded;
        return;
      } else if (response && response.error) {
        throw new Error(response.error);
      } else {
        throw new Error('Invalid response from background script');
      }
    } catch (error) {
      // Fallback to localStorage - this is expected when background script is unavailable
      try {
        const stored = localStorage.getItem('chatgpt_gold_category_expanded_backup');
        this.categoryExpandedState = stored ? JSON.parse(stored) : {};
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed for category expanded state:', localError);
        this.categoryExpandedState = {};
      }
    }
  }

  async saveCategoryExpandedState() {
    try {
      // Try direct chrome storage first
      try {
        await chrome.storage.local.set({ chatgpt_gold_category_expanded: this.categoryExpandedState });
        localStorage.setItem('chatgpt_gold_category_expanded_backup', JSON.stringify(this.categoryExpandedState));
        return;
      } catch (directError) {
        console.warn('ChatGPT Gold: Direct storage failed, trying background script:', directError);
        
        // Fallback to background script with timeout
        const response = await Promise.race([
          chrome.runtime.sendMessage({
            type: 'STORAGE_SET',
            data: { chatgpt_gold_category_expanded: this.categoryExpandedState }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ]);
        
        if (!response || !response.success) {
          throw new Error(response ? response.error : 'No response from background script');
        }
        
        localStorage.setItem('chatgpt_gold_category_expanded_backup', JSON.stringify(this.categoryExpandedState));
      }
    } catch (error) {
      console.warn('ChatGPT Gold: All storage methods failed, using localStorage only:', error);
      localStorage.setItem('chatgpt_gold_category_expanded_backup', JSON.stringify(this.categoryExpandedState));
    }
  }

  isCategoryExpanded(category) {
    // Default to false (collapsed) if no state is stored for this category
    return this.categoryExpandedState[category] === true;
  }

  async toggleCategory(category, buttonElement = null) {
    // Find the category element first - use buttonElement if provided for better reliability
    let categoryElement;
    if (buttonElement) {
      categoryElement = buttonElement.closest('.cg-prompt-category');
    } else {
      categoryElement = document.querySelector(`.cg-prompt-category[data-category="${category}"]`);
    }
    
    if (!categoryElement) {
      console.log('ChatGPT Gold: Category element not found for', category);
      return;
    }

    // Toggle the expanded state
    this.categoryExpandedState[category] = !this.isCategoryExpanded(category);
    const expanded = this.isCategoryExpanded(category);
    
    // Update UI immediately (synchronously) 
    categoryElement.classList.toggle('expanded', expanded);
    
    const promptsDiv = categoryElement.querySelector('.cg-category-prompts');
    if (promptsDiv) {
      promptsDiv.style.display = expanded ? 'block' : 'none';
    }
    
    const toggleIcon = categoryElement.querySelector('.cg-category-toggle span');
    if (toggleIcon) {
      toggleIcon.textContent = expanded ? '▼' : '▶';
    }
    
    
    // Save state asynchronously (don't block UI)
    this.saveCategoryExpandedState().catch(error => {
      // Fallback to localStorage
      try {
        localStorage.setItem('cg_category_expanded_backup', JSON.stringify(this.categoryExpandedState));
      } catch (e) {
      }
    });
  }

  async toggleAllCategories() {
    const promptsByCategory = this.prompts.reduce((acc, prompt) => {
      (acc[prompt.category] = acc[prompt.category] || []).push(prompt);
      return acc;
    }, {});
    
    const categories = Object.keys(promptsByCategory);
    
    // Check if all categories are currently expanded
    const allExpanded = categories.every(category => this.isCategoryExpanded(category));
    
    // Toggle all to the opposite state
    const newState = !allExpanded;
    
    categories.forEach(category => {
      this.categoryExpandedState[category] = newState;
    });
    
    await this.saveCategoryExpandedState();
    this.renderPrompts();
    
    // Update button text
    const toggleButton = document.getElementById('cg-toggle-all-categories');
    if (toggleButton) {
      toggleButton.textContent = newState ? 'Collapse All Categories' : 'Expand All Categories';
    }
    
    this.parent.showToast(newState ? 'All categories expanded' : 'All categories collapsed');
  }

  setupSortEventListeners() {
    const container = document.querySelector('[data-section="prompts"]');
    if (!container) return;

    // Remove any existing sort listeners to avoid duplicates
    const existingSortDropdown = container.querySelector('#cg-sort-type');
    const existingDirectionBtns = container.querySelectorAll('.cg-direction-btn');
    
    if (existingSortDropdown && existingSortDropdown._sortListener) {
      existingSortDropdown.removeEventListener('change', existingSortDropdown._sortListener);
    }
    
    existingDirectionBtns.forEach(btn => {
      if (btn._directionListener) {
        btn.removeEventListener('click', btn._directionListener);
      }
    });

    // Sort dropdown
    const sortDropdown = container.querySelector('#cg-sort-type');
    if (sortDropdown) {
      const dropdownListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSortTypeChange(e.target.value);
      };
      sortDropdown._sortListener = dropdownListener;
      sortDropdown.addEventListener('change', dropdownListener);
    }

    // Direction buttons
    container.querySelectorAll('.cg-direction-btn').forEach(btn => {
      const directionListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleDirectionChange(btn.dataset.direction);
      };
      btn._directionListener = directionListener;
      btn.addEventListener('click', directionListener);
    });
  }

  handleSortTypeChange(sortType) {
    if (this.sortState.currentSort !== sortType) {
      this.sortState.previousState = {
        currentSort: this.sortState.currentSort,
        direction: this.sortState.direction
      };
      this.sortState.currentSort = sortType;
      this.sortState.direction = 'asc';
      this.renderPrompts();
    }
  }

  handleDirectionChange(direction) {
    if (this.sortState.direction !== direction) {
      this.sortState.direction = direction;
      this.renderPrompts();
    }
  }

  handleSortChange(sortType) {
    if (this.sortState.currentSort !== sortType) {
      this.sortState.previousState = {
        currentSort: this.sortState.currentSort,
        direction: this.sortState.direction
      };
      this.sortState.currentSort = sortType;
      this.sortState.direction = 'asc';
    } else {
      this.toggleSortDirection();
    }
    this.renderPrompts();
  }

  toggleSortDirection() {
    this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
  }

  getSortedCategories(categories) {
    if (this.sortState.currentSort === 'name') {
      return categories.sort((a, b) => {
        return this.sortState.direction === 'asc' ? 
          a.localeCompare(b) : b.localeCompare(a);
      });
    } else if (this.sortState.currentSort === 'date') {
      // Sort by average creation date of prompts in category
      return categories.sort((a, b) => {
        const aPrompts = this.prompts.filter(p => p.category === a);
        const bPrompts = this.prompts.filter(p => p.category === b);
        const aAvgDate = aPrompts.reduce((sum, p) => sum + (p.createdAt || 0), 0) / aPrompts.length;
        const bAvgDate = bPrompts.reduce((sum, p) => sum + (p.createdAt || 0), 0) / bPrompts.length;
        return this.sortState.direction === 'asc' ? 
          aAvgDate - bAvgDate : bAvgDate - aAvgDate;
      });
    } else if (this.sortState.currentSort === 'custom') {
      return this.categoryOrder.filter(cat => categories.includes(cat));
    }
    return categories;
  }

  getSortedPrompts(prompts) {
    if (this.sortState.currentSort === 'name') {
      return prompts.sort((a, b) => {
        return this.sortState.direction === 'asc' ? 
          a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      });
    } else if (this.sortState.currentSort === 'date') {
      return prompts.sort((a, b) => {
        return this.sortState.direction === 'asc' ? 
          (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0);
      });
    } else if (this.sortState.currentSort === 'custom') {
      return prompts.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return prompts;
  }

  async saveSortState() {
    // Convert current sort to permanent order
    if (this.sortState.currentSort === 'name' || this.sortState.currentSort === 'date') {
      // Save category order
      const sortedCategories = this.getSortedCategories(Object.keys(this.prompts.reduce((acc, prompt) => {
        acc[prompt.category] = true;
        return acc;
      }, {})));
      this.categoryOrder = [...sortedCategories];
      
      // Save prompt order within each category
      const promptsByCategory = this.prompts.reduce((acc, prompt) => {
        (acc[prompt.category] = acc[prompt.category] || []).push(prompt);
        return acc;
      }, {});

      Object.keys(promptsByCategory).forEach(category => {
        const sortedPrompts = this.getSortedPrompts(promptsByCategory[category]);
        sortedPrompts.forEach((prompt, index) => {
          prompt.order = (index + 1) * 1000;
        });
      });

      this.sortState.currentSort = 'custom';
      this.sortState.previousState = null;
      
      await this.savePrompts();
      await this.saveCategoryOrder();
      this.renderPrompts();
    }
  }

  undoSort() {
    if (this.sortState.previousState) {
      this.sortState.currentSort = this.sortState.previousState.currentSort;
      this.sortState.direction = this.sortState.previousState.direction;
      this.sortState.previousState = null;
      this.renderPrompts();
    }
  }

  setupPromptEventListeners() {
    const container = document.querySelector('[data-section="prompts"]');
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const target = e.target;
      const action = target.dataset.action;
      const promptId = target.dataset.promptId;
      const categoryName = target.dataset.category;

      if (action === 'new-prompt' || target.id === 'cg-new-prompt') {
        this.showPromptDialog();
      } else if (target.id === 'cg-manage-prompts') {
        this.showCategoryManagementDialog();
      // Toggle all categories now handled by setupToggleAllListener method
      } else if (action === 'toggle-category') {
        // Note: Category toggles are now handled by direct listeners in setupCategoryToggleListeners()
        // This event delegation handler is kept as fallback but shouldn't be needed
        return;
      } else if (action === 'edit-category' && categoryName) {
        this.showEditCategoryDialog(categoryName);
      } else if (action === 'delete-category' && categoryName) {
        this.showDeleteCategoryDialog(categoryName);
      } else if (promptId) {
        switch (action) {
          case 'favorite-prompt':
            await this.toggleFavorite(promptId);
            break;
          case 'edit-prompt':
            const promptToEdit = this.prompts.find(p => p.id === promptId);
            if (promptToEdit) this.showPromptDialog(promptToEdit);
            break;
          case 'delete-prompt':
            const promptToDelete = this.prompts.find(p => p.id === promptId);
            if (promptToDelete) {
              this.showDeleteConfirmDialog(promptToDelete);
            }
            break;
          case 'use-prompt':
            const promptToUse = this.prompts.find(p => p.id === promptId);
            if (promptToUse) this.usePrompt(promptToUse);
            break;
          case 'expand-details':
            this.expandPromptDetails(promptId);
            break;
          case 'collapse-details':
            this.collapsePromptDetails(promptId);
            break;
        }
      }
    });
  }

  showPromptDialog(prompt = null) {
    // Close any existing modal first
    this.closeModal();
    
    const isEdit = !!prompt;
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-prompt-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">${isEdit ? 'Edit' : 'Create'} Prompt</h3>
          <button class="cg-modal-close" data-action="close-prompt-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <form id="cg-prompt-form">
            <div class="cg-form-group">
              <label class="cg-form-label">Title *</label>
              <input type="text" class="cg-form-input" name="title" value="${prompt?.title || ''}" required>
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Description</label>
              <input type="text" class="cg-form-input" name="description" value="${prompt?.description || ''}">
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Content *</label>
              <textarea class="cg-form-textarea" name="content" required>${prompt?.content || ''}</textarea>
              <p class="cg-form-help">Use {{variable_name}} for placeholders.</p>
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Category</label>
              <div class="cg-category-input-container">
                <select class="cg-form-input" name="category" id="cg-category-select">
                  ${this.categories.map(cat => `
                    <option value="${cat.name}" ${prompt?.category === cat.name ? 'selected' : ''}>
                      ${cat.icon} ${cat.name}
                    </option>
                  `).join('')}
                  ${prompt?.category && !this.categories.find(cat => cat.name === prompt.category) ? 
                    `<option value="${prompt.category}" selected>${this.getCategoryInfo(prompt.category).icon} ${prompt.category}</option>` : ''
                  }
                  <option value="__new__">➕ Create New Category...</option>
                </select>
              </div>
              <div class="cg-new-category-form" id="cg-new-category-form" style="display: none;">
                <input type="text" class="cg-form-input" id="cg-new-category-name" placeholder="Category name">
                <div class="cg-category-customization">
                  <label>Icon:</label>
                  <div id="cg-new-category-icon-picker"></div>
                  <label>Color:</label>
                  <input type="color" class="cg-form-input cg-color-input" id="cg-new-category-color" value="#3b82f6">
                </div>
                <div class="cg-new-category-actions">
                  <button type="button" class="cg-btn cg-btn-small cg-btn-primary" id="cg-create-category">Create</button>
                  <button type="button" class="cg-btn cg-btn-small cg-btn-secondary" id="cg-cancel-category">Cancel</button>
                </div>
              </div>
            </div>
            <div class="cg-form-actions">
              <button type="submit" class="cg-btn cg-btn-primary">${isEdit ? 'Update' : 'Create'} Prompt</button>
              <button type="button" class="cg-btn cg-btn-secondary" data-action="close-prompt-modal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;

    // Setup category management handlers
    this.setupCategoryManagementHandlers(modal);

    const form = modal.querySelector('#cg-prompt-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      
      const formData = new FormData(form);
      const promptData = {
        title: formData.get('title'),
        description: formData.get('description'),
        content: formData.get('content'),
        category: formData.get('category'),
      };
      try {
        if (isEdit) await this.editPrompt(prompt.id, promptData);
        else await this.createPrompt(promptData);
        this.closeModal();
      } catch (error) {
        console.error('Failed to save prompt:', error);
        this.parent.showToast('Failed to save prompt');
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-prompt-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        this.closeModal();
      }
    });

    // Add Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal === modal) {
        this.closeModal();
      }
    });

    setTimeout(() => { modal.querySelector('input[name="title"]')?.focus(); }, 100);
  }

  setupCategoryManagementHandlers(modal) {
    const categorySelect = modal.querySelector('#cg-category-select');
    const newCategoryForm = modal.querySelector('#cg-new-category-form');
    const createCategoryBtn = modal.querySelector('#cg-create-category');
    const cancelCategoryBtn = modal.querySelector('#cg-cancel-category');
    const iconPickerContainer = modal.querySelector('#cg-new-category-icon-picker');

    // Create and setup emoji picker for new categories
    if (iconPickerContainer) {
      const emojiPicker = this.createEmojiPicker('📁');
      iconPickerContainer.appendChild(emojiPicker);
    }

    // Handle category selection
    categorySelect.addEventListener('change', (e) => {
      if (e.target.value === '__new__') {
        newCategoryForm.style.display = 'block';
        modal.querySelector('#cg-new-category-name')?.focus();
      } else {
        newCategoryForm.style.display = 'none';
      }
    });

    // Handle create new category
    createCategoryBtn?.addEventListener('click', async () => {
      const name = modal.querySelector('#cg-new-category-name').value.trim();
      const emojiPicker = iconPickerContainer?.querySelector('.cg-emoji-picker');
      const icon = emojiPicker ? this.getSelectedEmoji(emojiPicker) : '📁';
      const color = modal.querySelector('#cg-new-category-color').value;

      if (!name) {
        this.parent.showToast('Please enter a category name');
        return;
      }

      if (this.categories.find(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        this.parent.showToast('Category already exists');
        return;
      }

      try {
        // Add new category
        this.categories.push({ name, icon, color });
        
        // Add to category order so it shows up in the interface
        if (!this.categoryOrder.includes(name)) {
          this.categoryOrder.push(name);
          await this.saveCategoryOrder();
        }
        
        await this.saveCategories();

        // Update the select options
        const newOption = document.createElement('option');
        newOption.value = name;
        newOption.textContent = `${icon} ${name}`;
        newOption.selected = true;
        
        // Insert before the "Create New" option
        const createNewOption = categorySelect.querySelector('option[value="__new__"]');
        categorySelect.insertBefore(newOption, createNewOption);

        // Hide the new category form and select the new category
        newCategoryForm.style.display = 'none';
        categorySelect.value = name;

        this.parent.showToast(`Category "${name}" created successfully`);
      } catch (error) {
        console.error('Failed to create category:', error);
        this.parent.showToast('Failed to create category');
      }
    });

    // Handle cancel new category
    cancelCategoryBtn?.addEventListener('click', () => {
      newCategoryForm.style.display = 'none';
      categorySelect.value = this.categories[0]?.name || 'Uncategorized';
      modal.querySelector('#cg-new-category-name').value = '';
    });

  }

  showCategoryManagementDialog() {
    this.closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-category-management-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Manage Categories</h3>
          <button class="cg-modal-close" data-action="close-category-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <div class="cg-categories-list">
            ${this.categories.map(category => `
              <div class="cg-category-management-item" data-category="${category.name}">
                <div class="cg-category-info" style="border-left: 3px solid ${category.color}">
                  <span class="cg-category-icon">${category.icon}</span>
                  <span class="cg-category-name">${category.name}</span>
                  <span class="cg-category-count">(${this.prompts.filter(p => p.category === category.name).length} prompts)</span>
                </div>
                <div class="cg-category-actions">
                  <button class="cg-btn cg-btn-small cg-btn-secondary" data-action="edit-category" data-category="${category.name}">✏️ Edit</button>
                  <button class="cg-btn cg-btn-small cg-btn-danger" data-action="delete-category" data-category="${category.name}">🗑️ Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="cg-modal-footer">
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-category-modal">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;

    // Setup event listeners
    modal.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const categoryName = e.target.dataset.category;

      if (action === 'close-category-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        this.closeModal();
      } else if (action === 'edit-category') {
        this.showEditCategoryDialog(categoryName);
      } else if (action === 'delete-category') {
        this.showDeleteCategoryDialog(categoryName);
      }
    });
  }

  showEditCategoryDialog(categoryName) {
    const category = this.categories.find(cat => cat.name === categoryName);
    if (!category) return;

    this.closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-edit-category-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Edit Category</h3>
          <button class="cg-modal-close" data-action="close-edit-category-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <form id="cg-edit-category-form">
            <div class="cg-form-group">
              <label class="cg-form-label">Category Name</label>
              <input type="text" class="cg-form-input" name="name" value="${category.name}" required>
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Icon</label>
              <div id="cg-edit-category-icon-picker"></div>
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Color</label>
              <input type="color" class="cg-form-input cg-color-input" name="color" value="${category.color}">
            </div>
            <div class="cg-form-actions">
              <button type="submit" class="cg-btn cg-btn-primary">Update Category</button>
              <button type="button" class="cg-btn cg-btn-secondary" data-action="close-edit-category-modal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;

    // Setup emoji picker for editing
    const editIconPickerContainer = modal.querySelector('#cg-edit-category-icon-picker');
    if (editIconPickerContainer) {
      const editEmojiPicker = this.createEmojiPicker(category.icon);
      editIconPickerContainer.appendChild(editEmojiPicker);
    }

    const form = modal.querySelector('#cg-edit-category-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const newName = formData.get('name').trim();
      const editEmojiPicker = editIconPickerContainer?.querySelector('.cg-emoji-picker');
      const newIcon = editEmojiPicker ? this.getSelectedEmoji(editEmojiPicker) : category.icon;
      const newColor = formData.get('color');

      if (!newName) {
        this.parent.showToast('Please enter a category name');
        return;
      }

      // Check if name already exists (excluding current category)
      if (newName !== categoryName && this.categories.find(cat => cat.name.toLowerCase() === newName.toLowerCase())) {
        this.parent.showToast('Category name already exists');
        return;
      }

      try {
        // Update category
        category.name = newName;
        category.icon = newIcon;
        category.color = newColor;

        // Update all prompts that use the old category name
        if (newName !== categoryName) {
          this.prompts.forEach(prompt => {
            if (prompt.category === categoryName) {
              prompt.category = newName;
            }
          });
          await this.savePrompts();
        }

        await this.saveCategories();
        this.renderPrompts();
        this.closeModal();
        
        this.parent.showToast(`Category updated successfully`);
      } catch (error) {
        console.error('Failed to update category:', error);
        this.parent.showToast('Failed to update category');
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-edit-category-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        this.closeModal();
      }
    });
  }

  showDeleteCategoryDialog(categoryName) {
    const category = this.categories.find(cat => cat.name === categoryName);
    if (!category) return;

    const promptsInCategory = this.prompts.filter(p => p.category === categoryName);
    
    this.closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-delete-category-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Delete Category</h3>
          <button class="cg-modal-close" data-action="close-delete-category-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <div class="cg-warning-message">
            <div class="cg-warning-icon">⚠️</div>
            <div class="cg-warning-content">
              <h4>Delete "${category.name}" category?</h4>
              ${promptsInCategory.length > 0 ? `
                <p>This category contains <strong>${promptsInCategory.length} prompt(s)</strong>. What would you like to do with them?</p>
                <div class="cg-deletion-options">
                  <label class="cg-radio-option">
                    <input type="radio" name="deletion-action" value="uncategorized" checked>
                    <span>Move all prompts to "Uncategorized"</span>
                  </label>
                  <label class="cg-radio-option">
                    <input type="radio" name="deletion-action" value="reassign">
                    <span>Move all prompts to another category:</span>
                  </label>
                  <select class="cg-form-input cg-reassign-category" id="cg-reassign-select" disabled>
                    ${this.categories.filter(cat => cat.name !== categoryName).map(cat => `
                      <option value="${cat.name}">${cat.icon} ${cat.name}</option>
                    `).join('')}
                  </select>
                </div>
              ` : `
                <p>This category is empty and can be safely deleted.</p>
              `}
            </div>
          </div>
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-danger" id="cg-confirm-delete-category">Delete Category</button>
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-delete-category-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;

    // Setup reassign category dropdown
    const reassignRadio = modal.querySelector('input[value="reassign"]');
    const reassignSelect = modal.querySelector('#cg-reassign-select');
    
    modal.querySelectorAll('input[name="deletion-action"]').forEach(radio => {
      radio.addEventListener('change', () => {
        reassignSelect.disabled = !reassignRadio.checked;
      });
    });

    // Handle delete confirmation
    modal.querySelector('#cg-confirm-delete-category').addEventListener('click', async () => {
      try {
        if (promptsInCategory.length > 0) {
          const deletionAction = modal.querySelector('input[name="deletion-action"]:checked').value;
          const targetCategory = deletionAction === 'reassign' ? reassignSelect.value : 'Uncategorized';

          // Reassign all prompts
          promptsInCategory.forEach(prompt => {
            prompt.category = targetCategory;
          });
          
          await this.savePrompts();
        }

        // Remove category
        this.categories = this.categories.filter(cat => cat.name !== categoryName);
        await this.saveCategories();
        
        this.renderPrompts();
        this.closeModal();
        
        this.parent.showToast(`Category "${categoryName}" deleted successfully`);
      } catch (error) {
        console.error('Failed to delete category:', error);
        this.parent.showToast('Failed to delete category');
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-delete-category-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        this.closeModal();
      }
    });
  }

  showDeleteConfirmDialog(prompt) {
    // Close any existing modal first
    this.closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-delete-confirm-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Delete Prompt</h3>
          <button class="cg-modal-close" data-action="close-delete-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <div class="cg-delete-warning">
            <div class="cg-warning-icon">⚠️</div>
            <div class="cg-warning-content">
              <p class="cg-warning-title">Are you sure you want to delete this prompt?</p>
              <p class="cg-warning-description">
                <strong>"${prompt.title}"</strong><br>
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-danger" data-action="confirm-delete">Delete Prompt</button>
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-delete-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;

    modal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm-delete') {
        try {
          await this.deletePrompt(prompt.id);
          this.closeModal();
        } catch (error) {
          console.error('Failed to delete prompt:', error);
          this.parent.showToast('Failed to delete prompt');
        }
      } else if (action === 'close-delete-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        this.closeModal();
      }
    });

    // Add Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal === modal) {
        this.closeModal();
      }
    });

    // Focus the cancel button by default for safety
    setTimeout(() => { modal.querySelector('[data-action="close-delete-modal"]')?.focus(); }, 100);
  }

  async usePrompt(prompt) {
    const variables = prompt.content.match(/{{(.*?)}}/g);
    if (variables && variables.length > 0) {
      this.showVariableInputDialog(prompt, variables);
    } else {
      this.insertPromptContent(prompt.content);
    }
  }

  showVariableInputDialog(prompt, variables) {
    // Close any existing modal first
    this.closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-variable-modal cg-guided-form';
    
    // Create variable helper info
    const variableInfo = this.getVariableInfo();
    
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content cg-guided-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Complete Your Prompt: ${prompt.title}</h3>
          <div class="cg-header-controls">
            <button class="cg-animation-toggle" id="cg-animation-toggle" title="Toggle animations">
              ✨
            </button>
            <button class="cg-modal-close" data-action="close-variable-modal">×</button>
          </div>
        </div>
        <div class="cg-modal-body cg-guided-body">
          <!-- Two Column Layout -->
          <div class="cg-guided-content">
            <!-- Variable Form Section -->
            <div class="cg-variable-form-section">
              <h4>Fill in the Details</h4>
              <div class="cg-form-scroll-area">
                <form id="cg-variable-form">
                  ${variables.map((variable, index) => {
                  const varName = variable.replace(/{{|}}/g, '');
                  const cleanName = varName.replace(/_/g, ' ').trim();
                  const info = variableInfo[varName.toLowerCase()] || {};
                  
                  return `
                    <div class="cg-form-group cg-guided-form-group" data-variable="${varName}">
                      <label class="cg-form-label cg-guided-label">
                        <span class="cg-variable-number">${index + 1}.</span>
                        <span class="cg-variable-name">${cleanName}</span>
                      </label>
                      ${info.hint ? `<p class="cg-variable-hint">${info.hint}</p>` : ''}
                      <div class="cg-input-wrapper">
                        ${info.type === 'textarea' ? 
                          `<textarea class="cg-form-input cg-guided-input" name="${varName}" placeholder="${info.placeholder || 'Enter ' + cleanName.toLowerCase() + '...'}" rows="3"></textarea>` :
                          `<input type="text" class="cg-form-input cg-guided-input" name="${varName}" placeholder="${info.placeholder || 'Enter ' + cleanName.toLowerCase() + '...'}">`
                        }
                      </div>
                    </div>
                  `;
                  }).join('')}
                  
                  <div class="cg-form-actions cg-guided-actions">
                    <button type="submit" class="cg-btn cg-btn-primary cg-insert-btn">
                      <span class="cg-btn-icon">✨</span>
                      Insert into ChatGPT
                    </button>
                    <button type="button" class="cg-btn cg-btn-secondary" data-action="close-variable-modal">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
            
            <!-- Live Preview Section -->
            <div class="cg-live-preview-section">
              <h4>Live Preview</h4>
              <div class="cg-live-preview" id="cg-live-preview">
                ${this.createPromptPreview(prompt.content, variables)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;

    const form = modal.querySelector('#cg-variable-form');
    const livePreview = modal.querySelector('#cg-live-preview');
    
    // Setup animation toggle
    const animationToggle = modal.querySelector('#cg-animation-toggle');
    let animationsEnabled = true;
    
    animationToggle.addEventListener('click', (e) => {
      e.preventDefault();
      animationsEnabled = !animationsEnabled;
      animationToggle.textContent = animationsEnabled ? '✨' : '⚡';
      animationToggle.title = animationsEnabled ? 'Disable animations' : 'Enable animations';
      modal.classList.toggle('cg-animations-disabled', !animationsEnabled);
    });

    // Setup live preview updates
    form.addEventListener('input', (e) => {
      this.updateLivePreview(prompt.content, variables, form, livePreview);
    });
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      let finalContent = prompt.content;
      const formData = new FormData(form);
      variables.forEach(variable => {
        const varName = variable.replace(/{{|}}/g, '');
        const value = formData.get(varName) || '';
        finalContent = finalContent.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
      });
      
      this.insertPromptContent(finalContent);
      this.closeModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-variable-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        this.closeModal();
      }
    });

    // Add Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal === modal) {
        this.closeModal();
      }
    });

    setTimeout(() => { modal.querySelector('input[name], textarea[name]')?.focus(); }, 100);
  }

  getVariableInfo() {
    return {
      'topic': {
        hint: 'What subject are you analyzing or discussing?',
        placeholder: 'e.g., "Remote work productivity", "Climate change impacts"',
        type: 'input'
      },
      'context': {
        hint: 'Background information, current situation, or why this matters now',
        placeholder: 'e.g., "Post-pandemic workplace changes", "Recent policy updates"',
        type: 'textarea'
      },
      'audience': {
        hint: 'Who will be reading or using this analysis?',
        placeholder: 'e.g., "C-level executives", "General public", "Technical team"',
        type: 'input'
      },
      'objectives': {
        hint: 'What goals or outcomes are you trying to achieve?',
        placeholder: 'e.g., "Increase efficiency by 20%", "Reduce costs", "Improve satisfaction"',
        type: 'textarea'
      },
      'timeline': {
        hint: 'Time constraints or important deadlines',
        placeholder: 'e.g., "Q1 2024", "Next 6 months", "By end of year"',
        type: 'input'
      },
      'budget': {
        hint: 'Financial constraints or available resources',
        placeholder: 'e.g., "$50K budget", "Limited resources", "Cost-neutral"',
        type: 'input'
      },
      'code': {
        hint: 'Paste the code you want reviewed or analyzed',
        placeholder: 'Paste your code here...',
        type: 'textarea'
      },
      'text': {
        hint: 'The content you want summarized or analyzed',
        placeholder: 'Paste your text here...',
        type: 'textarea'
      },
      'recipient': {
        hint: 'Who are you writing to?',
        placeholder: 'e.g., "John Smith", "Support Team", "Client"',
        type: 'input'
      }
    };
  }

  createPromptPreview(content, variables) {
    let preview = content.trim();
    variables.forEach(variable => {
      const varName = variable.replace(/{{|}}/g, '');
      const underlined = `<span class="cg-variable-placeholder" data-variable="${varName}">${varName}</span>`;
      preview = preview.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), underlined);
    });
    // Preserve line breaks and spacing
    preview = preview.replace(/\n/g, '<br>');
    preview = preview.replace(/  /g, '&nbsp;&nbsp;');
    return preview;
  }

  updateLivePreview(originalContent, variables, form, livePreviewElement) {
    let previewContent = originalContent.trim();
    const formData = new FormData(form);
    
    variables.forEach(variable => {
      const varName = variable.replace(/{{|}}/g, '');
      const value = formData.get(varName) || '';
      if (value.trim()) {
        previewContent = previewContent.replace(
          new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), 
          `<span class="cg-filled-variable">${value}</span>`
        );
      } else {
        previewContent = previewContent.replace(
          new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), 
          `<span class="cg-empty-variable">${varName}</span>`
        );
      }
    });
    
    // Preserve line breaks and spacing
    previewContent = previewContent.replace(/\n/g, '<br>');
    previewContent = previewContent.replace(/  /g, '&nbsp;&nbsp;');
    
    livePreviewElement.innerHTML = previewContent;
  }

  insertPromptContent(content) {
    // Try multiple selectors to find ChatGPT's input
    const selectors = [
      'textarea[placeholder*="Message"]',
      'textarea[data-id]',
      '#prompt-textarea',
      'textarea',
      '[contenteditable="true"]',
      'div[contenteditable="true"]'
    ];
    
    let inputElement = null;
    for (const selector of selectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) break;
    }
    
    if (inputElement) {
      if (inputElement.tagName === 'TEXTAREA') {
        inputElement.value = content;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Handle contenteditable div
        inputElement.innerText = content;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      inputElement.focus();
      this.parent.showToast('Prompt inserted!');
    } else {
      this.parent.showToast('Could not find chat input.');
    }
  }

  getQuickPrompts() {
    return this.prompts.filter(p => p.favorite || p.category === 'Quick').slice(0, 10); // Show up to 10 favorites or quick prompts
  }

  shouldShowPreview(prompt) {
    // Show preview for long content (>100 chars) or multiple variables (>1)
    const variables = prompt.content.match(/{{(.*?)}}/g) || [];
    return prompt.content.length > 100 || variables.length > 1;
  }

  expandPromptDetails(promptId) {
    const previewContainer = document.querySelector(`[data-prompt-id="${promptId}"] .cg-prompt-details-preview`);
    if (previewContainer) {
      const collapsed = previewContainer.querySelector('.cg-prompt-details-collapsed');
      const expanded = previewContainer.querySelector('.cg-prompt-details-expanded');
      
      if (collapsed && expanded) {
        collapsed.style.display = 'none';
        expanded.style.display = 'block';
      }
    }
  }

  collapsePromptDetails(promptId) {
    const previewContainer = document.querySelector(`[data-prompt-id="${promptId}"] .cg-prompt-details-preview`);
    if (previewContainer) {
      const collapsed = previewContainer.querySelector('.cg-prompt-details-collapsed');
      const expanded = previewContainer.querySelector('.cg-prompt-details-expanded');
      
      if (collapsed && expanded) {
        collapsed.style.display = 'block';
        expanded.style.display = 'none';
      }
    }
  }


  closeModal() {
    if (this.currentModal) {
      try {
        if (this.currentModal.parentNode) {
          this.currentModal.parentNode.removeChild(this.currentModal);
        }
      } catch (error) {
        console.error('ChatGPT Gold: Error removing modal:', error);
      }
      this.currentModal = null;
    }
  }

  // Emoji Picker Component Methods
  createEmojiPicker(selectedEmoji = '📁') {
    const picker = document.createElement('div');
    picker.className = 'cg-emoji-picker';
    
    picker.innerHTML = `
      <button type="button" class="cg-emoji-button" data-selected-emoji="${selectedEmoji}">
        ${selectedEmoji}
      </button>
      <div class="cg-emoji-dropdown">
        <input type="text" class="cg-emoji-search" placeholder="Search emojis..." />
        <div class="cg-emoji-categories">
          <button type="button" class="cg-emoji-category-btn active" data-category="Smileys & People">😀</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Animals & Nature">🐶</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Food & Drink">🍎</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Activity">⚽</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Travel & Places">🚗</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Objects">⌚</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Symbols">❤️</button>
        </div>
        <div class="cg-emoji-grid"></div>
      </div>
    `;

    this.setupEmojiPickerEvents(picker);
    return picker;
  }

  positionEmojiDropdown(button, dropdown) {
    const buttonRect = button.getBoundingClientRect();
    const dropdownHeight = 400; // max-height from CSS
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    // Position horizontally
    dropdown.style.left = `${buttonRect.left}px`;
    
    // Position vertically - flip to top if not enough space below
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      dropdown.style.top = `${buttonRect.top - dropdownHeight - 8}px`;
      dropdown.classList.add('cg-dropdown-flipped');
    } else {
      dropdown.style.top = `${buttonRect.bottom + 8}px`;
      dropdown.classList.remove('cg-dropdown-flipped');
    }
  }

  setupEmojiPickerEvents(picker) {
    const button = picker.querySelector('.cg-emoji-button');
    const dropdown = picker.querySelector('.cg-emoji-dropdown');
    const searchInput = picker.querySelector('.cg-emoji-search');
    const categoryBtns = picker.querySelectorAll('.cg-emoji-category-btn');
    const grid = picker.querySelector('.cg-emoji-grid');

    let currentCategory = 'Smileys & People';
    let isOpen = false;

    // Toggle dropdown
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen = !isOpen;
      dropdown.classList.toggle('show', isOpen);
      
      if (isOpen) {
        this.positionEmojiDropdown(button, dropdown);
        this.renderEmojiGrid(grid, currentCategory);
        searchInput.focus();
        // Close other open pickers
        document.querySelectorAll('.cg-emoji-dropdown.show').forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('show');
          }
        });
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!picker.contains(e.target)) {
        dropdown.classList.remove('show');
        isOpen = false;
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        dropdown.classList.remove('show');
        isOpen = false;
        button.focus();
      }
    });

    // Category switching
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        this.renderEmojiGrid(grid, currentCategory);
      });
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query) {
        this.renderEmojiSearch(grid, query);
      } else {
        this.renderEmojiGrid(grid, currentCategory);
      }
    });

    // Emoji selection
    grid.addEventListener('click', (e) => {
      if (e.target.classList.contains('cg-emoji-item')) {
        const selectedEmoji = e.target.textContent;
        button.textContent = selectedEmoji;
        button.dataset.selectedEmoji = selectedEmoji;
        dropdown.classList.remove('show');
        isOpen = false;
        
        // Dispatch custom event for emoji selection
        picker.dispatchEvent(new CustomEvent('emoji-selected', {
          detail: { emoji: selectedEmoji }
        }));
      }
    });
  }

  renderEmojiGrid(grid, category) {
    const emojis = this.emojiData[category] || [];
    grid.innerHTML = emojis.map(emoji => 
      `<button type="button" class="cg-emoji-item">${emoji}</button>`
    ).join('');
  }

  renderEmojiSearch(grid, query) {
    const allEmojis = [];
    Object.values(this.emojiData).forEach(categoryEmojis => {
      allEmojis.push(...categoryEmojis);
    });

    // Simple search - you could enhance this with emoji names/keywords
    const filteredEmojis = allEmojis.filter(emoji => {
      // For now, just show all if query matches common terms
      const commonTerms = {
        'happy': ['😀', '😃', '😄', '😁', '😊', '🙂', '😎'],
        'sad': ['😔', '😞', '😢', '😭', '😟'],
        'love': ['❤️', '💕', '💖', '💗', '💝', '😍', '🥰'],
        'fire': ['🔥'],
        'star': ['⭐', '🌟', '✨', '🌠'],
        'heart': ['❤️', '💕', '💖', '💗', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎'],
        'work': ['💻', '⚙️', '🔧', '🔨', '📊', '📈', '📋'],
        'money': ['💰', '💵', '💸', '🤑'],
        'food': ['🍕', '🍔', '🍟', '🍎', '🥑', '🍇', '🍓'],
        'animal': ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼']
      };
      
      if (commonTerms[query]) {
        return commonTerms[query].includes(emoji);
      }
      
      return allEmojis.includes(emoji);
    });

    grid.innerHTML = (filteredEmojis.length > 0 ? filteredEmojis : allEmojis)
      .slice(0, 64) // Limit results
      .map(emoji => `<button type="button" class="cg-emoji-item">${emoji}</button>`)
      .join('');
  }

  getSelectedEmoji(picker) {
    const button = picker.querySelector('.cg-emoji-button');
    return button.dataset.selectedEmoji || button.textContent;
  }
}

window.PromptManager = PromptManager;
