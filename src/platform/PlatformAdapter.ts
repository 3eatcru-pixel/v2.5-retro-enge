export interface PlatformAdapter {
  type: 'web' | 'desktop' | 'mobile';
  init(): Promise<void>;
  saveData(key: string, data: string): Promise<void>;
  loadData(key: string): Promise<string | null>;
  quit(): void;
}
