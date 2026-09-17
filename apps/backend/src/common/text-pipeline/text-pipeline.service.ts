import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DEFAULT_MAX_LENGTH,
  extractHashtags as coreExtractHashtags,
  extractMentions as coreExtractMentions,
  processText as coreProcessText,
  sanitizeText as coreSanitizeText,
  type PipelineOptions,
  type PipelineResult,
} from '@social-network/text-pipeline';
import { tryLoadTextPipeline, type TextPipelineBinding } from '@social-network/native';

/**
 * Server facade over @social-network/text-pipeline.
 *
 * Uses the verified Rust prebuild when present (MSG_TEXT=native/auto with a
 * binary), otherwise the portable TS core — identical outputs either way
 * (cross-checked at load, golden vectors in CI). Default caps mirror the
 * legacy product rules (mentions 10/post, 5/comment enforced by callers).
 */
@Injectable()
export class TextPipelineService implements OnModuleInit {
  private readonly logger = new Logger(TextPipelineService.name);
  private binding: TextPipelineBinding | null = null;

  onModuleInit(): void {
    try {
      this.binding = tryLoadTextPipeline();
    } catch (err) {
      // MSG_TEXT=native without a binary is an explicit misconfiguration:
      // fail fast instead of silently running unaccelerated.
      this.logger.error(
        `TextPipeline native backend requested but unavailable: ${(err as Error).message}`,
      );
      throw err;
    }
    this.logger.log(`TextPipeline backend: ${this.binding === null ? 'ts-core' : 'rust-native'}`);
  }

  public getBackend(): 'ts' | 'native' {
    return this.binding === null ? 'ts' : 'native';
  }

  public extractMentions(text: string | null | undefined): string[] {
    if (this.binding !== null) {
      try {
        return this.binding.extractMentions(text ?? '');
      } catch (err) {
        this.logger.warn(
          `TextPipeline native extractMentions failed, falling back: ${(err as Error).message}`,
        );
      }
    }
    return coreExtractMentions(text);
  }

  public extractHashtags(text: string | null | undefined): string[] {
    if (this.binding !== null) {
      try {
        return this.binding.extractHashtags(text ?? '');
      } catch (err) {
        this.logger.warn(
          `TextPipeline native extractHashtags failed, falling back: ${(err as Error).message}`,
        );
      }
    }
    return coreExtractHashtags(text);
  }

  public sanitizeText(input: string | null | undefined, maxLength = DEFAULT_MAX_LENGTH): string {
    // The napi fast path bakes in default limits; non-default limits always
    // run the core so truncation semantics stay exact.
    if (this.binding !== null && maxLength === DEFAULT_MAX_LENGTH) {
      try {
        return this.binding.sanitizeText(input ?? '');
      } catch (err) {
        this.logger.warn(
          `TextPipeline native sanitizeText failed, falling back: ${(err as Error).message}`,
        );
      }
    }
    return coreSanitizeText(input, maxLength);
  }

  public processText(input: string | null | undefined, options?: PipelineOptions): PipelineResult {
    if (this.binding !== null) {
      try {
        const parsed = JSON.parse(
          this.binding.processText(input ?? '', JSON.stringify(options ?? {})),
        ) as PipelineResult;
        return parsed;
      } catch (err) {
        this.logger.warn(
          `TextPipeline native processText failed, falling back: ${(err as Error).message}`,
        );
      }
    }
    return coreProcessText(input, options);
  }
}
