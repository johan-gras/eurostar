/**
 * Result type for operations that can fail.
 * Use this instead of throwing exceptions for expected error cases.
 */

export type Result<T, E> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly value: T;
  readonly ok = true;

  constructor(value: T) {
    this.value = value;
  }

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is never {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }
}

export class Err<E> {
  readonly error: E;
  readonly ok = false;

  constructor(error: E) {
    this.error = error;
  }

  isOk(): this is never {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  unwrap(): never {
    throw new Error(`Called unwrap on an Err value: ${String(this.error)}`);
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }
}

export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

export function err<E>(error: E): Err<E> {
  return new Err(error);
}
