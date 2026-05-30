"""TokenCipher protocol + an in-memory fake for tests.

A TokenCipher encrypts/decrypts short secrets (OAuth refresh tokens) and records
which key version produced the ciphertext, so we can store ciphertext + version
in oauth_secrets and rotate keys later.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class EncryptedToken:
    ciphertext: bytes
    key_version: str


@runtime_checkable
class TokenCipher(Protocol):
    def encrypt(self, plaintext: str) -> EncryptedToken: ...
    def decrypt(self, token: EncryptedToken) -> str: ...


_FAKE_PREFIX = b"FAKE1:"


class FakeCipher:
    """Deterministic, reversible, NON-cryptographic cipher for tests only.

    Do not use in production — it provides no confidentiality. It exists so the
    connection service and workers can be tested without Cloud KMS.
    """

    key_version = "fake-key/1"

    def encrypt(self, plaintext: str) -> EncryptedToken:
        if not plaintext:
            raise ValueError("plaintext must be non-empty")
        body = base64.b64encode(plaintext.encode("utf-8"))
        return EncryptedToken(ciphertext=_FAKE_PREFIX + body, key_version=self.key_version)

    def decrypt(self, token: EncryptedToken) -> str:
        ct = token.ciphertext
        if not ct.startswith(_FAKE_PREFIX):
            raise ValueError("ciphertext is not a FakeCipher payload (tampered or wrong cipher)")
        try:
            return base64.b64decode(ct[len(_FAKE_PREFIX):], validate=True).decode("utf-8")
        except Exception as exc:  # noqa: BLE001 - surface any decode failure as ValueError
            raise ValueError("failed to decrypt FakeCipher payload") from exc
