import { CredentialsSignin } from 'next-auth';

/**
 * Пользователь заблокирован (`User.isBlocked`).
 *
 * Подкласс `CredentialsSignin` — только его публичное поле `code` доезжает до
 * клиента в NextAuth v5 (`signIn(..., { redirect: false }).code`). Любой другой
 * throw из `authorize` схлопывается в generic `CredentialsSignin` и делает два
 * сообщения о блокировке неразличимыми.
 */
export class BlockedUserError extends CredentialsSignin {
  code = 'USER_BLOCKED';
}

/**
 * Компания пользователя заблокирована (`Company.isBlocked`).
 */
export class BlockedCompanyError extends CredentialsSignin {
  code = 'COMPANY_BLOCKED';
}
