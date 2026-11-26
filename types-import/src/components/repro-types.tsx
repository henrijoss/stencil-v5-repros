import { Component, type ComponentInterface, h, Prop } from '@stencil/core';

@Component({ tag: 'repro-types', encapsulation: { type: 'shadow' } })
export class ReproTypes implements ComponentInterface {
  @Prop() label?: string;

  render() {
    return <p>{this.label}</p>;
  }
}
