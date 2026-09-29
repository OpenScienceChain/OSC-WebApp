import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: 'input[maxlength], textarea[maxlength]',
  standalone: true,
})
export class ClampInputLengthDirective {
  @Output() lengthLimit = new EventEmitter<number>();

  @HostListener('beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    const field = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (event.inputType.startsWith('delete') || field.maxLength < 0) return;
    const selected = Math.max(0, (field.selectionEnd || 0) - (field.selectionStart || 0));
    const incoming = event.data?.length || event.dataTransfer?.getData('text')?.length || 1;
    if (field.value.length - selected + incoming > field.maxLength)
      this.lengthLimit.emit(field.maxLength);
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const field = event.target as HTMLInputElement | HTMLTextAreaElement;
    const max = field.maxLength;
    if (max >= 0 && field.value.length > max) {
      field.value = field.value.slice(0, max);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
