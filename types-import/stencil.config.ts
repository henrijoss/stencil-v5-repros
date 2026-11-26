import type { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'repro',
  outputTargets: [{ type: 'loader-bundle' }, { type: 'standalone' }],
};
