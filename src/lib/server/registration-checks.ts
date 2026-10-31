import { externalApiService } from './services/external-api.service.js';
import { ENABLE_EXTERNAL_VALIDATION, NODE_ENV } from './config.js';
import { abort } from './http.js';

/**
 * Optional email (Mailboxlayer) and phone (Numverify) checks before registration.
 * Off unless ENABLE_EXTERNAL_VALIDATION is set; lets registration through if the APIs are down.
 */
export async function checkRegistrationExternally(email?: string, phone?: string): Promise<void> {
  if (NODE_ENV === 'test' || !ENABLE_EXTERNAL_VALIDATION) return;

  if (email) {
    const result = await externalApiService.validateEmail(email);
    if (!result.valid) abort(422, 'INVALID_EMAIL', result.message);
  }
  if (phone) {
    const result = await externalApiService.validatePhone(phone);
    if (!result.valid) abort(422, 'INVALID_PHONE', result.message);
  }
}
