import { describe, it, expect } from 'vitest';
import {
  waitTimeToCrowdLevel,
  crowdLevelToDescription,
} from '../services/crowd-level.service.js';
import type { CrowdLevel } from '../types.js';

describe('Crowd Level Service', () => {
  describe('waitTimeToCrowdLevel', () => {
    it('should return very-low for 0 minutes', () => {
      expect(waitTimeToCrowdLevel(0)).toBe('very-low');
    });

    it('should return very-low for 5 minutes (boundary)', () => {
      expect(waitTimeToCrowdLevel(5)).toBe('very-low');
    });

    it('should return low for 6 minutes (just above very-low boundary)', () => {
      expect(waitTimeToCrowdLevel(6)).toBe('low');
    });

    it('should return low for 12 minutes (boundary)', () => {
      expect(waitTimeToCrowdLevel(12)).toBe('low');
    });

    it('should return moderate for 13 minutes (just above low boundary)', () => {
      expect(waitTimeToCrowdLevel(13)).toBe('moderate');
    });

    it('should return moderate for 20 minutes (boundary)', () => {
      expect(waitTimeToCrowdLevel(20)).toBe('moderate');
    });

    it('should return high for 21 minutes (just above moderate boundary)', () => {
      expect(waitTimeToCrowdLevel(21)).toBe('high');
    });

    it('should return high for 35 minutes (boundary)', () => {
      expect(waitTimeToCrowdLevel(35)).toBe('high');
    });

    it('should return very-high for 36 minutes (just above high boundary)', () => {
      expect(waitTimeToCrowdLevel(36)).toBe('very-high');
    });

    it('should return very-high for very long wait times', () => {
      expect(waitTimeToCrowdLevel(60)).toBe('very-high');
      expect(waitTimeToCrowdLevel(120)).toBe('very-high');
    });

    it('should handle negative values as very-low', () => {
      expect(waitTimeToCrowdLevel(-5)).toBe('very-low');
    });

    it('should handle decimal values correctly', () => {
      expect(waitTimeToCrowdLevel(5.5)).toBe('low'); // > 5, so low
      expect(waitTimeToCrowdLevel(12.9)).toBe('moderate'); // > 12, so moderate
    });
  });

  describe('crowdLevelToDescription', () => {
    it('should return a string for very-low level', () => {
      const description = crowdLevelToDescription('very-low');
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should return a string for low level', () => {
      const description = crowdLevelToDescription('low');
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should return a string for moderate level', () => {
      const description = crowdLevelToDescription('moderate');
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should return a string for high level', () => {
      const description = crowdLevelToDescription('high');
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should return a string for very-high level', () => {
      const description = crowdLevelToDescription('very-high');
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should return unique descriptions for each level', () => {
      const levels: CrowdLevel[] = ['very-low', 'low', 'moderate', 'high', 'very-high'];
      const descriptions = levels.map(crowdLevelToDescription);
      const uniqueDescriptions = new Set(descriptions);
      expect(uniqueDescriptions.size).toBe(5);
    });

    it('should include appropriate keywords in descriptions', () => {
      expect(crowdLevelToDescription('very-low').toLowerCase()).toContain('quiet');
      expect(crowdLevelToDescription('low').toLowerCase()).toContain('quiet');
      expect(crowdLevelToDescription('moderate').toLowerCase()).toContain('moderate');
      expect(crowdLevelToDescription('high').toLowerCase()).toContain('busy');
      expect(crowdLevelToDescription('very-high').toLowerCase()).toContain('busy');
    });
  });

  describe('integration: waitTime to description flow', () => {
    it('should produce appropriate description for different wait times', () => {
      const level = waitTimeToCrowdLevel(25);
      const description = crowdLevelToDescription(level);
      expect(level).toBe('high');
      expect(description.toLowerCase()).toContain('busy');
    });

    it('should produce very-low description for 0 minutes', () => {
      const level = waitTimeToCrowdLevel(0);
      const description = crowdLevelToDescription(level);
      expect(level).toBe('very-low');
      expect(description.toLowerCase()).toContain('quiet');
    });
  });
});
