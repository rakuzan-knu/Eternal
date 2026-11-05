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
    expect(text).toMatch(/contact address has not been provided|контактну адресу не надано/i);
  });

  it('discloses missing controller identity without presenting author credits as legal identity', () => {
    expect(JSON.stringify(PRIVACY_SECTIONS_EN)).toContain(
      'Complete operator identification has not been published',
    );
    expect(JSON.stringify(PRIVACY_SECTIONS_UK)).toContain(
      'ідентифікаційні дані операторів не опубліковано',
    );
  });
});
