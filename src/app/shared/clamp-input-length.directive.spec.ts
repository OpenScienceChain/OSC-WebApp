import { ClampInputLengthDirective } from './clamp-input-length.directive';

describe('ClampInputLengthDirective', () => {
  it('reports an attempted over-limit character without rejecting a replacement', () => {
    const directive = new ClampInputLengthDirective();
    const input = document.createElement('input');
    input.maxLength = 5;
    input.value = '12345';
    input.setSelectionRange(5, 5);
    const limits: number[] = [];
    directive.lengthLimit.subscribe((limit) => limits.push(limit));
    directive.onBeforeInput({ target: input, inputType: 'insertText', data: '6' } as unknown as InputEvent);
    expect(limits).toEqual([5]);
    input.setSelectionRange(4, 5);
    directive.onBeforeInput({ target: input, inputType: 'insertText', data: '6' } as unknown as InputEvent);
    expect(limits).toEqual([5]);
  });
});
