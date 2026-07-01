import { normalizePhone, normalizeSearchText } from './normalize.util';

describe('normalize utilities', () => {
  it('normaliza tildes, eñes, espacios y guiones para búsqueda tolerante', () => {
    expect(normalizeSearchText('  GARCÍA   Peña-López ')).toBe(
      'garcia pena lopez',
    );
  });

  it('conserva únicamente dígitos en teléfonos', () => {
    expect(normalizePhone('+51 (987) 654-321')).toBe('51987654321');
  });
});
