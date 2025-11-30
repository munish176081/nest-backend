import { ArgumentMetadata, ParseBoolPipe, ParseUUIDPipe } from '@nestjs/common';
export declare class OptionalUUIDPipe extends ParseUUIDPipe {
    constructor(options?: any);
    transform(value: any, metadata: ArgumentMetadata): Promise<string>;
}
export declare class OptionalBoolPipe extends ParseBoolPipe {
    private default;
    constructor(options?: any);
    transform(value: any, metadata: ArgumentMetadata): Promise<boolean>;
}
