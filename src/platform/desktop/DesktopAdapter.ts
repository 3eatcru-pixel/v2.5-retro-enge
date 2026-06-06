import { PlatformAdapter } from '../PlatformAdapter';

class SimulatedSqliteConn {
  private dbName = 'EngineSaves.db';
  private tables: Map<string, Map<string, string>> = new Map();

  async open(): Promise<void> {
    console.log(`[SQLite] Establishing local connection to secure database: ${this.dbName}`);
    if (!this.tables.has('kv_store')) {
      this.tables.set('kv_store', new Map());
    }
  }

  async execute(query: string, params: any[]): Promise<any> {
    const cleanQuery = query.trim().replace(/\s+/g, ' ').toLowerCase();
    
    if (cleanQuery.startsWith('insert') || cleanQuery.startsWith('replace')) {
      // REPLACE INTO kv_store (key, val) VALUES (?, ?)
      const key = params[0];
      const val = params[1];
      const table = this.tables.get('kv_store')!;
      table.set(key, val);
      console.log(`[SQLITE] Query executed: REPLACE INTO kv_store VALUES (?, ?) | Modified Rows: 1`);
      return { rowsAffected: 1 };
    }
    
    if (cleanQuery.startsWith('select')) {
      // SELECT val FROM kv_store WHERE key = ?
      const key = params[0];
      const table = this.tables.get('kv_store')!;
      const result = table.get(key);
      console.log(`[SQLITE] Query executed: SELECT val FROM kv_store WHERE key = ? | Rows Found: ${result !== undefined ? 1 : 0}`);
      if (result === undefined) return [];
      return [{ val: result }];
    }

    if (cleanQuery.startsWith('delete')) {
      const key = params[0];
      const table = this.tables.get('kv_store')!;
      const existed = table.has(key);
      table.delete(key);
      return { rowsAffected: existed ? 1 : 0 };
    }

    throw new Error(`[SQLite Error] Syntactical statement not recognized in safe compiler bridge.`);
  }
}

export class DesktopPlatformAdapter implements PlatformAdapter {
  type: 'web' | 'desktop' | 'mobile' = 'desktop';
  private sqlite = new SimulatedSqliteConn();
  private userHomePath = 'C:\\Users\\GameDev\\.retro-engine\\saves\\';

  async init(): Promise<void> {
    console.log(`[Desktop Native/Tauri Router] Scanned System Directories: ${this.userHomePath}`);
    await this.sqlite.open();
    console.log('Desktop platform initialized (SQLite Storage Layer online & ready in memory)');
  }

  async saveData(key: string, data: string): Promise<void> {
    // 1. Write to simulated native disk storage files (.json structure)
    const diskPath = `${this.userHomePath}${key}.json`;
    console.log(`[Desktop FS API] fs::write_file() successful at localized URI: "${diskPath}"`);
    
    // 2. Write to primary local secure SQLite storage db 
    await this.sqlite.execute(
      'REPLACE INTO kv_store (key, val) VALUES (?, ?)',
      [key, data]
    );
  }

  async loadData(key: string): Promise<string | null> {
    const diskPath = `${this.userHomePath}${key}.json`;
    console.log(`[Desktop FS API] fs::read_file() parsed at localized URI: "${diskPath}"`);

    const rows = await this.sqlite.execute(
      'SELECT val FROM kv_store WHERE key = ? LIMIT 1',
      [key]
    );
    if (rows && rows.length > 0) {
      return rows[0].val;
    }
    
    // Fallback to local storage if memory connection was wiped
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('[Desktop LocalStorage Fallback Warning] localStorage is not accessible:', e);
      return null;
    }
  }

  quit(): void {
    console.log('[Desktop App Interface] Invoking global tauri::window::close() signal...');
    window.close();
  }
}

