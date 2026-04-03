from fastapi import status

from src import error_codes


class AppError(Exception):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        details: dict | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication is required.") -> None:
        super().__init__(
            code=error_codes.UNAUTHORIZED,
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(AppError):
    def __init__(
        self, message: str = "You do not have access to this resource."
    ) -> None:
        super().__init__(
            code=error_codes.FORBIDDEN,
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ConflictError(AppError):
    def __init__(self, *, code: str, message: str, details: dict | None = None) -> None:
        super().__init__(
            code=code,
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class NotFoundError(AppError):
    def __init__(self, *, code: str, message: str) -> None:
        super().__init__(
            code=code,
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ValidationAppError(AppError):
    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(
            code=error_codes.VALIDATION_ERROR,
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class ServiceUnavailableAppError(AppError):
    def __init__(
        self,
        message: str,
        details: dict | None = None,
        code: str | None = None,
    ) -> None:
        super().__init__(
            code=code or error_codes.INTERNAL_ERROR,
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )
