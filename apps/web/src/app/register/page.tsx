'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, useFormField } from '@/components/ui/form-field';
import { register } from './actions';
import { showSuccess } from '@/lib/notifications';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

const validateName = (name: string) => {
  if (!name.trim()) return 'Name is required';
  return undefined;
};

const validateEmail = (email: string) => {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return undefined;
};

const validatePassword = (password: string) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return undefined;
};

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameField = useFormField('', validateName);
  const emailField = useFormField('', validateEmail);
  const passwordField = useFormField('', validatePassword);

  const passwordStrength = useMemo(() => getPasswordStrength(passwordField.value), [passwordField.value]);

  const passwordRequirements = useMemo(() => [
    { met: passwordField.value.length >= 8, label: 'At least 8 characters' },
    { met: /[a-z]/.test(passwordField.value), label: 'One lowercase letter' },
    { met: /[A-Z]/.test(passwordField.value), label: 'One uppercase letter' },
    { met: /\d/.test(passwordField.value), label: 'One number' },
  ], [passwordField.value]);

  const confirmPasswordError = confirmPasswordTouched && confirmPassword !== passwordField.value
    ? 'Passwords do not match'
    : undefined;

  const isFormValid = useMemo(() => {
    return !validateName(nameField.value) &&
      !validateEmail(emailField.value) &&
      !validatePassword(passwordField.value) &&
      confirmPassword === passwordField.value &&
      acceptTerms;
  }, [nameField.value, emailField.value, passwordField.value, confirmPassword, acceptTerms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameValid = nameField.validateField();
    const emailValid = emailField.validateField();
    const passwordValid = passwordField.validateField();
    setConfirmPasswordTouched(true);

    if (!nameValid || !emailValid || !passwordValid) {
      return;
    }

    if (passwordField.value !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({ name: nameField.value, email: emailField.value, password: passwordField.value });

      if (result.error) {
        setError(result.error);
        return;
      }

      showSuccess('Account created', 'Please sign in to continue');
      router.push('/login?registered=true');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Sign up to start tracking your Eurostar journeys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <FormField
              label="Name"
              type="text"
              placeholder="Your name"
              disabled={isLoading}
              autoComplete="name"
              showSuccessState
              {...nameField.fieldProps}
            />

            <FormField
              label="Email"
              type="email"
              placeholder="you@example.com"
              disabled={isLoading}
              autoComplete="email"
              showSuccessState
              {...emailField.fieldProps}
            />

            <div>
              <FormField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                disabled={isLoading}
                autoComplete="new-password"
                {...passwordField.fieldProps}
                rightElement={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />

              {passwordField.value && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                  </div>
                  <ul className="grid grid-cols-2 gap-1">
                    {passwordRequirements.map((req) => (
                      <li key={req.label} className="flex items-center gap-1 text-xs">
                        {req.met ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <FormField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              disabled={isLoading}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              onBlur={() => setConfirmPasswordTouched(true)}
              touched={confirmPasswordTouched}
              error={confirmPasswordError}
              isValid={confirmPasswordTouched && !confirmPasswordError && confirmPassword.length > 0}
              showSuccessState
              rightElement={
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <div className="flex items-start space-x-2">
              <input
                id="terms"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
