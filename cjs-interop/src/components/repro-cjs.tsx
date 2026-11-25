import { Component, h } from '@stencil/core';

@Component({ tag: 'repro-cjs', encapsulation: { type: 'shadow' } })
export class ReproCjs {
  render() {
    return <p>rendered</p>;
  }
}
