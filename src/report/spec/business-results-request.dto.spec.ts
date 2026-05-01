import { validate } from "class-validator";
import {
    BusinessResultsRequestDto,
    DateRangeMax31DaysConstraint,
} from "../dto/business-results-request.dto";
import { ValidationArguments } from "class-validator";

const makeArgs = (dateFrom: string): ValidationArguments =>
    ({
        object: { dateFrom } as BusinessResultsRequestDto,
    }) as ValidationArguments;

describe("DateRangeMax31DaysConstraint", () => {
    const constraint = new DateRangeMax31DaysConstraint();

    it("passes for a range of exactly 31 days", () => {
        expect(constraint.validate("2026-05-31", makeArgs("2026-05-01"))).toBe(
            true,
        );
    });

    it("passes for a range of 1 day", () => {
        expect(constraint.validate("2026-05-02", makeArgs("2026-05-01"))).toBe(
            true,
        );
    });

    it("passes for same date (0 days)", () => {
        expect(constraint.validate("2026-05-01", makeArgs("2026-05-01"))).toBe(
            true,
        );
    });

    it("fails for a range of 32 days", () => {
        // May has 31 days: May 1 → June 1 = 31 days (valid); June 2 = 32 days (invalid)
        expect(constraint.validate("2026-06-02", makeArgs("2026-05-01"))).toBe(
            false,
        );
    });

    it("fails when dateTo is before dateFrom", () => {
        expect(constraint.validate("2026-04-30", makeArgs("2026-05-01"))).toBe(
            false,
        );
    });

    it("fails when dateFrom is not a valid date", () => {
        expect(constraint.validate("2026-05-10", makeArgs("not-a-date"))).toBe(
            false,
        );
    });

    it("fails when dateTo is not a valid date", () => {
        expect(constraint.validate("not-a-date", makeArgs("2026-05-01"))).toBe(
            false,
        );
    });

    it("returns a human-readable default message", () => {
        expect(constraint.defaultMessage()).toContain("31 days");
    });
});

describe("BusinessResultsRequestDto validation", () => {
    const valid = async (dateFrom: string, dateTo: string) => {
        const dto = new BusinessResultsRequestDto();
        dto.dateFrom = dateFrom;
        dto.dateTo = dateTo;
        return validate(dto);
    };

    it("passes for a valid 7-day range", async () => {
        const errors = await valid("2026-05-01", "2026-05-07");
        expect(errors).toHaveLength(0);
    });

    it("fails when dateFrom is not an ISO date string", async () => {
        const errors = await valid("01-05-2026", "2026-05-07");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe("dateFrom");
    });

    it("fails when dateTo is not an ISO date string", async () => {
        const errors = await valid("2026-05-01", "07-05-2026");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe("dateTo");
    });

    it("fails when range exceeds 31 days", async () => {
        const errors = await valid("2026-05-01", "2026-06-15");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe("dateTo");
    });
});
