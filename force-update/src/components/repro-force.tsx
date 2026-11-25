import { Component, type ComponentShouldUpdateChanges, Element, forceUpdate, h, Method, State } from '@stencil/core';

@Component({ tag: 'repro-force', encapsulation: { type: 'shadow' } })
export class ReproForce {
  @Element() host: HTMLElement;

  @State() config = { label: 'always the same' };

  private renderCount = 0;

  // skips the render when a prop or state got a value with the same content as before
  componentShouldUpdate(changes: ComponentShouldUpdateChanges<this>) {
    return Object.values(changes).some(({ newVal, oldVal }) => JSON.stringify(newVal) !== JSON.stringify(oldVal));
  }

  /** Forces an update, nothing else. */
  @Method()
  async force() {
    forceUpdate(this.host);
  }

  /** Assigns a new object with the same content, then forces an update. */
  @Method()
  async assignEqualValueAndForce() {
    this.config = { ...this.config };
    forceUpdate(this.host);
  }

  /** Forces an update, then assigns a new object with the same content. */
  @Method()
  async forceAndAssignEqualValue() {
    forceUpdate(this.host);
    this.config = { ...this.config };
  }

  render() {
    this.renderCount++;
    return <p>render count: {this.renderCount}</p>;
  }
}
