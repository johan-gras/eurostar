'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input, type InputProps } from '@/components/ui/input';

export interface FormFieldProps extends Omit<InputProps, 'onChange'> {
  label: string;
  error?: string | undefined;
  helperText?: string | undefined;
  required?: boolean | undefined;
  showSuccessState?: boolean | undefined;
  isValid?: boolean | undefined;
  onChange?: ((value: string) => void) | undefined;
  onBlur?: (() => void) | undefined;
  touched?: boolean | undefined;
  rightElement?: React.ReactNode | undefined;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      showSuccessState = false,
      isValid = false,
      className,
      id,
      onChange,
      onBlur,
      touched = false,
      rightElement,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    const showError = touched && error;
    const showSuccess = showSuccessState && touched && isValid && !error;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            className={cn(
              showError && 'border-destructive focus-visible:ring-destructive pr-10',
              showSuccess && 'border-green-500 focus-visible:ring-green-500 pr-10',
              rightElement && 'pr-10',
              className
            )}
            aria-invalid={showError ? 'true' : undefined}
            aria-describedby={
              showError ? errorId : helperText ? helperId : undefined
            }
            onChange={handleChange}
            onBlur={onBlur}
            {...props}
          />
          {showError && !rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          {showSuccess && !rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-in-out',
            showError ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <p id={errorId} className="text-xs text-destructive flex items-center gap-1">
            {error}
          </p>
        </div>
        {helperText && !showError && (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

// Hook for managing form field state with blur validation
export function useFormField(initialValue = '', validate?: (value: string) => string | undefined) {
  const [value, setValue] = React.useState(initialValue);
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleChange = React.useCallback((newValue: string) => {
    setValue(newValue);
    // Clear error when user starts typing (fixing)
    if (error) {
      setError(undefined);
    }
  }, [error]);

  const handleBlur = React.useCallback(() => {
    setTouched(true);
    if (validate) {
      setError(validate(value));
    }
  }, [validate, value]);

  const validateField = React.useCallback(() => {
    setTouched(true);
    if (validate) {
      const validationError = validate(value);
      setError(validationError);
      return !validationError;
    }
    return true;
  }, [validate, value]);

  const reset = React.useCallback(() => {
    setValue(initialValue);
    setTouched(false);
    setError(undefined);
  }, [initialValue]);

  const isValid = touched && !error && value.length > 0;

  return {
    value,
    setValue,
    touched,
    setTouched,
    error,
    setError,
    handleChange,
    handleBlur,
    validateField,
    reset,
    isValid,
    fieldProps: {
      value,
      onChange: handleChange,
      onBlur: handleBlur,
      touched,
      error,
      isValid,
    },
  };
}

// Hook for managing entire form state
export function useForm<T extends Record<string, unknown>>(
  fields: { [K in keyof T]: { initialValue: T[K]; validate?: (value: T[K]) => string | undefined } }
) {
  const fieldNames = Object.keys(fields) as (keyof T)[];

  const [values, setValues] = React.useState<T>(() => {
    const initial = {} as T;
    for (const name of fieldNames) {
      initial[name] = fields[name].initialValue;
    }
    return initial;
  });

  const [touched, setTouched] = React.useState<Record<keyof T, boolean>>(() => {
    const initial = {} as Record<keyof T, boolean>;
    for (const name of fieldNames) {
      initial[name] = false;
    }
    return initial;
  });

  const [errors, setErrors] = React.useState<Record<keyof T, string | undefined>>(() => {
    const initial = {} as Record<keyof T, string | undefined>;
    for (const name of fieldNames) {
      initial[name] = undefined;
    }
    return initial;
  });

  const setValue = React.useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  const setFieldTouched = React.useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const validate = fields[name].validate;
    if (validate) {
      setErrors(prev => ({ ...prev, [name]: validate(values[name]) }));
    }
  }, [fields, values]);

  const validateAll = React.useCallback(() => {
    const newTouched = {} as Record<keyof T, boolean>;
    const newErrors = {} as Record<keyof T, string | undefined>;
    let isValid = true;

    for (const name of fieldNames) {
      newTouched[name] = true;
      const validate = fields[name].validate;
      if (validate) {
        const error = validate(values[name]);
        newErrors[name] = error;
        if (error) isValid = false;
      }
    }

    setTouched(newTouched);
    setErrors(newErrors);
    return isValid;
  }, [fieldNames, fields, values]);

  const reset = React.useCallback(() => {
    const newValues = {} as T;
    const newTouched = {} as Record<keyof T, boolean>;
    const newErrors = {} as Record<keyof T, string | undefined>;

    for (const name of fieldNames) {
      newValues[name] = fields[name].initialValue;
      newTouched[name] = false;
      newErrors[name] = undefined;
    }

    setValues(newValues);
    setTouched(newTouched);
    setErrors(newErrors);
  }, [fieldNames, fields]);

  const isValid = React.useMemo(() => {
    for (const name of fieldNames) {
      const validate = fields[name].validate;
      if (validate && validate(values[name])) {
        return false;
      }
    }
    return true;
  }, [fieldNames, fields, values]);

  const getFieldProps = React.useCallback((name: keyof T) => ({
    value: values[name] as string,
    onChange: (value: string) => setValue(name, value as T[keyof T]),
    onBlur: () => setFieldTouched(name),
    touched: touched[name],
    error: errors[name],
    isValid: touched[name] && !errors[name] && Boolean(values[name]),
  }), [values, touched, errors, setValue, setFieldTouched]);

  return {
    values,
    touched,
    errors,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
    isValid,
    getFieldProps,
  };
}

export { FormField };
