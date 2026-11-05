import { describe, expect, it } from 'vitest';
import {
  APPLICANT_PRIVACY_DATA,
  COOKIE_POLICY_DATA,
  COPYRIGHT_POLICY_DATA,
  DATA_PACKAGE_DATA,
  DATA_PRIVACY_CONTROLS_DATA,
  DEVELOPER_TERMS_DATA,
  GUIDELINES_SECTIONS,
  GUIDELINES_SECTIONS_UK,
  LAW_ENFORCEMENT_DATA,
  PAID_SERVICES_DATA,
  PRIVACY_SECTIONS_EN,
  PRIVACY_SECTIONS_UK,
  REGIONAL_PRIVACY_DATA,
  RETENTION_POLICY_DATA,
  TERMS_SECTIONS,
  TERMS_SECTIONS_UK,
} from '@social-network/shared-content';

describe('published legal contact accuracy', () => {
  it.each([
    APPLICANT_PRIVACY_DATA,
    COOKIE_POLICY_DATA,
    COPYRIGHT_POLICY_DATA,
    DATA_PACKAGE_DATA,
    DATA_PRIVACY_CONTROLS_DATA,
    DEVELOPER_TERMS_DATA,
    GUIDELINES_SECTIONS,
    GUIDELINES_SECTIONS_UK,
    LAW_ENFORCEMENT_DATA,
    PAID_SERVICES_DATA,
    PRIVACY_SECTIONS_EN,
    PRIVACY_SECTIONS_UK,
    REGIONAL_PRIVACY_DATA,
    RETENTION_POLICY_DATA,
    TERMS_SECTIONS,
    TERMS_SECTIONS_UK,
  ])('does not publish personal mailboxes or unverified project mailboxes', (document) => {
    const text = JSON.stringify(document);
    expect(text).not.toMatch(/[\w.+-]+@(?:gmail\.com|eternal\.(?:app|com))/i);
    expect(text).toContain('eternalnet.support@proton.me');
  });

  it('identifies the confirmed joint operators without claiming an appointed DPO', () => {
    for (const document of [
      PRIVACY_SECTIONS_EN,
      PRIVACY_SECTIONS_UK,
      TERMS_SECTIONS,
      TERMS_SECTIONS_UK,
    ]) {
      const text = JSON.stringify(document);
      expect(text).toContain('Mykola Agh');
      expect(text).toContain('Michal Agh');
      expect(text).not.toContain('operator identity not published');
    }
    expect(JSON.stringify(PRIVACY_SECTIONS_EN)).toContain(
      'A DPO appointment has not been confirmed',
    );
  });

  it('does not promise unavailable adult areas, paid services or emergency staffing', () => {
    expect(JSON.stringify(GUIDELINES_SECTIONS)).not.toContain(
      'accessible only to verified adult users',
    );
    expect(JSON.stringify(GUIDELINES_SECTIONS_UK)).not.toContain('Відвертий контент дозволений');
    expect(JSON.stringify(PAID_SERVICES_DATA)).not.toContain(
      'When you subscribe to Eternal Premium, you authorize',
    );
    expect(JSON.stringify(LAW_ENFORCEMENT_DATA)).not.toContain(
      'are evaluated 24/7 on an expedited basis',
    );
    expect(JSON.stringify(GUIDELINES_SECTIONS)).not.toContain(
      'We immediately report all instances',
    );
    expect(JSON.stringify(RETENTION_POLICY_DATA)).not.toContain('Phase 1: Grace Period');
  });
});
