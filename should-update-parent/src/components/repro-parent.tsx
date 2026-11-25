import { Component, h, Prop } from '@stencil/core';

const log = (message: string): void => {
  document.querySelector('#log').textContent += `${message}\n`;
};

@Component({ tag: 'repro-parent', encapsulation: { type: 'shadow' } })
export class ReproParent {
  @Prop() count = 0;

  componentDidRender() {
    log(`parent componentDidRender (count: ${this.count})`);
  }

  componentDidUpdate() {
    log(`parent componentDidUpdate (count: ${this.count})`);
  }

  render() {
    // a new object with the same content on every render
    return (
      <p>
        count: {this.count} <repro-child config={{ label: 'always the same' }} />
      </p>
    );
  }
}
