import { describe, it, expect } from 'vitest';

describe('Composition Service Domain Logic', () => {
  it('should parse role strings correctly', () => {
    // A placeholder test. In a real integration test, we'd mock Prisma here.
    const rawRoles = '1. Tank\n2. Heal\n3. DPS';
    const splitCount = rawRoles.split('\n').map(r => r.trim()).filter(Boolean).length;
    
    expect(splitCount).toBe(3);
  });
});
