import { describeValidationErrors } from './validation-errors';

describe('describeValidationErrors', () => {
  it('names the phone number field', () => {
    expect(describeValidationErrors({ to: ['is invalid'] })).toBe('Phone number is invalid.');
  });

  it('names the message field', () => {
    expect(describeValidationErrors({ body: ["can't be blank"] })).toBe("Message can't be blank.");
  });

  it('writes one sentence per error, in the order given', () => {
    const errors = {
      to: ['is invalid'],
      body: ["can't be blank", 'is too long (maximum is 250 characters)'],
    };

    expect(describeValidationErrors(errors)).toBe(
      "Phone number is invalid. Message can't be blank. Message is too long (maximum is 250 characters).",
    );
  });

  it('uses the field name as it is when it has no label', () => {
    expect(describeValidationErrors({ status: ['is not included in the list'] })).toBe(
      'status is not included in the list.',
    );
  });

  it('skips fields with no errors', () => {
    expect(describeValidationErrors({ to: [], body: ["can't be blank"] })).toBe(
      "Message can't be blank.",
    );
  });

  it('falls back to a general message when there are no errors', () => {
    expect(describeValidationErrors({})).toBe('The message could not be saved.');
  });
});
