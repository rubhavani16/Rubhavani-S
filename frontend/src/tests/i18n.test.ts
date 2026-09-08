import { describe, it, expect } from 'vitest';
import en from '../i18n/locales/en.json';
import ta from '../i18n/locales/ta.json';

describe('i18n localization dictionaries', () => {
  it('should have matching top-level keys between EN and TA', () => {
    const enKeys = Object.keys(en).sort();
    const taKeys = Object.keys(ta).sort();
    expect(enKeys).toEqual(taKeys);
  });

  it('should have valid Tamil translations for health states', () => {
    expect(ta.health.good).toBe('நல்லது');
    expect(ta.health.moderate).toBe('மிதமான');
    expect(ta.health.concerning).toBe('கவலைக்குரியது');
    expect(ta.health.poor).toBe('மோசமானது');
  });

  it('should have valid Tamil translations for freshness', () => {
    expect(ta.freshness.fresh).toBe('புதியது');
    expect(ta.freshness.aging).toBe('பழமையானது');
    expect(ta.freshness.stale).toBe('காலாவதியானது');
    expect(ta.freshness.missing).toBe('கிடைக்கவில்லை');
  });

  it('should have all 4 roles translated in both EN and TA', () => {
    expect(en.roles.resident).toBeDefined();
    expect(en.roles.volunteer).toBeDefined();
    expect(en.roles.admin).toBeDefined();
    expect(en.roles.analyst).toBeDefined();

    expect(ta.roles.resident).toBe('குடியிருப்புவாசி');
    expect(ta.roles.volunteer).toBe('நதி தன்னார்வலர்');
    expect(ta.roles.admin).toBe('போர்டல் நிர்வாகி');
    expect(ta.roles.analyst).toBe('சுற்றுச்சூழல் ஆய்வாளர்');
  });

  it('should define all 7 demo scenarios in both languages', () => {
    const scenarios = ['NORMAL', 'MISSING_SENSOR', 'STALE_SATELLITE', 'CONFLICTING', 'ANOMALY', 'NO_CITIZENS', 'LOW_SATELLITE'];
    scenarios.forEach((scen) => {
      expect(en.demo.scenarios[scen as keyof typeof en.demo.scenarios]).toBeDefined();
      expect(ta.demo.scenarios[scen as keyof typeof ta.demo.scenarios]).toBeDefined();
    });
  });
});
