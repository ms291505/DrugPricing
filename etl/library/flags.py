from enum import StrEnum


class Flag(StrEnum):
    FDA = "--fda"
    NADAC = "--nadac"


class AppMode(StrEnum):
    PROD = "prod"
    DEV = "dev"
