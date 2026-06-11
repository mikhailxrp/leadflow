'use client';

import { type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // TODO: signIn('credentials', { email, password }) через NextAuth v5
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        name="email"
        placeholder="you@company.com"
        autoComplete="email"
        required
      />
      <Input
        label="Пароль"
        type="password"
        name="password"
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />
      <Button type="submit" variant="primary" size="lg" className="w-full">
        Войти
      </Button>
    </form>
  );
}
