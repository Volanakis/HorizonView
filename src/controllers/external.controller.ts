import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { externalApiService } from '../services/external-api.service.js';

export const externalController = {
  async airportStatus(req: AuthRequest, res: Response): Promise<void> {
    const iata = (req.query.iata as string || '').toUpperCase();
    const datetime = req.query.datetime as string || '';

    if (!iata || iata.length !== 3) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Valid 3-letter IATA code required' }
      });
      return;
    }

    if (!datetime) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'datetime query parameter required' }
      });
      return;
    }

    const result = await externalApiService.checkAirportCongestion(iata, datetime);
    res.json({ success: true, data: result });
  },

  async weather(req: Request, res: Response): Promise<void> {
    const location = req.query.location as string || '';

    if (!location) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'location query parameter required' }
      });
      return;
    }

    const result = await externalApiService.getWeather(location);
    res.json({ success: true, data: result });
  },

  async exchangeRates(req: Request, res: Response): Promise<void> {
    const base = (req.query.base as string) || 'EUR';
    const symbolsParam = (req.query.symbols as string) || 'USD,GBP';
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());

    const result = await externalApiService.getExchangeRates(base, symbols);
    res.json({ success: true, data: result });
  },

  async detectLanguage(req: Request, res: Response): Promise<void> {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const result = await externalApiService.detectCountry(ip);
    res.json({ success: true, data: result });
  }
};
