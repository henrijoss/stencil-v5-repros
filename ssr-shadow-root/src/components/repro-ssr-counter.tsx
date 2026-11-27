import { Component, h, State } from '@stencil/core';

@Component({ tag: 'repro-ssr-counter', encapsulation: { type: 'shadow' } })
export class ReproSsrCounter {
  @State() count = 0;

  render() {
    return (
      <button type="button" onClick={() => this.count++}>
        count: {this.count}
      </button>
    );
  }
}
