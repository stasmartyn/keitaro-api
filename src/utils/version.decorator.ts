import { Controller } from "@nestjs/common";

export function VersionController(version: string, path: string) {
    return Controller(`${version}/${path}`);
}
