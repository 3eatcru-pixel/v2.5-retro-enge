import { retroEventBus } from '../events/EventBus';

export class LocalizationSystem {
  private dictionary: Map<string, Record<string, string>> = new Map();
  private currentLanguage: string = 'en';

  registerTranslations(language: string, translations: Record<string, string>): void {
    const existing = this.dictionary.get(language) || {};
    this.dictionary.set(language, { ...existing, ...translations });
  }

  setLanguage(language: string): void {
    if (this.dictionary.has(language)) {
      this.currentLanguage = language;
      retroEventBus.emit('language-changed', { language });
    } else {
      console.warn(`Language ${language} not registered.`);
    }
  }

  getLanguage(): string {
    return this.currentLanguage;
  }

  get(key: string, variables?: Record<string, string | number>): string {
    const langDict = this.dictionary.get(this.currentLanguage);
    if (!langDict || typeof langDict[key] === 'undefined') {
      return key; // Fallback to returning the key if not found
    }
    
    let text = langDict[key];
    if (variables) {
      for (const [varName, varValue] of Object.entries(variables)) {
         text = text.replace(new RegExp(`\\{${varName}\\}`, 'g'), String(varValue));
      }
    }
    
    return text;
  }

  clear(): void {
    this.dictionary.clear();
  }
}
