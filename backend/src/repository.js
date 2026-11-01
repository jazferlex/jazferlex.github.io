import { contentSchema } from './schema.js';
function envelope(row) {
  return row ? {content:contentSchema.parse(row.content),revision:Number(row.revision),updatedAt:row.updated_at.toISOString()} : null;
}
export class ContentRepository {
  constructor(pool) { this.pool = pool; }
  async read() {
    const {rows} = await this.pool.query('SELECT content, revision, updated_at FROM portfolio_content WHERE id=1');
    return envelope(rows[0]);
  }
  async seed(content) {
    const valid = contentSchema.parse(content);
    await this.pool.query('INSERT INTO portfolio_content (id, content) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',[JSON.stringify(valid)]);
    return this.read();
  }
  async save(content, revision) {
    const valid = contentSchema.parse(content);
    const {rows} = await this.pool.query('UPDATE portfolio_content SET content=$1::jsonb, revision=revision+1, updated_at=clock_timestamp() WHERE id=1 AND revision=$2 RETURNING content,revision,updated_at',[JSON.stringify(valid),revision]);
    return envelope(rows[0]);
  }
}
