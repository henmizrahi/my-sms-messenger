import {
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAX_BODY_LENGTH, NewMessage } from '../message';
import { e164, normalizePhone, notBlank } from './message-validators';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-message-form',
  styleUrl: './message-form.scss',
  templateUrl: './message-form.html',
})
export class MessageForm {
  readonly sending = input(false);
  readonly errorMessage = input<string | null>(null);
  // The id of the message that was last sent successfully. The form clears itself
  // each time this changes, so the parent signals success just by passing data down.
  readonly sentMessageId = input<string | null>(null);

  readonly submitted = output<NewMessage>();

  protected readonly maxBodyLength = MAX_BODY_LENGTH;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    to: ['', [notBlank, e164]],
    body: ['', [notBlank, Validators.maxLength(MAX_BODY_LENGTH)]],
  });

  protected readonly bodyLength = toSignal(this.form.controls.body.valueChanges, {
    initialValue: this.form.controls.body.value,
  });

  // Follows the errorMessage input, but Clear can dismiss it until the next one arrives.
  protected readonly visibleError = linkedSignal(() => this.errorMessage());

  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      if (this.sentMessageId() !== null) {
        untracked(() => this.reset());
      }
    });
  }

  protected showErrors(control: AbstractControl): boolean {
    return control.touched && control.invalid;
  }

  protected submit(): void {
    if (this.form.invalid || this.sending()) {
      return;
    }

    const { to, body } = this.form.getRawValue();
    this.submitted.emit({ to: normalizePhone(to), body });
  }

  protected clear(): void {
    this.reset();
    this.visibleError.set(null);
  }

  private reset(): void {
    this.form.reset();
    this.changeDetector.markForCheck();
  }
}
