# 📜 API Contracts & Type Sharing

The monorepo enforces a **Single-Source-of-Truth** contract design using **Zod**. Contracts define both the runtime validation schemas for the backend and the compile-time TypeScript interfaces consumed by the frontend.

---

## 💡 Architecture & Rationale

Traditionally, monorepos either:

1. Maintain duplicate interface files across apps, leading to type drift and runtime errors.
2. Compile a separate shared npm package (e.g. `packages/contracts`), introducing compilation lag, symlink conflicts, and watch-mode friction.

Our architecture (established in [ADR 001](../adr/001-monorepo-nx-and-zod-contracts.md) and [ADR 002](../adr/002-zero-packages-folder-and-path-aliases.md)) places all contracts directly inside `backend/src/common/contracts/`:

```mermaid
graph LR
    Contract["backend/src/common/contracts/<br/>(Zod Schemas + TypeScript Types)"]
    BackendPipe["Backend ZodValidationPipe<br/>Runtime Request Validation"]
    FrontendClient["Frontend API Client<br/>React Hook Form + Zod Resolvers"]
    TypeScriptCompiler["TypeScript Compiler<br/>Zero Type Drift"]

    Contract -->|@common/contracts| BackendPipe
    Contract -->|@backend/common/contracts| FrontendClient
    Contract --> TypeScriptCompiler
```

---

## 🛠️ Defining Contracts (Example)

Each domain slice in `backend/src/common/contracts/` exports:

1. **Zod Runtime Schema**: Validates payloads on incoming HTTP requests.
2. **Inferred Static Type**: Extracted using `z.infer<typeof Schema>`.

```typescript
// backend/src/common/contracts/posts.ts
import { z } from 'zod';

export const CreatePostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(5000, 'Content exceeds maximum limit of 5000 characters')
    .trim(),
  mediaIds: z.array(z.string().uuid()).max(10).optional(),
  pollId: z.string().uuid().optional(),
});

export type CreatePostDto = z.infer<typeof CreatePostSchema>;

export const PostResponseSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  authorId: z.string().uuid(),
  likesCount: z.number().int().nonnegative(),
  commentsCount: z.number().int().nonnegative(),
  sharesCount: z.number().int().nonnegative(),
  hasLiked: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PostResponseDto = z.infer<typeof PostResponseSchema>;
```

---

## 📦 How Each Layer Consumes Contracts

### 1. In Backend Controllers & Services

```typescript
import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { CreatePostSchema, type CreatePostDto, type PostResponseDto } from '@common/contracts';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

@Controller('posts')
export class PostsController {
  @Post()
  @UsePipes(new ZodValidationPipe(CreatePostSchema))
  async create(@Body() dto: CreatePostDto): Promise<PostResponseDto> {
    return this.postsService.create(dto);
  }
}
```

### 2. In Frontend React Hook Form & API Queries

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePostSchema, type CreatePostDto } from '@backend/common/contracts';
import { httpClient } from '@/shared/api/httpClient';

export function CreatePostForm() {
  const form = useForm<CreatePostDto>({
    resolver: zodResolver(CreatePostSchema),
    defaultValues: { content: '' },
  });

  const onSubmit = async (data: CreatePostDto) => {
    await httpClient.post('/posts', data);
  };
  // ...
}
```

---

## 📑 Contracts Catalog

All contracts are barrel-exported from `backend/src/common/contracts/index.ts`:

| Slice           | Contract Module              | Key Schemas & Types                                                     |
| :-------------- | :--------------------------- | :---------------------------------------------------------------------- |
| `auth`          | `contracts/auth.ts`          | `RegisterDto`, `LoginDto`, `AuthResponseDto`, `ResetPasswordDto`        |
| `users`         | `contracts/users.ts`         | `UpdateProfileDto`, `UserPrivacyDto`, `UserResponseDto`, `UserAliasDto` |
| `posts`         | `contracts/posts.ts`         | `CreatePostDto`, `UpdatePostDto`, `PostResponseDto`, `FeedQueryDto`     |
| `chat`          | `contracts/chat.ts`          | `CreateConversationDto`, `SendMessageDto`, `MessageResponseDto`         |
| `comments`      | `contracts/comments.ts`      | `CreateCommentDto`, `UpdateCommentDto`, `CommentResponseDto`            |
| `followers`     | `contracts/followers.ts`     | `FollowUserDto`, `FollowerResponseDto`, `CloseFriendDto`                |
| `poll`          | `contracts/poll.ts`          | `CreatePollDto`, `VotePollDto`, `PollResponseDto`                       |
| `stories`       | `contracts/stories.ts`       | `CreateStoryDto`, `StoryReactionDto`, `StoryResponseDto`                |
| `showcase`      | `contracts/showcase.ts`      | `CreateShowcaseItemDto`, `ReorderShowcaseDto`                           |
| `sessions`      | `contracts/sessions.ts`      | `SessionResponseDto`, `RevokeSessionDto`                                |
| `notifications` | `contracts/notifications.ts` | `NotificationResponseDto`, `NotificationSettingsDto`                    |
| `opengraph`     | `contracts/opengraph.ts`     | `OpenGraphPreviewDto`                                                   |
| `health`        | `contracts/health.ts`        | `HealthCheckResponseDto`                                                |
| `permissions`   | `contracts/permissions.ts`   | Dimensional privacy bitmasks and policy checks                          |

---

## ✍️ How to Add a New Contract (For Contributors)

1. Create or open the relevant file in `backend/src/common/contracts/<domain>.ts`.
2. Define the schema with Zod:
   ```typescript
   export const MyNewPayloadSchema = z.object({ ... });
   ```
3. Export the inferred TypeScript type:
   ```typescript
   export type MyNewPayloadDto = z.infer<typeof MyNewPayloadSchema>;
   ```
4. Re-export in `backend/src/common/contracts/index.ts`.
5. Run typecheck to verify:
   ```bash
   pnpm typecheck
   ```
   Both backend and frontend will immediately validate against the new contract without requiring any build step!
