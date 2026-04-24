# Create New API Endpoint

This skill scaffolds a new API endpoint following project conventions.

## Steps

1. **Define route** in `src/routes/{domain}.routes.ts`:
   - Add correct HTTP method
   - Apply `validateParam` for routes with `:id`
   - Apply `csrfProtect` for POST/PATCH/DELETE
   - Apply `authenticate` and `requireRole` as needed

2. **Add Zod schema** in `src/controllers/{domain}.controller.ts`:
   - Define and export the schema
   - Import and use in the route via `validate(schema)` middleware

3. **Add controller method** in `src/controllers/{domain}.controller.ts`:
   - Parse `req.body` (already validated by middleware — just destructure)
   - Call service method
   - Return standardized response

4. **Add service method** in `src/services/{domain}.service.ts`:
   - Business logic
   - `database.run/get/all` with parameterized statements
   - Wrap multi-step writes in `database.transaction()`
   - Call `database.save()` after writes

5. **Add audit log** for sensitive operations:
   - `database.run("INSERT INTO audit_log ...", [userId, action, entity, entityId])`

## Example: POST /api/example

```typescript
// routes/example.routes.ts
import { csrfProtect } from '../middleware/csrf.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { exampleController, createExampleSchema } from '../controllers/example.controller.js';

router.post(
  '/',
  authenticate,
  requireRole('customer'),
  csrfProtect,
  validate(createExampleSchema),
  exampleController.create
);

// controllers/example.controller.ts
export const createExampleSchema = z.object({
  name: z.string().min(1)
});

export const exampleController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const { name } = req.body as { name: string };
    const result = exampleService.create({ name, userId: req.user!.userId });

    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
      return;
    }
    res.status(201).json({ success: true, data: result.item });
  }
};

// services/example.service.ts
create(data: { name: string; userId: number }): { success: boolean; item?: Item; error?: string } {
  const database = getDb();
  database.run('INSERT INTO examples (name, user_id) VALUES (?, ?)', [data.name, data.userId]);
  const item = database.get<Item>('SELECT * FROM examples WHERE name = ?', [data.name]);
  database.run('INSERT INTO audit_log (user_id, action, entity) VALUES (?, ?, ?)', [data.userId, 'EXAMPLE_CREATE', 'example']);
  database.save();
  return { success: true, item };
}
```

## Validation Checklist
- Run `npx tsc --noEmit` — must pass clean
- Test with curl: `curl -X POST http://localhost:3000/api/example -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" -d '{"name":"test"}' --cookie "..."` 
