import { z } from 'zod';

export const HARDENED_USERNAME_REGEX = /^(?![._])(?!.*[._]{2})[a-zA-Z0-9._]{2,32}(?<![._])$/;

export const RESERVED_USERNAMES = [
  // Core System & Brand
  'eternal',
  'eternalnet',
  'theeternalnet',
  'eternalsocial',
  'theeternal',
  'admin',
  'administrator',
  'root',
  'mod',
  'moderator',
  'staff',
  'official',
  'system',
  'support',
  'security',
  'help',
  'helpdesk',
  'contact',
  'info',
  'team',
  'legal',
  'compliance',
  'billing',
  'press',
  'verified',
  'real',
  'test',
  'me',
  'you',
  'user',
  'account',
  'null',
  'undefined',

  // Core App Routes & Features
  'feed',
  'messages',
  'messenger',
  'chat',
  'explore',
  'search',
  'notifications',
  'settings',
  'profile',
  'reels',
  'music',
  'create',
  'saved',
  'bookmarks',
  'activity',
  'direct',
  'login',
  'signin',
  'signup',
  'register',
  'logout',
  'auth',
  'oauth',
  'forgot-password',
  'reset-password',
  'password',
  'download',
  'downloads',
  'apps',
  'install',
  'pwa',
  'desktop',
  'mobile',
  'web',

  // Company, Brand, Creators & Blog
  'about',
  'company',
  'company-information',
  'careers',
  'jobs',
  'brand',
  'branding',
  'news',
  'newsroom',
  'blog',
  'category',
  'creators',
  'guidelines',
  'rules',
  'community',

  // Safety & Trust Center
  'safety',
  'family',
  'family-center',
  'library',
  'safety-library',
  'privacy-hub',
  'transparency',
  'safety-news',
  'policies',
  'policy-hub',
  'teen-charter',
  'wellbeing',
  'law-enforcement',
  'law',
  'police',
  'faq',
  'help-center',
  'support-center',

  // Legal, Privacy & Terms
  'privacy',
  'privacy-policy',
  'terms',
  'terms-of-service',
  'tos',
  'cookie',
  'cookie-policy',
  'cookies',
  'regional-privacy',
  'gdpr',
  'ccpa',
  'retention',
  'retention-policy',
  'data-privacy-controls',
  'your-eternal-data-package',
  'your-data-package',
  'data',
  'export',
  'paid-services',
  'developer',
  'api',
  'developers',
  'applicant-candidate-privacy-policy',
  'applicant-privacy',
  'copyright',
  'dmca',
  'acknowledgements',
  'licenses',
  'license',
  'business',
  'marketing',
  'design',
  'engineering',

  // Technical & SEO Endpoints
  'sitemap',
  'sitemap.xml',
  'sitemap-static.xml',
  'robots.txt',
  'opensearch.xml',
  'security.txt',
  'well-known',
  'llms.txt',
  'llms-full.txt',
  'favicon.ico',
  'favicon.svg',
  'manifest.json',
  'graphql',
  'websocket',
  'ws',
  'socket',
  'cdn',
  'media',
  'static',
  'assets',
  'uploads',
  'avatars',
  'banners',
] as const;

export const loginSchema = z.object({
  email: z.string().email().max(255).optional(),
  identity: z
    .string({ required_error: 'Please enter your email or mobile phone number' })
    .min(1, 'Please enter your email or mobile phone number')
    .max(255)
    .refine(
      (val) => {
        if (!val || val.trim().length === 0) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[1-9]\d{6,14}$|^[0-9]{7,15}$/;
        const cleanPhone = val.replace(/[\s\-()]/g, '');
        return emailRegex.test(val.trim()) || phoneRegex.test(cleanPhone);
      },
      {
        message: 'Please enter a valid email address or mobile phone number.',
      },
    ),
  password: z
    .string({ required_error: 'Please enter your password' })
    .min(1, 'Please enter your password')
    .min(6, 'Password must contain at least 6 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  turnstileToken: z.string().max(2048).optional(),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z
    .string()
    .max(255)
    .transform((val) => val.trim().toLowerCase()),
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(
      HARDENED_USERNAME_REGEX,
      'Username must be 2-32 characters, cannot start/end with . or _, and cannot contain consecutive dots or underscores.',
    )
    .refine(
      (val) =>
        !RESERVED_USERNAMES.includes(val.toLowerCase() as (typeof RESERVED_USERNAMES)[number]),
      {
        message: 'This username is reserved and cannot be used.',
      },
    )
    .transform((val) => val.replace(/^@+/, '').trim().toLowerCase()),
  displayName: z.string().max(64).optional(),
  password: z.string().min(8).max(128),
  birthDate: z.string().datetime().optional(),
  turnstileToken: z.string().max(2048).optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const checkUsernameSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(32)
    .transform((val) => val.replace(/^@+/, '').trim().toLowerCase()),
});
export type CheckUsernameDto = z.infer<typeof checkUsernameSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    displayName: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    role: z.string().optional(),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email or mobile phone number is required' })
    .min(1, 'Email or mobile phone number is required')
    .max(255)
    .refine(
      (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[1-9]\d{6,14}$|^[0-9]{7,15}$/;
        const cleanPhone = val.replace(/[\s\-()]/g, '');
        return emailRegex.test(val.trim()) || phoneRegex.test(cleanPhone);
      },
      {
        message: 'Please enter a valid email address or mobile phone number.',
      },
    )
    .transform((val) => val.trim().toLowerCase()),
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const registerFormSchema = z
  .object({
    firstName: z
      .string({ required_error: 'Enter first name' })
      .min(1, 'Enter first name')
      .max(32, 'First name cannot exceed 32 characters')
      .regex(/^[\p{L}']+$/u, 'First name can only contain letters'),
    lastName: z
      .string({ required_error: 'Enter last name' })
      .min(1, 'Enter last name')
      .max(32, 'Last name cannot exceed 32 characters')
      .regex(/^[\p{L}']+$/u, 'Last name can only contain letters'),
    username: z
      .string({ required_error: 'Username is required' })
      .min(1, 'Username is required')
      .transform((val) => (val.startsWith('@') ? val.slice(1) : val))
      .pipe(
        z
          .string()
          .min(2, 'Username must be at least 2 characters')
          .max(32, 'Username cannot exceed 32 characters')
          .regex(
            HARDENED_USERNAME_REGEX,
            'Username must be 2-32 characters, cannot start/end with . or _, and cannot contain consecutive dots or underscores.',
          )
          .refine(
            (val) =>
              !RESERVED_USERNAMES.includes(
                val.toLowerCase() as (typeof RESERVED_USERNAMES)[number],
              ),
            {
              message: 'This username is reserved and cannot be used.',
            },
          ),
      ),
    birthMonth: z.string().min(1, 'Select a month'),
    birthDay: z.string().min(1, 'Select a day'),
    birthYear: z.string().min(1, 'Select a year'),
    gender: z.string().refine((val) => ['Male', 'Female', 'Custom'].includes(val), {
      message: 'Select gender',
    }),
    identity: z
      .string({ required_error: 'Mobile number or email is required' })
      .min(1, 'Mobile number or email is required')
      .max(255)
      .refine(
        (val) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const phoneRegex = /^\+?[1-9]\d{6,14}$|^[0-9]{7,15}$/;
          const cleanPhone = val.replace(/[\s\-()]/g, '');
          return emailRegex.test(val.trim()) || phoneRegex.test(cleanPhone);
        },
        {
          message: 'Please enter a valid email address or mobile phone number.',
        },
      ),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z
      .string({ required_error: 'Please confirm your password' })
      .min(1, 'Please confirm your password'),
    turnstileToken: z.string().max(2048).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterFormDto = z.infer<typeof registerFormSchema>;

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (!password) {
    return { strength: 'weak', score: 0, feedback: ['Enter a password'] };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('At least 8 characters');
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Mix of uppercase and lowercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('At least one number');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('At least one special symbol');
  }

  let strength: PasswordStrength = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score === 3) strength = 'good';
  else if (score === 2) strength = 'fair';

  return { strength, score, feedback };
}
