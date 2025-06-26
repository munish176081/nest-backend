import {
  ArgumentMetadata,
  Injectable,
  Optional,
  ParseBoolPipe,
  ParseUUIDPipe,
} from '@nestjs/common';

@Injectable()
export class OptionalUUIDPipe extends ParseUUIDPipe {
  constructor(@Optional() options?: any) {
    super(options);
  }

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return null;

    return super.transform(value, metadata);
  }
}

@Injectable()
export class OptionalBoolPipe extends ParseBoolPipe {
  private default: boolean;

  constructor(@Optional() options?: any) {
    super(options);

    if (options.default) {
      this.default = options.default;
    }
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return this.default;

    return super.transform(value, metadata);
  }
}
