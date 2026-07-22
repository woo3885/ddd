import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { initialGuideState, useGuideStore } from '@/store/useGuideStore';

beforeEach(() => {
  useGuideStore.setState({ ...initialGuideState });
});

afterEach(() => {
  cleanup();
});
