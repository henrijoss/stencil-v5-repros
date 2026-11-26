import { Component, h, Prop } from '@stencil/core';

@Component({ tag: 'repro-ssr', encapsulation: { type: 'shadow' } })
export class ReproSsr {
  @Prop() label?: string;

  render() {
    return (
      <div>
        <p>{this.label}</p>
        <slot />
      </div>
    );
  }
}
