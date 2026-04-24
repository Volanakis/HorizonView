// Service template - copy and customize
import { Database } from '../db/index.js';

export class ExampleService {
  private db = Database.getInstance();

  async findAll(): Promise<Example[]> {
    return this.db.query('SELECT * FROM examples');
  }

  async findById(id: string): Promise<Example | null> {
    const results = await this.db.query('SELECT * FROM examples WHERE id = ?', [id]);
    return results[0] || null;
  }

  async create(data: Partial<Example>): Promise<Example> {
    const result = await this.db.run('INSERT INTO examples ...', [...]);
    return { id: result.lastInsertRowid, ...data } as Example;
  }

  async update(id: string, data: Partial<Example>): Promise<Example | null> {
    await this.db.run('UPDATE examples SET ... WHERE id = ?', [..., id]);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM examples WHERE id = ?', [id]);
  }
}
