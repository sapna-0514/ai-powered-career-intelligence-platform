
import os
import secrets

from fastapi import Header, HTTPException


def verify_internal_key(
    x_internal_api_key: str = Header(default="")
):

    expected_key = os.getenv("AI_SERVICE_SECRET", "")

    if not expected_key or not secrets.compare_digest(
        x_internal_api_key,
        expected_key
    ):

        raise HTTPException(
            status_code=401,
            detail="Unauthorized AI service request"
        )
