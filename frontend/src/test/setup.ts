// Vitest global setup. Extends `expect` with jest-dom matchers and clears the
// DOM between tests so component tests don't leak state into each other.
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
