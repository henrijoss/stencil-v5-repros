import { Component, Element, h } from '@stencil/core';

@Component({ tag: 'repro-ssr-children', encapsulation: { type: 'shadow' } })
export class ReproSsrChildren {
  @Element() host!: HTMLElement;

  render() {
    // reads its children when it renders, as a component does that looks for a slotted label
    return (
      <div>
        <p>children: {this.host.children.length}</p>
        <slot />
      </div>
    );
  }
}
