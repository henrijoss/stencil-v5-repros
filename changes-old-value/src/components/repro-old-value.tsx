import { Component, type ComponentShouldUpdateChanges, h, Prop } from '@stencil/core';

@Component({ tag: 'repro-old-value', encapsulation: { type: 'shadow' } })
export class ReproOldValue {
  /** Not set at the first render. */
  @Prop() config?: { label: string };

  private log: string[] = [];

  // skips the render when a prop got a value with the same content as before
  componentShouldUpdate(changes: ComponentShouldUpdateChanges<this>) {
    const { newVal, oldVal } = changes.config;
    const shouldUpdate = JSON.stringify(newVal) !== JSON.stringify(oldVal);
    this.log.push(`oldVal: ${JSON.stringify(oldVal)}, newVal: ${JSON.stringify(newVal)}, update: ${shouldUpdate}`);
    console.log(this.log.at(-1));
    return shouldUpdate;
  }

  render() {
    return <p>rendered config: {JSON.stringify(this.config) ?? 'undefined'}</p>;
  }
}
