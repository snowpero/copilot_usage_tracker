/**
 * core/storage.js
 * chrome.storage.local 기반 토큰/설정 관리
 * 웹 버전의 sessionStorage와 동일한 인터페이스
 */

export const storage = {
  async get(key) {
    return new Promise(resolve => {
      chrome.storage.local.get(key, result => resolve(result[key] ?? null));
    });
  },

  async set(key, value) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },

  async getAll() {
    return new Promise(resolve => {
      chrome.storage.local.get(['gh_token', 'gh_username', 'gh_plan'], resolve);
    });
  },

  async clearAll() {
    return new Promise(resolve => {
      chrome.storage.local.remove(['gh_token', 'gh_username', 'gh_plan'], resolve);
    });
  },

  async getToken()    { return this.get('gh_token'); },
  async getUsername() { return this.get('gh_username'); },
  async getPlan()     { return this.get('gh_plan') ?? 'pro'; },

  async setToken(v)    { return this.set('gh_token', v); },
  async setUsername(v) { return this.set('gh_username', v); },
  async setPlan(v)     { return this.set('gh_plan', v); },
};
