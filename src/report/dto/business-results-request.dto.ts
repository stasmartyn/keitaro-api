import {
    IsDateString,
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from "class-validator";

@ValidatorConstraint({ name: "DateRangeMax31Days", async: false })
export class DateRangeMax31DaysConstraint
    implements ValidatorConstraintInterface
{
    validate(dateTo: string, args: ValidationArguments): boolean {
        // justified: class-validator passes plain object; we know it's the parent DTO
        const dto = args.object as BusinessResultsRequestDto;
        const from = new Date(dto.dateFrom);
        const to = new Date(dateTo);

        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            return false;
        }

        if (to < from) {
            return false;
        }

        const diffMs = to.getTime() - from.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        return diffDays <= 31;
    }

    defaultMessage(): string {
        return "Date range must not exceed 31 days and dateFrom must be before dateTo";
    }
}

export class BusinessResultsRequestDto {
    @IsDateString()
    dateFrom: string;

    @IsDateString()
    @Validate(DateRangeMax31DaysConstraint)
    dateTo: string;
}
