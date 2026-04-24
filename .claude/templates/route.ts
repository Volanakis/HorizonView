// Route template - copy and customize
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request.js';
import { ExampleService } from './example.service.js';

const router = Router();
const exampleService = new ExampleService();

const exampleSchema = z.object({
  // Define schema fields
});

router.get('/', async (req: Request, res: Response) => {
  const examples = await exampleService.findAll();
  res.json({ data: examples });
});

router.get('/:id', validateRequest, async (req: Request, res: Response) => {
  const example = await exampleService.findById(req.params.id);
  if (!example) {
    return res.status(404).json({ error: { message: 'Example not found', code: 'NOT_FOUND' } });
  }
  res.json({ data: example });
});

router.post('/', validateRequest, async (req: Request, res: Response) => {
  const example = await exampleService.create(req.body);
  res.status(201).json({ data: example });
});

router.patch('/:id', validateRequest, async (req: Request, res: Response) => {
  const example = await exampleService.update(req.params.id, req.body);
  if (!example) {
    return res.status(404).json({ error: { message: 'Example not found', code: 'NOT_FOUND' } });
  }
  res.json({ data: example });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await exampleService.delete(req.params.id);
  res.status(204).end();
});

export default router;
