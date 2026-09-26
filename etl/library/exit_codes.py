from enum import IntEnum


class ExitCode(IntEnum):
    OK = 0
    ERROR = 1
    USAGE = 2
    NO_DB = 4
    FDA_404 = 14
    FDA_INSERT_FAILED = 15
    NADAC_404 = 24
    NADAC_INSET_FAILED = 25
    INTERRUPTED = 130
