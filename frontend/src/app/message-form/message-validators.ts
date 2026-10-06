import { AbstractControl, ValidationErrors } from '@angular/forms';

// Mirrors the phone rules of the Message model in the Rails API.
const E164_FORMAT = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-()]/g, '');
}

export function e164(control: AbstractControl<string>): ValidationErrors | null {
  const value = normalizePhone(control.value);

  return value === '' || E164_FORMAT.test(value) ? null : { e164: true };
}

export function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? { required: true } : null;
}
