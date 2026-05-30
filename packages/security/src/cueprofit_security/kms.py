"""Cloud KMS implementation of TokenCipher (symmetric encrypt/decrypt).

Refresh tokens are tiny (< 64KB), so we encrypt them directly with a KMS
symmetric key — no envelope/DEK needed. Requires the `kms` extra
(`google-cloud-kms`) and Application Default Credentials at runtime.
"""

from __future__ import annotations

from .cipher import EncryptedToken


class KmsTokenCipher:
    """Encrypts via a Cloud KMS crypto key.

    key_name format:
      projects/<p>/locations/<l>/keyRings/<r>/cryptoKeys/<k>
    """

    def __init__(self, key_name: str, client=None):
        if not key_name:
            raise ValueError("key_name is required")
        self._key_name = key_name
        if client is None:
            # Lazy import so the package (and its tests) don't require google-cloud-kms.
            from google.cloud import kms  # type: ignore

            client = kms.KeyManagementServiceClient()
        self._client = client

    @property
    def key_version(self) -> str:
        return self._key_name

    def encrypt(self, plaintext: str) -> EncryptedToken:
        if not plaintext:
            raise ValueError("plaintext must be non-empty")
        resp = self._client.encrypt(
            request={"name": self._key_name, "plaintext": plaintext.encode("utf-8")}
        )
        # resp.name is the specific key VERSION used — record it for rotation.
        return EncryptedToken(ciphertext=resp.ciphertext, key_version=resp.name or self._key_name)

    def decrypt(self, token: EncryptedToken) -> str:
        resp = self._client.decrypt(
            request={"name": self._key_name, "ciphertext": token.ciphertext}
        )
        return resp.plaintext.decode("utf-8")
