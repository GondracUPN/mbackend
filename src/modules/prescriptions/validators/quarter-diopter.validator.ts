import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsQuarterDiopter(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isQuarterDiopter',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return (
            typeof value === 'number' &&
            Number.isInteger(Math.round(value * 100)) &&
            Math.abs(value * 4 - Math.round(value * 4)) < 1e-9
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe usar incrementos de 0.25.`;
        },
      },
    });
}
