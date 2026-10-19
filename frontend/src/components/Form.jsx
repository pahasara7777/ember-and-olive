import { useId } from 'react';

// Labelled input. Errors are tied to the field with aria-describedby for screen readers.
export function Field({ label, error, hint, as: Tag = 'input', ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
      {hint && !error && <small id={`${id}-hint`}>{hint}</small>}
      {error && <small id={`${id}-err`} className="error">{error}</small>}
    </div>
  );
}

// Shows the server's message and the first problem for each field.
export function FormError({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="alert">
      <p>{error.message}</p>
      {error.issues?.length > 0 && (
        <ul>
          {error.issues.map((i) => <li key={i.path + i.message}>{i.path ? `${i.path}: ` : ''}{i.message}</li>)}
        </ul>
      )}
    </div>
  );
}

// Returns the message for one field from an ApiError, so it can sit under that field.
export const fieldError = (error, path) => error?.issues?.find((i) => i.path === path)?.message;
