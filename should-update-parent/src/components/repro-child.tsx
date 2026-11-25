import { Component, type ComponentShouldUpdateChanges, h, Prop } from '@stencil/core';

@Component({ tag: 'repro-child', encapsulation: { type: 'shadow' } })
export class ReproChild {
  @Prop() config: { label: string };

  // skips the render when the object the parent passed has the same content as before
  componentShouldUpdate(changes: ComponentShouldUpdateChanges<this>) {
    return Object.values(changes).some(({ newVal, oldVal }) => JSON.stringify(newVal) !== JSON.stringify(oldVal));
  }

  render() {
    return <span>{this.config.label}</span>;
  }
}
